import { afterEach, expect, it, vi } from 'vitest'
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules()})
it('imports the official price stream and recalculates only after successful ingestion',async()=>{
 let handler:((r:Request)=>Promise<Response>)|undefined
 vi.stubGlobal('Deno',{env:{get:(k:string)=>k==='SUPABASE_URL'?'https://test':'internal'},serve:(h:typeof handler)=>{handler=h}})
 const f=vi.fn(async(url:string,options?:RequestInit)=>{
  if(url.includes('fixed_income_positions')) return Response.json([{type:'tesouro_ipca',maturity_date:'2029-05-15',application_date:'2025-05-20'}])
  if(url.includes('precotaxatesourodireto.csv')) return new Response('Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha\nTesouro IPCA+;15/05/2029;30/10/2026;7;7;4000;3950;3944,73\n')
  if(url.includes('calc-fixed-income')) return Response.json({erros:[]})
  if(options?.method==='POST') return new Response(null,{status:204})
  throw new Error('unexpected request')
 })
 vi.stubGlobal('fetch',f)
 const path='../../../../supabase/functions/sync-treasury-prices/index.ts';await import(path)
 expect((await handler!(new Request('https://test',{method:'POST'}))).status).toBe(401)
 const r=await handler!(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer internal'}}))
 expect(r.status).toBe(200);expect(await r.json()).toMatchObject({saved:1,latest:'2026-10-30'})
 const inserted=JSON.parse(String(f.mock.calls.find(c=>c[0].includes('/treasury_prices'))?.[1]?.body))
 expect(inserted[0].base_price).toBe(3944.73)
 expect(String(f.mock.calls[f.mock.calls.length-1][0])).toContain('calc-fixed-income')
})
