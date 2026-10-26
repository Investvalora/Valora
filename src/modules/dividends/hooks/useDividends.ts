import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { positionService } from '../../portfolio/services/positionService'
import { useAllTransactions } from '../../portfolio/hooks/useTransactions'
import { useWallets } from '../../portfolio/hooks/useWallets'
import type { Transaction } from '../../portfolio/services/transactionsService'
import { dividendService } from '../services/dividendService'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import { toIsoDate } from '../../../shared/utils/isoDate'
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
function enrichRows(
  raw: DividendRaw[],
  positions: PositionWithAsset[],
  transactions: Transaction[] = [],
  announced = false,
): DividendRow[] {
  const positionByTicker = new Map<string, PositionWithAsset>()
  for (const pos of positions) {
    positionByTicker.set(pos.ticker, pos)
  }

  const transactionsByTicker = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    if (transaction.type !== 'buy' && transaction.type !== 'sell') continue
    const tickerTransactions = transactionsByTicker.get(transaction.ticker) ?? []
    tickerTransactions.push(transaction)
    transactionsByTicker.set(transaction.ticker, tickerTransactions)
  }

  const result: DividendRow[] = []
  const today = toIsoDate(new Date())

  for (const row of raw) {
    const position = positionByTicker.get(row.ticker)
    if (!position) continue

    const tickerTransactions = transactionsByTicker.get(row.ticker) ?? []
    const firstBuyDate = tickerTransactions
      .filter((transaction) => transaction.type === 'buy')
      .reduce<string | null>(
        (earliest, transaction) =>
          earliest === null || transaction.transaction_date < earliest
            ? transaction.transaction_date
            : earliest,
        null,
      ) ?? position.acquisition_date

    if (firstBuyDate && row.ex_date <= firstBuyDate) continue

    let quantity = position.quantity
    // Datas ex futuras usam a posição atual apenas como estimativa, sem antecipar compras.
    if (tickerTransactions.length > 0) {
      quantity = tickerTransactions.reduce((held, transaction) => {
        if (announced && row.ex_date > today ? transaction.transaction_date > today : transaction.transaction_date >= row.ex_date) return held
        const amount = Number(transaction.quantity)
        if (!Number.isFinite(amount)) return held
        return held + (transaction.type === 'buy' ? amount : -amount)
      }, 0)
    } else if (position.acquisition_date && position.acquisition_date >= row.ex_date) {
      continue
    }

    if (!Number.isFinite(quantity) || quantity <= 0) continue

    result.push({
      ...row,
      quantity,
      total_value: row.value_per_share * quantity,
      asset_type: position.asset?.type ?? null,
      currency: position.asset?.currency ?? 'BRL',
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
export function _enrichRows(
  raw: DividendRaw[],
  positions: PositionWithAsset[],
  transactions: Transaction[] = [],
  announced = false,
): DividendRow[] {
  return enrichRows(raw, positions, transactions, announced)
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
export function useDividends(period: DividendPeriod, status: 'paid' | 'announced' = 'paid'): UseDividendsResult {
  const { user, loading: isSessionLoading } = useAuth()
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''
  const userId = user?.id
  const transactionsQuery = useAllTransactions()

  // --- Query 1: posições ---
  const positionsQuery = useQuery<PositionWithAsset[]>({
    queryKey: ['portfolio', 'positions', userId, walletId],
    queryFn: () => positionService.listPositions(userId as string, walletId),
    enabled: Boolean(userId) && Boolean(walletId),
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

  const firstPurchaseDate = useMemo(() => {
    const firstBuyByTicker = new Map<string, string>()
    for (const transaction of transactionsQuery.data ?? []) {
      if (transaction.type !== 'buy') continue
      const current = firstBuyByTicker.get(transaction.ticker)
      if (!current || transaction.transaction_date < current) {
        firstBuyByTicker.set(transaction.ticker, transaction.transaction_date)
      }
    }

    const purchaseDates = positions.map(
      (position) => firstBuyByTicker.get(position.ticker) ?? position.acquisition_date,
    ).filter((date): date is string => Boolean(date))
    return purchaseDates.length > 0 ? purchaseDates.sort()[0] : null
  }, [positions, transactionsQuery.data])

  const periodSince = periodToSince(period)
  const since = period === 'Tudo' && firstPurchaseDate
    ? `${firstPurchaseDate.slice(0, 7)}-01`
    : periodSince
  const until = period === 'Tudo' ? '9999-12-31' : shiftIsoDate(period === '6M' ? 183 : 365)

  // --- Query 2: dividendos ---
  const dividendsQuery = useQuery<DividendRaw[]>({
    queryKey: [...dividendsQueryKey(userId, period, tickers), walletId, since, status, until],
    queryFn: () => dividendService.listDividendsByTickers(tickers, since, true, status, until),
    enabled: Boolean(userId) && Boolean(walletId) && !positionsQuery.isLoading && !transactionsQuery.isLoading,
    staleTime: STALE_TIME_MS,
  })

  // --- Enriquecimento client-side ---
  const rows = useMemo<DividendRow[]>(() => {
    if (!dividendsQuery.data || positions.length === 0) return []
    return enrichRows(dividendsQuery.data, positions, transactionsQuery.data ?? [], status === 'announced')
  }, [dividendsQuery.data, positions, transactionsQuery.data, status])

  const availableTypes = useMemo<string[]>(() => {
    const types = new Set<string>()
    for (const row of rows) types.add(row.type)
    return [...types].sort()
  }, [rows])

  const isLoading =
    isSessionLoading || positionsQuery.isLoading || transactionsQuery.isLoading || dividendsQuery.isLoading

  const isError = positionsQuery.isError || transactionsQuery.isError || dividendsQuery.isError

  const error = (positionsQuery.error ?? transactionsQuery.error ?? dividendsQuery.error) as Error | null

  const refetch = () => {
    void positionsQuery.refetch()
    void transactionsQuery.refetch()
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


/**
 * Sincroniza dividendos reais do Yahoo Finance para a carteira do usuário.
 *
 * Após o sucesso, invalida todas as queries de dividendos para que ProventosPage,
 * Dashboard e AtivoDetailPage reflitam os dados atualizados automaticamente.
 */
export function useSyncDividends() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Sessão ausente. Entre novamente.')
      return dividendService.syncFromYahoo()
    },
    onSuccess: () => {
      // Invalida todas as queries que começam com 'dividends', 'dashboard' e
      // 'portfolio' (inclui dividend-totals da tabela de posições)
      void queryClient.invalidateQueries({ queryKey: ['dividends'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['assets', 'dividends'] })
      void queryClient.invalidateQueries({ queryKey: ['portfolio', 'dividend-totals'] })
    },
  })
}
