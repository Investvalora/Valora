import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { fixedIncomeService } from '../../portfolio/services/fixedIncomeService'
import { useCalcFixedIncome } from '../../portfolio/hooks/useCalcFixedIncome'
import type { PositionRow } from '../../portfolio/types'
export function TreasuryMarketForm({ lot }: { lot: PositionRow }) {
 const { user }=useAuth(), client=useQueryClient()
 const { calc, error: calcError }=useCalcFixedIncome()
 const [quantity,setQuantity]=useState(String(lot.fixedIncome?.treasury_quantity ?? ''))
 const [maturity,setMaturity]=useState(lot.fixedIncome?.maturity_date ?? '')
 const [busy,setBusy]=useState(false), [message,setMessage]=useState('')
 return <form className="mt-3 space-y-3 border-t border-white/10 pt-3" onSubmit={async e=>{
  e.preventDefault();if(!user) return;setBusy(true);setMessage('')
  try {
   await fixedIncomeService.configureTreasury(user.id,lot.id,Number(quantity.replace(',','.')),maturity)
   await calc();await client.invalidateQueries({queryKey:['portfolio','fixed-income']});await client.invalidateQueries({queryKey:['portfolio','fixed-income-history']})
   setMessage('Dados salvos. O saldo usa o preço oficial disponível; se ainda não houver preço, aguarde a próxima sincronização.')
  } catch {setMessage('Não foi possível salvar. Confira quantidade e vencimento.')} finally {setBusy(false)}
 }}>
 <p className="text-xs text-white/60">Marcação a mercado para títulos sem cupons. Use a quantidade exata do extrato, sem converter o valor aplicado.</p>
 <label className="block text-xs">Quantidade de títulos<input aria-label="Quantidade de títulos" value={quantity} onChange={e=>setQuantity(e.target.value)} required inputMode="decimal" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-3" /></label>
 <label className="block text-xs">Vencimento<input aria-label="Vencimento do título" type="date" value={maturity} onChange={e=>setMaturity(e.target.value)} required className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-3" /></label>
 <button disabled={busy} type="submit" className="rounded-xl bg-white/10 px-4 py-3 text-xs disabled:opacity-50">{busy?'Salvando…':'Usar preço de mercado'}</button>
 {(message || calcError) && <p role="status" className="text-xs text-white/60">{calcError ?? message}</p>}
 </form>
}
