import { useId, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useWallets } from '../portfolio/hooks/useWallets'
import { usePositions } from '../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../portfolio/hooks/useLatestQuotes'
import { usePanelRefresh } from './usePanelRefresh'
import { updateRange, timestamp } from './updateDates'

export function UpdateStatusCard() {
  const { selectedWallet } = useWallets()
  const positions = usePositions(selectedWallet?.id ?? '')
  const tickers = [...new Set((positions.data ?? []).filter(row => row.asset?.type !== 'fixed_income').map(row => row.ticker))]
  const quotes = useLatestQuotes(tickers)
  const cadence = usePanelRefresh(() => quotes.refetch(), Boolean(selectedWallet && tickers.length))
  const [open, setOpen] = useState(false)
  const id = useId()
  const pending = positions.isLoading || quotes.isLoading || quotes.isFetching
  const failed = positions.isError || quotes.isError
  const complete = tickers.length > 0 && (quotes.data?.length ?? 0) >= tickers.length
  const label = pending ? 'Conferindo' : failed ? 'Falha na consulta' : !tickers.length ? 'Sem cotações' : complete ? 'Dados disponíveis' : 'Dados parciais'
  return <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
    <button type="button" aria-expanded={open} aria-controls={id} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-white/80 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-nf-purple">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${pending ? 'animate-pulse bg-sky-400 motion-reduce:animate-none' : failed || !complete ? 'bg-amber-400' : 'bg-emerald-400'}`} />{label}
    </button>
    {open && <div id={id} role="region" aria-label="Status das atualizações" className="absolute right-0 top-full z-50 w-[min(300px,calc(100vw-32px))] pt-2"><div className="space-y-3 rounded-xl border border-white/15 bg-[#242424] p-4 text-xs text-white/80 shadow-xl">
      <p className="font-semibold text-white">Atualização das cotações</p>
      <p>Última gravação (Brasília): <strong>{updateRange((quotes.data ?? []).map(row => row.updated_at))}</strong></p>
      <p>Referência: {updateRange((quotes.data ?? []).map(row => row.date), false)}</p>
      <p>Próxima conferência: <strong>{cadence.paused ? 'pausada' : cadence.nextCheck ? timestamp(new Date(cadence.nextCheck).toISOString()) : pending ? 'consulta em andamento' : 'sem consulta programada'}</strong></p>
      <p className="text-white/55">Consulta os dados salvos a cada cinco minutos com a tela visível e conectada. Próxima coleta do fornecedor: horário não disponibilizado. Dados disponíveis não garantem cotações em tempo real nem cobertura dos proventos.</p>
      <NavLink className="inline-flex min-h-8 items-center underline" to="/analise/ferramentas?tab=health">Ver saúde dos dados</NavLink>
    </div></div>}
  </div>
}
