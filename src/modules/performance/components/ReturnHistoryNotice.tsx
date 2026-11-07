import { Link } from 'react-router-dom'

export function ReturnHistoryNotice({ incomplete, issues = [], onRetry }: { incomplete?: boolean; issues?: string[]; onRetry?: () => void }) {
  return <div className="text-xs leading-relaxed text-white/60">
    <p>Rentabilidade ajustada por compras e vendas, com proventos pagos. Compras são consideradas no início do dia e vendas no fim. Meses encerrados; para carteiras iniciadas neste mês, resultado parcial.</p>
    {incomplete && <p role="status" className="mt-2 text-amber-200">Histórico incompleto: faltam preços, câmbio ou movimentações suficientes. O gráfico mostra os trechos disponíveis, com interrupções nas lacunas. Cada trecho da carteira reinicia em 0%; não representa o acumulado do período inteiro nem permite comparação direta com os índices ao longo dessas lacunas.</p>}
    {incomplete && issues.length > 0 && <ul className="mt-2 list-disc break-words pl-4 text-amber-200">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
    {incomplete && <div className="mt-3 flex flex-wrap gap-3">
      <Link to="/ativos/lancamentos" className="inline-flex min-h-11 items-center underline">Conferir lançamentos e eventos</Link>
      {onRetry && <button type="button" onClick={onRetry} className="min-h-11 underline">Recarregar histórico</button>}
      <p className="w-full">Preços e índices: tente recarregar. Taxas, quantidades, saldos e resgates: confira os lotes com o extrato antes de editar. Recarregar não inventa dados ausentes na fonte.</p>
    </div>}
  </div>
}
