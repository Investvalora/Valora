import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseCsvTransactions, MAX_PREVIEW_ROWS, type CsvImportError, type ParsedTransactionRow } from '../csv/csvParser'
import { transactionsService } from '../services/transactionsService'
import { useImportTransactions } from '../hooks/useImportTransactions'

const HEADER = 'data;ticker;tipo;quantidade;preço;corretagem'
const FIELDS = ['date', 'ticker', 'type', 'quantity', 'price', 'brokerageFee'] as const

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
  const [rows, setRows] = useState<ParsedTransactionRow[]>([])
  const [fileError, setFileError] = useState('')
  const [totalRows, setTotalRows] = useState(0)
  const [isReading, setIsReading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const validationVersion = useRef(0)

  const validateRows = async (nextRows: ParsedTransactionRow[]) => {
    const version = validationVersion.current + 1
    validationVersion.current = version
    try {
      const validatedRows = await transactionsService.validateTickers(nextRows)
      if (version !== validationVersion.current) return
      setRows(validatedRows)
      setFileError('')
    } catch {
      setFileError('Não foi possível validar os tickers no catálogo. Tente novamente.')
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    setIsReading(true)
    setSuccessMessage('')
    setFileError('')
    try {
      const result = parseCsvTransactions(await file.arrayBuffer())
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
    try {
      const count = await importMutation.mutateAsync(rows)
      setSuccessMessage(`${count} ${count === 1 ? 'transação importada' : 'transações importadas'} com sucesso.`)
      setRows([])
      setTotalRows(0)
    } catch {
      setFileError('Não foi possível confirmar a importação. Nenhuma linha foi declarada como importada; revise o preview e tente novamente.')
    }
  }

  const selectedCount = rows.filter((row) => row.selected && row.errors.length === 0 && !row.skipped).length
  const visibleRows = rows.slice(0, MAX_PREVIEW_ROWS)

  return (
    <main className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Importar transações</h1>
          <p className="mt-1 text-sm text-gray-400">Valide o CSV antes de gravar sua carteira.</p>
        </div>
        <button type="button" onClick={() => navigate('/carteira')} className="text-sm text-gray-300 underline hover:text-white">
          Voltar para carteira
        </button>
      </header>

      <section className="rounded-lg border border-dark-border bg-dark-surface p-6" aria-label="Upload de CSV">
        <label htmlFor="transaction-csv" className="block text-sm font-medium text-white">Arquivo CSV</label>
        <input
          id="transaction-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          disabled={isReading || importMutation.isPending}
          className="mt-2 block w-full text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="mt-2 text-xs text-gray-400">Colunas obrigatórias: data, ticker, tipo, quantidade, preço e corretagem. Até 1000 linhas.</p>
      </section>

      {fileError && <p className="mt-4 rounded border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300" role="alert">{fileError}</p>}
      {successMessage && <p className="mt-4 rounded border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-300" role="status">{successMessage}</p>}

      {rows.length > 0 && (
        <section className="mt-6" aria-label="Preview das transações">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-300">{totalRows} linhas encontradas; {selectedCount} selecionadas.</p>
            <button type="button" onClick={selectValidRows} className="text-sm font-medium text-blue-300 underline hover:text-blue-200">Selecionar linhas válidas</button>
          </div>
          {totalRows > MAX_PREVIEW_ROWS && <p className="mb-3 text-sm text-amber-300">Exibindo as primeiras {MAX_PREVIEW_ROWS} linhas; as linhas válidas restantes continuam incluídas na confirmação.</p>}
          <div className="overflow-x-auto rounded-lg border border-dark-border">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead className="bg-slate-800 text-xs uppercase text-gray-400">
                <tr><th className="px-3 py-3">Usar</th><th className="px-3 py-3">Linha</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Ticker</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Quantidade</th><th className="px-3 py-3">Preço</th><th className="px-3 py-3">Corretagem</th><th className="px-3 py-3">Validação</th></tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.rowNumber} className={row.errors.length > 0 ? 'border-t border-red-500/30 bg-red-500/5' : 'border-t border-dark-border'}>
                    <td className="px-3 py-3"><input aria-label={`Usar linha ${row.rowNumber}`} type="checkbox" checked={row.selected} onChange={(event) => toggleRow(row.rowNumber, event.target.checked)} /></td>
                    <td className="px-3 py-3">{row.rowNumber}</td>
                    {FIELDS.map((field) => (
                      <td className="px-3 py-3" key={field}><input aria-label={`${field} linha ${row.rowNumber}`} value={row[field]} onChange={(event) => void updateRow(row.rowNumber, field, event.target.value)} className="w-28 rounded border border-dark-border bg-slate-900 px-2 py-1 text-white" /></td>
                    ))}
                    <td className="max-w-xs px-3 py-3 text-xs text-red-300">{row.errors.length > 0 ? renderErrors(row.errors) : 'Válida'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void confirm()} disabled={selectedCount === 0 || importMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{importMutation.isPending ? 'Importando...' : 'Confirmar importação'}</button>
            <span className="text-sm text-gray-400">Linhas inválidas devem ser corrigidas ou desmarcadas.</span>
          </div>
        </section>
      )}
    </main>
  )
}