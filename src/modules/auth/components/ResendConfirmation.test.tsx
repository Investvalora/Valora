import { fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ResendConfirmation } from './ResendConfirmation'
import { authService } from '../services/authService'
vi.mock('../services/authService', () => ({ authService: { resendConfirmation: vi.fn() } }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

it('reenvia apenas ao clicar e impede repetição imediata', async () => {
  vi.mocked(authService.resendConfirmation).mockResolvedValue(undefined)
  render(<ResendConfirmation email="teste@valora.test" />)
  expect(authService.resendConfirmation).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar email de confirmação' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Se houver um cadastro pendente')
  expect(authService.resendConfirmation).toHaveBeenCalledWith('teste@valora.test')
  expect(screen.getByRole('button', { name: 'Reenviar em 60s' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button'))
  expect(authService.resendConfirmation).toHaveBeenCalledOnce()
})
it('mostra falha e libera nova tentativa após o intervalo', async () => {
  vi.useFakeTimers()
  vi.mocked(authService.resendConfirmation).mockRejectedValue(new Error('rate limit'))
  render(<ResendConfirmation email="teste@valora.test" />)
  await act(async () => { fireEvent.click(screen.getByRole('button')) })
  expect(screen.getByRole('alert')).toHaveTextContent('Aguarde')
  expect(screen.getByRole('button')).toBeDisabled()
  for (let i = 0; i < 60; i++) await act(async () => { vi.advanceTimersByTime(1000) })
  expect(screen.getByRole('button', { name: 'Reenviar email de confirmação' })).toBeEnabled()
})
