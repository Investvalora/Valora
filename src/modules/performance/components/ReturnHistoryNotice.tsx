export function ReturnHistoryNotice({ incomplete }: { incomplete?: boolean }) {
  return <div className="text-xs leading-relaxed text-white/60">
    <p>Rentabilidade ajustada por compras e vendas, com proventos pagos. Compras são consideradas no início do dia e vendas no fim. Meses encerrados; para carteiras iniciadas neste mês, resultado parcial.</p>
    {incomplete && <p role="status" className="mt-2 text-amber-200">Histórico incompleto: faltam preços, câmbio ou movimentações suficientes. Períodos sem cobertura aparecem como — e não entram em um retorno acumulado.</p>}
  </div>
}
