/**
 * Converte uma data ISO `YYYY-MM-DD` para o formato brasileiro `DD/MM/YYYY`.
 * Retorna `fallback` para valores ausentes ou mal formados (padrão: `'—'`).
 *
 * Centralizado aqui para evitar duplicação entre DividendsTable e dividendsCsv.
 */
export function formatDividendDate(
  value: string | null | undefined,
  fallback = '—',
): string {
  if (!value) return fallback
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : fallback
}
