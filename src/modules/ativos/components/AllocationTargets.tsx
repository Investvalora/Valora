import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { supabase } from '../../../shared/services/supabaseClient'
import { assetClassLabel } from '../../portfolio/composition'
import { useAtivosValuation } from '../hooks/useAtivosValuation'
import { ALLOCATION_CLASSES, allocationGap, validTargets, type AllocationTargets as Targets } from '../utils/allocationTargets'
import { fmtMoney } from '../utils/fmt'

export function AllocationTargets({ walletId }: { walletId: string }) {
  const { user } = useAuth()
  const cache = useQueryClient()
  const key = ['wallets', 'allocation-targets', user?.id, walletId]
  const query = useQuery({ queryKey: key, enabled: Boolean(user?.id && walletId), queryFn: async () => {
    const { data, error } = await supabase.from('wallets').select('allocation_targets').eq('id', walletId).eq('user_id', user!.id).single()
    if (error) throw error
    return data.allocation_targets as Targets
  } })
  const valuation = useAtivosValuation(walletId, true)
  const [draft, setDraft] = useState<Targets | null>(null)
  const [error, setError] = useState('')
  const targets = draft ?? query.data ?? {}
  const save = useMutation({ mutationFn: async (value: Targets) => {
    if (!user || !walletId || !validTargets(value)) throw new Error('Metas inválidas')
    const { error } = await supabase.from('wallets').update({ allocation_targets: value }).eq('id', walletId).eq('user_id', user.id).select('id').single()
    if (error) throw error
    return value
  }, onSuccess: (value) => { cache.setQueryData(key, value); setDraft(null) } })
  const total = Object.values(targets).reduce((sum, value) => sum + (value ?? 0), 0)
  const ready = !valuation.isLoading && !valuation.isError && valuation.complete
  const editing = draft !== null
  const targetsReady = validTargets(targets) && Object.keys(targets).length > 0

  return <section className="mt-5 border-t border-white/10 pt-5" aria-label="Metas por classe">
    <h3 className="text-sm font-semibold text-white">Posição ideal e rebalanceamento</h3>
    <p className="mt-2 text-xs text-white/50">Metas da carteira inteira, incluindo renda fixa, sem os filtros de Ativos. Diferenças calculadas sobre o patrimônio atual; não incluem taxas nem executam ordens.</p>
    {query.isLoading ? <p role="status">Carregando metas…</p> : query.isError ? <p role="alert">Não foi possível carregar as metas. <button onClick={() => void query.refetch()}>Tentar novamente</button></p> : <>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[430px] text-right text-xs text-white/70">
        <thead><tr><th className="py-2 text-left">Classe</th><th>Atual</th><th>Meta</th><th>Diferença em R$</th></tr></thead>
        <tbody>{ALLOCATION_CLASSES.map((type) => {
          const current = valuation.compositionRows.filter((row) => (row.type ?? 'unknown') === type).reduce((sum, row) => sum + (row.marketValueBRL ?? 0), 0)
          const target = targets[type]
          const gap = ready && targetsReady && target !== undefined ? allocationGap(valuation.totalBRL, current, target) : null
          return <tr key={type} className="border-t border-white/5"><th className="py-3 text-left font-normal">{assetClassLabel(type)}</th>
            <td>{ready && valuation.totalBRL > 0 ? `${(current / valuation.totalBRL * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—'}</td>
            <td>{editing ? <input aria-label={`Meta ${assetClassLabel(type)}`} type="number" min="0" max="100" step="0.01" value={target ?? 0} disabled={save.isPending} onChange={(event) => { setError(''); setDraft({ ...targets, [type]: Number(event.target.value) }) }} className="min-h-10 w-20 rounded border border-white/15 bg-[#262626] px-2 text-right" /> : target === undefined ? '—' : `${target}%`}</td>
            <td className={gap === null ? '' : gap > 0 ? 'text-nf-green' : 'text-nf-pink'}>{gap === null ? '—' : `${gap > 0 ? '+' : ''}${fmtMoney(gap)}`}</td></tr>
        })}</tbody>
      </table></div>
      <p className="mt-3 text-xs text-white/50">Positivo: falta para a meta. Negativo: acima da meta. {editing && `Prévia não salva. Soma: ${total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%. Use até duas casas decimais.`}</p>
      {!ready && <p role="status" className="mt-2 text-xs text-white/50">A comparação aguarda a avaliação completa das posições.</p>}
      <div className="mt-4 flex gap-3">
        {editing ? <>
          <button disabled={save.isPending} onClick={() => { if (!validTargets(targets) || Object.keys(targets).length === 0) { setError('As metas devem somar 100%.'); return } save.mutate(targets) }} className="min-h-11 rounded-xl bg-nf-purple px-4 text-sm text-white disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar metas'}</button>
          <button disabled={save.isPending} onClick={() => { setDraft(null); setError(''); save.reset() }} className="min-h-11 text-sm text-white/60">Cancelar</button>
        </> : <button onClick={() => { setDraft(Object.fromEntries(ALLOCATION_CLASSES.map((type) => [type, query.data?.[type] ?? 0]))); save.reset() }} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm text-white">Editar metas</button>}
      </div>
      {(error || save.isError) && <p role="alert" className="mt-3 text-sm text-rose-300">{error || 'Não foi possível salvar as metas. Tente novamente.'}</p>}
      {save.isSuccess && !editing && <p role="status" className="mt-2 text-sm text-nf-green">Metas salvas.</p>}
    </>}
  </section>
}
