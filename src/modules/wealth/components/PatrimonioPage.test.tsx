import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PatrimonioPage } from './PatrimonioPage'
import { useAtivosValuation } from '../../ativos/hooks/useAtivosValuation'

vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'wallet' } }) }))
vi.mock('../hooks/useWealthHistory', () => ({ useWealthHistory: () => ({ series: [], hasHistory: false, hasPositions: false, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../../ativos/hooks/useAtivosValuation', () => ({ useAtivosValuation: vi.fn() }))

it('preserva a rota e mostra composição atual incluindo renda fixa, sem depender do histórico', () => {
  vi.mocked(useAtivosValuation).mockReturnValue({
    assetCount: 1, complete: true, isLoading: false, isError: false, totalBRL: 3007.51,
    compositionRows: [{ ticker: 'RDB', type: 'fixed_income', marketValueBRL: 3007.51 }],
  } as ReturnType<typeof useAtivosValuation>)
  render(<PatrimonioPage />)
  expect(useAtivosValuation).toHaveBeenCalledWith('wallet', true)
  expect(screen.getByRole('heading', { name: /^Patrimônio$/ })).toBeInTheDocument()
  expect(screen.getByText('Renda Fixa')).toBeInTheDocument()
  expect(screen.getAllByText(/3\.007,51/).length).toBeGreaterThan(0)
  expect(screen.queryByText('Nenhuma posição cadastrada')).not.toBeInTheDocument()
})
