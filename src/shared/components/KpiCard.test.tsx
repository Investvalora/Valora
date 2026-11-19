import { fireEvent, render, screen, within } from '@testing-library/react'
import { Wallet } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { KpiCard } from './KpiCard'

describe('KpiCard contextual help', () => {
  it('keeps the information button beside the metric it explains', () => {
    render(<KpiCard label="Patrimônio total" value="R$ 230,00" icon={Wallet} helpTopic="balance" />)
    const metricLabel = screen.getByText('Patrimônio total')
    const trigger = within(metricLabel.parentElement!).getByRole('button', { name: 'Como funciona: Patrimônio e valor investido' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Patrimônio e valor investido' })).toBeInTheDocument()
    expect(screen.getByText(/a posição vale R\$ 230/)).toBeInTheDocument()
  })

  it('does not add unrelated help to a card without a topic', () => {
    render(<KpiCard label="Ativos" value="3" icon={Wallet} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
