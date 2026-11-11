/** Explicita a diferença entre retorno histórico e resultado da posição atual. */
export function ReturnPeriodNotice({ endDate }: { endDate?: string | null }) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const closed = endDate && endDate.slice(0, 7) < currentMonth
  const reference = endDate ? new Date(`${endDate}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null
  return (
    <p className="text-xs leading-relaxed text-[#8F8F8F]">
      Rentabilidade histórica{reference ? ` até ${reference}` : ': sem período disponível'}.
      {reference && (closed ? ' Considera meses encerrados; o mês atual fica fora.' : ' Período inicial parcial, ainda sem mês encerrado.')}
      {' O retorno considera as movimentações e os proventos do período. Lucro e patrimônio atuais incluem as cotações mais recentes e podem ter sinais diferentes.'}
    </p>
  )
}
