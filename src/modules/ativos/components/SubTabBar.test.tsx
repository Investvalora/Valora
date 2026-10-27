import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SubTabBar } from './SubTabBar'

const tabs = [
  { label: 'Posições', to: '/ativos/posicoes' },
  { label: 'Composição', to: '/ativos/composicao' },
  { label: 'Lançamentos', to: '/ativos/lancamentos' },
]

describe('Navegação de Ativos no mobile', () => {
  it('distribui as três guias e acompanha a rota selecionada', () => {
    render(
      <MemoryRouter initialEntries={['/ativos/posicoes']}>
        <SubTabBar tabs={tabs} mobileVariant="segmented" />
        <Routes>
          <Route path="/ativos/posicoes" element={<p>Lista de posições</p>} />
          <Route path="/ativos/composicao" element={<p>Gráfico de composição</p>} />
          <Route path="/ativos/lancamentos" element={<p>Lista de lançamentos</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tablist')).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
    expect(screen.getByRole('tab', { name: 'Posições' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('subtab-selection-indicator')).toHaveStyle({ transform: 'translateX(0%)' })

    fireEvent.click(screen.getByRole('tab', { name: 'Composição' }))
    expect(screen.getByRole('tab', { name: 'Composição' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('subtab-selection-indicator')).toHaveStyle({ transform: 'translateX(100%)' })
    expect(screen.getByText('Gráfico de composição')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Lançamentos' }))
    expect(screen.getByRole('tab', { name: 'Lançamentos' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('subtab-selection-indicator')).toHaveStyle({ transform: 'translateX(200%)' })
    expect(screen.getByText('Lista de lançamentos')).toBeInTheDocument()
  })

  it('acomoda quatro abas com o indicador alinhado à quarta', () => {
    const analysisTabs = [
      { label: 'Visão geral', to: '/analise/visao-geral' },
      { label: 'Score', to: '/analise/score' },
      { label: 'Estratégias', to: '/analise/estrategias' },
      { label: 'Alertas', to: '/analise/alertas' },
    ]
    render(<MemoryRouter initialEntries={['/analise/alertas']}><SubTabBar tabs={analysisTabs} mobileVariant="segmented" /></MemoryRouter>)
    expect(screen.getByRole('tablist')).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' })
    expect(screen.getByTestId('subtab-selection-indicator')).toHaveStyle({ width: '25%', transform: 'translateX(300%)' })
    fireEvent.click(screen.getByRole('tab', { name: 'Estratégias' }))
    expect(screen.getByRole('tab', { name: 'Estratégias' })).toHaveAttribute('aria-selected', 'true')
  })
})
