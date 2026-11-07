import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { supabase } from '../../../shared/services/supabaseClient'
import { scoreRulesQueryKey } from '../hooks/useScoreRules'
import { STARTER_SCORE } from '../utils/starterScore'


export function StarterScore() {
  const { user } = useAuth()
  const client = useQueryClient()
  const create = useMutation({ mutationFn: async () => {
    if (!user) throw new Error('Sessão não encontrada')
    const existing = await supabase.from('score_rules').select('id').eq('user_id', user.id).limit(1)
    if (existing.error) throw existing.error
    if (existing.data?.length) return
    // One statement: all criteria succeed or none are persisted.
    const { error } = await supabase.from('score_rules').insert(STARTER_SCORE.map(rule => ({ ...rule, user_id: user.id })))
    if (error) throw error
  }, onSuccess: () => client.invalidateQueries({ queryKey: scoreRulesQueryKey(user?.id) }) })
  return <div className="max-w-xl rounded-[14px] border border-white/10 bg-[#1B1B1B] p-5 text-left">
    <h3 className="font-semibold text-white">Comece com um modelo editável</h3>
    <p className="mt-2 text-sm text-white/60">Exemplo para ações: cinco condições de 20 pontos, total de 100. Ajuste os limites ao setor e à sua análise; não é recomendação de investimento.</p>
    <ul className="my-3 space-y-1 text-xs text-white/70">{STARTER_SCORE.map(rule => <li key={rule.metric}>{({ pl: 'P/L de 1 a 15', pvp: 'P/VP de 0,1 a 2', roe: 'ROE ≥ 10%', net_margin: 'Margem líquida ≥ 5%', dy: 'DY ≥ 4%' } as Record<string, string>)[rule.metric]} · 20 pontos</li>)}</ul>
    <p className="mb-3 text-xs text-white/50">Após criar, clique em “Usar este score” para selecioná-lo. Dados ausentes não somam pontos.</p>
    <button disabled={create.isPending} onClick={() => create.mutate()} className="rounded-full border border-nf-blue/40 bg-nf-blue/10 px-4 py-2 text-sm text-nf-blue disabled:opacity-50">{create.isPending ? 'Criando…' : 'Criar modelo inicial'}</button>
    {create.isError && <p role="alert" className="mt-3 text-sm text-amber-200">Não foi possível criar o modelo. Tente novamente.</p>}
  </div>
}
