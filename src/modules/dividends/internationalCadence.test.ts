import { expect, it, vi } from 'vitest'
// @ts-expect-error Standalone Node runner has no application-facing declarations.
import { analyzeCadence, reportCadence } from '../../../scripts/report-international-cadence.mjs'

it('separates hours between schedule creation from runner waiting time',()=>{
 const dates=['2026-11-17T02:26:13Z','2026-11-17T11:03:39Z','2026-11-17T19:45:28Z']
 const runs=dates.map(created_at=>({event:'schedule',created_at}))
 runs.push({event:'workflow_dispatch',created_at:'2026-11-17T22:00:00Z'})
 expect(analyzeCadence(runs,{created_at:dates[2],run_started_at:dates[2]},Date.parse('2026-11-17T22:00:00Z'))).toEqual({scheduled_runs:3,max_creation_gap_seconds:31309,last_schedule_age_seconds:8072,schedule_delayed:true,current_runner_wait_seconds:0})
})
it('does not infer missing runs from absent or malformed history',()=>{
 expect(analyzeCadence([{event:'schedule',created_at:'private-invalid'}],{},0)).toEqual({scheduled_runs:0,max_creation_gap_seconds:null,last_schedule_age_seconds:null,schedule_delayed:null,current_runner_wait_seconds:null})
})
it('keeps GitHub lookup failures separate from financial collection and strips exception text',async()=>{
 const request=vi.fn(async()=>{throw new Error('PRIVATE_CREDENTIAL')})
 expect(await reportCadence({GITHUB_REPOSITORY:'Investvalora/Valora',GITHUB_RUN_ID:'123',GITHUB_TOKEN:'secret'},request)).toEqual({available:false,reason:'github_history_unavailable'})
 expect(request).toHaveBeenCalledTimes(2)
})
it('performs no request outside the trusted repository context',async()=>{
 const request=vi.fn()
 expect(await reportCadence({GITHUB_REPOSITORY:'untrusted/repository',GITHUB_RUN_ID:'123',GITHUB_TOKEN:'secret'},request)).toEqual({available:false,reason:'context_unavailable'})
 expect(request).not.toHaveBeenCalled()
})
