export function ReturnHistoryNotice({ incomplete, issues = [] }: { incomplete?: boolean; issues?: string[] }) {
  return <div className="text-xs leading-relaxed text-white/60">
    <p>Rentabilidade ajustada por compras e vendas, com proventos pagos. Compras são consideradas no início do dia e vendas no fim. Meses encerrados; para carteiras iniciadas neste mês, resultado parcial.</p>
    {incomplete && <p role="status" className="mt-2 text-amber-200">Histórico incompleto: faltam preços, câmbio ou movimentações suficientes. O gráfico mostra os trechos disponíveis, com interrupções nas lacunas. Cada trecho da carteira reinicia em 0%; não representa o acumulado do período inteiro nem permite comparação direta com os índices ao longo dessas lacunas.</p>}
    {incomplete && issues.length > 0 && <ul className="mt-2 list-disc pl-4 text-amber-200">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
  </div>
}
