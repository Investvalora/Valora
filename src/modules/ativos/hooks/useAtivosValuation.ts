import { useMemo } from 'react'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useLatestQuotes } from '../../portfolio/hooks/useLatestQuotes'
import { useFixedIncomePositions } from '../../portfolio/hooks/useFixedIncomePositions'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import { matchesAssetFilters, useAssetFilters, useFilteredPositions } from './useAssetFilters'
import { valueAssets } from '../assetValuation'

export function useAtivosValuation(walletId: string, ignoreFilters = false) {
  const positionQuery = usePositions(walletId)
  const filteredPositions = useFilteredPositions(positionQuery.data ?? [])
  const positions = useMemo(() => ignoreFilters ? positionQuery.data ?? [] : filteredPositions, [ignoreFilters, positionQuery.data, filteredPositions])
  const filters = useAssetFilters()
  const query = ignoreFilters ? '' : filters.query
  const types = useMemo(() => ignoreFilters ? [] : filters.types, [ignoreFilters, filters.types])
  const fixedQuery = useFixedIncomePositions(walletId)
  const fixed = useMemo(() => (fixedQuery.data ?? []).filter((position) => matchesAssetFilters({
    ticker: position.name, name: position.name, type: 'fixed_income',
  }, { query, types })), [fixedQuery.data, query, types])
  const tickers = useMemo(() => positions.map((position) => position.ticker), [positions])
  const quotesQuery = useLatestQuotes(tickers)
  const needsUsd = positions.some((position) => position.asset?.currency === 'USD')
  const usdQuery = useUSDRate({ enabled: needsUsd })
  const usdRate = usdQuery.data?.rate ?? null
  const value = useMemo(() => valueAssets(positions, quotesQuery.data ?? [], fixed, usdRate), [positions, quotesQuery.data, fixed, usdRate])
  const isLoading = positionQuery.isLoading || quotesQuery.isLoading || fixedQuery.isLoading || (needsUsd && usdQuery.isLoading)
  const isError = positionQuery.isError || quotesQuery.isError || fixedQuery.isError || (needsUsd && usdQuery.isError)
  const ready = !isLoading && !isError && walletId !== ''
  return { ...value, allPositions: positionQuery.data ?? [], positions, tickers, usdRate, isLoading, isError,
    totalBRL: ready ? value.totalBRL : 0,
    patrimonioBRL: ready ? value.patrimonioBRL : null,
    valorInvestidoBRL: ready ? value.valorInvestidoBRL : null }
}
