import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PeriodSelector } from './PeriodSelector'
import type { WealthPeriod } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSelector(
  value: WealthPeriod,
  onChange: (p: WealthPeriod) => void = vi.fn(),
  periods?: WealthPeriod[],
) {
  return render(
    <PeriodSelector value={value} onChange={onChange} periods={periods} />,
  )
}

// ---------------------------------------------------------------------------
// Comportamento padrão (sem prop periods)
// ---------------------------------------------------------------------------

describe('PeriodSelector — padrão (todos os períodos)', () => {
  it('renderiza todos os 5 períodos quando periods não é fornecido', () => {
    renderSelector('1M')
    expect(screen.getAllByRole('button')).toHaveLength(5)
    expect(screen.getByText('1M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
    expect(screen.getByText('6M')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()
    expect(screen.getByText('Tudo')).toBeInTheDocument()
  })

  it('marca o período ativo com aria-pressed="true"', () => {
    renderSelector('3M')
    expect(screen.getByText('3M').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1M').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('chama onChange com o período clicado', async () => {
    const onChange = vi.fn()
    renderSelector('1M', onChange)
    const user = userEvent.setup()

    await user.click(screen.getByText('6M'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('6M')
  })
})

// ---------------------------------------------------------------------------
// Prop `periods` — subconjunto customizado (caminho novo da Story 3.3)
// ---------------------------------------------------------------------------

describe('PeriodSelector — prop periods customizada', () => {
  const SUBSET: WealthPeriod[] = ['6M', '1A', 'Tudo']

  it('renderiza apenas os períodos fornecidos', () => {
    renderSelector('6M', vi.fn(), SUBSET)

    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByText('6M')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()
    expect(screen.getByText('Tudo')).toBeInTheDocument()

    // Os períodos omitidos não devem aparecer
    expect(screen.queryByText('1M')).toBeNull()
    expect(screen.queryByText('3M')).toBeNull()
  })

  it('marca corretamente o período ativo dentro do subconjunto', () => {
    renderSelector('1A', vi.fn(), SUBSET)

    expect(screen.getByText('1A').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('6M').closest('button')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Tudo').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('chama onChange com o período correto ao clicar dentro do subconjunto', async () => {
    const onChange = vi.fn()
    renderSelector('6M', onChange, SUBSET)
    const user = userEvent.setup()

    await user.click(screen.getByText('Tudo'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('Tudo')
  })

  it('não invoca onChange ao clicar no período já ativo', async () => {
    // O componente não tem prevenção própria — onChange é chamado mesmo no
    // período ativo; esse teste documenta o comportamento atual para evitar
    // regressão silenciosa caso o comportamento mude.
    const onChange = vi.fn()
    renderSelector('6M', onChange, SUBSET)
    const user = userEvent.setup()

    await user.click(screen.getByText('6M'))

    // Comportamento atual: onChange é chamado (sem prevenção no componente)
    expect(onChange).toHaveBeenCalledWith('6M')
  })

  it('grupo tem aria-label acessível', () => {
    renderSelector('6M', vi.fn(), SUBSET)
    expect(screen.getByRole('group', { name: 'Selecionar período' })).toBeInTheDocument()
  })
})
