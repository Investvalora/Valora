import { beforeEach, expect, it } from 'vitest'
import { useExploreMemory } from './useExploreMemory'

beforeEach(() => {
  localStorage.clear()
  useExploreMemory.setState({ entries: {} })
})

it('guarda o último detalhe e até seis ativos recentes por conta', () => {
  const { rememberRoute, rememberAsset } = useExploreMemory.getState()
  rememberRoute('alice', '/ativos/explorar/AAA0?q=AAA')
  for (let index = 0; index < 7; index++) {
    rememberAsset('alice', { ticker: `AAA${index}`, name: `Ativo ${index}`, type: 'stock_br', currency: 'BRL' })
  }
  rememberRoute('bob', '/ativos/explorar/BBB1?q=BBB')

  const entries = useExploreMemory.getState().entries
  expect(entries.alice.lastRoute).toBe('/ativos/explorar/AAA0?q=AAA')
  expect(entries.alice.recentAssets.map((asset) => asset.ticker)).toEqual(['AAA6', 'AAA5', 'AAA4', 'AAA3', 'AAA2', 'AAA1'])
  expect(entries.bob.recentAssets).toEqual([])
  expect(JSON.parse(localStorage.getItem('valora:explore-memory:v1') ?? '{}').state.entries.alice.lastRoute).toBe('/ativos/explorar/AAA0?q=AAA')
})
