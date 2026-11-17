import assert from 'node:assert/strict'
import { readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// Inspect the active dependency graph, not stale packages in the pnpm store.
const graph=spawnSync('pnpm',['list','picomatch','--depth','Infinity','--parseable'],{encoding:'utf8',shell:process.platform==='win32',timeout:30000})
assert.equal(graph.status,0,graph.stderr || 'Cannot inspect picomatch dependencies')
const packages=new Set()
for(const line of graph.stdout.trim().split(/\r?\n/)) {
 const dir=line.trim()
 if(!dir)continue
 const pkg=JSON.parse(readFileSync(path.join(dir,'package.json'),'utf8'))
 if(pkg.name==='picomatch')packages.add(realpathSync(dir))
}
assert.equal(packages.size,2,'Review the mitigation when picomatch versions change')
for(const dir of packages) {
 const source=readFileSync(path.join(dir,'lib/parse.js'),'utf8')
 assert.ok(source.includes('Valora GHSA-fc5q-39xc-vjpf mitigation'),'Active picomatch dependency is not patched')
 const probe=spawnSync(process.execPath,['--input-type=commonjs','-e',`
  const assert=require('node:assert/strict'); const pm=require(process.argv[1]);
  for(const pattern of ['+(*)','+(*a)','*(*a)','+(*a|b)','+(?*a)']) {
   const re=pm.makeRe(pattern);
   assert.equal(re.test('a'.repeat(64)+'!'),false);
   if(pattern!=='+(?*a)') assert.equal(re.test(pattern),true,'Risky repeated extglob must be literal');
  }
  assert.equal(pm('src/**/*.tsx')('src/pages/Home.tsx'),true);
  assert.equal(pm('+(ab)')('abab'),true);
  assert.equal(pm('@(foo|bar).js')('foo.js'),true);
 `,dir],{encoding:'utf8',timeout:3000})
 assert.equal(probe.status,0,probe.error?.message || probe.stderr || 'Unsafe or incompatible picomatch patch')
}
console.log('picomatch mitigation verified for both active versions')
