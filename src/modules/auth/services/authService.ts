import { supabase } from '../../../shared/services/supabaseClient'
import { LoginFormData, SignupFormData, UserProfile } from '../types'
import { authRedirect } from './authRedirect'
import { passwordSchema } from '../schemas/passwordSchema'

export const authService = {
  async signup(data: SignupFormData) {
    const fullName = data.fullName.trim()
    if (fullName.length < 3) throw new Error('Nome completo deve ter no mínimo 3 caracteres')
    passwordSchema.parse(data.password)
    // Create auth user with metadata
    // The trigger will automatically create the users table entry
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: authRedirect('/login'),
        data: {
          full_name: fullName,
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
      options: { redirectTo: authRedirect('/login') },
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
      redirectTo: authRedirect('/reset-password'),
    })

    if (error) throw error
    return data
  },

  async resetPassword(password: string) {
    passwordSchema.parse(password)
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
