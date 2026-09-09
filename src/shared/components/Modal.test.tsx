import { useState } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Modal } from './Modal'

/**
 * jsdom não implementa layout, então `HTMLElement.offsetParent` é sempre `null`
 * — e o filtro de visibilidade do `Modal` (`offsetParent !== null`, que descarta
 * elemento em `display: none`) descartaria *todos* os focáveis, deixando o foco
 * preso no próprio container. Sem este stub não há como asseverar Tab nem foco
 * inicial: o teste passaria a medir a limitação do jsdom, não o componente.
 *
 * O stub devolve o pai do elemento, que é o que um navegador devolve para um
 * filho do overlay `position: fixed`.
 */
const originalOffsetParent = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'offsetParent',
)

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.parentElement
    },
  })
})

afterAll(() => {
  if (originalOffsetParent) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent)
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetParent
  }
})

/**
 * O `Modal` não tinha arquivo de teste algum: portal, foco preso, devolução de
 * foco e as duas vias de fechamento eram todas garantia não asserida.
 *
 * Os eventos de teclado vão sempre para o elemento em foco, e não para o
 * diálogo: é assim que o teclado real funciona, e é o que exercita de fato o
 * `onKeyDown` no container através da propagação.
 */
function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = props.onClose ?? vi.fn()

  const view = render(
    <Modal isOpen title="Adicionar posição" onClose={onClose} {...props}>
      <button type="button">Primeiro</button>
      <button type="button">Segundo</button>
    </Modal>,
  )

  return { ...view, onClose }
}

/**
 * O navegador retira o foco do elemento no instante em que ele é desabilitado —
 * um elemento desabilitado não é focável, e o foco cai para o `body`. O jsdom
 * não implementa isso: verificado que tanto `el.setAttribute('disabled', '')`
 * quanto `el.disabled = true` deixam `document.activeElement` no próprio botão
 * já desabilitado.
 *
 * Sem emular o navegador, o cenário que a recuperação de foco do `Modal` existe
 * para tratar simplesmente não acontece no runner: o foco continua (por
 * acidente) dentro do diálogo e o teste passaria tanto com a recuperação quanto
 * sem ela. Este stub é o que torna a asserção verdadeira.
 *
 * Interceptado em `setAttribute` porque é por ali que o React aplica `disabled`
 * (verificado: um rerender com `disabled` registra `setAttribute:disabled`, e
 * não o setter da propriedade). O `blur()` vem antes de escrever o atributo
 * porque o `blur` do jsdom é no-op em elemento não focável, e um elemento já
 * desabilitado não é focável — na outra ordem o stub não faria nada. O estado
 * final é o do navegador: atributo aplicado e foco no `body`. Fica instalado só
 * durante a chamada.
 */
function withBrowserDisabledBlur<T>(fn: () => T): T {
  const original = Element.prototype.setAttribute

  Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
    if (name === 'disabled' && this === document.activeElement && this instanceof HTMLElement) {
      this.blur()
    }

    original.call(this, name, value)
  }

  try {
    return fn()
  } finally {
    Element.prototype.setAttribute = original
  }
}

describe('Modal — fechamento', () => {
  it('Escape fecha', () => {
    const { onClose } = renderModal()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Primeiro' }), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clique no overlay fecha', () => {
    const { onClose } = renderModal()

    // O overlay é o pai do diálogo; `mousedown` nele, e não no diálogo.
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement
    fireEvent.mouseDown(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('mousedown dentro do diálogo não fecha', () => {
    const { onClose } = renderModal()

    fireEvent.mouseDown(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('o botão de fechar fecha', () => {
    const { onClose } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Modal — foco', () => {
  it('foca o primeiro elemento focável ao abrir', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
  })

  it('Tab no último elemento volta ao primeiro, e Shift+Tab no primeiro vai ao último', () => {
    renderModal()

    const first = screen.getByRole('button', { name: 'Fechar' })
    const last = screen.getByRole('button', { name: 'Segundo' })

    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('devolve o foco ao elemento que abriu o modal', () => {
    function Host() {
      const [isOpen, setIsOpen] = useState(false)

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Abrir
          </button>
          <Modal isOpen={isOpen} title="Adicionar posição" onClose={() => setIsOpen(false)}>
            <button type="button">Primeiro</button>
          </Modal>
        </>
      )
    }

    render(<Host />)

    const opener = screen.getByRole('button', { name: 'Abrir' })
    opener.focus()
    fireEvent.click(opener)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(opener).not.toHaveFocus()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Fechar' }), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opener).toHaveFocus()
  })

  /**
   * Desabilitar o controle em foco joga o foco para o `body`, e dali o Tab
   * volta a percorrer a página de fundo — o foco escapa do diálogo sem que
   * ninguém tenha pedido. É o que acontece quando o submit desabilita o botão
   * de fechar sob o cursor de teclado do usuário.
   *
   * O teste depende do stub abaixo: sem ele o cenário não existe no jsdom e a
   * asserção mede a limitação do runner, não o componente.
   */
  it('recupera o foco para dentro do diálogo quando o botão em foco é desabilitado', () => {
    const onClose = vi.fn()

    const { rerender } = render(
      <Modal isOpen title="Adicionar posição" onClose={onClose} dismissible>
        <button type="button">Primeiro</button>
      </Modal>,
    )

    const close = screen.getByRole('button', { name: 'Fechar' })
    close.focus()
    expect(close).toHaveFocus()

    // Submit em voo: a página trava o fechamento e o botão de fechar, que está
    // sob o foco do usuário, é desabilitado.
    withBrowserDisabledBlur(() => {
      rerender(
        <Modal isOpen title="Adicionar posição" onClose={onClose} dismissible={false}>
          <button type="button">Primeiro</button>
        </Modal>,
      )
    })

    const dialog = screen.getByRole('dialog')
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
    // O foco não ficou no `body`, e voltou para dentro do diálogo.
    expect(document.activeElement).not.toBe(document.body)
    expect(dialog.contains(document.activeElement)).toBe(true)

    // Foco recuperado é o que mantém o teclado vivo: Shift+Tab continua preso
    // no diálogo, agora sobre o único focável restante (o botão de fechar saiu
    // da ordem de tabulação ao ser desabilitado).
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus()

    // Escrita terminou (com erro, digamos): o modal volta a ser fechável e o
    // Escape do usuário ainda chega ao diálogo, porque o foco está dentro dele.
    rerender(
      <Modal isOpen title="Adicionar posição" onClose={onClose} dismissible>
        <button type="button">Primeiro</button>
      </Modal>,
    )

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Modal — dismissible=false', () => {
  it('bloqueia Escape, overlay e o botão de fechar', () => {
    const onClose = vi.fn()
    renderModal({ dismissible: false, onClose })

    const dialog = screen.getByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.mouseDown(dialog.parentElement as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Modal — estrutura', () => {
  it('não renderiza nada quando fechado', () => {
    render(
      <Modal isOpen={false} title="Adicionar posição" onClose={vi.fn()}>
        <button type="button">Primeiro</button>
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('é um dialog modal rotulado pelo título, montado em portal no body', () => {
    const { container } = renderModal()
    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Adicionar posição')
    // Portal: o diálogo não está na árvore DOM do ponto de render.
    expect(container).not.toContainElement(dialog)
    expect(document.body).toContainElement(dialog)
  })
})
