import { supabase } from '../../../shared/services/supabaseClient'
import type { UserProfile } from '../../auth/types'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function validateAvatar(file: File) {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > MAX_AVATAR_SIZE) throw new Error('A imagem deve ter no máximo 2 MB.')
}

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
    if (error) throw error
    return data as UserProfile
  },

  async updateName(userId: string, fullName: string) {
    const { data: profile, error: profileError } = await supabase
      .from('users').update({ full_name: fullName }).eq('id', userId).select('*').single()
    if (profileError) throw profileError

    const { data: authData, error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (authError) throw authError
    return { profile: profile as UserProfile, user: authData.user }
  },

  async uploadAvatar(userId: string, file: File) {
    validateAvatar(file)
    const avatarPath = `${userId}/avatar`
    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, file, {
      cacheControl: '3600', contentType: file.type, upsert: true,
    })
    if (uploadError) throw uploadError

    const { data: profile, error: profileError } = await supabase
      .from('users').update({ avatar_path: avatarPath }).eq('id', userId).select('*').single()
    if (profileError) throw profileError
    return profile as UserProfile
  },

  async getAvatarUrl(avatarPath: string | null) {
    if (!avatarPath) return null
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath, 60 * 60)
    if (error) throw error
    return data.signedUrl
  },
}
