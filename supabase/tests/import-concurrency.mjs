// Local Docker only; no connection string or hosted project accepted.
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const container = process.argv[2] ?? 'supabase_db_valora'
if (!['supabase_db_valora','supabase_db_replay'].includes(container)) throw new Error('Use the disposable local Supabase')
const args = ['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-tA']
const sql = text => execFileSync('docker',args,{input:text,encoding:'utf8'})
const owner = randomUUID()
const ticker = `QA${owner.replaceAll('-','').slice(0,12).toUpperCase()}`
try {
  sql(`INSERT INTO public.assets(ticker,name,type,quote_provider) VALUES('${ticker}','Concurrency fixture','stock_br','brapi');
    INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('${owner}','${owner}@concurrency.invalid','{"full_name":"Concurrency fixture"}');`)
  const wallet = sql(`SELECT id FROM public.wallets WHERE user_id='${owner}' LIMIT 1;`).trim()
  const payload = JSON.stringify([{ticker,type:'buy',quantity:1,price:10,brokerage_fee:0,transaction_date:'2026-01-02'}])
  const request = `BEGIN; SELECT set_config('request.jwt.claim.sub','${owner}',true); SET LOCAL ROLE authenticated;
    SELECT public.import_owned_transactions('${wallet}','concurrent.csv','${payload}'::jsonb); SELECT pg_sleep(1); COMMIT;`
  const invoke = () => new Promise((resolve,reject) => {
    const child = spawn('docker',args)
    let out='', error=''
    child.stdout.on('data',chunk => { out+=chunk })
    child.stderr.on('data',chunk => { error+=chunk })
    child.on('error',reject)
    child.on('close',code => code===0 ? resolve(out) : reject(new Error(error)))
    child.stdin.end(request)
  })
  const results = await Promise.all([invoke(),invoke()])
  const receipts = results.map(out => out.split('\n').find(line => line.startsWith('{'))).map(line => JSON.parse(line))
  if (receipts.filter(r => r.duplicate).length!==1 || receipts[0].batch_id!==receipts[1].batch_id) throw new Error('Concurrent requests produced different receipts')
  const count = sql(`SELECT count(*) FROM public.transactions WHERE user_id='${owner}';`).trim()
  if (count!=='1') throw new Error('Concurrent import duplicated transactions')
  console.log('Concurrent import: one transaction, one receipt, retry recognized.')
} finally {
  sql(`DELETE FROM auth.users WHERE id='${owner}'; DELETE FROM public.assets WHERE ticker='${ticker}';`)
}
