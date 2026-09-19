import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useAuthStore } from '../../auth/store'
import { profileService } from '../services/profileService'

export const profileQueryKey = (userId?: string) => ['preferences', 'profile', userId] as const

export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id
  return useQuery({ queryKey: profileQueryKey(userId), queryFn: () => profileService.getProfile(userId!), enabled: Boolean(userId) })
}

export function useAvatarUrl(avatarPath: string | null | undefined) {
  return useQuery({
    queryKey: ['preferences', 'avatar-url', avatarPath],
    queryFn: () => profileService.getAvatarUrl(avatarPath ?? null),
    enabled: Boolean(avatarPath),
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fullName: string) => {
      if (!user) throw new Error('Sessão ausente. Entre novamente para continuar.')
      return profileService.updateName(user.id, fullName)
    },
    onSuccess: ({ user: updatedUser }) => {
      useAuthStore.getState().setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: profileQueryKey(user?.id) })
    },
  })
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error('Sessão ausente. Entre novamente para continuar.')
      return profileService.uploadAvatar(user.id, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(user?.id) })
      queryClient.invalidateQueries({ queryKey: ['preferences', 'avatar-url'] })
    },
  })
}
