/** Backend-only audit; never store headers, URLs, tokens or request bodies. */
export async function jobRun(url: string, key: string, id: string, result?: Record<string, unknown>, request = fetch, job: 'sync-macro-rates' | 'international-providers' = 'sync-macro-rates'): Promise<boolean> {
  const finished = result !== undefined
  const errors = Array.isArray(result?.erros) ? result.erros : []
  const coverage = Array.isArray(result?.coverage_gaps) ? result.coverage_gaps.filter((x): x is string => typeof x === 'string' && /^(alpha_vantage|marketstack):[A-Z][A-Z0-9.-]{0,9}$/.test(x)).slice(0,8) : []
  const skips=Array.isArray(result?.provider_skips)?result.provider_skips.filter((x):x is {provider:string;reason:string}=>!!x&&typeof x==='object'&&['alpha_vantage','marketstack'].includes(x.provider)&&['provider_key_missing','provider_key_budget_exhausted','provider_no_due_task_or_global_budget'].includes(x.reason)).slice(0,2).map(x=>({provider:x.provider,reason:x.reason})):[]
  const supplied = result?.supplemental as {results?:unknown[]} | undefined
  const supplemental = Array.isArray(supplied?.results) ? supplied.results.slice(0,2).flatMap(value=>{
    const r=value as Record<string,unknown>
    if(!r||!['massive','alpaca'].includes(String(r.provider)))return []
    return [{provider:String(r.provider),ticker:typeof r.ticker==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(r.ticker)?r.ticker:null,
      observations:Number.isInteger(r.observations)&&Number(r.observations)>=0&&Number(r.observations)<=100?Number(r.observations):0,
      error:typeof r.error==='string'&&/^supplemental_[a-z_]{1,60}$/.test(r.error)?r.error:null,
      skipped:['credentials_missing','budget_or_no_due_task'].includes(String(r.skipped))?String(r.skipped):null}]
  }) : []
  const calculation = result?.recalculo as { posicoes_atualizadas?: unknown; erros?: unknown } | null | undefined
  const updated = Number(calculation?.posicoes_atualizadas ?? 0)
  const calculationErrors = Array.isArray(calculation?.erros) ? calculation.erros.filter((x): x is string => typeof x==='string').slice(0,10).map(x=>x.slice(0,180)) : []
  const details = finished ? { rates: result?.linhas_gravadas ?? {}, updated: Number.isFinite(updated) ? updated : 0,
    calculation_errors: calculationErrors, errors: errors.map(x => String(x).split(':')[0].replace(/[^a-z_]/g,'').slice(0,32)).slice(0,8), coverage_gaps: coverage,provider_skips:skips,...(supplemental.length?{supplemental}:{}) } : {}
  const status = !finished ? 'running' : errors.length ? calculation ? 'partial' : 'failed' : coverage.length||skips.length||supplemental.some(r=>r.ticker) ? 'partial' : 'success'
  try {
    const response = await request(`${url}/rest/v1/operational_job_runs${finished ? `?id=eq.${id}` : ''}`, {
      method: finished ? 'PATCH' : 'POST',
      headers: { apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation' },
      body: JSON.stringify(finished ? {status,finished_at:new Date().toISOString(),details} : {id,job,status}),
      signal:AbortSignal.timeout(10000),
    })
    if(!response.ok)return false
    const rows=await response.json()
    return Array.isArray(rows)&&rows.length===1&&rows[0].id===id
  } catch { return false }
}
