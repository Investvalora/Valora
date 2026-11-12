import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'npm:jose@6.1.3'
import { verifyGithubCollectorToken, authorizeInternationalCollector } from './githubOidc.ts'
const pair=await generateKeyPair('RS256');const publicKey=await exportJWK(pair.publicKey);publicKey.kid='test';publicKey.alg='RS256'
const keys=createLocalJWKSet({keys:[publicKey]});const audience='https://test.invalid/functions/v1/sync-international-announcements'
const claims={repository:'Investvalora/Valora',repository_id:'1228349930',repository_owner_id:'282645586',ref:'refs/heads/main',sub:'repo:Investvalora/Valora:ref:refs/heads/main',workflow_ref:'Investvalora/Valora/.github/workflows/international-announcements.yml@refs/heads/main',runner_environment:'github-hosted',repository_visibility:'public',event_name:'schedule',run_id:'123'}
Deno.test('authorizes the stored cron credential by digest without transmitting the raw token to the RPC',async()=>{
 let called=false
 const backend:typeof fetch=async(input,init)=>{
  called=true
  const body=String((init as {body?:unknown}|undefined)?.body)
  if(String(input)!=='https://test.invalid/rest/v1/rpc/authorize_market_job'||!/^\{"token_digest":"[a-f0-9]{64}"\}$/.test(body)||body.includes('legacy-job-fixture'))throw Error('Unsafe authorization request')
  return Response.json(true)
 }
 const accepted=await authorizeInternationalCollector(new Request('https://test.invalid',{headers:{Authorization:'Bearer legacy-job-fixture'}}),'https://test.invalid','runtime-key-fixture',backend)
 if(!accepted||!called)throw Error('Stored credential not authorized')
})
Deno.test('rejects mismatched credentials, failed RPC, transport errors and truthy nonboolean replies',async()=>{
 for(const backend of [async()=>Response.json(false),async()=>Response.json(true,{status:503}),async()=>Response.json('true'),async()=>{throw Error('private failure')}]){
  if(await authorizeInternationalCollector(new Request('https://test.invalid',{headers:{Authorization:'Bearer not-a-job-token'}}),'https://test.invalid','runtime-key-fixture',backend))throw Error('Invalid credential accepted')
 }
})
Deno.test('missing credential never consults the authorization backend',async()=>{
 if(await authorizeInternationalCollector(new Request('https://test.invalid'),'https://test.invalid','runtime-key-fixture',async()=>{throw Error('Unexpected request')}))throw Error('Missing credential accepted')
})
async function signed(change:Record<string,unknown>={},issuer='https://token.actions.githubusercontent.com',aud=audience){
 return new SignJWT({...claims,...change}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:'test'}).setIssuer(issuer).setAudience(aud).setIssuedAt().setNotBefore('0s').setExpirationTime('5m').setJti(crypto.randomUUID()).sign(pair.privateKey)
}
Deno.test('accepts signed collector identity only for the trusted main workflow',async()=>{await verifyGithubCollectorToken(await signed(),audience,keys)})
for(const change of [{repository:'attacker/Valora'},{repository_id:'123'},{repository_owner_id:'123'},{ref:'refs/heads/pr'},{event_name:'pull_request'},{workflow_ref:'Investvalora/Valora/.github/workflows/other.yml@refs/heads/main'},{sub:'repo:Investvalora/Valora:pull_request'},{runner_environment:'self-hosted'}]){
 Deno.test(`rejects signed mismatched identity ${JSON.stringify(change)}`,async()=>{let rejected=false;try{await verifyGithubCollectorToken(await signed(change),audience,keys)}catch{rejected=true}if(!rejected)throw Error('Untrusted collector accepted')})
}
Deno.test('rejects wrong issuer, wrong audience, forged signature and expired token',async()=>{
 const token=await signed();const parts=token.split('.');const p=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));p.run_id='999';parts[1]=btoa(JSON.stringify(p)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
 const expired=await new SignJWT(claims).setProtectedHeader({alg:'RS256',typ:'JWT',kid:'test'}).setIssuer('https://token.actions.githubusercontent.com').setAudience(audience).setIssuedAt(Math.floor(Date.now()/1000)-1000).setNotBefore(0).setExpirationTime(Math.floor(Date.now()/1000)-600).setJti('old').sign(pair.privateKey)
 for(const candidate of [await signed({},'https://attacker.invalid'),await signed({},undefined,'https://other.invalid'),parts.join('.'),expired]){let rejected=false;try{await verifyGithubCollectorToken(candidate,audience,keys)}catch{rejected=true}if(!rejected)throw Error('Invalid JWT accepted')}
})
