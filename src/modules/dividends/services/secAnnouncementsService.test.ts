import { beforeEach, expect, it, vi } from 'vitest'
import { supabaseMock } from '../../../test/supabaseMock'
import { listPendingSecAnnouncements } from './secAnnouncementsService'
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: supabaseMock.client }))
beforeEach(() => supabaseMock.reset())
const special = { ticker: 'COST', accession: 'special', record_date: '2026-11-24', payment_date: '2026-12-04', value_per_share: 30, distribution: 'special' }
const regular = { ...special, accession: 'regular', value_per_share: 1.47 }
it('mostra aviso FNET em BRL sem data ex/declaração e deduplica documentos iguais sem somar', async () => {
 const notice = { ticker:'XPML11',source_url:'https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1387873',record_date:'2026-11-17',payment_date:'2026-11-25',value_per_share:0.8 }
 supabaseMock.on('fnet_payment_notices',()=>({data:[notice,{...notice,source_url:notice.source_url+'0'}],error:null}))
 expect(await listPendingSecAnnouncements(['XPML11'],'2026-11-19','2027-11-19')).toEqual([{...notice,accession:notice.source_url,declaration_date:null,distribution:'regular',currency:'BRL',source_kind:'fnet'}])
 supabaseMock.on('dividends',()=>({data:[{...notice,ex_date:'2026-11-18'}],error:null}))
 expect(await listPendingSecAnnouncements(['XPML11'],'2026-11-19','2027-11-19')).toEqual([])
})
it('não transforma falha da fonte FNET em calendário vazio',async()=>{
 supabaseMock.on('fnet_payment_notices',()=>({data:null,error:new Error('FNET offline')}))
 await expect(listPendingSecAnnouncements(['XPML11'],'2026-11-19','2027-11-19')).rejects.toThrow('FNET offline')
})
it('removes confirmed specials from pending while preserving unconfirmed distributions',async()=>{
 supabaseMock.on('sec_dividend_announcements',()=>({data:[{...special,confirmed_ex_date:'2026-11-24'},regular],error:null}))
 expect(await listPendingSecAnnouncements(['COST'],'2026-11-12','2027-11-12')).toEqual([regular])
})
it('oculta somente anúncio já conciliado com corte, pagamento, valor e ticker iguais', async () => {
  supabaseMock.on('sec_dividend_announcements', () => ({ data: [regular, special], error: null }))
  supabaseMock.on('dividends', () => ({ data: [{ ...regular, ex_date: '2026-11-23' }], error: null }))
  expect(await listPendingSecAnnouncements(['COST'], '2026-11-12', '2027-11-12')).toEqual([special])
  expect(supabaseMock.chains[0].calls).toContainEqual({ method: 'in', args: ['ticker', ['COST']] })
  expect(supabaseMock.chains[2].calls).toContainEqual({ method: 'not', args: ['source', 'in', '(seed,synthetic)'] })
})
it('não usa data de registro diferente para ocultar um anúncio', async () => {
  supabaseMock.on('sec_dividend_announcements', () => ({ data: [special], error: null }))
  supabaseMock.on('dividends', () => ({ data: [{ ...special, record_date: '2026-11-23' }], error: null }))
  expect(await listPendingSecAnnouncements(['COST'], '2026-11-12', '2027-11-12')).toEqual([special])
})
it('não consulta catálogo global em carteira vazia', async () => {
  expect(await listPendingSecAnnouncements([], '2026-11-12', '2027-11-12')).toEqual([])
  expect(supabaseMock.chains).toHaveLength(0)
})
it('falhas e truncamento não viram lista vazia nem cobertura parcial silenciosa', async () => {
  supabaseMock.on('sec_dividend_announcements', () => ({ data: null, error: new Error('offline') }))
  await expect(listPendingSecAnnouncements(['COST'], '2026-11-12', '2027-11-12')).rejects.toThrow('offline')
  supabaseMock.on('sec_dividend_announcements', () => ({ data: Array(501).fill(special), error: null }))
  await expect(listPendingSecAnnouncements(['COST'], '2026-11-12', '2027-11-12')).rejects.toThrow('reduza o período')
})
