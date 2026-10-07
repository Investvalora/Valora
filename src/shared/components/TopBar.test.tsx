import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

vi.mock('../../modules/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'kaue@example.com', user_metadata: { full_name: 'Kauê Cardoso' } } }),
}))

vi.mock('./WalletMorphSelector', () => ({
  WalletMorphSelector: () => <span>Minha Carteira</span>,
}))

describe('TopBar', () => {
  it('abre a tela de alertas ao clicar no sino com contador', () => {
    render(
      <MemoryRouter initialEntries={['/inicio']}>
        <Routes>
          <Route path="/inicio" element={<TopBar alertCount={2} />} />
          <Route path="/alertas" element={<h1>Alertas</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Abrir alertas (2 novos)' }))
    expect(screen.getByRole('heading', { name: 'Alertas' })).toBeInTheDocument()
  })
})
