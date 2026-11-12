import {expect,it,vi} from 'vitest'
import {maReleaseLinks,maAnnouncement} from '../../../supabase/functions/sync-international-announcements/mastercard'
// @ts-expect-error Standalone Node runner has no application-facing declarations.
import {mastercardAnnouncements,maIndex} from '../../../scripts/mastercard-announcements.mjs'
// @ts-expect-error Standalone Node runner has no application-facing declarations.
import {collectAnnouncements} from '../../../scripts/collect-international-announcements.mjs'
const link={source_url:'https://www.nasdaq.com/press-release/mastercard-board-directors-announces-quarterly-dividend-2026-09-29',declaration_date:'2026-09-29'}
const listing={status:{rCode:200},data:{rows:[{title:'Mastercard Board of Directors Announces Quarterly Dividend',created:'Sep 29, 2026',related_symbols:['ma|stocks'],url:new URL(link.source_url).pathname}]}}
const html='<p>Mastercard Incorporated (NYSE: MA) today announced that its Board of Directors has declared a quarterly cash dividend of <span>87 cents</span> per share. The cash dividend will be paid on November 9, 2026 to holders of record of its Class A common stock and Class B common stock as of <span>October 9, 2026</span>.</p><p>Source: Mastercard Investor Relations</p><a href="https://www.businesswire.com/news/home/20260929565725/en/">Original</a>'
it('descobre pelo feed por ticker, exige emissor e não inventa ex',async()=>{
 const read=vi.fn(async(url:string)=>url===maIndex?JSON.stringify(listing):html)
 const events=await mastercardAnnouncements('2026-11-12',read)
 expect(events).toEqual([{...link,record_date:'2026-10-09',payment_date:'2026-11-09',value_per_share:0.87}])
 expect(events[0]).not.toHaveProperty('ex_date');expect(read.mock.calls.map(c=>c[0])).toEqual([maIndex,link.source_url])
})
it('não usa o índice genérico AAPL como se fosse MA e não admite URL externa',()=>{
 expect(()=>maReleaseLinks({...listing,data:{rows:[{...listing.data.rows[0],related_symbols:['aapl|stocks']}]}},'2026-11-12')).toThrow('identity')
 expect(()=>maReleaseLinks({...listing,data:{rows:[{...listing.data.rows[0],url:'https://attacker.invalid/x'}]}},'2026-11-12')).toThrow('source')
})
it.each([
 html.replace('Source: Mastercard Investor Relations','Source: analyst'),
 html.replace('(NYSE: MA)','(NYSE: XYZ)'),
 html.replace('20260929565725','20260928565725'),
 html.replace('quarterly cash dividend','special cash dividend'),
 html+html,
])('rejeita identidade, calendário ou distribuição não comprovada',value=>expect(()=>maAnnouncement(value,link,'2026-11-12')).toThrow())
it('preserva independência da Nasdaq listagem ao rotear MA pelo comunicado',async()=>{
 const source=vi.fn(),maSource=vi.fn(async()=>[maAnnouncement(html,link,'2026-11-12')])
 const request=vi.fn(async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).mode==='claim'?Response.json({tasks:[{ticker:'MA',claim_token:'lease'}]}):Response.json({saved:0,conflicts:0,error:null}))
 const result=await collectAnnouncements({endpoint:'https://zawjqzekqfnmvwglahnk.supabase.co/functions/v1/sync-international-announcements',token:'test',source,maSource,request})
 expect(result.failed).toBe(0);expect(source).not.toHaveBeenCalled();expect(maSource).toHaveBeenCalledOnce()
 expect(JSON.parse(String(request.mock.calls[1][1].body)).events[0]).not.toHaveProperty('ex_date')
})
