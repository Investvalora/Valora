import { supabase } from '../../../shared/services/supabaseClient'

export type WalletColor =
  | 'gold'
  | 'green'
  | 'blue'
  | 'gray'
  | 'pink'
  | 'red'
  | 'purple'
  | 'orange'

export interface Wallet {
  id: string
  user_id: string
  name: string
  color: WalletColor
  is_default: boolean
  created_at: string
}

const WALLET_COLUMNS = 'id, user_id, name, color, is_default, created_at'

export const walletService = {
  async list(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as Wallet[]
  },

  async create(userId: string, name: string, color: WalletColor): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert({ user_id: userId, name: name.trim(), color })
      .select(WALLET_COLUMNS)
      .single()

    if (error) throw error
    return data as Wallet
  },

  async update(
    userId: string,
    walletId: string,
    name: string,
    color: WalletColor,
  ): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .update({ name: name.trim(), color })
      .eq('id', walletId)
      .eq('user_id', userId)
      .select(WALLET_COLUMNS)
      .single()

    if (error) throw error
    return data as Wallet
  },
}
