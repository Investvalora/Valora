import { supabase } from '../../../shared/services/supabaseClient'
import type { ScoreMetric } from '../../score/types'

export type RuleKind = 'indicator' | 'dividend_announced' | 'dividend_payment'
export interface ConfiguredAlertRule {
  id: string; user_id: string; ticker: string; kind: RuleKind
  metric: ScoreMetric | null; operator: 'gte' | 'lte' | null
  threshold: number | null; enabled: boolean; created_at: string
}
export type RuleInput = Pick<ConfiguredAlertRule, 'ticker' | 'kind' | 'metric' | 'operator' | 'threshold'>
const columns = 'id,user_id,ticker,kind,metric,operator,threshold,enabled,created_at'
export const configuredAlertsService = {
  async list(userId: string): Promise<ConfiguredAlertRule[]> {
    const { data, error } = await supabase.from('configured_alert_rules').select(columns).eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
  async save(userId: string, input: RuleInput, id?: string) {
    if (!input.ticker.trim() || (input.kind === 'indicator' && (!input.metric || !input.operator || input.threshold === null || !Number.isFinite(input.threshold)))) throw new Error('Preencha uma condição válida.')
    const payload = { ...input, ticker: input.ticker.trim().toUpperCase() }
    const query = id ? supabase.from('configured_alert_rules').update(payload).eq('user_id', userId).eq('id', id) : supabase.from('configured_alert_rules').insert({ ...payload, user_id: userId })
    const { error } = await query.select('id').single()
    if (error) throw error
  },
  async setEnabled(userId: string, id: string, enabled: boolean) {
    const { error } = await supabase.from('configured_alert_rules').update({ enabled }).eq('user_id', userId).eq('id', id).select('id').single()
    if (error) throw error
  },
  async remove(userId: string, id: string) {
    const { error } = await supabase.from('configured_alert_rules').delete().eq('user_id', userId).eq('id', id).select('id').single()
    if (error) throw error
  },
}
