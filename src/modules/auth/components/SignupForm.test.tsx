import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { SignupForm } from './SignupForm'
const signup = vi.hoisted(() => vi.fn())
vi.mock('../services/authService', () => ({ authService: { signup } }))

it('revela senha e confirmação independentemente, preserva valores e não envia cadastro', async () => {
  const user = userEvent.setup()
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><SignupForm /></MemoryRouter></QueryClientProvider>)
  const password = screen.getByLabelText('Senha', { exact: true })
  const confirmation = screen.getByLabelText('Confirmar senha', { exact: true })
  await user.type(password, 'Exemplo!123')
  await user.type(confirmation, 'Exemplo!123')
  await user.click(screen.getByRole('button', { name: /^Mostrar senha$/ }))
  expect(password).toHaveAttribute('type', 'text')
  expect(confirmation).toHaveAttribute('type', 'password')
  await user.click(screen.getByRole('button', { name: 'Mostrar confirmação de senha' }))
  expect(confirmation).toHaveAttribute('type', 'text')
  await user.click(screen.getByRole('button', { name: /^Ocultar senha$/ }))
  await user.click(screen.getByRole('button', { name: 'Ocultar confirmação de senha' }))
  expect(password).toHaveAttribute('type', 'password')
  expect(confirmation).toHaveAttribute('type', 'password')
  expect(password).toHaveValue('Exemplo!123')
  expect(confirmation).toHaveValue('Exemplo!123')
  expect(signup).not.toHaveBeenCalled()
})
