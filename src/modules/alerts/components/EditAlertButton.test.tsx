import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { EditAlertButton } from './EditAlertButton'
import type { Alert } from '../types'

const save = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useAlertMutations', () => ({ useEditAlert: () => ({ mutateAsync: save, isPending: false }) }))
const alert = { id: 'a', ticker: 'MXRF11', type: 'price_target', status: 'lido', title: 'Meu alerta', description: 'Descrição antiga', target_price: 10, condition: 'below' } as Alert
beforeEach(() => { save.mockReset().mockResolvedValue(undefined) })
it('edita preço e condição, atualiza a descrição padrão e fecha após salvar', async () => {
  render(<EditAlertButton alert={alert} />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar alerta de MXRF11' }))
  fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '12.5' } })
  fireEvent.change(screen.getByLabelText('Condição'), { target: { value: 'above' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith({ alert, payload: expect.objectContaining({ targetPrice: 12.5, condition: 'above', description: expect.stringContaining('acima de') }) }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
it('cancela sem salvar e mostra erro se a atualização falhar', async () => {
  save.mockRejectedValue(new Error('Falha'))
  render(<EditAlertButton alert={{ ...alert, type: 'overvalued', status: 'ignorado' }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Editar alerta de MXRF11' }))
  expect(screen.queryByLabelText('Preço-alvo (R$)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
