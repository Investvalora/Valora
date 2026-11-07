import type { NewScoreRule } from '../types'

/** An explicit editable example; never replaces an existing user's rules. */
export const STARTER_SCORE: NewScoreRule[] = [
  { name: 'Modelo inicial', metric: 'pl', operator: 'between', threshold_min: 1, threshold_max: 15, points: 20 },
  { name: 'Modelo inicial', metric: 'pvp', operator: 'between', threshold_min: 0.1, threshold_max: 2, points: 20 },
  { name: 'Modelo inicial', metric: 'roe', operator: 'gte', threshold_min: 10, threshold_max: null, points: 20 },
  { name: 'Modelo inicial', metric: 'net_margin', operator: 'gte', threshold_min: 5, threshold_max: null, points: 20 },
  { name: 'Modelo inicial', metric: 'dy', operator: 'gte', threshold_min: 4, threshold_max: null, points: 20 },
]

