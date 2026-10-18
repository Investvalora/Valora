import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DesempenhoPage } from './DesempenhoPage'

describe('Desempenho', () => {
  it('navega pelas guias sem criar uma etapa de retorno', () => {
    render(
      <MemoryRouter initialEntries={['/desempenho/rentabilidade']}>
        <Routes>
          <Route path="/desempenho" element={<DesempenhoPage />}>
            <Route path="visao-geral" element={<p>Visão geral</p>} />
            <Route path="rentabilidade" element={<p>Dados de rentabilidade</p>} />
            <Route path="proventos" element={<p>Dados de proventos</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('heading', { name: 'Desempenho' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Desempenho' })).toHaveClass('font-sans')
    expect(screen.queryByRole('button', { name: 'Desempenho' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Rentabilidade' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: 'Proventos' }))
    expect(screen.getByText('Dados de proventos')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Proventos' })).toHaveAttribute('aria-selected', 'true')
  })
})
