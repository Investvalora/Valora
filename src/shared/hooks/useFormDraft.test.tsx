import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useFormDraft } from './useFormDraft'
import { readDraft, saveDraft } from '../utils/sessionDraft'

const validate = (value: unknown) => typeof value === 'string' ? value : null
beforeEach(() => sessionStorage.clear())
it('não mistura contextos, restaura só por escolha e remove ao voltar aos valores originais', () => {
  saveDraft('a', 'anterior')
  const form = renderHook(({ value }) => useFormDraft('a', value, value !== '', validate), { initialProps: { value: '' } })
  expect(form.result.current.available).toBe(true)
  expect(renderHook(() => useFormDraft('b', '', false, validate)).result.current.available).toBe(false)
  let restored: string | null = null
  act(() => { restored = form.result.current.restore() })
  expect(restored).toBe('anterior')
  form.rerender({ value: 'alterado' })
  expect(readDraft('a')).toBe('alterado')
  form.rerender({ value: '' })
  expect(readDraft('a')).toBeNull()
})
it('explica armazenamento indisponível sem impedir o preenchimento', () => {
  const setter = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('disabled') })
  const form = renderHook(() => useFormDraft('a', 'valor', true, validate))
  expect(form.result.current.storageFailed).toBe(true)
  act(() => form.result.current.clear())
  expect(form.result.current.storageFailed).toBe(false)
  setter.mockRestore()
})
it('rejeita conteúdo incompatível com o formulário', () => {
  saveDraft('a', { unexpected: true })
  expect(renderHook(() => useFormDraft('a', '', false, validate)).result.current.available).toBe(false)
})
