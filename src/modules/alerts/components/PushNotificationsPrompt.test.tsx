import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PushNotificationsPrompt } from './PushNotificationsPrompt'

const state = vi.hoisted(() => ({ enabled: false, ready: true, supported: true, configured: true, busy: false, error: '', toggle: vi.fn() }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }))
vi.mock('../hooks/usePushNotifications', async (original) => ({
  ...await original<typeof import('../hooks/usePushNotifications')>(),
  usePushNotifications: () => state,
}))

beforeEach(() => {
  localStorage.clear()
  Object.assign(state, { enabled: false, ready: true, supported: true, configured: true, busy: false, error: '' })
  state.toggle.mockClear()
  vi.stubGlobal('Notification', { permission: 'default' })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Convite push no app', () => {
  it('solicita ativação somente após o clique', () => {
    render(<PushNotificationsPrompt />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(state.toggle).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ativar notificações' }))
    expect(state.toggle).toHaveBeenCalledOnce()
  })

  it('adia por sete dias e respeita a escolha ao reabrir', () => {
    const view = render(<PushNotificationsPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.unmount()
    render(<PushNotificationsPrompt />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    cleanup()
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * 86400000)
    render(<PushNotificationsPrompt />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it.each(['enabled', 'not-ready', 'unsupported', 'unconfigured', 'denied'])('não convida quando %s', (condition) => {
    if (condition === 'enabled') state.enabled = true
    if (condition === 'not-ready') state.ready = false
    if (condition === 'unsupported') state.supported = false
    if (condition === 'unconfigured') state.configured = false
    if (condition === 'denied') vi.stubGlobal('Notification', { permission: 'denied' })
    render(<PushNotificationsPrompt />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
