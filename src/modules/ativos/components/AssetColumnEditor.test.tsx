import { useState } from 'react'
import { beforeEach, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AssetColumnEditor } from './AssetColumnEditor'
import { AtivosTable } from './AtivosTable'
import { useAssetColumns } from '../hooks/useAssetColumns'
import type { PositionRow } from '../../portfolio/types'

const rows = [{ id: 'a', ticker: 'AAA3', name: 'Empresa A', quantity: 10, averagePrice: 10, quotePrice: 12, currency: 'BRL', type: 'stock_br', marketValueBRL: 120, weightPercent: 100, changePercent: 2, grahamPrice: 15 }] as PositionRow[]

function Harness() {
  const [userId, setUserId] = useState('user-a')
  const settings = useAssetColumns(userId)
  const [open, setOpen] = useState(false)
  return <MemoryRouter>
    <button onClick={() => setOpen(true)}>Editar colunas</button>
    <button onClick={() => setUserId('user-b')}>Trocar usuário</button>
    <AtivosTable rows={rows} totalBRL={120} visibleColumns={settings.columns} />
    {open && <AssetColumnEditor columns={settings.columns} onSave={settings.save} onClose={() => setOpen(false)} />}
  </MemoryRouter>
}

beforeEach(() => localStorage.clear())

it('aplica seleção ao salvar, persiste ao recarregar e isola usuários', async () => {
  const user = userEvent.setup()
  const view = render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'Editar colunas' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Editar colunas' }))
  expect(dialog.getByRole('checkbox', { name: 'Ativo' })).toBeDisabled()
  expect(dialog.getByRole('checkbox', { name: 'Quantidade' })).toBeDisabled()
  await user.click(dialog.getByRole('checkbox', { name: 'Nome' }))
  await user.click(dialog.getByRole('checkbox', { name: 'Preço justo (Graham)' }))
  expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
  await user.click(dialog.getByRole('button', { name: 'Salvar' }))
  expect(screen.queryByRole('columnheader', { name: 'Nome' })).not.toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Preço justo (Graham)' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: /15,00/ })).toBeInTheDocument()
  view.unmount()
  render(<Harness />)
  expect(screen.queryByRole('columnheader', { name: 'Nome' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Trocar usuário' }))
  expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
})

it('descarta alterações ao cancelar e restaura o padrão somente ao salvar', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'Editar colunas' }))
  await user.click(screen.getByRole('checkbox', { name: 'Nome' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Editar colunas' }))
  await user.click(screen.getByRole('checkbox', { name: 'Nome' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await user.click(screen.getByRole('button', { name: 'Editar colunas' }))
  await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
  expect(screen.queryByRole('columnheader', { name: 'Nome' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
})
