import { supabase } from '../../../shared/services/supabaseClient'
import type {
  NewScoreRule,
  ScoreRule,
  UpdateScoreRule,
  UpsertUserPreferences,
  UserPreferences,
} from '../types'

const SCORE_RULES_COLUMNS =
  'id, user_id, name, metric, operator, threshold_min, threshold_max, points, created_at'

const USER_PREFERENCES_COLUMNS =
  'user_id, default_score_rule_id, valuation_method, preferred_currency, updated_at'

export const scoreService = {
  /** Lista todas as regras de score do usuário, ordenadas por nome e data de criação. */
  async listRules(userId: string): Promise<ScoreRule[]> {
    const { data, error } = await supabase
      .from('score_rules')
      .select(SCORE_RULES_COLUMNS)
      .eq('user_id', userId)
      .order('name', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as unknown as ScoreRule[]
  },

  /** Cria uma nova regra de score para o usuário. */
  async createRule(userId: string, payload: NewScoreRule): Promise<ScoreRule> {
    const { data, error } = await supabase
      .from('score_rules')
      .insert({ ...payload, user_id: userId })
      .select(SCORE_RULES_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as ScoreRule
  },

  /** Atualiza uma regra de score existente. */
  async updateRule(id: string, userId: string, payload: UpdateScoreRule): Promise<ScoreRule> {
    const { data, error } = await supabase
      .from('score_rules')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select(SCORE_RULES_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as ScoreRule
  },

  /** Remove uma regra de score. */
  async deleteRule(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('score_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  /** Busca as preferências do usuário. Retorna null se ainda não existirem. */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select(USER_PREFERENCES_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as unknown as UserPreferences | null
  },

  /**
   * Cria ou atualiza as preferências do usuário.
   * Usa upsert para lidar com o caso de não existir ainda.
   */
  async upsertPreferences(
    userId: string,
    prefs: UpsertUserPreferences,
  ): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        { ...prefs, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select(USER_PREFERENCES_COLUMNS)
      .single()

    if (error) throw error
    return data as unknown as UserPreferences
  },
}
