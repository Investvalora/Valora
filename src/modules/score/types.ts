/** Métricas fundamentalistas disponíveis para regras de score. */
export type ScoreMetric = 'pl' | 'pvp' | 'roe' | 'dy' | 'debt_equity' | 'net_margin'

/** Operadores de comparação para regras de score. */
export type ScoreOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'between'

/** Linha da tabela `score_rules` retornada pelo banco. */
export interface ScoreRule {
  id: string
  user_id: string
  name: string
  metric: ScoreMetric
  operator: ScoreOperator
  threshold_min: number
  threshold_max: number | null
  points: number
  created_at: string
}

/** Payload de criação de nova regra (sem campos gerados pelo banco). */
export type NewScoreRule = Omit<ScoreRule, 'id' | 'user_id' | 'created_at'>

/** Payload de atualização parcial de regra existente. */
export type UpdateScoreRule = Partial<NewScoreRule>

/** Linha da tabela `user_preferences`. */
export interface UserPreferences {
  user_id: string
  default_score_rule_id: string | null
  valuation_method: string
  preferred_currency: string
  updated_at: string
}

/** Payload de upsert de preferências (sem user_id e updated_at). */
export type UpsertUserPreferences = Partial<
  Omit<UserPreferences, 'user_id' | 'updated_at'>
>

/** Rótulos legíveis para exibição na UI. */
export const METRIC_LABELS: Record<ScoreMetric, string> = {
  pl: 'P/L',
  pvp: 'P/VP',
  roe: 'ROE (%)',
  dy: 'DY (%)',
  debt_equity: 'Dívida/PL',
  net_margin: 'Margem Líquida (%)',
}

export const OPERATOR_LABELS: Record<ScoreOperator, string> = {
  lt: 'menor que (<)',
  lte: 'menor ou igual (≤)',
  gt: 'maior que (>)',
  gte: 'maior ou igual (≥)',
  between: 'entre',
}
