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
  'active, created_at, updated_at, remaining_principal, treasury_quantity, valuation_method, valuation_price_date'

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

  async configureTreasury(userId: string, id: string, quantity: number, maturity: string): Promise<void> {
    if (!Number.isFinite(quantity) || quantity <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(maturity)) throw new Error('Informe quantidade e vencimento válidos.')
    const events = await supabase.from('fixed_income_events').select('id').eq('position_id',id).limit(1)
    if (events.error) throw events.error
    if (events.data?.length) throw new Error('Esta aplicação possui eventos. É necessário conferir as quantidades movimentadas antes de mudar a avaliação.')
    const { data, error } = await supabase.from('fixed_income_positions')
      .update({ treasury_quantity: quantity, maturity_date: maturity, current_value: null, valuation_method: 'market', valuation_price_date: null })
      .eq('user_id', userId).eq('id', id).in('type', ['tesouro_ipca','tesouro_pre','tesouro_selic']).select('id').single()
    if (error || !data) throw error ?? new Error('Aplicação não encontrada.')
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
