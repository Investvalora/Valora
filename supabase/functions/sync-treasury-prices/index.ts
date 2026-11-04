import { yahooCaller } from '../_shared/yahooAuthorization.ts'
import { parseTreasuryLine } from '../_shared/treasury.ts'
const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers = {apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json'}
const csv = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv'
Deno.serve(async request => {
 if(request.method !== 'POST') return new Response('Method not allowed',{status:405})
 const caller = await yahooCaller(request,url,key)
 if(caller.kind !== 'service') return new Response('Unauthorized',{status:caller.kind === 'denied' ? caller.status : 403})
 try {
  const positions: {type:string;maturity_date:string;application_date:string}[] = []
  for(let offset=0;;offset+=500) {
   const r=await fetch(`${url}/rest/v1/fixed_income_positions?select=type,maturity_date,application_date&type=in.(tesouro_ipca,tesouro_pre,tesouro_selic)&maturity_date=not.is.null&order=id&limit=500&offset=${offset}`,{headers,signal:AbortSignal.timeout(15000)})
   if(!r.ok) throw new Error('positions')
   const page=await r.json(); positions.push(...page); if(page.length<500) break
  }
  if(!positions.length) return Response.json({saved:0})
  const keys=new Map<string,string>()
  for(const p of positions) {const k=`${p.type}:${p.maturity_date}`;keys.set(k, keys.has(k) && keys.get(k)!<p.application_date ? keys.get(k)! : p.application_date)}
  const response=await fetch(csv,{signal:AbortSignal.timeout(90000)})
  if(!response.ok || !response.body) throw new Error('source')
  const reader=response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer='', saved=0, latest='', batch: unknown[]=[], headerSeen=false
  const today=new Date().toISOString().slice(0,10)
  async function flush() {
   if(!batch.length) return
   const r=await fetch(`${url}/rest/v1/treasury_prices?on_conflict=type,maturity_date,date`,{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(batch),signal:AbortSignal.timeout(15000)})
   if(!r.ok) throw new Error('storage')
   saved+=batch.length;batch=[]
  }
  async function line(text:string) {
   if(!headerSeen) {
    if(!text.replace(/^\uFEFF/,'').startsWith('Tipo Titulo;Data Vencimento;Data Base;') || !text.includes(';PU Base Manha')) throw new Error('source_schema')
    headerSeen=true;return
   }
   const row=parseTreasuryLine(text);if(!row) return
   const from=keys.get(`${row.type}:${row.maturity_date}`)
   if(!from || row.date<from || row.date>today) return
   batch.push({...row,updated_at:new Date().toISOString()}); if(row.date>latest) latest=row.date
   if(batch.length>=500) await flush()
  }
  while(true) {
   const part=await reader.read();if(part.done) break
   buffer+=part.value; const lines=buffer.split('\n');buffer=lines.pop() ?? ''
   for(const text of lines) await line(text)
  }
  if(buffer) await line(buffer);await flush()
  if(!saved) throw new Error('empty_source')
  const calc=await fetch(`${url}/functions/v1/calc-fixed-income`,{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(90000)})
  if(!calc.ok) throw new Error('calculation')
  const result=await calc.json()
  return Response.json({saved,latest,recalculation:result},{status:result.erros?.length?503:200})
 } catch {return Response.json({error:'treasury_sync_failed'},{status:503})}
})
