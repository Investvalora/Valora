import { supabase } from '../../../shared/services/supabaseClient'
import { toIsoDate } from '../../../shared/utils/isoDate'
import type { BenchmarkRow } from '../types'

/**
 * Páginas abaixo do limite padrão do PostgREST, sem limitar o período total.
 */
const PAGE_SIZE = 500

const BENCHMARK_COLUMNS = 'name, date, value, source'

export const benchmarkService = {
  /**
   * Retorna os pontos de todos os benchmarks (CDI, IBOV, IFIX) no intervalo
   * `[since, hoje]`, ordenados por `(name ASC, date ASC)`.
   *
   * RLS de `benchmarks` libera SELECT apenas para `authenticated`.
   */
  async listBenchmarks(since: string): Promise<BenchmarkRow[]> {
    const today = toIsoDate(new Date())

    const rows: BenchmarkRow[] = []
    for (let start = 0; ; start += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('benchmarks')
        .select(BENCHMARK_COLUMNS)
        .gte('date', since)
        .lte('date', today)
        .order('name', { ascending: true })
        .order('date', { ascending: true })
        .range(start, start + PAGE_SIZE - 1)

      if (error) throw error
      const page = (data ?? []) as unknown as BenchmarkRow[]
      rows.push(...page)
      if (page.length < PAGE_SIZE) return rows
    }
  },
}
