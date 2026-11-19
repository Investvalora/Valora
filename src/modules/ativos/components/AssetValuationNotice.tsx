import { LoadingState } from '../../../shared/components/LoadingState'
export function AssetValuationNotice({ loading, error, complete }: { loading: boolean; error: boolean; complete: boolean }) {
  if (loading) return <LoadingState label="Carregando posições e renda fixa…" variant="table" />
  if (error) return <p role="alert" className="text-sm text-red-300">Não foi possível carregar todos os saldos. O patrimônio total está indisponível.</p>
  if (!complete) return <p role="status" className="text-sm text-white/50">Faltam cotações ou câmbio para calcular o patrimônio completo.</p>
  return null
}
