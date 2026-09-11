import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { positionService } from '../../portfolio/services/positionService'
import { dividendService } from '../services/dividendService'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import type { DividendPeriod, DividendRaw, DividendRow } from '../types'
import type { PositionWithAsset } from '../../portfolio/types'

/** staleTime de 5 minutos — dados de baixa frequência (seed trimestral). */
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Query key estruturada por domínio, recurso e parâmetros.
 * Inclui os tickers normalizados para que a mesma carteira com o mesmo período
 * nunca resulte em chaves distintas.
 */
export function dividendsQueryKey(
  userId: string | undefined,
  period: DividendPeriod,
  tickers: string[],
) {
  return ['dividends', 'list', userId, period, tickers] as const
}

/**
 * Calcula a data de início do período para uso no filtro `since`.
 * `Tudo` usa 1970-01-01 para capturar qualquer dado histórico disponível.
 */
function periodToSince(period: DividendPeriod): string {
  const today = new Date()

  if (period === '6M') return shiftIsoDate(-183, today)
  if (period === '1A') return shiftIsoDate(-365, today)
  // 'Tudo'
  return '1970-01-01'
}

/**
 * Enriquece as linhas brutas com `quantity` e `total_value` derivados das
 * posições do usuário.
 *
 * Linhas sem posição correspondente são descartadas (o ticker não pertence
 * mais à carteira ou há inconsistência nos dados).
 */
function enrichRows(raw: DividendRaw[], positions: PositionWithAsset[]): DividendRow[] {
  const quantityByTicker = new Map<string, number>()
  for (const pos of positions) {
    quantityByTicker.set(pos.ticker, pos.quantity)
  }

  const result: DividendRow[] = []

  for (const row of raw) {
    const quantity = quantityByTicker.get(row.ticker)
    if (quantity === undefined || quantity <= 0) continue

    result.push({
      ...row,
      quantity,
      total_value: row.value_per_share * quantity,
    })
  }

  return result
}

/**
 * Calcula a data de início do período para uso no filtro `since`.
 * `Tudo` usa 1970-01-01 para capturar qualquer dado histórico disponível.
 *
 * Exportado com prefixo `_` exclusivamente para testes unitários.
 */
export function _periodToSince(period: DividendPeriod): string {
  return periodToSince(period)
}

/**
 * Enriquece as linhas brutas com `quantity` e `total_value` derivados das
 * posições do usuário.
 *
 * Exportado com prefixo `_` exclusivamente para testes unitários.
 */
export function _enrichRows(raw: DividendRaw[], positions: PositionWithAsset[]): DividendRow[] {
  return enrichRows(raw, positions)
}

export interface UseDividendsResult {
  rows: DividendRow[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  /** Tickers das posições do usuário (para popular o filtro de ticker). */
  tickers: string[]
  /** Tipos únicos presentes nos dados retornados (para popular o filtro de tipo). */
  availableTypes: string[]
}

/**
 * Hook principal da tela de Proventos.
 *
 * Orquestra duas queries:
 * 1. Posições do usuário → extrai tickers e quantidade
 * 2. Dividendos filtrados pelos tickers e período
 *
 * O enriquecimento (quantity + total_value) é client-side em `useMemo`.
 */
export function useDividends(period: DividendPeriod): UseDividendsResult {
  const { user, loading: isSessionLoading } = useAuth()
  const userId = user?.id

  // --- Query 1: posições ---
  const positionsQuery = useQuery<PositionWithAsset[]>({
    queryKey: ['portfolio', 'positions', userId],
    queryFn: () => positionService.listPositions(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })

  const positions = useMemo(
    () => positionsQuery.data ?? [],
    [positionsQuery.data],
  )

  const tickers = useMemo(
    () => positions.map((p) => p.ticker).sort(),
    [positions],
  )

  const since = periodToSince(period)

  // --- Query 2: dividendos ---
  const dividendsQuery = useQuery<DividendRaw[]>({
    queryKey: dividendsQueryKey(userId, period, tickers),
    queryFn: () => dividendService.listDividendsByTickers(tickers, since),
    enabled: Boolean(userId) && !positionsQuery.isLoading,
    staleTime: STALE_TIME_MS,
  })

  // --- Enriquecimento client-side ---
  const rows = useMemo<DividendRow[]>(() => {
    if (!dividendsQuery.data || positions.length === 0) return []
    return enrichRows(dividendsQuery.data, positions)
  }, [dividendsQuery.data, positions])

  const availableTypes = useMemo<string[]>(() => {
    const types = new Set<string>()
    for (const row of rows) types.add(row.type)
    return [...types].sort()
  }, [rows])

  const isLoading =
    isSessionLoading || positionsQuery.isLoading || dividendsQuery.isLoading

  const isError = positionsQuery.isError || dividendsQuery.isError

  const error = (positionsQuery.error ?? dividendsQuery.error) as Error | null

  const refetch = () => {
    void positionsQuery.refetch()
    void dividendsQuery.refetch()
  }

  return {
    rows,
    isLoading,
    isError,
    error,
    refetch,
    tickers,
    availableTypes,
  }
}

/**
 * Indica se o usuário não tem posições cadastradas.
 * Útil para diferenciar "sem posições" de "posições sem dividendos no período".
 */
export function useHasPositions(): { hasPositions: boolean; isLoading: boolean } {
  const { user, loading: isSessionLoading } = useAuth()
  const userId = user?.id

  const positionsQuery = useQuery<PositionWithAsset[]>({
    queryKey: ['portfolio', 'positions', userId],
    queryFn: () => positionService.listPositions(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  })

  return {
    hasPositions: (positionsQuery.data?.length ?? 0) > 0,
    isLoading: isSessionLoading || positionsQuery.isLoading,
  }
}

