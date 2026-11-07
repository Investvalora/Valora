import { validIso } from '../_shared/officialFiles.ts'
const iso=(value:string)=>{const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);const result=m?`${m[3]}-${m[2]}-${m[1]}`:'';return validIso(result)?result:null}
export function b3Announcements(payload:unknown,ticker:string,isin:string,source_url:string) {
 if(!Array.isArray(payload) || payload.length!==1 || !Array.isArray(payload[0]?.cashDividends)) throw new Error('b3_schema_changed')
 return payload[0].cashDividends.flatMap((row:Record<string,string>)=>{
  if(row.isinCode!==isin || row.assetIssued!==isin) return []
  const type=row.label==='DIVIDENDO'?'dividend':row.label==='JRS CAP PROPRIO'?'jcp':null
  if(!type) return []
  const record_date=iso(row.lastDatePrior ?? ''),payment_date=iso(row.paymentDate ?? ''),approval_date=iso(row.approvedOn ?? '')
  // Unknown payment dates remain unconfirmed; never substitute approval/record.
  if(!record_date || !payment_date || !approval_date) return []
  if(!/^\d+(,\d+)?$/.test(row.rate ?? '')) throw new Error('b3_invalid_amount')
  const value_per_share=Number(row.rate.replace(',','.'))
  if(!Number.isFinite(value_per_share)||value_per_share<=0||payment_date<record_date) throw new Error('b3_invalid_event')
  return [{ticker,isin,type,record_date,payment_date,approval_date,value_per_share,source_url}]
 })
}
