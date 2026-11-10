import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssetSearch } from '../../portfolio/hooks/useAssetSearch'
import type { Asset } from '../../portfolio/types'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { INDICATOR_CATALOG, INDICATOR_IDS, supportsIndicator } from '../../../shared/indicators/catalog'

export function AssetComparison() {
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<Asset[]>([])
  const search = useAssetSearch(term)
  const funds = useFundamentals(selected.map(asset => asset.ticker))
  return <section className="space-y-5">
    <header><h2 className="text-lg font-semibold text-white">Comparar ativos</h2>
      <p className="mt-2 text-sm text-white/60">Selecione de dois a quatro ativos do catálogo, mesmo que não estejam na sua carteira. Compare indicadores considerando setor, período e fonte.</p></header>
    <div className="rounded-[14px] border border-white/10 bg-[#1B1B1B] p-5">
      <label className="text-sm text-white/80" htmlFor="comparison-search">Buscar por ticker ou nome</label>
      <input id="comparison-search" value={term} disabled={selected.length >= 4} onChange={event => setTerm(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-white focus:outline-none focus:ring-2 focus:ring-nf-blue" placeholder="Ex.: PETR4, VALE3" />
      {selected.length >= 4 && <p className="mt-2 text-xs text-white/60">Limite de quatro ativos. Remova um para escolher outro.</p>}
      {term.trim().length >= 2 && selected.length < 4 && <div className="mt-2 space-y-1">
        {search.isFetching && <p role="status" className="text-sm text-white/60">Buscando…</p>}
        {search.isError && <p role="alert" className="text-sm text-amber-200">Não foi possível buscar. <button onClick={() => search.refetch()} className="underline">Tentar novamente</button></p>}
        {!search.isFetching && !search.isError && search.data?.length === 0 && <p className="text-sm text-white/60">Nenhum ativo encontrado no catálogo.</p>}
        {(search.data ?? []).map(asset => <button key={asset.ticker} disabled={selected.some(item => item.ticker === asset.ticker)} onClick={() => { setSelected(items => [...items, asset]); setTerm('') }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-40">{asset.ticker} · {asset.name} · {asset.currency}</button>)}
      </div>}
      <div className="mt-3 flex flex-wrap gap-2">{selected.map(asset => <button key={asset.ticker} onClick={() => setSelected(items => items.filter(item => item.ticker !== asset.ticker))} aria-label={`Remover ${asset.ticker}`} className="rounded-full border border-white/15 px-3 py-1 text-sm text-white">{asset.ticker} ×</button>)}</div>
    </div>
    {selected.length < 2 ? <p className="text-sm text-white/60">Escolha pelo menos dois ativos para iniciar a comparação.</p>
      : funds.isLoading ? <p role="status" className="text-white/60">Carregando indicadores…</p>
      : funds.isError ? <p role="alert" className="text-amber-200">Não foi possível carregar os indicadores. <button onClick={() => funds.refetch()} className="underline">Tentar novamente</button></p>
      : <div className="overflow-x-auto rounded-[14px] border border-white/10 bg-[#1B1B1B]" role="region" aria-label="Comparação com rolagem horizontal" tabIndex={0}>
        <table className="w-full text-left text-sm text-white/80"><caption className="p-4 text-left text-xs text-white/60">Dados mais recentes disponíveis por ativo. Ausência de dados não significa zero; múltiplos e percentuais têm unidades distintas.</caption>
          <thead><tr><th className="p-4">Indicador</th>{selected.map(asset => <th key={asset.ticker} className="min-w-44 p-4"><Link className="text-nf-blue" to={`/ativo/${asset.ticker.toLowerCase()}`}>{asset.ticker}</Link><p className="mt-1 text-xs font-normal text-white/50">{asset.name} · {asset.currency}</p></th>)}</tr></thead>
          <tbody>{INDICATOR_IDS.map(metric => <tr key={metric} className="border-t border-white/10"><th className="p-4 font-medium">{metric === 'debt_equity' ? 'Dívida/PL (%)' : INDICATOR_CATALOG[metric].label}</th>{selected.map(asset => {
            const row = funds.data?.find(item => item.ticker === asset.ticker)
            const value = row?.[metric]
            const available = row && !['seed', 'synthetic'].includes(row.source ?? '') && (metric !== 'debt_equity' || row.source === 'yahoo') && typeof value === 'number' && Number.isFinite(value)
            return <td key={asset.ticker} className="p-4">{!supportsIndicator(metric, asset.type) ? 'Não se aplica' : available ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${INDICATOR_CATALOG[metric].unit === 'percent' ? '%' : '×'}` : 'Indisponível'}</td>
          })}</tr>)}<tr className="border-t border-white/10"><th className="p-4">Referência e fonte</th>{selected.map(asset => { const row = funds.data?.find(item => item.ticker === asset.ticker); return <td key={asset.ticker} className="p-4 text-xs text-white/50">{row && !['seed', 'synthetic'].includes(row.source ?? '') ? `${row.reference_date} · ${row.source ?? 'Fonte não informada'}` : 'Sem dados reais disponíveis'}</td> })}</tr></tbody>
        </table>
      </div>}
  </section>
}
