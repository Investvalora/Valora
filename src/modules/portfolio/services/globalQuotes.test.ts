import { expect, it } from 'vitest'
import { quoteStamp, selectedProviders } from '../../../../supabase/functions/sync-global-assets/quotes'
const now = Date.parse('2026-11-04T22:00:00Z')
it('keeps the real previous session date rather than assigning today', () => {
 expect(quoteStamp(Date.parse('2026-11-03T21:00:00Z')/1000,771.16,now)).toEqual({date:'2026-11-03',market_time:'2026-11-03T21:00:00.000Z'})
})
it('rejects missing timestamps, future timestamps and invalid prices', () => {
 for (const [t,p] of [[undefined,1],[now/1000+400,1],[now/1000,0],[now/1000,Infinity],[1,1]]) expect(()=>quoteStamp(t,p,now)).toThrow()
})
it('separates crypto scheduling from stock providers', () => {
 expect(selectedProviders({providers:['coingecko']})).toEqual(['coingecko'])
 expect(selectedProviders({providers:['finnhub','awesomeapi']})).not.toContain('coingecko')
 expect(()=>selectedProviders({providers:['unknown']})).toThrow()
 expect(()=>selectedProviders({providers:[]})).toThrow()
})
