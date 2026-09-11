export type AlertStatus = 'novo' | 'lido' | 'ignorado'
export type AlertType =
  | 'position_no_transactions'
  | 'stale_quote'
  | 'opportunity'
  | 'overvalued'

export interface Alert {
  id: string
  user_id: string
  type: AlertType
  ticker: string
  status: AlertStatus
  title: string
  description: string
  last_quote_date: string | null
  created_at: string
  updated_at: string
}