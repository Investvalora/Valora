import { nextCollection, type DataCategory } from './collectionSchedule'
import { updateRange, timestamp, valid } from './updateDates'
import { NavLink } from 'react-router-dom'
import { InformationHelp } from '../../shared/components/InformationHelp'

export interface UpdateSource {
  name: string
  expected: number
  records: { updatedAt?: string | null; reference?: string | null; source?: string | null }[]
  fetching?: boolean
  error?: boolean
  outdated?: boolean
  note?: string
}
export function DataUpdateSummary({ sources, nextCheck, paused }: { sources: UpdateSource[]; nextCheck: number | null; paused: boolean }) {
  return <section aria-label="Resumo das atualizações" className="space-y-3">
    <div className="flex flex-wrap items-center gap-1"><h4 className="font-semibold text-white">Atualização por fonte de dados</h4><InformationHelp topic="health" /></div>
    <p className="text-xs text-white/60">Horários em Brasília. Próximas coletas são previsões da agenda configurada; é o próximo lote da categoria, não de cada ativo. Filas, cotas e falhas podem adiar a atualização. A gravação indica quando os registros foram atualizados no Valora; a referência indica a data dos dados. Uma consulta bem-sucedida não garante dados novos nem calendário completo.</p>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">{sources.map(item => {
      const applicable = item.expected > 0
      const partial = item.records.length < item.expected || item.records.some(row => !valid(row.updatedAt))
      const state = item.fetching ? 'Conferindo' : item.error ? 'Falha na consulta' : !applicable ? 'Não se aplica' : !item.records.length ? 'Sem informação' : item.outdated ? 'Referência antiga' : partial ? 'Informação parcial' : 'Dados consultados'
      return <article key={item.name} aria-label={item.name} aria-busy={Boolean(item.fetching)} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h5 className="font-semibold text-white">{item.name}</h5><span className={`rounded-full px-2 py-1 text-[11px] ${item.error || item.outdated ? 'bg-amber-400/10 text-amber-200' : 'bg-white/5 text-white/65'}`}>{state}</span></div>
        <dl className="mt-3 space-y-3 text-xs [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-white/85 [&_dt]:text-white/50">
          <div><dt>Última atualização:</dt><dd>{applicable ? updateRange(item.records.map(row => row.updatedAt)) : 'Sem ativos desta categoria'}</dd></div>
          <div><dt>Dados referentes a</dt><dd>{applicable ? updateRange(item.records.map(row => row.reference), false) : 'Não se aplica'}</dd></div>
          <div><dt>Origem</dt><dd>{[...new Set(item.records.map(row => row.source).filter(Boolean))].join(', ') || 'Não informada'}</dd></div>
          <div><dt>Próxima atualização:</dt><dd>{applicable ? timestamp(nextCollection(item.name as DataCategory)) : 'Não se aplica'}</dd></div>
        </dl>{item.note && <p className="mt-3 text-xs text-white/50">{item.note}</p>}
      </article>
    })}</div>
    <p className="text-xs text-white/60">Próxima conferência dos dados salvos nesta tela: <strong>{paused ? 'pausada enquanto a tela estiver oculta ou sem conexão' : nextCheck ? `aproximadamente ${timestamp(new Date(nextCheck).toISOString())}` : 'aguardando a consulta terminar'}</strong>. A conferência ocorre a cada cinco minutos enquanto este painel estiver visível e conectado; não dispara os coletores nem garante nova publicação da fonte.</p>
  </section>
}

export function QuoteUpdateNote({ updates }: { updates?: { updatedAt: string; reference: string }[] }) {
  if (!updates?.length) return null
  return <p className="flex flex-wrap items-center gap-1 text-xs text-white/50">
    Cotações gravadas em {updateRange(updates.map(row => row.updatedAt))} · referência {updateRange(updates.map(row => row.reference), false)}.
    <InformationHelp topic="health" />
    <NavLink to="/analise/ferramentas?tab=health" className="min-h-8 content-center underline underline-offset-2">Ver saúde dos dados</NavLink>
  </p>
}
