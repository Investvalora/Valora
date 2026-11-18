import { pathToFileURL } from 'node:url'
import { appendFile } from 'node:fs/promises'

function time(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value) ? Date.parse(value) : NaN
}
/** Creation gaps and runner delays measure different stages; neither proves a dropped run. */
export function analyzeCadence(runs, current, now = Date.now()) {
  const dates = [...new Set((Array.isArray(runs) ? runs : []).filter(r => r?.event === 'schedule').map(r => time(r.created_at)).filter(Number.isFinite))].sort((a,b) => a-b)
  const gaps = dates.slice(1).map((date,i) => (date-dates[i])/1000)
  const created = time(current?.created_at), started = time(current?.run_started_at)
  const age = dates.length ? Math.max(0,Math.floor((now-dates.at(-1))/1000)) : null
  const lastGap = gaps.length ? gaps.at(-1) : null
  return {
    scheduled_runs: dates.length,
    max_creation_gap_seconds: gaps.length ? Math.max(...gaps) : null,
    last_creation_gap_seconds: lastGap,
    last_schedule_age_seconds: age,
    // A just-created run must not erase evidence of the preceding long gap.
    schedule_delayed: age === null ? null : age > 5400 || (lastGap !== null && lastGap > 5400),
    current_runner_wait_seconds: Number.isFinite(created) && Number.isFinite(started) && started>=created ? (started-created)/1000 : null,
  }
}

export async function reportCadence(env = process.env, request = fetch) {
  if (env.GITHUB_REPOSITORY !== 'Investvalora/Valora' || !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') || !env.GITHUB_TOKEN) return {available:false,reason:'context_unavailable'}
  const base = 'https://api.github.com/repos/Investvalora/Valora/actions'
  try {
    const get = async path => {
      const r = await request(base+path,{headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(10000)})
      if (!r.ok) throw new Error('cadence_unavailable')
      return r.json()
    }
    const [history,current] = await Promise.all([get('/workflows/international-announcements.yml/runs?event=schedule&per_page=12'),get(`/runs/${env.GITHUB_RUN_ID}`)])
    return {available:true,...analyzeCadence(history.workflow_runs,current)}
  } catch { return {available:false,reason:'github_history_unavailable'} }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await reportCadence()
  console.log(JSON.stringify({international_cadence:report}))
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,`\n### Cadência internacional\n\nCriação dos runs agendados e espera por runner são etapas distintas. Cron é best effort; nenhuma execução ausente é presumida como descartada.\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n`)
}
