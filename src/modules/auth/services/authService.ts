import { supabase } from '../../../shared/services/supabaseClient'
import { LoginFormData, SignupFormData, UserProfile } from '../types'

export const authService = {
  async signup(data: SignupFormData) {
    // Create auth user with metadata
    // The trigger will automatically create the users table entry
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone || null,
        },
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Check if email confirmation is required
    if (!authData.session) {
      throw new Error('Por favor, confirme seu email para continuar. Verifique sua caixa de entrada.')
    }

    return authData
  },

  async login(data: LoginFormData) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) throw error
    return authData
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },
}
