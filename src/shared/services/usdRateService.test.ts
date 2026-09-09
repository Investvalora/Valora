import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { USD_RATE_DEFAULT, USD_RATE_STORAGE_KEY, usdRateService } from './usdRateService'

/**
 * Domingo, 06/09/2026. Serve de referência fixa porque é exatamente o caso em
 * que o PTAX não publica: a série do dia é vazia e a taxa correta é a da
 * sexta-feira anterior.
 */
const SUNDAY = new Date(2026, 8, 6)

const PTAX_SERIES = {
  value: [
    { cotacaoVenda: 5.1301, dataHoraCotacao: '2026-09-03 13:09:02.951' },
    { cotacaoVenda: 5.1253, dataHoraCotacao: '2026-09-04 13:08:47.123' },
  ],
}

const AWESOME_PAYLOAD = {
  USDBRL: { bid: '5.4321', create_date: '2026-09-06 17:00:00' },
}

type FetchHandler = (url: string) => { status?: number; body?: unknown; reject?: boolean }

function jsonResponse(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

/** `fetch` substituído por um roteador por URL: PTAX e AwesomeAPI separados. */
function stubFetch(handler: FetchHandler) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input)
    const result = handler(url)
    if (result.reject) throw new TypeError('Failed to fetch')

    return jsonResponse(result.body, result.status ?? 200)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function isPtax(url: string): boolean {
  return url.includes('olinda.bcb.gov.br')
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('usdRateService — BCB PTAX como primária', () => {
  it('usa a cotação mais recente da série e marca a fonte oficial', async () => {
    stubFetch((url) => (isPtax(url) ? { body: PTAX_SERIES } : { body: AWESOME_PAYLOAD }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate).toEqual({ rate: 5.1253, source: 'bcb', isFallback: false, date: '2026-09-04' })
  })

  it('não consulta a AwesomeAPI quando o PTAX responde', async () => {
    const fetchMock = stubFetch(() => ({ body: PTAX_SERIES }))

    await usdRateService.getUSDRate(SUNDAY)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('olinda.bcb.gov.br')
  })

  /**
   * O PTAX publica só em dia útil. Pedir apenas "hoje" devolveria série vazia em
   * todo sábado, domingo e feriado e derrubaria a fonte oficial sem necessidade
   * — a janela é o que faz fim de semana não ser erro.
   */
  it('pede uma janela de dias anteriores, em MM-DD-YYYY', async () => {
    const fetchMock = stubFetch(() => ({ body: PTAX_SERIES }))

    await usdRateService.getUSDRate(SUNDAY)

    const url = decodeURIComponent(String(fetchMock.mock.calls[0][0]))
    expect(url).toContain("@dataInicial='08-27-2026'")
    expect(url).toContain("@dataFinalCotacao='09-06-2026'")
  })

  it('escolhe pela data da cotação, não pela ordem em que a série veio', async () => {
    stubFetch(() => ({
      body: {
        value: [
          { cotacaoVenda: 5.1253, dataHoraCotacao: '2026-09-04 13:08:47.123' },
          { cotacaoVenda: 5.1301, dataHoraCotacao: '2026-09-03 13:09:02.951' },
        ],
      },
    }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate.rate).toBe(5.1253)
  })

  it('ignora entrada com taxa inválida', async () => {
    stubFetch((url) =>
      isPtax(url)
        ? {
            body: {
              value: [
                { cotacaoVenda: 5.1253, dataHoraCotacao: '2026-09-03 13:09:02.951' },
                { cotacaoVenda: 0, dataHoraCotacao: '2026-09-04 13:08:47.123' },
              ],
            },
          }
        : { body: AWESOME_PAYLOAD },
    )

    const rate = await usdRateService.getUSDRate(SUNDAY)

    // Zero não é taxa: a entrada é descartada e vale a cotação anterior válida.
    expect(rate).toMatchObject({ rate: 5.1253, source: 'bcb' })
  })
})

describe('usdRateService — AwesomeAPI como secundária', () => {
  /** A AwesomeAPI devolveu `HTTP 429 QuotaExceeded` em 2026-09-08. */
  it('assume quando o PTAX falha', async () => {
    stubFetch((url) => (isPtax(url) ? { status: 503, body: {} } : { body: AWESOME_PAYLOAD }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate).toEqual({
      rate: 5.4321,
      source: 'awesomeapi',
      isFallback: false,
      date: '2026-09-06',
    })
  })

  it('assume quando a série do PTAX volta vazia', async () => {
    stubFetch((url) => (isPtax(url) ? { body: { value: [] } } : { body: AWESOME_PAYLOAD }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate.source).toBe('awesomeapi')
  })

  it('assume quando a rede recusa a conexão com o PTAX', async () => {
    stubFetch((url) => (isPtax(url) ? { reject: true } : { body: AWESOME_PAYLOAD }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate.source).toBe('awesomeapi')
  })
})

describe('usdRateService — fallback local', () => {
  it('grava a última taxa viva no localStorage', async () => {
    stubFetch(() => ({ body: PTAX_SERIES }))

    await usdRateService.getUSDRate(SUNDAY)

    const stored = JSON.parse(window.localStorage.getItem(USD_RATE_STORAGE_KEY) as string)
    expect(stored).toMatchObject({ rate: 5.1253, date: '2026-09-04', source: 'bcb' })
  })

  it('reaproveita a taxa salva quando as duas fontes caem, marcando aproximação', async () => {
    window.localStorage.setItem(
      USD_RATE_STORAGE_KEY,
      JSON.stringify({ rate: 5.0912, date: '2026-09-04', source: 'bcb' }),
    )
    stubFetch(() => ({ reject: true }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate).toEqual({ rate: 5.0912, source: 'cache', isFallback: true, date: '2026-09-04' })
  })

  it('cai na taxa fixa quando não há fonte nem cache', async () => {
    stubFetch(() => ({ reject: true }))

    const rate = await usdRateService.getUSDRate(SUNDAY)

    expect(rate).toEqual({
      rate: USD_RATE_DEFAULT,
      source: 'default',
      isFallback: true,
      date: null,
    })
    expect(USD_RATE_DEFAULT).toBe(5)
  })

  it('cache corrompido não derruba a cadeia', async () => {
    window.localStorage.setItem(USD_RATE_STORAGE_KEY, '{isso não é json')
    stubFetch(() => ({ reject: true }))

    await expect(usdRateService.getUSDRate(SUNDAY)).resolves.toMatchObject({ source: 'default' })
  })

  it('cache com taxa não numérica é descartado', async () => {
    window.localStorage.setItem(USD_RATE_STORAGE_KEY, JSON.stringify({ rate: 'muito' }))
    stubFetch(() => ({ reject: true }))

    await expect(usdRateService.getUSDRate(SUNDAY)).resolves.toMatchObject({ source: 'default' })
  })

  /**
   * A cadeia inteira existe para que o cálculo de patrimônio internacional não
   * fique sem número: `getUSDRate` não tem caminho de rejeição.
   */
  it('nunca rejeita, mesmo com todas as fontes quebradas', async () => {
    stubFetch(() => {
      throw new Error('boom')
    })

    await expect(usdRateService.getUSDRate(SUNDAY)).resolves.toMatchObject({ isFallback: true })
  })
})
