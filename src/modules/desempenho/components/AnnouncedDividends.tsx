import { useMemo, useState } from 'react'
import { useDividends } from '../../dividends/hooks/useDividends'
import type { DividendPeriod } from '../../dividends/types'
import { toIsoDate } from '../../../shared/utils/isoDate'

const date = (value: string | null) => value ? value.split('-').reverse().join('/') : 'A definir'
const money = (value: number, currency = 'BRL') => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 4 }).format(value)

export function AnnouncedDividends() {
  const [period, setPeriod] = useState<DividendPeriod>('1A')
  const [search, setSearch] = useState('')
  const { rows, isLoading, isError, refetch } = useDividends(period, 'announced')
  const filtered = useMemo(() => rows.filter((row) => row.ticker.includes(search.trim().toUpperCase())).sort((a, b) => (a.payment_date ?? '9999').localeCompare(b.payment_date ?? '9999') || a.ticker.localeCompare(b.ticker)), [rows, search])
  const today = toIsoDate(new Date())
  return <section className="rounded-2xl border border-white/10 p-4 md:p-6">
    <h2 className="text-lg font-semibold text-white">Anunciados / a receber</h2>
    <p className="mt-2 text-sm text-white/50">Dados dos ativos atualmente na carteira. Pagamentos futuros com data ficam separados dos registros sem data, que podem já ter sido pagos. Quantidades anteriores à data ex indicam elegibilidade; datas ex futuras são estimativas. Valores na moeda do ativo, antes de impostos.</p>
    <div className="my-4 flex flex-wrap gap-3">
      <label className="text-sm text-white/70">Previsão <select value={period} onChange={(event) => setPeriod(event.target.value as DividendPeriod)} className="min-h-11 rounded-lg bg-[#262626] px-3"><option value="6M">Próximos 6 meses</option><option value="1A">Próximo ano</option><option value="Tudo">Todos os anúncios</option></select></label>
      <input aria-label="Buscar anúncio por ativo" placeholder="Buscar ativo" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 rounded-lg border border-white/15 bg-[#262626] px-3 text-white" />
    </div>
    {isLoading ? <p role="status">Carregando anúncios…</p> : isError ? <p role="alert">Não foi possível carregar os anúncios. <button onClick={refetch}>Tentar novamente</button></p> : filtered.length === 0 ? <p className="text-sm text-white/50">Nenhum anúncio disponível para os ativos e o período selecionados. Isso não significa ausência de pagamentos futuros.</p> :
      <div className="space-y-6">{([true, false] as const).map((dated) => <section key={String(dated)}>
        <h3 className="mb-3 text-sm font-semibold text-white">{dated ? 'Pagamentos futuros com data' : 'Sem data de pagamento · situação desconhecida'}</h3>
        {!filtered.some((row) => Boolean(row.payment_date) === dated) && <p className="text-sm text-white/50">Nenhum registro disponível.</p>}
        <div className="grid gap-3 md:grid-cols-2">{filtered.filter((row) => Boolean(row.payment_date) === dated).map((row) => <article key={`${row.ticker}-${row.type}-${row.ex_date}-${row.payment_date}`} className="rounded-xl border border-white/10 p-4 text-sm text-white/70">
        <h3 className="font-semibold text-white">{row.ticker} · {row.type.toUpperCase()}</h3>
        <div className="mt-3 space-y-1"><div>Data ex: {date(row.ex_date)}</div><div>Pagamento: {row.payment_date ? date(row.payment_date) : 'Não informado na base'}</div><div>Valor por cota: {money(row.value_per_share, row.currency)}</div><div>Quantidade {row.ex_date > today ? 'estimada' : 'elegível'}: {row.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</div><div className="text-nf-green">{dated ? 'Total estimado' : 'Valor de referência'}: {money(row.total_value, row.currency)}</div></div>
        <p className="mt-2 text-xs text-white/40">{row.payment_date === null ? 'Pode já ter sido pago. Ausência de data não comprova um valor a receber.' : row.ex_date > today ? 'Direito ainda não consolidado.' : 'Pagamento anunciado; confira o crédito na corretora.'}</p>
      </article>)}</div></section>)}</div>}
  </section>
}
