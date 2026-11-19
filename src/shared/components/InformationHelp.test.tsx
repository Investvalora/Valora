import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InformationHelp } from './InformationHelp'
import { pageHelpTopics } from '../help/topics'
import { HELP_TOPICS } from '../help/topics'

describe('contextual information', () => {
  it('opens rules and examples without submitting the surrounding form; Escape returns focus', () => {
    const submit = vi.fn()
    render(<form onSubmit={submit}><InformationHelp topic="transactions" /></form>)
    const trigger = screen.getByRole('button', { name: 'Como funciona: Lançamentos, quantidades e moeda' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeInTheDocument()
    expect(screen.getByText(/O mercado fracionário brasileiro/)).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps examples and rules in every topic', () => {
    for (const content of Object.values(HELP_TOPICS)) {
      expect(content.rules.length).toBeGreaterThanOrEqual(3)
      expect(content.example.length).toBeGreaterThan(50)
    }
  })

  it('selects specific help before generic route groups', () => {
    expect(pageHelpTopics('/ativos/importar')).toEqual(['csv', 'transactions'])
    expect(pageHelpTopics('/desempenho/proventos')).toEqual(['income'])
    expect(pageHelpTopics('/analise/score')).toEqual(['score'])
    expect(pageHelpTopics('/analise/ferramentas')).toEqual([])
    expect(pageHelpTopics('/conta')).toEqual([])
  })
})
