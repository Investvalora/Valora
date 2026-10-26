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
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: data.fullName,
          phone: data.phone || null,
        },
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')
    // With email confirmation enabled, Supabase can return an obfuscated user
    // instead of an error when a confirmed email is already registered.
    if (authData.user.identities?.length === 0) {
      throw new Error('Email already registered')
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

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/inicio` },
    })

    if (error) throw error
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async requestPasswordRecovery(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
    return data
  },

  async resetPassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password })

    if (error) throw error
    return data
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
