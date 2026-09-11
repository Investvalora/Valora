import { supabase } from '../../../shared/services/supabaseClient'
import { toIsoDate } from '../../../shared/utils/isoDate'
import type { BenchmarkRow } from '../types'

/**
 * Limite por fetch: 3 benchmarks × 365 dias = 1.095 linhas máximo.
 * Suficiente para o período "Tudo" com amostragem diária.
 */
const BENCHMARKS_LIMIT = 3 * 365

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

    const { data, error } = await supabase
      .from('benchmarks')
      .select(BENCHMARK_COLUMNS)
      .gte('date', since)
      .lte('date', today)
      .order('name', { ascending: true })
      .order('date', { ascending: true })
      .limit(BENCHMARKS_LIMIT)

    if (error) throw error
    return (data ?? []) as unknown as BenchmarkRow[]
  },
}
