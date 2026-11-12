/** Backend-only audit; never store headers, URLs, tokens or request bodies. */
export async function jobRun(url: string, key: string, id: string, result?: Record<string, unknown>, request = fetch, job: 'sync-macro-rates' | 'international-providers' = 'sync-macro-rates'): Promise<boolean> {
  const finished = result !== undefined
  const errors = Array.isArray(result?.erros) ? result.erros : []
  const calculation = result?.recalculo as { posicoes_atualizadas?: unknown; erros?: unknown } | null | undefined
  const updated = Number(calculation?.posicoes_atualizadas ?? 0)
  const calculationErrors = Array.isArray(calculation?.erros) ? calculation.erros.filter((x): x is string => typeof x==='string').slice(0,10).map(x=>x.slice(0,180)) : []
  const details = finished ? { rates: result?.linhas_gravadas ?? {}, updated: Number.isFinite(updated) ? updated : 0,
    calculation_errors: calculationErrors, errors: errors.map(x => String(x).split(':')[0].replace(/[^a-z_]/g,'').slice(0,32)).slice(0,8) } : {}
  const status = !finished ? 'running' : errors.length ? calculation ? 'partial' : 'failed' : 'success'
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
