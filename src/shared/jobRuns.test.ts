import {expect,it,vi} from 'vitest'
import {jobRun} from '../../supabase/functions/_shared/jobRuns'
const id='11111111-1111-4111-8111-111111111111'
it('persists a private partial result with bounded diagnostics and no credentials in the stored body',async()=>{
 const request=vi.fn<typeof fetch>(async()=>Response.json([{id}]))
 expect(await jobRun('https://example.test','private',id,{linhas_gravadas:{cdi:540},recalculo:{posicoes_atualizadas:13,erros:['lote: Preço oficial não encontrado']},erros:['recalculo: falha']},request)).toBe(true)
 const body=JSON.parse(String(request.mock.calls[0][1]?.body))
 expect(body).toMatchObject({status:'partial',details:{updated:13,rates:{cdi:540},errors:['recalculo'],calculation_errors:['lote: Preço oficial não encontrado']}})
 expect(JSON.stringify(body)).not.toContain('private')
})
it.each([Response.json({}),Response.json([], {status:500}),Response.json([{id:'other'}])])('does not report persistence when HTTP or returned row is wrong',async r=>{
 expect(await jobRun('https://example.test','private',id,{},async()=>r)).toBe(false)
})
it('a transport failure is observable without throwing secret-bearing exception text',async()=>{
 expect(await jobRun('https://example.test','private',id,{},async()=>{throw new Error('private')})).toBe(false)
})
