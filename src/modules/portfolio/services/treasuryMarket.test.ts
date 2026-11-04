import { expect, it } from 'vitest'
import { parseTreasuryLine, treasuryValueAt } from '../../../../supabase/functions/_shared/treasury'
import { fixedIncomeAt } from '../../dashboard/historicalValuation'
const lot = {type:'tesouro_ipca' as const,indexer:'ipca' as const,rate:7.19,principal:102.0009,application_date:'2025-05-20',maturity_date:'2029-05-15',treasury_quantity:0.03}
const quote = {type:'tesouro_ipca',maturity_date:'2029-05-15',date:'2026-10-30',base_price:3944.73}
it('parses only official D0 base prices, never purchase prices or coupon bonds',()=>{
 expect(parseTreasuryLine('Tesouro IPCA+;15/05/2029;30/10/2026;7,1;7,2;4.000,00;3.950,00;3.944,73')).toEqual(quote)
 expect(parseTreasuryLine('Tesouro IPCA+ com Juros Semestrais;15/05/2029;30/10/2026;7;7;4000;3950;3944,73')).toBeNull()
 expect(parseTreasuryLine('Tesouro IPCA+;31/02/2029;30/10/2026;7;7;4000;3950;3944,73')).toBeNull()
})
it('values exact units without depending on unpublished IPCA',()=>{
 expect(fixedIncomeAt(lot,'2026-10-31',[],[quote])).toBeCloseTo(118.3419)
 expect(treasuryValueAt({...lot,treasury_quantity:0.01},'2026-10-31',[quote])?.value).toBeCloseTo(39.4473)
})
it('never uses a future quote, another maturity or an old price as a current value',()=>{
 expect(treasuryValueAt(lot,'2026-10-29',[quote])).toBeNull()
 expect(treasuryValueAt(lot,'2026-11-15',[quote])).toBeNull()
 expect(treasuryValueAt({...lot,maturity_date:'2035-05-15'},'2026-10-31',[quote])).toBeNull()
 expect(treasuryValueAt({...lot,name:'Tesouro IPCA+ com Juros Semestrais'},'2026-10-31',[quote])).toBeNull()
})
it('does not infer quantity from principal and does not silently replace a missing market price with a contract estimate',()=>{
 expect(treasuryValueAt({...lot,treasury_quantity:null},'2026-10-31',[quote])).toBeNull()
 expect(fixedIncomeAt(lot,'2026-10-31',[],[])).toBeNull()
 expect(fixedIncomeAt({...lot,active:false},'2026-10-31',[],[quote])).toBeNull()
})
it('does not guess quantity following a partial redemption or cashflow event',()=>{
 expect(treasuryValueAt({...lot,events:[{}]},'2026-10-31',[quote])).toBeNull()
 expect(treasuryValueAt(lot,'2029-05-15',[quote])).toBeNull()
})

it('keeps the October return complete when official market prices are present and October IPCA is not published', async()=>{
 const { historicalReturns, summarizeHistoricalReturns } = await import('../../performance/utils/historicalReturns')
 const points = historicalReturns([],[],[],[{...lot,application_date:'2026-09-30'}],{usd:[],macro:[],treasury:[{...quote,date:'2026-09-30'},...Array.from({length:31},(_,i)=>({...quote,date:`2026-10-${String(i+1).padStart(2,'0')}`}))]},'2026-10-31')
 const result=summarizeHistoricalReturns(points,'2026-10-01','2026-11-04')
 expect(result.incomplete).toBe(false)
 expect(result.returnPct).toBeCloseTo(0)
})
