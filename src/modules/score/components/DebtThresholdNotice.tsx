/** Explain the stored threshold; never infer whether the owner intended a multiple. */
export function DebtThresholdNotice({ minimum, maximum }: { minimum: number; maximum?: number | null }) {
  const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 12 })
  if (!Number.isFinite(minimum) || (maximum != null && !Number.isFinite(maximum))) return null
  return <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/65">
    Dívida/PL usa percentual na fonte Yahoo. {maximum == null ? `O limite ${number(minimum)} é interpretado como ${number(minimum)}% (${number(minimum / 100)} vez o patrimônio).` : `Os limites ${number(minimum)} e ${number(maximum)} são interpretados como ${number(minimum)}% e ${number(maximum)}%.`}
    {' '}Se você pretendia 1,5 vez o patrimônio, o valor em percentual é 150. Confira sua intenção antes de editar. Nenhum limite foi convertido automaticamente.
  </p>
}
