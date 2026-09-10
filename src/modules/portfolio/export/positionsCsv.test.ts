import { describe, expect, it, vi } from 'vitest'
import type { PositionRow } from '../types'
import { downloadPositionsCsv, MAX_EXPORT_ROWS, serializePositionsCsv } from './positionsCsv'

function row(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
    id: 'position-1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    currency: 'BRL',
    type: 'stock_br',
    quantity: 100,
    averagePrice: 32.1,
    acquisitionDate: '2026-01-05',
    quote: null,
    quotePrice: Number.NaN,
    marketValueBRL: null,
    weightPercent: null,
    changePercent: null,
    isStaleQuote: false,
    usesUSDRate: false,
    ...overrides,
  }
}

describe('serializePositionsCsv', () => {
  it('emite BOM, cabeçalho na ordem da tabela e valores pt-BR', () => {
    const csv = serializePositionsCsv([
      row({
        quotePrice: 34.5,
        marketValueBRL: 3450,
        weightPercent: 100,
        changePercent: 7.4766355,
      }),
    ])

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Ticker;Nome;Quantidade;Preço médio;Cotação;Valor de mercado;Peso;Variação;Data de aquisição',
      'PETR4;Petrobras PN;100;R$ 32,10;R$ 34,50;R$ 3.450,00;100,00%;+7,48%;05/01/2026',
    ])
  })

  it('escapa ponto e vírgula, aspas e quebras de linha', () => {
    const csv = serializePositionsCsv([
      row({
        ticker: 'A;"B"',
        name: 'Nome\ncom "aspas"',
      }),
    ])

    expect(csv.slice(1)).toContain('"A;""B""";"Nome\ncom ""aspas""";')
  })

  it('representa todas as lacunas como travessão', () => {
    const csv = serializePositionsCsv([row()])

    expect(csv.slice(1)).toContain('PETR4;Petrobras PN;100;R$ 32,10;—;—;—;—;05/01/2026')
    expect(csv).not.toContain('NaN')
  })

  it('limita a exportação a 1000 linhas', () => {
    const csv = serializePositionsCsv(
      Array.from({ length: MAX_EXPORT_ROWS + 1 }, (_, index) =>
        row({ id: `position-${index}`, ticker: `T${index}` }),
      ),
    )

    expect(csv.slice(1).split('\r\n')).toHaveLength(MAX_EXPORT_ROWS + 1)
    expect(csv).not.toContain(`T${MAX_EXPORT_ROWS}`)
  })

  it('serializa 1000 linhas em menos de 2 segundos', () => {
    const rows = Array.from({ length: MAX_EXPORT_ROWS }, (_, index) =>
      row({ id: `position-${index}`, ticker: `T${index}` }),
    )
    const startedAt = performance.now()

    serializePositionsCsv(rows)

    expect(performance.now() - startedAt).toBeLessThan(2000)
  })

  it('inicia o download com Blob, nome de arquivo e revogacao da URL', () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.fn()
    const anchor = document.createElement('a')
    anchor.click = click
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    downloadPositionsCsv([row()], 'minha-carteira.csv')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createElement).toHaveBeenCalledWith('a')
    expect(anchor.download).toBe('minha-carteira.csv')
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')

    createElement.mockRestore()
    vi.unstubAllGlobals()
  })

  it('nao inicia download sem linhas', () => {
    const createObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL })

    downloadPositionsCsv([])

    expect(createObjectURL).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
