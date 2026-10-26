import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useSidebarPreference } from './useSidebarPreference'

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })

it('carrega a escolha salva, compartilha alterações e separa usuários', () => {
  localStorage.setItem('valora:sidebar:v1:owner', 'compact')
  const first = renderHook(() => useSidebarPreference('owner'))
  const second = renderHook(() => useSidebarPreference('owner'))
  expect(first.result.current.compact).toBe(true)
  act(() => first.result.current.setCompact(false))
  expect(second.result.current.compact).toBe(false)
  expect(localStorage.getItem('valora:sidebar:v1:owner')).toBe('expanded')
  const other = renderHook(() => useSidebarPreference('other'))
  act(() => other.result.current.setCompact(true))
  expect(first.result.current.compact).toBe(false)
  expect(other.result.current.compact).toBe(true)
})

it('funciona na sessão quando o navegador bloqueia o armazenamento', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  const hook = renderHook(() => useSidebarPreference('blocked'))
  expect(hook.result.current.compact).toBe(false)
  act(() => hook.result.current.setCompact(true))
  expect(hook.result.current.compact).toBe(true)
})
