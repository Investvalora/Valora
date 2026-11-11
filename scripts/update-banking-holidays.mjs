import {writeFile} from 'node:fs/promises'
const years={}
for(let first=2001;first<=2030;first+=3){
 await Promise.all(Array.from({length:Math.min(3,2031-first)},(_,i)=>first+i).map(async year=>{
  const r=await fetch(`https://www.anbima.com.br/feriados/fer_nacionais/${year}.asp`,{signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw Error(`HTTP ${r.status}`)
  const t=await r.text(); const matches=[...t.matchAll(/>\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*<\/td>/g)]
  const dates=matches.map(m=>{
    if(Number(m[3])!==year && Number(m[3])!==year%100)throw Error(`Unexpected calendar year ${year}`)
    const iso=`${year}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
    if(!Number.isFinite(Date.parse(iso))||new Date(iso).toISOString().slice(0,10)!==iso)throw Error(`Invalid holiday ${iso}`)
    return iso
  })
  if(dates.length<10||dates.length>15||new Set(dates).size!==dates.length)throw Error(`Calendar schema ${year}: ${dates.length}`)
  years[year]=dates.sort()
 }))
}
await writeFile('supabase/functions/_shared/bankingHolidays.ts',`// ANBIMA annual banking calendars, retrieved ${new Date().toISOString().slice(0,10)}.\n// https://www.anbima.com.br/feriados/fer_nacionais/{year}.asp\n// No municipal holidays or exchange-only closures. Review source updates annually.\nexport const bankingHolidays: Record<string, readonly string[]> = ${JSON.stringify(years,null,2)}\n`)
console.log('Calendars checked:',Object.keys(years).length)
