import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../../shared/services/supabaseClient'
import { authService } from './authService'

vi.mock('../../../shared/services/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}))

const signupData = {
  email: 'teste@exemplo.com',
  password: 'Vento!Nuvem82',
  fullName: 'Teste Valora',
}

function signupResponse(identities: object[]) {
  return {
    data: { user: { identities }, session: null },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.signUp>>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authService.signup', () => {
  it('reconhece a resposta ofuscada de email confirmado já cadastrado', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue(signupResponse([]))

    await expect(authService.signup(signupData)).rejects.toThrow('Email already registered')
  })

  it('mantém o cadastro pendente de confirmação e redireciona para a origem atual', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue(signupResponse([{}]))

    const result = await authService.signup(signupData)

    expect(result.session).toBeNull()
    expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: `${window.location.origin}/login`,
      }),
    }))
  })
})

it('pede o reset para a página da origem atual', async () => {
  vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null })

  await authService.requestPasswordRecovery(signupData.email)

  expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(signupData.email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
})

it('inicia o login Google com retorno para a aplicação', async () => {
  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: { provider: 'google', url: 'https://accounts.google.com' }, error: null })
  await authService.loginWithGoogle()
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/login` } })
})

it('propaga falha ao iniciar OAuth', async () => {
  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: { provider: 'google', url: null }, error: new Error('provider disabled') } as Awaited<ReturnType<typeof supabase.auth.signInWithOAuth>>)
  await expect(authService.loginWithGoogle()).rejects.toThrow('provider disabled')
})
