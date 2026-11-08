import { ArrowLeft, FileUp, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../../auth/hooks/useAuth'
import { draftKey, readDraft, saveDraft, removeDraft } from '../../../shared/utils/sessionDraft'
import { useNavigate } from 'react-router-dom'
import { parseCsvTransactions, MAX_PREVIEW_ROWS, type CsvImportError, type ParsedTransactionRow } from '../csv/csvParser'
import { transactionsService } from '../services/transactionsService'
import { useImportTransactions } from '../hooks/useImportTransactions'
import { useWallets } from '../hooks/useWallets'
import { useAllTransactions } from '../hooks/useTransactions'
import { duplicateRows } from '../csv/duplicatePreview'

const HEADER = 'data;ticker;tipo;quantidade;preço;corretagem'
const FIELDS = ['date', 'ticker', 'type', 'quantity', 'price', 'brokerageFee'] as const
const draftSchema = z.object({ fileName: z.string().min(1).max(255), rows: z.array(z.object({
  rowNumber: z.number().int().positive(), date: z.string(), ticker: z.string(),
  type: z.enum(['buy', 'sell', 'dividend', 'jcp', 'bonus', '']), quantity: z.string(), price: z.string(), brokerageFee: z.string(),
  selected: z.boolean(), skipped: z.boolean(),
})).min(1).max(1000) })

function reparseRow(row: ParsedTransactionRow, value: string, field: (typeof FIELDS)[number]) {
  const values = {
    date: row.date,
    ticker: row.ticker,
    type: row.type,
    quantity: row.quantity,
    price: row.price,
    brokerageFee: row.brokerageFee,
    [field]: value,
  }
  const parsed = parseCsvTransactions(
    `${HEADER}\n${values.date};${values.ticker};${values.type};${values.quantity};${values.price};${values.brokerageFee}`,
  ).rows[0]
  return { ...parsed, rowNumber: row.rowNumber, selected: row.selected, skipped: row.skipped }
}

function renderErrors(errors: CsvImportError[]) {
  return errors.map((item) => `${item.column}: ${item.message} Exemplo: ${item.example}`).join(' ')
}

export function TransactionImportPage() {
  const navigate = useNavigate()
  const importMutation = useImportTransactions()
  const { selectedWallet } = useWallets()
  const { user } = useAuth()
  const storageKey = user && selectedWallet ? draftKey(user.id, selectedWallet.id, 'csv') : null
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [draftWarning, setDraftWarning] = useState('')
  const history = useAllTransactions()
  const [fileName, setFileName] = useState('')
  const [previewWallet, setPreviewWallet] = useState<string | null>(null)
  const [acceptDuplicates, setAcceptDuplicates] = useState(false)
  const [rows, setRows] = useState<ParsedTransactionRow[]>([])
  const [fileError, setFileError] = useState('')
  const [totalRows, setTotalRows] = useState(0)
  const [isReading, setIsReading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const validationVersion = useRef(0)
  const duplicates = useMemo(() => duplicateRows(rows, history.data ?? []), [rows, history.data])
  const walletChanged = previewWallet !== null && previewWallet !== selectedWallet?.id

  useEffect(() => {
    setDraftAvailable(!!storageKey && draftSchema.safeParse(readDraft(storageKey)).success)
  }, [storageKey])
  useEffect(() => {
    if (!storageKey || !rows.length || walletChanged || isReading) return
    if (!saveDraft(storageKey, { fileName, rows })) setDraftWarning('Não foi possível guardar a prévia neste navegador. Preserve o CSV antes de recarregar.')
  }, [storageKey, rows, fileName, walletChanged, isReading])

  const restoreDraft = async () => {
    if (!storageKey) return
    const saved = draftSchema.safeParse(readDraft(storageKey))
    if (!saved.success) return
    const restored = saved.data.rows.map(row => reparseRow({ ...row, errors: [] }, row.date, 'date'))
    setRows(restored)
    setTotalRows(restored.length)
    setFileName(saved.data.fileName)
    setPreviewWallet(selectedWallet?.id ?? null)
    setAcceptDuplicates(false)
    setDraftAvailable(false)
    await validateRows(restored)
  }

  const validateRows = async (nextRows: ParsedTransactionRow[]) => {
    const version = validationVersion.current + 1
    validationVersion.current = version
    setIsValidating(true)
    try {
      const validatedRows = await transactionsService.validateTickers(nextRows)
      if (version !== validationVersion.current) return
      setRows(current => validatedRows.map(row => {
        const currentRow = current.find(item => item.rowNumber === row.rowNumber)
        return currentRow ? { ...row, selected: row.errors.length === 0 && currentRow.selected, skipped: currentRow.skipped } : row
      }))
      setFileError('')
    } catch {
      if (version !== validationVersion.current) return
      setFileError('Não foi possível validar os tickers no catálogo. Tente novamente.')
    } finally {
      if (version === validationVersion.current) setIsValidating(false)
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    setIsReading(true)
    setFileName(file.name || 'importacao.csv')
    setDraftAvailable(false)
    setPreviewWallet(selectedWallet?.id ?? null)
    setAcceptDuplicates(false)
    setSuccessMessage('')
    setFileError('')
    try {
      const result = parseCsvTransactions(await file.arrayBuffer())
      setRows(result.rows)
      setTotalRows(result.totalRows)
      if (result.errors.length > 0 && result.rows.length === 0) {
        setRows([])
        setFileError(renderErrors(result.errors))
      } else {
        await validateRows(result.rows)
      }
    } catch {
      setRows([])
      setFileError('Não foi possível ler o arquivo. Use CSV UTF-8 ou Windows-1252.')
    } finally {
      setIsReading(false)
    }
  }

  const updateRow = async (rowNumber: number, field: (typeof FIELDS)[number], value: string) => {
    setAcceptDuplicates(false)
    const nextRows = rows.map((row) => (row.rowNumber === rowNumber ? reparseRow(row, value, field) : row))
    setRows(nextRows)
    await validateRows(nextRows)
  }

  const toggleRow = (rowNumber: number, selected: boolean) => {
    setRows(rows.map((row) => (row.rowNumber === rowNumber ? { ...row, selected, skipped: !selected } : row)))
  }

  const selectValidRows = () => {
    setRows(rows.map((row) => ({ ...row, selected: row.errors.length === 0, skipped: row.errors.length > 0 })))
  }

  const confirm = async () => {
    if (isReading || isValidating || importMutation.isPending || fileError || walletChanged || !selectedWallet || history.isPending || history.isError || (duplicates.size > 0 && !acceptDuplicates)) return
    try {
      const { count, duplicate } = await importMutation.mutateAsync({ rows, fileName, walletId: selectedWallet.id })
      setSuccessMessage(duplicate ? `Este lote de ${count} transações já foi importado nesta carteira. Nenhuma transação foi duplicada.` : `${count} ${count === 1 ? 'transação importada' : 'transações importadas'} com sucesso.`)
      setRows([])
      setTotalRows(0)
      if (storageKey) removeDraft(storageKey)
      setDraftAvailable(false)
    } catch {
      void history.refetch()
      setFileError('Não foi possível confirmar o resultado da importação. Confira o histórico antes de repetir: uma falha de conexão pode ocorrer depois da gravação. Revalide a prévia para conferir possíveis duplicatas.')
    }
  }

  const selectedCount = rows.filter((row) => row.selected && row.errors.length === 0 && !row.skipped).length
  const visibleRows = rows.slice(0, MAX_PREVIEW_ROWS)

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-10 pt-6 sm:px-6 md:px-0 md:pt-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Importar transações</h1>
          <p className="mt-1 text-sm text-white/50">Valide o CSV antes de gravar sua carteira.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70"><Wallet className="h-3.5 w-3.5 text-nf-purple" aria-hidden="true" />Destino: {selectedWallet?.name ?? 'Selecione uma carteira'}</p>
          {fileName && <p className="mt-1 text-xs text-white/50">Arquivo: {fileName}</p>}
        </div>
        <button type="button" onClick={() => navigate('/carteira')} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/70 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar para carteira
        </button>
      </header>
      {draftAvailable && rows.length === 0 && <div role="status" className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Há uma prévia guardada nesta aba para esta carteira. Ela expira em 8 horas e não será enviada automaticamente.
        <button className="ml-3 underline" type="button" onClick={() => void restoreDraft()}>Restaurar prévia</button>
        <button className="ml-3 underline" type="button" onClick={() => { if (storageKey) removeDraft(storageKey); setDraftAvailable(false) }}>Descartar rascunho</button>
      </div>}
      {draftWarning && <p role="status" className="mb-4 text-sm text-amber-200">{draftWarning}</p>}

      <section className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-5 sm:p-6" aria-label="Upload de CSV">
        <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nf-purple/10 text-nf-purple"><FileUp className="h-5 w-5" aria-hidden="true" /></span><div><label htmlFor="transaction-csv" className="block text-sm font-semibold text-white">Arquivo CSV</label><p className="mt-1 text-xs text-white/50">Selecione o arquivo e confira a prévia antes de importar.</p></div></div>
        <input
          id="transaction-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          disabled={!selectedWallet || isReading || isValidating || importMutation.isPending}
          className="block min-h-12 w-full min-w-0 cursor-pointer rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-3 text-xs text-white/60 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-white/15 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-3 text-xs leading-relaxed text-white/50">Colunas obrigatórias: data, ticker, tipo, quantidade, preço e corretagem. Até 1000 linhas.</p>
        <p className="mt-3 text-xs leading-relaxed text-white/50">Tipo: buy (compra), sell (venda), dividend, jcp ou bonus. Data no formato AAAA-MM-DD. Preços e custos devem estar na moeda do ativo cadastrado.</p>
        <p className="mt-3 text-xs leading-relaxed text-white/50">O mesmo lote selecionado é importado uma única vez por carteira, mesmo em dispositivos diferentes. Linhas iguais dentro do arquivo são mantidas. Para uma nova operação idêntica a um lote anterior, use um lançamento manual.</p>
      </section>

      {fileError && <p className="mt-4 rounded border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300" role="alert">{fileError}</p>}
      {fileError && rows.length > 0 && <button type="button" disabled={isValidating || importMutation.isPending} className="mt-3 min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/70 hover:bg-white/5" onClick={() => void validateRows(rows)}>Revalidar prévia</button>}
      {walletChanged && <p role="alert" className="mt-4 text-amber-200">A carteira mudou. Selecione o arquivo novamente para conferir o destino antes de importar.</p>}
      {history.isError && <p role="alert" className="mt-4 text-amber-200">Não foi possível conferir o histórico para identificar duplicatas. <button type="button" className="underline" onClick={() => void history.refetch()}>Tentar novamente</button></p>}
      {successMessage && <p className="mt-4 rounded border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-300" role="status">{successMessage}</p>}

      {rows.length > 0 && (
        <section className="mt-6" aria-label="Preview das transações">
          {duplicates.size > 0 && <label className="mb-4 block rounded-xl border border-amber-500/40 p-3 text-sm text-amber-200"><input type="checkbox" checked={acceptDuplicates} onChange={event => setAcceptDuplicates(event.target.checked)} className="mr-2 h-4 w-4 accent-nf-purple" />Conferi as {duplicates.size} linhas com possível duplicidade e quero importar as selecionadas. Compras iguais podem ser legítimas; nenhuma foi removida automaticamente.</label>}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/65">{totalRows} linhas encontradas; {selectedCount} selecionadas.</p>
            <button type="button" disabled={importMutation.isPending} onClick={selectValidRows} className="min-h-11 rounded-full border border-white/15 px-4 text-xs font-medium text-white/70 hover:bg-white/5">Selecionar linhas válidas</button>
          </div>
          {totalRows > MAX_PREVIEW_ROWS && <p className="mb-3 text-sm text-amber-300">Exibindo as primeiras {MAX_PREVIEW_ROWS} linhas; as linhas válidas restantes continuam incluídas na confirmação.</p>}
          <div className="overflow-x-auto rounded-[14px] border border-white/10">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead className="bg-white/[0.04] text-[11px] font-medium uppercase tracking-wide text-white/50">
                <tr><th className="px-3 py-3">Usar</th><th className="px-3 py-3">Linha</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Ticker</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Quantidade</th><th className="px-3 py-3">Preço</th><th className="px-3 py-3">Corretagem</th><th className="px-3 py-3">Validação</th></tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.rowNumber} className={row.errors.length > 0 ? 'border-t border-red-500/30 bg-red-500/5' : 'border-t border-white/[0.08]'}>
                    <td className="px-3 py-3"><input disabled={importMutation.isPending} aria-label={`Usar linha ${row.rowNumber}`} type="checkbox" checked={row.selected} onChange={(event) => toggleRow(row.rowNumber, event.target.checked)} /></td>
                    <td className="px-3 py-3">{row.rowNumber}</td>
                    {FIELDS.map((field) => (
                      <td className="px-3 py-3" key={field}><input disabled={importMutation.isPending} aria-label={`${field} linha ${row.rowNumber}`} value={row[field]} onChange={(event) => void updateRow(row.rowNumber, field, event.target.value)} className="min-h-10 w-28 rounded-xl border border-white/15 bg-[#252525] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-nf-purple" /></td>
                    ))}
                    <td className="max-w-xs px-3 py-3 text-xs text-red-300">{row.errors.length > 0 ? renderErrors(row.errors) : duplicates.has(row.rowNumber) ? 'Possível duplicata: confira data, quantidade e preço.' : 'Válida'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void confirm()} disabled={selectedCount === 0 || !selectedWallet || walletChanged || history.isPending || history.isError || (duplicates.size > 0 && !acceptDuplicates) || isReading || isValidating || !!fileError || importMutation.isPending} className="min-h-11 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-purple disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{importMutation.isPending ? 'Importando...' : isValidating ? 'Validando...' : 'Confirmar importação'}</button>
            <span className="text-sm text-white/50">Linhas inválidas devem ser corrigidas ou desmarcadas.</span>
          </div>
        </section>
      )}
    </main>
  )
}
