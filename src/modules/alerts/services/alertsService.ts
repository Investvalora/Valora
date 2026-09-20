import { supabase } from '../../../shared/services/supabaseClient'
import type { Alert, AlertCondition, AlertStatus } from '../types'

const ALERT_COLUMNS =
  'id, user_id, type, ticker, status, title, description, last_quote_date, target_price, condition, created_at, updated_at'

export const alertsService = {
  async listAlerts(userId: string): Promise<Alert[]> {
    const { data, error } = await supabase
      .from('alerts')
      .select(ALERT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Alert[]
  },

  async countNewAlerts(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'novo')

    if (error) throw error
    return count ?? 0
  },

  async generateAlerts(): Promise<{ created: number; positions: number }> {
    const { data, error } = await supabase.functions.invoke('generate-alerts', { body: {} })
    if (error) throw error
    return data as { created: number; positions: number }
  },

  async updateStatus(userId: string, alertId: string, status: AlertStatus): Promise<void> {
    const { error } = await supabase
      .from('alerts')
      .update({ status })
      .eq('id', alertId)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (error) throw error
  },

  async createPriceTargetAlert(
    userId: string,
    ticker: string,
    targetPrice: number,
    condition: AlertCondition,
  ): Promise<Alert> {
    const conditionLabel = condition === 'below' ? 'abaixo de' : 'acima de'
    const priceFormatted = targetPrice.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    const title = `Alerta de preço: ${ticker}`
    const description = `Notificar quando ${ticker} estiver ${conditionLabel} ${priceFormatted}.`

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: userId,
        type: 'price_target',
        ticker,
        status: 'lido', // começa monitorando (lido = não aparece como "novo" até disparar)
        title,
        description,
        target_price: targetPrice,
        condition,
      })
      .select(ALERT_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as Alert
  },

  async checkPriceTargets(): Promise<{ triggered: number }> {
    const { data, error } = await supabase.functions.invoke('check-price-targets', { body: {} })
    if (error) throw error
    return data as { triggered: number }
  },
}