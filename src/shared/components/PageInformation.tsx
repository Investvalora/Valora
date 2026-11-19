import { useLocation } from 'react-router-dom'
import { InformationHelp } from './InformationHelp'
import { pageHelpTopics, type HelpTopic } from '../help/topics'

export function PageInformation() {
  const { pathname } = useLocation()
  const topics = pageHelpTopics(pathname)
  if (!topics.length) return null
  return <aside aria-label="Ajuda desta tela" className="flex flex-wrap items-center justify-end gap-x-3 px-4 pt-2 text-xs text-gray-400">
    {topics.map(topic => <span key={`${pathname}:${topic}`} className="inline-flex items-center"><span>{({ balance: 'Valores', returns: 'Rentabilidade', income: 'Proventos', transactions: 'Lançamentos', csv: 'Importação', score: 'Score', analysis: 'Análise', allocation: 'Carteiras' } as Partial<Record<HelpTopic, string>>)[topic]}</span><InformationHelp topic={topic} /></span>)}
  </aside>
}
