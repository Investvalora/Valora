import { afterEach, expect, it, vi } from 'vitest'
let handler: (r: Request) => Promise<Response>
const reply = (d: unknown, status=200) => new Response(JSON.stringify(d),{status})
async function setup(fail=false) {
 vi.resetModules()
 vi.stubGlobal('Deno',{env:{get:(k:string)=>k==='SUPABASE_URL'?'https://example.test':'internal-test'},serve:(h: typeof handler)=>{handler=h}})
 const f=vi.fn(async(input: string | URL | Request)=> {
  const u=String(input)
  if(u.includes('bcdata.sgs')) return fail?reply({},503):reply([{data:'03/11/2026',valor:'13.65'}])
  if(u.includes('calc-fixed-income')) return reply({posicoes_atualizadas:1,erros:[]})
  return reply({})
 })
 vi.stubGlobal('fetch',f)
 await import('../../../../supabase/functions/sync-macro-rates/index')
 return f
}
afterEach(()=>vi.unstubAllGlobals())
it('runs recalculation only after all rates have been persisted',async()=>{
 const f=await setup()
 const r=await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer internal-test'},body:JSON.stringify({recalculate:true})}))
 expect(r.status).toBe(200)
 const urls=f.mock.calls.map(c=>String(c[0]))
 expect(urls.filter(u=>u.includes('macro_rates'))).toHaveLength(3)
 expect(urls[urls.length-1]).toContain('calc-fixed-income')
})
it('does not recalculate when a macro provider fails and reports a failed execution',async()=>{
 const f=await setup(true)
 const r=await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer internal-test'},body:JSON.stringify({recalculate:true})}))
 expect(r.status).toBe(503)
 expect(f.mock.calls.some(c=>String(c[0]).includes('calc-fixed-income'))).toBe(false)
})
