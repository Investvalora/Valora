import type { DividendRow, DividendSort, MonthlyBar } from '../types'

/**
 * Agrupa as linhas por mês (`YYYY-MM`) e soma `total_value` por grupo.
 *
 * O resultado é ordenado cronologicamente (mais antigo primeiro), o que é a
 * ordem natural para um gráfico de barras de esquerda para direita.
 *
 * Linhas com `ex_date` inválida ou mal formada são ignoradas com segurança.
 */
export function buildMonthlyBars(rows: DividendRow[]): MonthlyBar[] {
  const totals = new Map<string, number>()

  for (const row of rows) {
    // ex_date tem formato YYYY-MM-DD; os primeiros 7 chars são o mês
    const month = typeof row.ex_date === 'string' ? row.ex_date.slice(0, 7) : ''
    if (!month || !/^\d{4}-\d{2}$/.test(month)) continue

    totals.set(month, (totals.get(month) ?? 0) + row.total_value)
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }))
}

/**
 * Filtra e ordena as linhas de proventos sem mutar o array original.
 *
 * - `tickerFilter`: match case-insensitive de substring no ticker
 * - `typeFilter`: match exato no tipo; string vazia = sem filtro de tipo
 * - `sort`: coluna e direção; padrão esperado fora: `ex_date` decrescente
 */
export function filterAndSort(
  rows: DividendRow[],
  tickerFilter: string,
  typeFilter: string,
  sort: DividendSort,
): DividendRow[] {
  const tickerNorm = tickerFilter.trim().toUpperCase()
  const typeNorm = typeFilter.trim().toLowerCase()

  let filtered = rows

  if (tickerNorm) {
    filtered = filtered.filter((r) => r.ticker.toUpperCase().includes(tickerNorm))
  }

  if (typeNorm) {
    filtered = filtered.filter((r) => r.type.trim().toLowerCase() === typeNorm)
  }

  return [...filtered].sort((a, b) => {
    const { column, direction } = sort
    const mult = direction === 'asc' ? 1 : -1

    if (column === 'ex_date') {
      return mult * a.ex_date.localeCompare(b.ex_date)
    }

    if (column === 'total_value') {
      return mult * (a.total_value - b.total_value)
    }

    // column === 'ticker'
    return mult * a.ticker.localeCompare(b.ticker)
  })
}

/**
 * Soma `total_value` de todas as linhas do array.
 * Retorna 0 para array vazio.
 */
export function sumTotalValue(rows: DividendRow[]): number {
  return rows.reduce((acc, r) => acc + r.total_value, 0)
}
