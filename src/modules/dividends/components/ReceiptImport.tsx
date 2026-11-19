import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { supabase } from '../../../shared/services/supabaseClient'
import { PanelCard } from '../../../shared/components/PanelCard'
import { toIsoDate } from '../../../shared/utils/isoDate'
import { parseReceiptCsv, RECEIPT_HEADER, type ReceiptInput } from '../utils/receiptCsv'

const action = 'min-h-9 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50'
function ReceiptForm({ walletId, walletName, close }: { walletId: string; walletName: string; close: () => void }) {
  const cache = useQueryClient()
  const [rows, setRows] = useState<ReceiptInput[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<{ new_rows: number; duplicates: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [fileName, setFileName] = useState('')
  async function load(file?: File) {
    setRows([]); setErrors([]); setPreview(null); setMessage(''); setConfirmed(false); setFileName(file?.name ?? '')
    if (!file) return
    if (file.size > 300000) { setErrors(['Arquivo acima de 300 KB.']); return }
    setBusy(true)
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
      const parsed = parseReceiptCsv(text, toIsoDate(new Date()))
      setRows(parsed.rows); setErrors(parsed.errors)
    } catch { setErrors(['Não foi possível ler o CSV. Use UTF-8.']) }
    finally { setBusy(false) }
  }
  async function submit(commit: boolean) {
    setBusy(true); setMessage('')
    try {
      const { data, error } = await supabase.rpc('import_income_statement', { p_wallet: walletId, p_rows: rows, p_commit: commit })
      if (error) throw error
      if (!commit) setPreview(data as { new_rows: number; duplicates: number })
      else {
        setMessage(`${data.new_rows} créditos importados; ${data.duplicates} já registrados.`)
        setRows([]); setPreview(null); setConfirmed(false)
        await cache.invalidateQueries({ predicate: q => ['dividends','portfolio','performance','dashboard'].includes(String(q.queryKey[0])) })
      }
    } catch (error) {
      setPreview(null)
      const text = (error as { message?: string }).message ?? ''
      setMessage(/Reference conflicts|manual reconciliation/.test(text)
        ? 'Há um crédito conflitante ou já conciliado sem referência. Revise o extrato antes de importar; nada deste lote foi salvo.'
        : /Ticker\/currency/.test(text) ? 'Confira o ticker cadastrado e a moeda de cada crédito. Nada deste lote foi salvo.'
        : commit
          ? 'Não foi possível confirmar o resultado. Valide novamente o mesmo arquivo antes de tentar importar; as referências impedem repetir os créditos já registrados.'
          : 'Não foi possível validar o lote. Confira os dados e tente novamente com uma sessão ativa. A validação não grava créditos.')
    } finally { setBusy(false) }
  }
  function sample() {
    const url = URL.createObjectURL(new Blob(['\uFEFF'+RECEIPT_HEADER+'\ncorretora;ID-DO-EXTRATO;2020-01-01;EXEMPLO;dividend;USD;0,06;0,02;0;0,04;;;\n'], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'modelo-recebimentos.csv'; link.click(); URL.revokeObjectURL(url)
  }
  return <PanelCard><div className="space-y-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-white">Importar recebimentos do extrato</h3><button className={action} disabled={busy} onClick={close}>Fechar</button></div>
    <p className="text-white/65">Destino: {walletName}. Cada linha confirma um crédito líquido. Não cria compras nem altera quantidades da carteira. Use valores na moeda do extrato, sem converter câmbio.</p>
    <p className="text-xs text-white/60">CSV UTF-8 separado por ponto e vírgula, até 500 créditos. Informe corretora, referência única, data, ticker, tipo dividend/jcp, BRL/USD, bruto, imposto, tarifa e líquido. Use 0 apenas para custo confirmado como zero. Quantidade, valor unitário e data COM são opcionais; não serão estimados. Se o crédito cair em data diferente do anúncio, a data COM ajuda a conciliá-lo. Este lote não confirma o mês inteiro.</p>
    <div className="flex flex-wrap items-center gap-2"><button onClick={sample} className={action}>Baixar modelo</button><label className={`${action} cursor-pointer focus-within:ring-2 focus-within:ring-violet-400`}>Escolher CSV<input aria-label="CSV de recebimentos" type="file" accept=".csv,text/csv" disabled={busy} className="sr-only" onChange={e => void load(e.target.files?.[0])} /></label></div>
    {fileName && <p className="break-all text-xs text-white/60">Arquivo: {fileName}</p>}
    {errors.length > 0 && <ul role="alert" className="max-h-44 overflow-auto text-xs text-red-300">{errors.map((e,i) => <li key={i}>{e}</li>)}</ul>}
    {rows.length > 0 && <><p className="text-white/70">{rows.length} créditos lidos. Prévia dos primeiros 10:</p><div className="overflow-x-auto"><table className="w-full text-left text-xs text-white/75"><thead><tr>{['Data','Ativo','Referência','Moeda','Bruto','Imposto','Tarifa','Líquido'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,10).map((r,i)=><tr key={i}>{[r.payment_date,r.ticker,r.reference,r.currency,r.gross_amount,r.withholding_amount,r.fees_amount,r.net_amount].map((c,j)=><td className="whitespace-nowrap p-2" key={j}>{c}</td>)}</tr>)}</tbody></table></div>
      <button className={action} disabled={busy || errors.length>0} onClick={() => void submit(false)}>Validar no banco</button></>}
    {preview && <div className="space-y-3"><p className="text-white/75">Novos: {preview.new_rows}. Referências já importadas: {preview.duplicates}.</p><label className="flex gap-2 text-white/70"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} />Conferi os créditos, referências, moeda e valores com meu extrato.</label><button className={action} disabled={busy || !confirmed || !preview.new_rows} onClick={() => void submit(true)}>Confirmar importação</button></div>}
    {busy && <p role="status" className="text-white/60">Validando…</p>}{message && <p role="status" className="text-white/75">{message}</p>}
  </div></PanelCard>
}
function Destination({ close }: { close: () => void }) {
  const { user } = useAuth(); const { selectedWallet } = useWallets()
  return user && selectedWallet ? <ReceiptForm key={`${user.id}:${selectedWallet.id}`} walletId={selectedWallet.id} walletName={selectedWallet.name} close={close} /> : <p className="text-sm text-white/65">Entre e selecione uma carteira para importar.</p>
}
export function ReceiptImport() {
  const [open,setOpen] = useState(false)
  return <div>{open ? <Destination close={()=>setOpen(false)} /> : <button className={action} onClick={()=>setOpen(true)}>Importar recebimentos</button>}</div>
}
