import { usePendingSecAnnouncements } from '../../dividends/hooks/usePendingSecAnnouncements'
import type { DividendPeriod } from '../../dividends/types'

const date = (value: string) => value.split('-').reverse().join('/')
const usd = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 })
function officialDocument(value: string) {
  return /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/[A-Za-z0-9_-]+\.html?$/.test(value)
}

export function PendingSecAnnouncements({ period, search }: { period: DividendPeriod; search: string }) {
  const query = usePendingSecAnnouncements(period)
  const rows = (query.data ?? []).filter(row => row.ticker.includes(search.trim().toUpperCase()))
  return <section className="mt-6 border-t border-white/10 pt-5">
    <h3 className="text-sm font-semibold text-white">Anúncios com data ex a confirmar</h3>
    <p className="mt-2 text-xs text-white/50">Declarações oficiais para ativos da carteira. Sem data ex confirmada, não calculamos quantidade elegível nem valor a receber. Estes anúncios não entram nos totais, no gráfico ou no DY/Bazin. A cobertura SEC é parcial.</p>
    {query.isLoading ? <p role="status" className="mt-3 text-sm text-white/60">Consultando declarações…</p>
      : query.isError ? <p role="alert" className="mt-3 text-sm text-red-300">Não foi possível consultar as declarações. <button type="button" onClick={() => void query.refetch()} className="underline">Tentar novamente</button></p>
      : rows.length === 0 ? <p className="mt-3 text-sm text-white/50">Nenhuma declaração pendente encontrada neste filtro. Isso não comprova ausência de novos anúncios.</p>
      : <div className="mt-3 grid gap-3 md:grid-cols-2">{rows.map(row => <article key={`${row.ticker}-${row.accession}`} className="min-w-0 rounded-xl border border-white/10 p-4 text-sm text-white/70">
        <h4 className="font-semibold text-white">{row.ticker} · {row.distribution === 'special' ? 'Dividendo especial' : 'Dividendo ordinário'}</h4>
        <dl className="mt-3 space-y-1">
          <div><dt className="inline">Declaração: </dt><dd className="inline">{date(row.declaration_date)}</dd></div>
          <div><dt className="inline">Data de registro: </dt><dd className="inline">{date(row.record_date)}</dd></div>
          <div><dt className="inline">Pagamento anunciado: </dt><dd className="inline">{date(row.payment_date)}</dd></div>
          <div><dt className="inline">Bruto por ação: </dt><dd className="inline">{usd.format(Number(row.value_per_share))}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-white/50">Data de registro não substitui a data ex. Impostos e crédito líquido dependem da corretora.</p>
        {officialDocument(row.source_url) && <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-nf-purple underline">Ver documento oficial na SEC</a>}
      </article>)}</div>}
  </section>
}
