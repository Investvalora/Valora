import { supabase } from '../../../shared/services/supabaseClient'
import { LoginFormData, SignupFormData, UserProfile } from '../types'
import { authRedirect } from './authRedirect'
import { passwordSchema } from '../schemas/passwordSchema'
import { phoneSchema, profileSchema } from '../schemas/profileSchema'
import { z } from 'zod'

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
          phone: phoneSchema.parse(data.phone ?? '') || null,
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

  async resendConfirmation(email: string) {
    const address = z.string().trim().email('Informe um email válido').parse(email)
    const { error } = await supabase.auth.resend({ type: 'signup', email: address, options: { emailRedirectTo: authRedirect('/login') } })
    if (error) throw error
  },

  async updateProfile(input: { fullName: string; phone: string }) {
    const values = profileSchema.parse(input)
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: values.fullName, phone: values.phone || null } })
    if (error) throw error
    return data.user
  },

  async requestEmailChange(email: string) {
    const address = z.string().trim().email('Informe um email válido').parse(email)
    const { data, error } = await supabase.auth.updateUser({ email: address }, { emailRedirectTo: authRedirect('/login') })
    if (error) throw error
    return data.user
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

  async requestPasswordChangeCode() {
    const { error } = await supabase.auth.reauthenticate()
    if (error) throw error
  },

  async changePassword(password: string, nonce?: string) {
    passwordSchema.parse(password)
    const { error } = await supabase.auth.updateUser({ password, ...(nonce ? { nonce } : {}) })
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
