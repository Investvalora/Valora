import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { InformationHelp } from './InformationHelp'
import { HELP_TOPICS } from '../help/topics'

afterEach(() => vi.unstubAllGlobals())

function mobileViewport() {
  vi.stubGlobal('innerWidth', 393)
  vi.stubGlobal('matchMedia', (query: string) => Object.assign(new EventTarget(), { matches: query === '(max-width: 767px)', media: query }))
  // jsdom não oferece PointerEvent; preservamos coordenadas e a identidade do ponteiro.
  class TestPointerEvent extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.isPrimary = init.isPrimary ?? true
    }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent)
}

describe('contextual information', () => {
  it('opens rules and examples without submitting the surrounding form; Escape returns focus', () => {
    const submit = vi.fn()
    render(<form onSubmit={submit}><InformationHelp topic="transactions" /></form>)
    const trigger = screen.getByRole('button', { name: 'Como funciona: Lançamentos, quantidades e moeda' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Fechar' })).not.toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeInTheDocument()
    expect(screen.getByText(/O mercado fracionário brasileiro/)).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByText(/O mercado fracionário brasileiro/))
    expect(screen.getByRole('button', { name: 'Fechar' })).not.toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('fecha pelo X e devolve o foco ao botão de informação', () => {
    render(<InformationHelp topic="balance" />)
    const trigger = screen.getByRole('button', { name: 'Como funciona: Patrimônio e valor investido' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Patrimônio e valor investido' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps examples and rules in every topic', () => {
    for (const content of Object.values(HELP_TOPICS)) {
      expect(content.rules.length).toBeGreaterThanOrEqual(3)
      expect(content.example.length).toBeGreaterThan(50)
    }
  })

  it('mantém o conteúdo contínuo ao expandir e recolher pela alça, sem botão intermediário', async () => {
    mobileViewport()
    const user = userEvent.setup()
    render(<InformationHelp topic="balance" />)
    const trigger = screen.getByRole('button', { name: 'Como funciona: Patrimônio e valor investido' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toHaveFocus()
    const example = screen.getByRole('heading', { name: 'Exemplo' })
    expect(screen.queryByRole('button', { name: 'Ver informações completas' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expandir informações' }))
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBe(example)
    expect(screen.getByRole('button', { name: 'Recolher informações' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Recolher informações' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'Expandir informações' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBe(example)
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'Expandir informações' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeInTheDocument()
  })

  it('acompanha o arrasto da alça, expande para cima e recolhe para baixo sem fechar', () => {
    mobileViewport()
    render(<InformationHelp topic="balance" />)
    fireEvent.click(screen.getByRole('button', { name: 'Como funciona: Patrimônio e valor investido' }))
    let handle = screen.getByRole('button', { name: 'Expandir informações' })
    const overlay = screen.getByRole('dialog').parentElement!
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 600 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 500 })
    expect(Number(overlay.style.getPropertyValue('--information-sheet-progress'))).toBeGreaterThan(0)
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 500 })
    // O clique sintético gerado após um arrasto não deve desfazer a expansão.
    fireEvent.click(handle, { detail: 1 })
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeVisible()
    handle = screen.getByRole('button', { name: 'Recolher informações' })
    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientY: 200 })
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 300 })
    fireEvent.pointerUp(handle, { pointerId: 2, clientY: 300 })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expandir informações' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeInTheDocument()
  })

  it('cancela o arrasto sem expandir e permite tocar na alça para expandir', async () => {
    mobileViewport()
    const user = userEvent.setup()
    render(<InformationHelp topic="balance" />)
    await user.click(screen.getByRole('button', { name: 'Como funciona: Patrimônio e valor investido' }))
    const handle = screen.getByRole('button', { name: 'Expandir informações' })
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 600 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 })
    fireEvent.pointerCancel(handle, { pointerId: 1 })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeInTheDocument()
    await user.click(handle)
    expect(screen.getByRole('heading', { name: 'Exemplo' })).toBeVisible()
  })

})
