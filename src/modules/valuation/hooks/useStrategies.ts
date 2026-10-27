import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { supabase } from '../../../shared/services/supabaseClient'
import type { InsightStrategy } from '../types'
import { validCustomRules, type CustomStrategyRule } from '../utils/customStrategy'
import { fiiCeiling } from '../utils/investmentSimulations'
import type { AssetType } from '../../portfolio/types'
import { strategyAssetTypes } from '../utils/strategyAssetTypes'

export interface ValuationStrategy {
  id: string
  name: string
  method: InsightStrategy | 'custom' | 'fii'
  fii_inflation?: number | null
  fii_treasury?: number | null
  fii_tax?: number | null
  fii_premium?: number | null
  custom_rules?: CustomStrategyRule[]
  rule_match?: 'all' | 'any'
  min_dy: number
  safety_discount: number
  show_in_assets: boolean
  asset_types?: AssetType[] | null
}
export type StrategyInput = Omit<ValuationStrategy, 'id'>
const columns = 'id,name,method,min_dy,safety_discount,show_in_assets,custom_rules,rule_match,fii_inflation,fii_treasury,fii_tax,fii_premium,asset_types'

export function useStrategies() {
  const { user } = useAuth()
  const client = useQueryClient()
  const key = ['valuation', 'strategies', user?.id]
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('valuation_strategies').select(columns).eq('user_id', user!.id).order('created_at')
      if (error) throw error
      return data as ValuationStrategy[]
    },
  })
  const save = useMutation({
    mutationFn: async ({ id, ...input }: StrategyInput & { id?: string }) => {
      if (!user) throw new Error('Sessão ausente.')
      if (input.asset_types && (input.asset_types.length === 0 || input.asset_types.some((type) => !strategyAssetTypes(input.method).includes(type)))) throw new Error('Selecione classes compatíveis.')
      if (input.method === 'custom' && !validCustomRules(input.custom_rules ?? [])) throw new Error('Regras inválidas.')
      const min_dy = input.method === 'fii' ? fiiCeiling(1, input.fii_inflation ?? NaN, input.fii_treasury ?? NaN, input.fii_tax ?? NaN, input.fii_premium ?? NaN).requiredYield : input.min_dy
      const payload = { ...input, min_dy, name: input.name.trim(), user_id: user.id }
      const request = id
        ? supabase.from('valuation_strategies').update(payload).eq('user_id', user.id).eq('id', id)
        : supabase.from('valuation_strategies').insert(payload)
      const { data, error } = await request.select(columns).single()
      if (error) throw error
      return data as ValuationStrategy
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Sessão ausente.')
      const { error } = await supabase.from('valuation_strategies').delete().eq('user_id', user.id).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
  return { ...query, strategies: query.data ?? [], save, remove }
}
