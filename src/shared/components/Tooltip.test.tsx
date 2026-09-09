import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from './Tooltip'

function renderTooltip() {
  return render(
    <Tooltip label="Procedência da cotação de PETR4">
      <span>Fonte: b3_cotahist</span>
    </Tooltip>,
  )
}

describe('Tooltip — abertura por clique', () => {
  it('não mostra nada antes do clique', () => {
    renderTooltip()

    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('abre no clique e descreve o botão com o painel', async () => {
    renderTooltip()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Fonte: b3_cotahist')
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', tooltip.id)
  })

  /**
   * `aria-describedby` apontando para um id inexistente é ignorado por parte dos
   * leitores de tela e engana qualquer inspeção do DOM.
   */
  it('não deixa aria-describedby apontando para nada quando fechado', () => {
    renderTooltip()

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby')
  })

  it('o mesmo botão fecha no segundo clique', async () => {
    renderTooltip()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button'))

    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  /** Teclado: o botão é alcançável por Tab e ativado por Enter/Espaço. */
  it('abre pelo teclado, sem depender de hover', async () => {
    renderTooltip()
    const user = userEvent.setup()

    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})

describe('Tooltip — fechamento', () => {
  it('Escape fecha e devolve o foco ao botão', async () => {
    renderTooltip()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('button')).toHaveFocus()
  })

  /**
   * O painel vive num portal no `body`. Se o Escape fosse tratado por um
   * listener do DOM na árvore do botão, a tecla pressionada com o foco no painel
   * não chegaria — eventos de portal borbulham pela árvore React, não pela do DOM.
   */
  it('Escape com o foco dentro do painel também fecha', async () => {
    render(
      <Tooltip label="Procedência">
        <button type="button">link interno</button>
      </Tooltip>,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Procedência' }))
    const inner = screen.getByRole('button', { name: 'link interno' })
    inner.focus()

    fireEvent.keyDown(inner, { key: 'Escape' })

    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('clique fora fecha', async () => {
    render(
      <div>
        <Tooltip label="Procedência">conteúdo</Tooltip>
        <p data-testid="fora">outro conteúdo</p>
      </div>,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Procedência' }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('fora'))

    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('clique dentro do painel não fecha', async () => {
    renderTooltip()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))
    fireEvent.mouseDown(screen.getByRole('tooltip'))

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})

describe('Tooltip — vários na mesma tela', () => {
  /**
   * Numa tabela existe um botão por linha. Ids repetidos fariam
   * `aria-describedby` de todas as linhas apontar para o mesmo painel.
   */
  it('cada instância tem seu próprio id de painel', async () => {
    render(
      <>
        <Tooltip label="Cotação de PETR4">fonte A</Tooltip>
        <Tooltip label="Cotação de VALE3">fonte B</Tooltip>
      </>,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Cotação de PETR4' }))
    const first = screen.getByRole('tooltip').id

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Cotação de VALE3' }))
    const second = screen.getByRole('tooltip').id

    expect(first).not.toBe(second)
    expect(screen.getByRole('tooltip')).toHaveTextContent('fonte B')
  })
})
