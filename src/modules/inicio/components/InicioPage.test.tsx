import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardData } from '../../dashboard/hooks/useDashboard'
import { InicioPage } from './InicioPage'

let walletId = 'wallet-a'
const dashboardByWallet: Record<string, DashboardData> = {
  'wallet-a': {
    totalPatrimonioBRL: 4872,
    valorInvestidoBRL: 2529,
    ganhoCapitalBRL: 2343,
    lucroTotalBRL: 2730.43,
    proventos12mBRL: 387.43,
    variacaoPct: 4,
    rentabilidadeTotalPct: 92.65,
    monthlySeries: [{ month: '2026-09', totalBRL: 4872, investedBRL: 2529 }],
    compositionSlices: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  'wallet-b': {
    totalPatrimonioBRL: 1000,
    valorInvestidoBRL: 800,
    ganhoCapitalBRL: 200,
    lucroTotalBRL: 200,
    proventos12mBRL: null,
    variacaoPct: null,
    rentabilidadeTotalPct: 25,
    monthlySeries: [],
    compositionSlices: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'kaue@example.com', user_metadata: { full_name: 'Kauê Cardoso' } } }),
}))
vi.mock('../../portfolio/hooks/useWallets', () => ({
  useWallets: () => ({ selectedWallet: { id: walletId, name: walletId === 'wallet-a' ? 'Minha Carteira' : 'Reserva' } }),
}))
vi.mock('../../dashboard/hooks/useDashboard', () => ({
  useDashboard: (id: string) => dashboardByWallet[id],
}))
vi.mock('./AlertasRecentes', () => ({ AlertasRecentes: () => <div>Alertas recentes</div> }))

describe('Início', () => {
  it('usa os valores da carteira selecionada em vez dos exemplos antigos', () => {
    walletId = 'wallet-a'
    const { rerender } = render(<MemoryRouter><InicioPage /></MemoryRouter>)

    expect(screen.getAllByText('R$ 4.872,00')).toHaveLength(2)
    expect(screen.getByText('R$ 2.730,43')).toBeInTheDocument()
    expect(screen.queryByText('R$ 13.666,39')).not.toBeInTheDocument()
    expect(screen.getByText(/Minha Carteira/)).toBeInTheDocument()

    walletId = 'wallet-b'
    rerender(<MemoryRouter><InicioPage /></MemoryRouter>)

    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument()
    expect(screen.getByText(/Reserva/)).toBeInTheDocument()
    expect(screen.queryByText('R$ 4.872,00')).not.toBeInTheDocument()
  })
})
