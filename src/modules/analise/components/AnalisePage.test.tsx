import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AnalisePage } from './AnalisePage'

describe('Análise', () => {
  it('trata Score e Alertas como guias da mesma tela no mobile', () => {
    render(
      <MemoryRouter initialEntries={['/analise/score']}>
        <Routes>
          <Route path="/analise" element={<AnalisePage />}>
            <Route path="visao-geral" element={<p>Visão geral</p>} />
            <Route path="score" element={<p>Regras de score</p>} />
            <Route path="alertas" element={<p>Alertas da análise</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('heading', { name: 'Análise' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Análise' })).toHaveClass('font-sans')
    expect(screen.queryByRole('button', { name: 'Análise' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: 'Alertas' }))
    expect(screen.getByText('Alertas da análise')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alertas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: 'Análise' })).not.toBeInTheDocument()
  })

  it('mantém a guia Score selecionada enquanto o editor de regra está aberto', () => {
    render(
      <MemoryRouter initialEntries={['/analise/score/nova']}>
        <Routes>
          <Route path="/analise" element={<AnalisePage />}>
            <Route path="score/nova" element={<p>Editor de regra</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Editor de regra')).toBeInTheDocument()
  })
})
