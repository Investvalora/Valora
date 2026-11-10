import { afterEach, expect, it, vi } from 'vitest'
import { sectorService } from './sectorService'
afterEach(() => vi.unstubAllGlobals())

it('pagina sem chave nem dados de carteira e não usa classificação genérica de fundo como setor', async () => {
  const fetch = vi.fn(async (url: string) => ({ ok: true, json: async () => ({
    stocks: url.includes('type=bdr') ? [] : [{ stock: 'BBAS3', type: 'stock', sector: 'Finance' }, { stock: 'MXRF11', type: 'fund', sector: 'Finance' }],
    hasNextPage: false,
  }) }))
  vi.stubGlobal('fetch', fetch)
  expect(await sectorService.list()).toEqual([{ ticker: 'BBAS3', sector: 'Financeiro', source: 'brapi' }])
  expect(fetch).toHaveBeenCalledTimes(2)
  for (const [url] of fetch.mock.calls) expect(url).not.toMatch(/token|wallet|user/)
})

it('não apresenta resposta truncada como classificação completa', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ stocks: [], hasNextPage: true }) })))
  await expect(sectorService.list()).rejects.toThrow('incompleta')
})
