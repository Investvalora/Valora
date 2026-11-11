import { expect, it } from 'vitest'
import { titleForPath } from './pageTitle'

it('identifica Explorar e seu resumo sem perder o tratamento de rota inexistente', () => {
  expect(titleForPath('/ativos/explorar/')).toBe('Explorar ativos | Valora')
  expect(titleForPath('/ativos/explorar/itub4')).toBe('ITUB4 | Valora')
  expect(titleForPath('/ativo/ITUB4')).toBe('ITUB4 | Valora')
  expect(titleForPath('/ativos/explorar/%')).toBe('Resumo do ativo | Valora')
  expect(titleForPath('/inexistente')).toBe('Página não encontrada | Valora')
})
