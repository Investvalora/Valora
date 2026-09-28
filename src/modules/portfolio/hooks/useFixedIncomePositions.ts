import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { fixedIncomeService } from '../services/fixedIncomeService'
import { useWallets } from './useWallets'
import {
  FixedIncomePosition,
  FixedIncomeRow,
  NewFixedIncomePosition,
} from '../types'

export function fiQueryKey(userId: string | undefined, walletId?: string) {
  return ['portfolio', 'fixed-income', userId, walletId] as const
}

/** Deriva FixedIncomeRow a partir da posição armazenada. */
function toRow(pos: FixedIncomePosition): FixedIncomeRow {
  const currentValue = pos.current_value ?? null
  const gainBRL =
    currentValue !== null ? currentValue - pos.principal : null
  const gainPercent =
    currentValue !== null && pos.principal > 0
      ? ((currentValue / pos.principal) - 1) * 100
      : null

  // Stale quando last_updated_at é anterior a ontem (>1 dia)
  let isStale = false
  if (pos.last_updated_at) {
    const diffMs = Date.now() - new Date(pos.last_updated_at).getTime()
    isStale = diffMs > 86_400_000
  } else {
    isStale = true // nunca calculado = stale
  }

  return {
    id: pos.id,
    name: pos.name,
    type: pos.type,
    indexer: pos.indexer,
    rate: pos.rate,
    principal: pos.principal,
    application_date: pos.application_date,
    maturity_date: pos.maturity_date,
    currentValue,
    gainBRL,
    gainPercent,
    lastUpdatedAt: pos.last_updated_at,
    isStale,
  }
}

/** Busca e lista posições de renda fixa do usuário. */
export function useFixedIncomePositions(walletId?: string) {
  const { user } = useAuth()
  const userId = user?.id

  const query = useQuery<FixedIncomePosition[]>({
    queryKey: fiQueryKey(userId, walletId),
    queryFn: () => fixedIncomeService.listPositions(userId!, walletId),
    enabled: Boolean(userId) && walletId !== '',
    staleTime: 5 * 60_000, // 5 min — muda só quando calc-fixed-income roda
  })

  const rows = useMemo(
    () => (query.data ?? []).map(toRow),
    [query.data],
  )

  /** Soma dos valores atuais conhecidos, em BRL. */
  const totalBRL = useMemo(
    () => rows.reduce((sum, r) => sum + (r.currentValue ?? r.principal), 0),
    [rows],
  )

  return { ...query, rows, totalBRL }
}

/** Adiciona uma nova posição de renda fixa. */
export function useAddFixedIncomePosition() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()
  const { selectedWallet } = useWallets()

  return useMutation({
    mutationFn: (position: NewFixedIncomePosition) => {
      if (!userId) throw new Error('Sessão ausente.')
      if (!selectedWallet) throw new Error('Selecione uma carteira.')
      return fixedIncomeService.addPosition(userId, position, selectedWallet.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiQueryKey(userId) })
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'fixed-income', userId] })
    },
  })
}

/** Remove (soft-delete) uma posição de renda fixa. */
export function useDeactivateFixedIncomePosition() {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (positionId: string) => {
      if (!userId) throw new Error('Sessão ausente.')
      return fixedIncomeService.deactivatePosition(userId, positionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiQueryKey(userId) })
    },
  })
}
