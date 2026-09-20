export type AlertStatus = 'novo' | 'lido' | 'ignorado'
export type AlertType =
  | 'position_no_transactions'
  | 'stale_quote'
  | 'opportunity'
  | 'overvalued'
  | 'price_target'

export type AlertCondition = 'above' | 'below'

export interface Alert {
  id: string
  user_id: string
  type: AlertType
  ticker: string
  status: AlertStatus
  title: string
  description: string
  last_quote_date: string | null
  /** Preço-alvo definido pelo usuário. Presente apenas em alertas price_target. */
  target_price: number | null
  /** Condição de disparo: 'above' (acima) ou 'below' (abaixo). Apenas em price_target. */
  condition: AlertCondition | null
  created_at: string
  updated_at: string
}

/** Payload para criar um alerta de preço-alvo. */
export interface CreatePriceTargetPayload {
  ticker: string
  target_price: number
  condition: AlertCondition
}