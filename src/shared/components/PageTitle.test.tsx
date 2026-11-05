import { expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router-dom'
import { PageTitle } from './PageTitle'
import { titleForPath } from '../utils/pageTitle'

it('atualiza a aba na navegação, sem incorporar query string ou identificador de conta', () => {
  render(<MemoryRouter initialEntries={['/login?email=privado']}><PageTitle /><Link to="/ativo/wege3">Abrir ativo</Link></MemoryRouter>)
  expect(document.title).toBe('Entrar | Valora')
  fireEvent.click(screen.getByRole('link'))
  expect(document.title).toBe('WEGE3 | Valora')
  expect(titleForPath('/privacidade')).toBe('Privacidade | Valora')
  expect(titleForPath('/nao-existe')).toBe('Página não encontrada | Valora')
  expect(titleForPath('/ativo/%')).toBe('Resumo do ativo | Valora')
})
