import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PendingSecAnnouncements } from './PendingSecAnnouncements'
const state = vi.hoisted(() => ({ error: false, loading: false, fnet: false }))
vi.mock('../../dividends/hooks/usePendingSecAnnouncements', () => ({ usePendingSecAnnouncements: () => ({
  data: state.fnet ? [{ ticker:'XPML11',accession:'fnet:1387873',declaration_date:null,record_date:'2026-11-17',payment_date:'2026-11-25',value_per_share:0.8,distribution:'regular',currency:'BRL',source_kind:'fnet',source_url:'https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1387873' }] : [{ ticker: 'COST', accession: '0000909832-26-000134', declaration_date: '2026-11-10', record_date: '2026-11-24', payment_date: '2026-12-04', value_per_share: 30, distribution: 'special', source_url: 'https://www.sec.gov/Archives/edgar/data/909832/000090983226000134/cost-20261107.htm' }],
  isError: state.error, isLoading: state.loading, refetch: vi.fn(),
}) }))
afterEach(() => { cleanup(); state.error = false; state.loading = false; state.fnet = false })
it('exibe FNET em reais e preserva declaração desconhecida sem total pessoal',()=>{
 state.fnet=true
 render(<PendingSecAnnouncements period="1A" search="XPML" />)
 expect(screen.getByText('R$ 0,80')).toBeInTheDocument()
 expect(screen.getByText('Não informada no documento')).toBeInTheDocument()
 expect(screen.getByText('Data COM:')).toBeInTheDocument()
 expect(screen.getByRole('link')).toHaveTextContent('FNET')
 expect(screen.queryByText(/Total estimado:/)).not.toBeInTheDocument()
})
it('mostra especial em USD sem converter corte em ex nem prometer crédito pessoal', () => {
  render(<PendingSecAnnouncements period="1A" search="cost" />)
  expect(screen.getByText('COST · Dividendo especial')).toBeInTheDocument()
  expect(screen.getByText('US$ 30,00')).toBeInTheDocument()
  expect(screen.getByText(/não calculamos quantidade elegível/)).toBeInTheDocument()
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.queryByText(/Total estimado:/)).not.toBeInTheDocument()
})
it('respeita filtro sem afirmar cobertura completa', () => {
  render(<PendingSecAnnouncements period="6M" search="MA" />)
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(screen.getByText(/Isso não comprova ausência/)).toBeInTheDocument()
})
it('distingue falha de ausência de anúncios', () => {
  state.error = true
  render(<PendingSecAnnouncements period="Tudo" search="" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível')
  expect(screen.queryByText(/Nenhuma declaração pendente/)).not.toBeInTheDocument()
})
