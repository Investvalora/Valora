import { supabase } from '../../../shared/services/supabaseClient'
import {
  FixedIncomePosition,
  NewFixedIncomePosition,
} from '../types'

const COLUMNS =
  'id, user_id, name, type, indexer, rate, principal, ' +
  'application_date, maturity_date, current_value, last_updated_at, ' +
  'active, created_at, updated_at'

export const fixedIncomeService = {
  /** Lista posições ativas do usuário, ordenadas da mais recente para a mais antiga. */
  async listPositions(userId: string): Promise<FixedIncomePosition[]> {
    const { data, error } = await supabase
      .from('fixed_income_positions')
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('active', true)
      .order('application_date', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as FixedIncomePosition[]
  },

  /** Cria uma nova posição de renda fixa. */
  async addPosition(
    userId: string,
    position: NewFixedIncomePosition,
  ): Promise<FixedIncomePosition> {
    const { data, error } = await supabase
      .from('fixed_income_positions')
      .insert({
        user_id: userId,
        ...position,
      })
      .select(COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as FixedIncomePosition
  },

  /**
   * Soft-delete: marca a posição como inativa (resgatada/encerrada).
   * RLS garante que só o dono pode fazer isso.
   */
  async deactivatePosition(userId: string, positionId: string): Promise<void> {
    const { error } = await supabase
      .from('fixed_income_positions')
      .update({ active: false })
      .eq('id', positionId)
      .eq('user_id', userId)

    if (error) throw error
  },
}
