import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { INTERNATIONAL_TYPES } from '../../portfolio/composition'
import { wealthService } from '../services/wealthService'
import { buildLastPricesMap, buildWealthSeries } from '../wealthCalculations'
import type { WealthPeriod, WealthPoint, PositionSnapshot, PriceHistoryRow } from '../types'

/**
 * Número de dias que cada período representa.
 * "Tudo" usa 365 dias como janela máxima (AD-11 / NFR-3).
 */
const PERIOD_DAYS: Record<WealthPeriod, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1A': 365,
  'Tudo': 365,
}

/** staleTime de 5 minutos — dados de baixa frequência (epic-3-context). */
const WEALTH_STALE_TIME_MS = 5 * 60 * 1000

/**
 * Chave de query no padrão `['dominio','recurso',...params]`.
 * Inclui `tickers` (ordenados) para revalidar quando a carteira muda, mesmo
 * que o período permaneça o mesmo.
 * Exportada para que mutations possam invalidar exatamente esta entrada.
 */
export function wealthHistoryQueryKey(
  userId: string | undefined,
  period: WealthPeriod,
  tickers: string[] = [],
) {
  return ['wealth', 'history', userId, period, [...tickers].sort()] as const
}

/**
 * Calcula a data de início do período em ISO `YYYY-MM-DD`.
 */
function periodSince(period: WealthPeriod): string {
  return shiftIsoDate(-PERIOD_DAYS[period])
}

export interface UseWealthHistoryResult {
  /** Série temporal de patrimônio para o período selecionado. */
  series: WealthPoint[]
  isLoading: boolean
  isError: boolean
  hasPositions: boolean
  hasHistory: boolean
  usdRateIsFallback: boolean
  refetch: () => void
  /**
   * Posições com tipo e moeda — expostas para que `PatrimonioPage`
   * possa passar a `deriveComposition` sem reprocessar a query.
   */
  positions: PositionSnapshot[]
  /**
   * Último preço conhecido por ticker (dentro do período consultado).
   * Usado pela página para construir `PositionRow[]` para `deriveComposition`.
   */
  lastPricesMap: Map<string, number>
  /** Taxa USD/BRL efetiva usada no cálculo (com fallback aplicado). */
  usdRate: number
}

/**
 * Hook principal da tela Patrimônio.
 *
 * Orquestra dois fetches (posições + histórico de preços) e a taxa USD/BRL,
 * depois deriva a série temporal em `useMemo`.
 * Expõe `positions`, `lastPricesMap` e `usdRate` para que a página possa
 * calcular a composição por classe reutilizando `deriveComposition`.
 */
export function useWealthHistory(period: WealthPeriod): UseWealthHistoryResult {
  const { user, loading: isSessionLoading } = useAuth()
  const userId = user?.id

  const since = useMemo(() => periodSince(period), [period])

  // 1. Posições com tipo e moeda
  const positionsQuery = useQuery({
    queryKey: ['wealth', 'positions-snapshot', userId],
    queryFn: () => wealthService.listPositionsSnapshot(userId as string),
    enabled: Boolean(userId),
    staleTime: WEALTH_STALE_TIME_MS,
  })

  const positions: PositionSnapshot[] = useMemo(
    () => positionsQuery.data ?? [],
    [positionsQuery.data],
  )

  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])

  // 2. Histórico de preços para o período
  const historyQuery = useQuery({
    queryKey: wealthHistoryQueryKey(userId, period, tickers),
    queryFn: () => wealthService.listPriceHistory(tickers, since),
    enabled: Boolean(userId) && tickers.length > 0,
    staleTime: WEALTH_STALE_TIME_MS,
  })

  const priceRows: PriceHistoryRow[] = useMemo(
    () => historyQuery.data ?? [],
    [historyQuery.data],
  )

  // 3. Taxa USD/BRL — só busca quando há ativo internacional
  const hasInternational = useMemo(
    () =>
      positions.some(
        (p) =>
          p.currency === 'USD' &&
          p.type !== null &&
          (INTERNATIONAL_TYPES as readonly string[]).includes(p.type),
      ),
    [positions],
  )

  const usdRateQuery = useUSDRate({ enabled: hasInternational })
  // `|| 5`: garante fallback quando a API retorna 0 (raro, mas possível).
  // `?? 5` não cobre 0 porque 0 é falsy para `||` mas truthy para `??`.
  const usdRate = usdRateQuery.data?.rate || 5 // fallback R$ 5,00

  // 4. Mapa de último preço por ticker (para composição)
  const lastPricesMap = useMemo(() => buildLastPricesMap(priceRows), [priceRows])

  // 5. Série temporal derivada no cliente
  const series = useMemo(
    () => buildWealthSeries(positions, priceRows, usdRate),
    [positions, priceRows, usdRate],
  )

  const isLoading =
    isSessionLoading ||
    positionsQuery.isLoading ||
    (tickers.length > 0 && historyQuery.isLoading) ||
    (hasInternational && usdRateQuery.isLoading)

  const isError =
    positionsQuery.isError ||
    historyQuery.isError ||
    // Falha na taxa USD não tem retry automático (a própria cadeia já tentou todas
    // as fontes). Propagar para isError permite que a página mostre o botão de retry.
    (hasInternational && usdRateQuery.isError)

  return {
    series,
    isLoading,
    isError,
    hasPositions: positions.length > 0,
    hasHistory: priceRows.length > 0,
    usdRateIsFallback: usdRateQuery.data?.isFallback ?? false,
    refetch: () => {
      void positionsQuery.refetch()
      void historyQuery.refetch()
    },
    positions,
    lastPricesMap,
    usdRate,
  }
}
