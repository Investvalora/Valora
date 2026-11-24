import { useSearchParams } from 'react-router-dom'
import { DataUpdateSummary, type UpdateSource } from './DataUpdateSummary'
import { usePanelRefresh } from './usePanelRefresh'
import { LoadingState } from '../../shared/components/LoadingState'
import { InformationHelp } from '../../shared/components/InformationHelp'
import type { HelpTopic } from '../../shared/help/topics'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useWallets } from '../portfolio/hooks/useWallets'
import { useAuth } from '../auth/hooks/useAuth'
import { supabase } from '../../shared/services/supabaseClient'
import { useAtivosValuation } from '../ativos/hooks/useAtivosValuation'
import { assetClassLabel } from '../portfolio/composition'
import { AllocationTargets } from '../ativos/components/AllocationTargets'
import type { AllocationTargets as Targets } from '../ativos/utils/allocationTargets'
import { passiveIncomeGoal } from '../valuation/utils/investmentSimulations'
import { planContribution, backupSchema, duplicateCounts } from './calculations'
import { useHistoricalReturns } from '../performance/hooks/useHistoricalReturns'
import { useBrlDividends } from '../dividends/hooks/useBrlDividends'
import { useFixedIncomeHistory } from '../portfolio/hooks/useFixedIncomeHistory'
import { useLatestQuotes } from '../portfolio/hooks/useLatestQuotes'
import { useUSDRate } from '../../shared/hooks/useUSDRate'
import { fundamentalsService } from '../score/services/fundamentalsService'
import { businessDaysBetween, toIsoDate } from '../../shared/utils/isoDate'
import { parseDecimalPtBr } from '../portfolio/schemas/positionSchema'
const money = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? 'Indisponível' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const input = 'min-h-11 w-full rounded-lg border border-white/20 bg-[#262626] px-3 text-white'
const button = 'min-h-11 rounded-lg border border-white/20 px-4 text-sm disabled:opacity-50'
const tabs = ['Planejar aporte', 'Variação do patrimônio', 'Exportar carteira', 'Meta de renda', 'Saúde dos dados'] as const
function useSettings(walletId: string, includeGoal = true) {
  const { user } = useAuth()
  return useQuery({ queryKey: ['planning', 'settings', user?.id, walletId, includeGoal], queryFn: async () => {
    const { data, error } = includeGoal
      ? await supabase.from('wallets').select('allocation_targets,passive_income_goal').eq('id', walletId).eq('user_id', user!.id).single()
      : await supabase.from('wallets').select('allocation_targets').eq('id', walletId).eq('user_id', user!.id).single()
    if (error) throw error
    return { targets: data.allocation_targets as Targets, goal: 'passive_income_goal' in data ? Number(data.passive_income_goal) : 0 }
  }, enabled: !!user && !!walletId })
}
function Planner({ walletId }: { walletId: string }) {
  const settings = useSettings(walletId, false)
  const valuation = useAtivosValuation(walletId, true)
  const [amount, setAmount] = useState('')
  const [minimum, setMinimum] = useState('0')
  const current: Record<string, number> = {}
  for (const row of valuation.compositionRows) current[row.type ?? 'unknown'] = (current[row.type ?? 'unknown'] ?? 0) + (row.marketValueBRL ?? 0)
  const ready = !valuation.isLoading && !valuation.isError && valuation.complete && settings.isSuccess
  const plan = ready ? planContribution(parseDecimalPtBr(amount), current, settings.data.targets, parseDecimalPtBr(minimum)) : null
  return <>
    <p>Distribuição por classe para aproximar as metas, sem vender posições. Valores em reais; o mínimo se aplica a cada classe. A compra efetiva depende do preço e das unidades negociáveis.</p>
    <div className="my-4 grid gap-4 sm:grid-cols-2"><label>Aporte disponível (R$)<input className={input} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></label><label>Mínimo por classe (R$)<input className={input} inputMode="decimal" value={minimum} onChange={e => setMinimum(e.target.value)} /></label></div>
    {!ready && (settings.isLoading || valuation.isLoading ? <LoadingState label="Carregando metas e avaliação da carteira…" variant="table" /> : <p role="status">{settings.isError || valuation.isError ? 'Falha ao carregar metas ou avaliação.' : 'Aguardando metas e avaliação completa da carteira.'}<button className={button} onClick={() => { void settings.refetch(); valuation.refetch() }}>Tentar novamente</button></p>)}
    {ready && !plan && <p role="status">Informe valores válidos e metas que somem 100%.</p>}
    {plan && <><ul className="space-y-2">{plan.rows.map(row => <li key={row.type} className="flex justify-between gap-3"><span>{assetClassLabel(row.type)}</span><strong>{money(row.amount)}</strong></li>)}</ul><p className="mt-4 font-semibold">Sobra em caixa: {money(plan.remainder)}</p><p className="text-xs">A simulação não inclui taxas, preço mínimo de cada ativo ou ordens. A sobra não entra no patrimônio cadastrado.</p></>}
    <AllocationTargets walletId={walletId} />
  </>
}
function WealthExplanation({ walletId }: { walletId: string }) {
  const history = useHistoricalReturns('Tudo', walletId)
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState(toIsoDate(new Date()))
  const first = history.points[0]?.date ?? ''
  const selected = history.points.filter(point => point.date >= (from || first) && point.date <= until)
  const prior = [...history.points].reverse().find(point => point.date < (from || first))
  const initial = prior?.value ?? (from && from > first ? null : 0)
  const complete = !history.isLoading && !history.isError && initial !== null && selected.length > 0 && selected.every(point => point.value !== null && point.marketChange != null && point.fxChange != null)
  const sum = (key: 'purchases' | 'withdrawals' | 'income' | 'marketChange' | 'fxChange') => selected.reduce((total, point) => total + (point[key] ?? 0), 0)
  const round = (value: number) => Math.round(value * 100)
  const lastValue = selected[selected.length - 1]?.value
  const rounding = complete && initial !== null && lastValue != null ? (round(lastValue) - round(initial) - round(sum('purchases')) + round(sum('withdrawals')) - round(sum('marketChange')) - round(sum('fxChange'))) / 100 : 0
  return <>
    <p>Reconciliação do saldo dos ativos. Compras e aplicações são entradas; vendas e resgates são saídas. Não representa o caixa da corretora. Proventos ficam separados, pois não entram automaticamente no saldo dos ativos. Um saldo sem lançamentos é tratado como posição de abertura na aquisição.</p>
    <div className="my-4 grid gap-4 sm:grid-cols-2"><label>De<input className={input} type="date" value={from || first} max={until} onChange={e => setFrom(e.target.value)} /></label><label>Até<input className={input} type="date" min={from || first} max={toIsoDate(new Date())} value={until} onChange={e => setUntil(e.target.value)} /></label></div>
    {!complete ? <div>{history.isLoading ? <LoadingState variant="chart" label="Calculando histórico…" /> : <p>A separação aguarda histórico completo de preços, movimentos e câmbio no período.</p>}<ul>{history.issues.slice(0, 6).map(issue => <li key={issue}>{issue}</li>)}</ul><button className={button} onClick={history.refetch}>Atualizar histórico</button></div> : <dl className="grid grid-cols-2 gap-3">
      <dt>Saldo anterior a {selected[0].date}</dt><dd>{money(initial)}</dd><dt>Entradas</dt><dd>{money(sum('purchases'))}</dd><dt>Saídas</dt><dd>{money(-sum('withdrawals'))}</dd><dt>Valorização e custos</dt><dd>{money(sum('marketChange'))}</dd><dt>Efeito do câmbio</dt><dd>{money(sum('fxChange'))}</dd>{rounding !== 0 && <><dt>Ajuste de arredondamento</dt><dd>{money(rounding)}</dd></>}<dt>Saldo em {selected[selected.length - 1].date}</dt><dd>{money(selected[selected.length - 1].value)}</dd><dt>Proventos no período, fora do saldo</dt><dd>{money(sum('income'))}</dd>
    </dl>}
    <p className="mt-4 text-xs text-white/50">Câmbio: quantidade e preço em USD do fechamento anterior × mudança diária da taxa. A interação entre preço e câmbio fica na valorização. Custos reduzem o resultado. Todos os componentes usam a mesma série diária; lacunas impedem a reconciliação.</p>
  </>
}
async function exportWallet(walletId: string) {
  const { data, error } = await supabase.rpc('export_owned_wallet', { p_wallet_id: walletId })
  if (error) throw error
  return backupSchema.parse(data)
}
function ExportWallet({ walletId }: { walletId: string }) {
  const [preview, setPreview] = useState('')
  const [validating, setValidating] = useState(false)
  const download = useMutation({ mutationFn: async () => {
    const backup = await exportWallet(walletId)
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `valora-${walletId}-${toIsoDate(new Date())}.json`; a.click(); URL.revokeObjectURL(url)
  } })
  async function validate(file?: File) {
    setPreview('')
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { setPreview('Arquivo excede 20 MB.'); return }
    setValidating(true)
    try {
      const incoming = backupSchema.parse(JSON.parse(await file.text()))
      const current = await exportWallet(walletId)
      const duplicates = duplicateCounts(incoming, current)
      setPreview(`Arquivo válido: ${incoming.wallet.name}. ${incoming.transactions.length} lançamentos, ${incoming.positions.length} posições, ${incoming.fixed_income_positions.length} títulos, ${incoming.fixed_income_events.length} eventos e ${incoming.wallet_income.length} recebimentos. Registros com IDs já presentes: ${Object.values(duplicates).reduce((a, b) => a + b, 0)}. Nenhum dado foi importado. A restauração automática ainda não está disponível.`)
    } catch { setPreview('Não foi possível validar: confira versão, estrutura, vínculos e duplicatas do arquivo, ou a conexão para comparar a carteira atual.') } finally { setValidating(false) }
  }
  return <div className="space-y-4"><p>Arquivo JSON versionado com lançamentos, posições, renda fixa e eventos, recebimentos, impostos, tarifas, importações e metadados de ativos/moedas/fontes. A exportação usa uma fotografia consistente da carteira no banco.</p><button className={button} aria-busy={download.isPending} disabled={download.isPending} onClick={() => download.mutate()}>{download.isPending ? 'Preparando exportação…' : 'Baixar exportação completa'}</button>{download.isError && <p role="alert">Não foi possível exportar. Tente novamente.</p>}<p className="text-xs">O arquivo contém seus dados financeiros. Guarde em local privado. Não inclui preços históricos públicos nem credenciais.</p><label className="block">Conferir arquivo para futura restauração<input className="mt-2 block max-w-full" type="file" disabled={validating} aria-busy={validating} accept="application/json,.json" onChange={event => void validate(event.target.files?.[0])} /></label>{validating && <LoadingState label="Conferindo arquivo e comparando os registros…" />}{preview && <p role="status">{preview}</p>}</div>
}
function IncomeGoal({ walletId }: { walletId: string }) {
  const { user } = useAuth()
  const settings = useSettings(walletId)
  const fixed = useFixedIncomeHistory(walletId)
  const income = useBrlDividends('1A', 'paid', walletId)
  const [goal, setGoal] = useState<string | null>(null)
  const [annualYield, setAnnualYield] = useState('6')
  const save = useMutation({ mutationFn: async () => {
    const value = parseDecimalPtBr(goal ?? String(settings.data?.goal ?? 0).replace('.', ','))
    if (!Number.isFinite(value) || value < 0 || value > 9999999999999) throw new Error('Meta inválida')
    const { error } = await supabase.from('wallets').update({ passive_income_goal: value }).eq('id', walletId).eq('user_id', user!.id).select('id').single()
    if (error) throw error
  }, onSuccess: () => { setGoal(null); void settings.refetch() } })
  const confirmed = income.rows.filter(row => row.source === 'imported')
  const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const coupons = (fixed.data?.events ?? []).filter(event => event.type === 'coupon' && event.event_date >= since && event.event_date <= toIsoDate(new Date()))
  const actual = (confirmed.reduce((total, row) => total + row.total_value, 0) + coupons.reduce((sum, event) => sum + Number(event.amount), 0)) / 12
  const target = settings.data?.goal ?? 0
  const yieldPct = parseDecimalPtBr(annualYield)
  let projectedCapital: number | null = null
  try { if (target > 0 && yieldPct > 0 && yieldPct <= 100) projectedCapital = passiveIncomeGoal(target, yieldPct / 100, 0, 12, 0).target } catch { /* Invalid assumptions remain unavailable. */ }
  return <div className="space-y-4"><p>Meta mensal em reais, comparada à média dos últimos 12 meses de recebimentos confirmados por extrato/lançamento. Estimativas públicas não contam como recebimento confirmado.</p>{settings.isLoading ? <LoadingState label="Carregando meta…" /> : settings.isError ? <p role="alert">Não foi possível carregar a meta.</p> : <><label className="block">Meta mensal (R$)<input className={input} inputMode="decimal" value={goal ?? String(target).replace('.', ',')} onChange={event => setGoal(event.target.value)} /></label><button className={button} aria-busy={save.isPending} disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando meta…' : 'Salvar meta'}</button></>}{save.isError && <p role="alert">Confira a meta e tente salvar novamente.</p>}{save.isSuccess && <p role="status">Meta salva.</p>}{income.isLoading || fixed.isLoading ? <LoadingState label="Carregando recebimentos confirmados…" variant="table" /> : income.isError || fixed.isError ? <p role="status">Recebimentos ou câmbio histórico indisponíveis.</p> : <><p>Média confirmada (12M): <strong>{money(actual)}</strong></p><p>Falta para a meta salva: {money(Math.max(0, target - actual))}</p><p className="text-xs">{confirmed.length} proventos e {coupons.length} cupons confirmados no período. Meses sem registro contam como zero nesta média; confira se seu extrato está completo.</p></>}<hr className="border-white/10" /><h3>Projeção, sem garantia de rendimento</h3><label className="block">Rendimento anual hipotético (%)<input className={input} inputMode="decimal" value={annualYield} onChange={event => setAnnualYield(event.target.value)} /></label><p>Capital necessário para a meta salva: {money(projectedCapital)}</p><p className="text-xs">Mesma fórmula da calculadora de renda passiva: meta mensal ÷ taxa mensal equivalente à taxa anual informada. Inflação assumida zero; impostos e tarifas não incluídos. Pagamentos mensais não são garantidos.</p></div>
}
function DataHealth({ walletId }: { walletId: string }) {
  const fixed = useFixedIncomeHistory(walletId)
  const valuation = useAtivosValuation(walletId, true)
  const quotes = useLatestQuotes(valuation.tickers)
  const fx = useUSDRate({ enabled: valuation.positions.some(row => row.asset?.currency === 'USD') })
  const fundamentals = useQuery({ queryKey: ['planning', 'fundamentals', valuation.tickers], queryFn: () => fundamentalsService.listByTickers(valuation.tickers), enabled: valuation.tickers.length > 0 })
  const history = useHistoricalReturns('Tudo', walletId)
  const today = toIsoDate(new Date())
  const refreshing = quotes.isFetching || fx.isFetching || fundamentals.isFetching || fixed.isFetching
  const refreshSaved = () => Promise.allSettled([...(valuation.tickers.length ? [quotes.refetch(), fundamentals.refetch()] : []), ...(valuation.positions.some(row => row.asset?.currency === 'USD') ? [fx.refetch()] : []), fixed.refetch()])
  const cadence = usePanelRefresh(refreshSaved, !valuation.isLoading && !valuation.isError)
  const market = valuation.positions.filter(row => row.asset?.type !== 'fixed_income')
  const fundamentalTickers = new Set(market.filter(row => ['stock_br', 'stock_us', 'bdr'].includes(row.asset?.type ?? '')).map(row => row.ticker))
  const fundamentalRecords = (fundamentals.data ?? []).filter(row => fundamentalTickers.has(row.ticker))
  const treasury = (fixed.data?.positions ?? []).filter(row => row.active && Number(row.treasury_quantity) > 0)
  const sources: UpdateSource[] = [
    { name: 'Cotações', expected: new Set(market.map(row => row.ticker)).size, records: (quotes.data ?? []).map(row => ({ updatedAt: row.updated_at, reference: row.date, source: row.source })), fetching: quotes.isFetching, error: quotes.isError || valuation.isError,
      outdated: market.some(position => { const quote = quotes.data?.find(row => row.ticker === position.ticker); return quote && (position.asset?.type === 'crypto' ? (Date.parse(today) - Date.parse(quote.date)) / 86400000 > 1 : (businessDaysBetween(quote.date, today) ?? 0) > 1) }),
      note: 'Ativos podem ter horários diferentes; o intervalo inclui o registro mais antigo e o mais recente disponíveis.' },
    { name: 'Proventos', expected: market.length, records: [], note: 'O calendário combina fontes com cadências diferentes. A consulta atual não fornece uma data unificada de coleta. Data ex e pagamento não representam atualização; ausência de horário não significa ausência de proventos.' },
    { name: 'Fundamentos', expected: fundamentalTickers.size, records: fundamentalRecords.map(row => ({ updatedAt: row.updated_at, reference: row.reference_date, source: row.source })), fetching: fundamentals.isFetching, error: fundamentals.isError,
      outdated: fundamentalRecords.some(row => Date.parse(today) - Date.parse(row.reference_date) > 180 * 86400000), note: 'A competência pode ser anterior à última gravação. Cobertura e aplicabilidade variam por indicador e classe.' },
    { name: 'Tesouro', expected: treasury.length, records: treasury.map(row => ({ updatedAt: row.last_updated_at, reference: row.valuation_price_date, source: row.valuation_method === 'market' ? 'Preço de mercado do Tesouro' : 'Taxa contratada' })), fetching: fixed.isFetching, error: fixed.isError,
      outdated: treasury.some(row => row.valuation_price_date && (businessDaysBetween(row.valuation_price_date, today) ?? 0) > 1), note: 'Horário do saldo avaliado e data do preço são informações distintas. Outros títulos de renda fixa continuam detalhados abaixo.' },
  ]
  if (valuation.isLoading || quotes.isLoading || fundamentals.isLoading || fixed.isLoading) return <LoadingState variant="table" label="Conferindo fontes e datas dos dados…" />
  return <div className="space-y-4"><DataUpdateSummary sources={sources} {...cadence} /><p>Últimos dados conhecidos e suas fontes. Fechamento anterior em fim de semana não significa falha. A verificação por dias úteis não substitui o calendário de feriados de cada bolsa.</p><button className={button} disabled={refreshing} aria-busy={refreshing} onClick={() => { void refreshSaved(); history.refetch() }}>{refreshing ? 'Conferindo dados…' : 'Conferir dados novamente'}</button><p>Histórico: {history.isLoading ? 'verificando' : history.isError ? 'consulta falhou' : history.incomplete || history.points.some(point => point.value === null || point.returnPct === null) ? 'cobertura parcial' : history.points.length ? `${history.points[0].date} a ${history.points[history.points.length - 1].date}` : 'sem histórico'}</p><p>Câmbio USD: {fx.data ? `${fx.data.source} · ${fx.data.date ?? 'sem data'}${fx.data.isFallback ? ' · aproximado' : ''}` : 'não utilizado ou indisponível'}</p><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><caption className="sr-only">Saúde dos dados por ativo</caption><thead><tr><th>Ativo</th><th>Cotação / fonte</th><th>Estado</th><th>Fundamentos / fonte</th></tr></thead><tbody>{valuation.positions.map(position => {
    const quote = quotes.data?.find(row => row.ticker === position.ticker)
    const fundamental = fundamentals.data?.find(row => row.ticker === position.ticker)
    const days = quote ? position.asset?.type === 'crypto' ? Math.floor((Date.parse(today) - Date.parse(quote.date)) / 86400000) : businessDaysBetween(quote.date, today) : null
    const weekend = [0, 6].includes(new Date(`${today}T12:00:00`).getDay()) && position.asset?.type !== 'crypto'
    return <tr key={position.id} className="border-t border-white/10"><th className="py-3">{position.ticker}</th><td>{quote ? `${quote.date} · ${quote.source}` : 'sem cotação'}</td><td>{quotes.isError ? 'consulta falhou' : days === null ? 'cobertura incompleta' : days > 1 ? 'dado antigo' : weekend ? 'sem pregão no fim de semana · último fechamento' : quote?.date !== today ? 'último fechamento disponível' : 'data atual'}</td><td>{fundamentals.isError ? 'consulta falhou' : fundamental ? `${fundamental.reference_date} · ${fundamental.source ?? 'fonte não informada'}${Date.parse(today) - Date.parse(fundamental.reference_date) > 180 * 86400000 ? ' · referência há mais de 180 dias' : ''}` : 'sem cobertura'}</td></tr>
  })}</tbody></table></div>{(fixed.data?.positions.length ?? 0) > 0 && <details><summary>Renda fixa: avaliação e atualização</summary><ul className="mt-2 space-y-2 text-xs">{fixed.data?.positions.map(position => <li key={position.id}>{position.name}: {position.valuation_method === 'market' ? 'preço de mercado' : 'taxa contratada'} · preço {position.valuation_price_date ?? 'sem data de mercado'} · saldo atualizado {position.last_updated_at ?? 'sem atualização'}{position.current_value === null ? ' · avaliação incompleta' : ''}{!position.active ? ' · encerrado/inativo' : ''}</li>)}</ul></details>}{history.issues.length > 0 && <details><summary>Ver lacunas históricas</summary><ul className="mt-2 space-y-2 text-xs">{history.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></details>}<p className="text-xs">Conferir novamente consulta os dados salvos; não garante nova publicação pelo fornecedor. Fundamentos usam a data de referência informada e não a data da cotação.</p></div>
}
export function PlanningPage() {
  const { wallets, selectedWallet, selectWallet, isLoading: walletsLoading, isError: walletsError, refetch: refetchWallets } = useWallets()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(() => params.get('tab') === 'health' ? 4 : 0)
  const helpTopics: HelpTopic[] = ['planner', 'wealth', 'export', 'goal', 'health']
  return <section className="mx-auto w-full min-w-0 max-w-5xl space-y-5 text-sm text-white/80"><header><h2 className="text-xl font-semibold text-white">Ferramentas</h2><p className="mt-2 text-white/55">Planeje seus próximos passos e confira os dados da carteira selecionada.</p></header><label className="block">Carteira<select className={input} disabled={!selectedWallet && (walletsLoading || !wallets.length)} aria-busy={walletsLoading} value={selectedWallet?.id ?? ''} onChange={event => selectWallet(event.target.value)}>{!selectedWallet && <option value="">{walletsLoading ? 'Carregando carteiras…' : walletsError ? 'Carteiras indisponíveis' : 'Selecione uma carteira'}</option>}{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label><div role="tablist" aria-label="Ferramentas da carteira" className="flex flex-wrap gap-2">{tabs.map((label, index) => <button className={`${button} ${tab === index ? 'bg-nf-purple text-white' : ''}`} id={`planning-tab-${index}`} aria-controls={`planning-panel-${index}`} role="tab" tabIndex={tab === index ? 0 : -1} onKeyDown={event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (next !== null) { event.preventDefault(); setTab(next); document.getElementById(`planning-tab-${next}`)?.focus() }
  }} aria-selected={tab === index} key={label} onClick={() => setTab(index)}>{label}</button>)}</div><section key={`${selectedWallet?.id}:${tab}`} role="tabpanel" aria-labelledby={`planning-tab-${tab}`} id={`planning-panel-${tab}`} className="ui-panel-entry min-w-0 space-y-4 rounded-2xl border border-white/10 bg-[#1b1b1b] p-5"><h3 className="flex items-center gap-1 font-semibold text-white">{tabs[tab]} <InformationHelp topic={helpTopics[tab]} /></h3>{!selectedWallet ? walletsLoading ? <LoadingState label="Carregando carteiras…" variant="form" /> : walletsError ? <div role="alert"><p>Não foi possível carregar as carteiras.</p><button type="button" className={button} onClick={() => void refetchWallets()}>Tentar novamente</button></div> : <p>Selecione ou crie uma carteira.</p> : tab === 0 ? <Planner walletId={selectedWallet.id} /> : tab === 1 ? <WealthExplanation walletId={selectedWallet.id} /> : tab === 2 ? <ExportWallet walletId={selectedWallet.id} /> : tab === 3 ? <IncomeGoal walletId={selectedWallet.id} /> : <DataHealth walletId={selectedWallet.id} />}</section></section>
}
