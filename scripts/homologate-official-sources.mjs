/** Isolated integration harness: real local PostgreSQL + PostgREST + job handlers.
 * Portable binaries live under output/qa-fontes-oficiais/runtime (not committed).
 * No production URL/token is loaded. Only the optional CoinGecko key is read.
 */
import { execFileSync, spawn } from 'node:child_process'
import { createHmac, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const root=resolve('.'), out=join(root,'output/qa-fontes-oficiais')
const bin=join(out,'runtime/postgres/package/native/bin'), pgrest=join(out,'runtime/postgrest/postgrest.exe')
const data=join(out,'pgdata'), port=15432, apiPort=15434
const secret=randomBytes(40).toString('hex')
const jwt=role=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const p=Buffer.from(JSON.stringify({role,sub:'00000000-0000-4000-8000-000000000001',exp:Math.floor(Date.now()/1000)+7200})).toString('base64url');return `${h}.${p}.${createHmac('sha256',secret).update(`${h}.${p}`).digest('base64url')}`}
const service=jwt('service_role'), user=jwt('authenticated')
const env={...process.env,PATH:`${bin};${process.env.PATH}`}
const sqlClient=join(out,'sql-client.mjs')
const sql=query=>execFileSync(process.execPath,[sqlClient],{input:query,encoding:'utf8',env,windowsHide:true,maxBuffer:16*1024*1024})
const apply=file=>sql(readFileSync(join(root,file),'utf8'))
const query=statement=>JSON.parse(sql(statement).trim())
const wait=ms=>new Promise(r=>setTimeout(r,ms))
mkdirSync(out,{recursive:true})
if(existsSync(join(data,'PG_VERSION'))&&!process.argv.includes('--reuse-cluster')) throw new Error('Existing QA cluster: use --reuse-cluster to create a fresh database in the isolated cluster')
if(!existsSync(join(data,'PG_VERSION'))){
 execFileSync(join(bin,'initdb.exe'),['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--locale=C'],{env,windowsHide:true,stdio:'ignore'})
 execFileSync(join(bin,'pg_ctl.exe'),['-D',data,'-l',join(out,'postgres.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','start'],{env,windowsHide:true,stdio:'ignore'})
}
writeFileSync(sqlClient,`import pg from './deps/node_modules/pg/lib/index.js';import {readFileSync} from 'node:fs';pg.types.setTypeParser(1082,value=>value);pg.types.setTypeParser(1700,Number);pg.types.setTypeParser(20,Number);const client=new pg.Client({host:'127.0.0.1',port:${port},user:'postgres',database:process.env.QA_DATABASE??'postgres'});await client.connect();try{const result=await client.query(readFileSync(0,'utf8'));console.log(JSON.stringify((Array.isArray(result)?result.at(-1):result).rows??[]));}finally{await client.end();}`)
const database=`valora_official_qa_${Date.now()}`
sql(`create database ${database};`);env.QA_DATABASE=database
console.log('QA PostgreSQL ready (loopback only)')

// Real migrations for the schema exercised by these jobs; no customer data.
apply('supabase/tests/000_stub_supabase.sql')
for(const file of ['001_create_users_table.sql','002_create_user_trigger.sql','003_create_assets_price_history.sql','004_harden_default_privileges.sql','006_create_positions.sql','007_create_transactions.sql','008_create_alerts.sql','009_create_dividends_and_fundamentals.sql','010_create_benchmarks.sql','014_add_fixed_income_asset_type.sql','015_create_fixed_income_positions.sql','016_create_macro_rates.sql','024_create_wallets.sql','20261025143849_fixed_income_events.sql']) apply(`supabase/migrations/${file}`)
sql(`alter type public.asset_type add value if not exists 'etf_us';alter type public.asset_type add value if not exists 'etf_br';
create schema cron;create table cron.job(jobid bigserial,jobname text unique,schedule text,command text);
create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname) do update set schedule=$2,command=$3 returning jobid$$;
alter table public.fundamentals alter column pl drop not null,alter column pvp drop not null,alter column roe drop not null,alter column dy drop not null,alter column debt_equity drop not null,alter column net_margin drop not null,alter column lpa drop not null,alter column vpa drop not null;
alter table public.fundamentals drop constraint fundamentals_vpa_positive;
create function public.authorize_market_job(token_digest text) returns boolean language sql as $$select false$$;
revoke all on function public.authorize_market_job(text) from public,anon,authenticated;grant execute on function public.authorize_market_job(text) to service_role;`)
for(const file of ['20261104190014_market_provider_cooldown.sql','20261104220125_preserve_global_quote_fields.sql','20261104223542_treasury_market_prices.sql','20261107013406_fundamental_payout_ratio.sql','20261107183717_official_market_sources.sql']) apply(`supabase/migrations/${file}`)
// Hosted Supabase grants backend ownership privileges outside app migrations.
// Reproduce those platform grants only in this disposable local database.
sql('grant all on all tables in schema public to service_role;grant usage,select on all sequences in schema public to service_role;')
sql(`insert into public.assets(ticker,name,type,currency,quote_provider,provider_symbol) values
('PETR3','Petrobras ON','stock_br','BRL','brapi','PETR3'),('PETR4','Petrobras PN','stock_br','BRL','brapi','PETR4'),
('GARE11','Guardian Real Estate','fii','BRL','brapi','GARE11'),('CPTS11','Capitania Securities','fii','BRL','brapi','CPTS11'),('HGLG11','CSHG Logistica','fii','BRL','brapi','HGLG11'),
('TFLO','iShares Treasury Floating Rate Bond ETF','etf_us','USD','finnhub','TFLO'),('IVV','iShares Core S&P 500 ETF','etf_us','USD','finnhub','IVV'),
('BTC','Bitcoin','crypto','USD','coingecko','bitcoin'),('BTC-BRL','Bitcoin BRL','crypto','BRL','coingecko','bitcoin'),('ETH-BRL','Ethereum BRL','crypto','BRL','coingecko','ethereum');
insert into public.assets(ticker,name,type,currency,quote_provider,provider_symbol) select 'ZZQA'||lpad(n::text,5,'0'),'Pagination fixture','stock_br','BRL','brapi','ZZQA'||lpad(n::text,5,'0') from generate_series(1,505) n;
insert into public.fundamentals(ticker,reference_date,vpa,pvp,dy,source) values('GARE11',current_date,null,null,12,'yahoo'),('CPTS11',current_date,null,null,13,'yahoo'),('HGLG11',current_date,123.45,1.2,8,'confirmed_fixture');
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('TFLO','2026-11-02',0.17,'dividend','yahoo');
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000001','qa-official@example.invalid','{"full_name":"Homologação isolada"}');
insert into public.fixed_income_positions(user_id,name,type,indexer,rate,principal,application_date,maturity_date,treasury_quantity)
values('00000000-0000-4000-8000-000000000001','QA CDI','cdb_cdi','cdi',115,1000,current_date-20,null,null),
('00000000-0000-4000-8000-000000000001','QA Prefixado','cdb_pre','pre',10,500,current_date-20,null,null),
('00000000-0000-4000-8000-000000000001','QA Tesouro IPCA','tesouro_ipca','ipca',7.19,102.0009,'2025-05-20','2029-05-15',0.03);`)
const config=join(out,'postgrest.conf')
writeFileSync(config,`db-uri = "postgresql://postgres@127.0.0.1:${port}/${database}"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = 15433\ndb-max-rows = 1000\n`)
const pgLog=openSync(join(out,'postgrest.log'),'a')
const restProcess=spawn(pgrest,[config],{env,windowsHide:true,stdio:['ignore',pgLog,pgLog]})
let ready=false
for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:15433/');if(r.status<500){ready=true;break}}catch{}await wait(200)}
assert(ready,'PostgREST did not start')
console.log('QA PostgREST ready')

// Execute repository handlers unchanged, behind a small local Supabase URL gateway.
process.env.SUPABASE_URL=`http://127.0.0.1:${apiPort}`;process.env.SUPABASE_SERVICE_ROLE_KEY=service
const localEnv=existsSync('.env')?readFileSync('.env','utf8'):''
const coin=/^\s*COINGECKO_KEY\s*=\s*(.*?)\s*$/m.exec(localEnv)?.[1]?.replace(/^['"]|['"]$/g,'')
if(coin) process.env.COINGECKO_KEY=coin
const handlers=new Map();let loading='';let failureHost=''
globalThis.Deno={env:{get:name=>process.env[name]},serve:handler=>handlers.set(loading,handler)}
for(const slug of ['sync-b3-prices','sync-cvm-fii','sync-b3-dividends','sync-issuer-dividends','sync-macro-rates','sync-treasury-prices','calc-fixed-income','sync-global-assets','sync-dividends-yahoo']){loading=slug;await import(pathToFileURL(join(root,`supabase/functions/${slug}/index.ts`)))}
const nativeFetch=globalThis.fetch
globalThis.fetch=(input,init)=>{
 const u=String(input instanceof Request?input.url:input)
 if(failureHost && new URL(u).hostname===failureHost) return Promise.resolve(new Response(null,{status:503}))
 return nativeFetch(input,init)
}
const reports=[]
const server=createServer(async(req,res)=>{
 try{
  const address=new URL(req.url,`http://127.0.0.1:${apiPort}`)
  if(address.pathname==='/qa/model'){
   const [funds,dividends]=await Promise.all(['fundamentals?select=*&ticker=in.(GARE11,CPTS11,HGLG11)&order=ticker,reference_date.desc','dividends?select=*&ticker=eq.TFLO&order=ex_date.desc&limit=10'].map(p=>nativeFetch(`http://127.0.0.1:15433/${p}`,{headers:{Authorization:`Bearer ${user}`}}).then(r=>r.json())))
   res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'http://127.0.0.1:5175'});res.end(JSON.stringify({funds,dividends}));return
  }
  let response
  const chunks=[];for await(const chunk of req) chunks.push(chunk)
  const body=Buffer.concat(chunks)
  if(address.pathname.startsWith('/rest/v1/')) response=await nativeFetch(`http://127.0.0.1:15433/${address.pathname.slice(9)}${address.search}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body})
  else if(address.pathname.startsWith('/functions/v1/')){
   const handler=handlers.get(address.pathname.split('/').at(-1))
   response=handler?await handler(new Request(address,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body})):new Response('Unknown handler',{status:404})
  } else response=new Response('Unauthorized',{status:401})
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
 }catch(error){console.error('QA gateway failed:',error.message);res.writeHead(500);res.end('QA gateway failed')}
})
await new Promise(resolve=>server.listen(apiPort,'127.0.0.1',resolve))
const call=async(slug,body={},token=service)=>{
 const started=Date.now(), r=await nativeFetch(`http://127.0.0.1:${apiPort}/functions/v1/${slug}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(240000)})
 const value=await r.json();const row={job:slug,status:r.status,elapsed_ms:Date.now()-started,result:value};reports.push(row);writeFileSync(join(out,'integration-results.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(row));return row
}
const snapshot=()=>query(`select (select count(*) from positions) positions,(select count(*) from transactions) transactions,(select count(*) from fixed_income_events) events,(select sum(principal) from fixed_income_positions) principal`)[0]
const before=snapshot()
try{
 for(const slug of ['sync-b3-prices','sync-cvm-fii','sync-b3-dividends','sync-issuer-dividends']) assert.equal((await call(slug,{},user)).status,401)
 assert.equal((await call('sync-b3-prices')).status,200)
 assert(query('select * from asset_market_identifiers').length>=5,'Missing official identifiers')
 assert.equal((await call('sync-cvm-fii')).status,200)
 assert(query("select vpa from fundamentals where ticker='GARE11' order by reference_date desc limit 1")[0].vpa>0)
 assert.equal(query("select vpa from fundamentals where ticker='HGLG11' order by reference_date desc limit 1")[0].vpa,123.45)
 const reportCount=query('select count(*)::integer n from cvm_fii_reports')[0].n
 assert.equal((await call('sync-cvm-fii')).status,200)
 assert.equal(query('select count(*)::integer n from cvm_fii_reports')[0].n,reportCount)
 assert.equal((await call('sync-b3-dividends')).status,200)
 assert.equal((await call('sync-issuer-dividends',{discover:true})).status,200)
 assert.equal((await call('sync-issuer-dividends')).status,200)
 const distribution=query("select * from dividends where ticker='TFLO' and ex_date='2026-11-02'")[0]
 assert.equal(distribution.source,'ishares');assert.equal(distribution.value_per_share,0.171627);assert.equal(distribution.payment_date,'2026-11-05')
 // Cold start: indexes exist but Treasury PU has not been ingested yet.
 // Partial recalculation must report that gap, preserving that lot's balance.
 assert.equal((await call('sync-macro-rates',{recalculate:true})).status,503)
 assert.equal((await call('sync-treasury-prices')).status,200)
 assert.equal((await call('sync-macro-rates',{recalculate:true})).status,200)
 assert.equal((await call('sync-global-assets',{providers:['coingecko']})).status,200)
 // Source failure must preserve the previous public data and return incomplete.
 failureHost='dados.cvm.gov.br';assert.equal((await call('sync-cvm-fii')).status,503);failureHost=''
 assert.equal(query('select count(*)::integer n from cvm_fii_reports')[0].n,reportCount)
 assert.deepEqual(snapshot(),before,'Personal fixture history changed')
 writeFileSync(join(out,'assertions.json'),JSON.stringify({passed:true,reportCount,before,after:snapshot(),note:'Local PostgreSQL/PostgREST; cron registration recorded by stub, jobs invoked by HTTP'},null,2))
 console.log('INTEGRATION ASSERTIONS PASSED; local API remains available for browser verification')
}catch(error){failureHost='';writeFileSync(join(out,'failure.txt'),error.stack);console.error('INTEGRATION ASSERTION FAILED:',error.message)}

process.on('SIGINT',()=>{server.close();restProcess.kill();try{execFileSync(join(bin,'pg_ctl.exe'),['-D',data,'-m','fast','stop'],{env,windowsHide:true,stdio:'pipe'})}catch{}process.exit(0)})
