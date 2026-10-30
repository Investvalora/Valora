import { useQueryClient } from '@tanstack/react-query'
import { useAssetDataSyncState, syncAssetData } from '../services/assetDataSync'
import { useAuth } from '../../auth/hooks/useAuth'

export function AssetDataSyncNotice({ tickers }: { tickers: string[] }) {
  const { pending, warnings } = useAssetDataSyncState()
  const visible = pending.filter(ticker => tickers.includes(ticker))
  const issues = Object.entries(warnings).filter(([ticker]) => tickers.includes(ticker))
  return <>
    {visible.length > 0 && <p role="status" className="text-sm text-white/60">Atualizando cotação, histórico, proventos e indicadores de {visible.join(', ')}…</p>}
    {issues.map(([ticker, message]) => <p role="status" key={ticker} className="text-sm text-amber-300">
      {ticker}: {message}{' '}
      <RetrySync ticker={ticker} disabled={pending.includes(ticker)} />
    </p>)}
  </>
}

function RetrySync({ ticker, disabled }: { ticker: string; disabled: boolean }) {
  const { user } = useAuth()
  const client = useQueryClient()
  return <button type="button" className="underline" disabled={disabled} onClick={() => { if (user) void syncAssetData(client, user.id, ticker) }}>Tentar novamente</button>
}

export function RefreshAssetDataButton({ ticker, className, onStarted }: { ticker: string; className?: string; onStarted: () => void }) {
  const { user } = useAuth()
  const client = useQueryClient()
  const pending = useAssetDataSyncState(state => state.pending.includes(ticker))
  return <button type="button" className={className} disabled={!user || pending} onClick={() => {
    if (!user) return
    void syncAssetData(client, user.id, ticker)
    onStarted()
  }}>{pending ? 'Atualizando dados…' : 'Atualizar dados de mercado'}</button>
}
