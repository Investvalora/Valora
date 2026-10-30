import { supabase } from '../../../shared/services/supabaseClient'
import { movementDateSchema } from '../schemas/movementDateSchema'
import {
  FixedIncomePosition,
  NewFixedIncomePosition,
  FixedIncomeEvent,
  NewFixedIncomeEvent,
} from '../types'

const COLUMNS =
  'id, user_id, wallet_id, name, type, indexer, rate, principal, ' +
  'application_date, maturity_date, current_value, last_updated_at, ' +
  'active, created_at, updated_at, remaining_principal'

export const fixedIncomeService = {
  /** Lista posições ativas do usuário, ordenadas da mais recente para a mais antiga. */
  async listPositions(userId: string, walletId?: string): Promise<FixedIncomePosition[]> {
    let query = supabase
      .from('fixed_income_positions')
      .select(COLUMNS)
      .eq('user_id', userId)

    if (walletId !== undefined) {
      query = query.eq('wallet_id', walletId)
    }

    const { data, error } = await query
      .eq('active', true)
      .order('application_date', { ascending: false })

    if (error) throw error
    return ((data ?? []) as unknown as FixedIncomePosition[]).map((row) => ({ ...row, principal: Number(row.remaining_principal ?? row.principal) }))
  },

  async listHistory(userId: string, walletId?: string): Promise<{ positions: FixedIncomePosition[]; events: FixedIncomeEvent[] }> {
    const positions: FixedIncomePosition[] = []
    const events: FixedIncomeEvent[] = []
    for (let page = 0; ; page += 500) {
      let query = supabase.from('fixed_income_positions').select(COLUMNS).eq('user_id', userId).order('id').range(page, page + 499)
      if (walletId !== undefined) query = query.eq('wallet_id', walletId)
      const { data, error } = await query
      if (error) throw error
      positions.push(...(data ?? []) as unknown as FixedIncomePosition[])
      if (!data || data.length < 500) break
    }
    for (let page = 0; ; page += 500) {
      let query = supabase.from('fixed_income_events').select('*').eq('user_id', userId).order('event_date').order('seq').range(page, page + 499)
      if (walletId !== undefined) query = query.eq('wallet_id', walletId)
      const { data, error } = await query
      if (error) throw error
      events.push(...(data ?? []) as FixedIncomeEvent[])
      if (!data || data.length < 500) break
    }
    return { positions, events }
  },

  async addEvent(event: NewFixedIncomeEvent): Promise<void> {
    const { error } = await supabase.from('fixed_income_events').insert(event)
    if (error?.code === '23505') {
      const { data, error: lookupError } = await supabase.from('fixed_income_events').select('*').eq('id', event.id).maybeSingle()
      if (!lookupError && data && data.position_id === event.position_id && data.type === event.type && data.event_date === event.event_date && Number(data.amount) === event.amount && Number(data.principal_redeemed) === event.principal_redeemed && Number(data.balance_after) === event.balance_after) return
    }
    if (error) throw error
  },

  /** Cria uma nova posição de renda fixa. */
  async addPosition(
    userId: string,
    position: NewFixedIncomePosition,
    walletId?: string,
  ): Promise<FixedIncomePosition> {
    movementDateSchema.parse(position.application_date)
    const { data, error } = await supabase
      .from('fixed_income_positions')
      .insert({
        user_id: userId,
        ...(walletId ? { wallet_id: walletId } : {}),
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
