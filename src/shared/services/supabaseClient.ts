import { createClient } from '@supabase/supabase-js'
import { rejectedRecoveryOnStartup } from '../../modules/auth/recoveryReturn'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Force callback error capture before the SDK initializes URL handling.
void rejectedRecoveryOnStartup
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
