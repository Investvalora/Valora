import { authorizeServiceJob } from '../_shared/serviceAuthorization.ts'
import { boundedBytes, zipFiles } from '../_shared/officialFiles.ts'
import { fundReports } from './reports.ts'

const url = Deno.env.get('SUPABASE_URL') ?? '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
Deno.serve(async request => {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  if (!await authorizeServiceJob(request, url, key)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  let saved = 0, conflicts = 0
  try {
    // Two annual bulk files also cover delayed submissions around January.
    const today = new Date().toISOString().slice(0, 10), year = Number(today.slice(0, 4))
    for (const y of [year - 1, year]) {
      const source = `https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_${y}.zip`
      const response = await fetch(source, { signal: AbortSignal.timeout(45000) })
      const files = await zipFiles(await boundedBytes(response), name => /^inf_mensal_fii_(geral|complemento)_\d{4}\.csv$/.test(name))
      const rows = fundReports(files.get(`inf_mensal_fii_geral_${y}.csv`) ?? '', files.get(`inf_mensal_fii_complemento_${y}.csv`) ?? '', source, today, count => { conflicts += count })
      for (let offset = 0; offset < rows.length; offset += 500) {
        const result = await fetch(`${url}/rest/v1/cvm_fii_reports?on_conflict=cnpj,reference_date,version`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(offset, offset + 500)), signal: AbortSignal.timeout(15000) })
        if (!result.ok) throw new Error('cvm_storage_failed')
        saved += Math.min(500, rows.length - offset)
      }
    }
    const result = await fetch(`${url}/rest/v1/rpc/apply_cvm_fii_fallback`, { method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(15000) })
    if (!result.ok) throw new Error('cvm_fallback_failed')
    return Response.json({ saved, excluded_conflicting_reports: conflicts, fundamentals_enriched: await result.json(), source: 'cvm', received_income_created: 0 })
  } catch { return Response.json({ saved, error: 'cvm_sync_incomplete' }, { status: 503 }) }
})
