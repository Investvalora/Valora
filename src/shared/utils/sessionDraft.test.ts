import { beforeEach, expect, it, vi } from 'vitest'
import { clearSessionDrafts, draftKey, readDraft, saveDraft } from './sessionDraft'
beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks() })
it('separa conta/carteira e preserva campos apenas na sessão da aba', () => {
  const key = draftKey('a','wallet-a','csv')
  expect(saveDraft(key,{ quantity: '2' })).toBe(true)
  expect(readDraft(key)).toEqual({ quantity: '2' })
  expect(readDraft(draftKey('b','wallet-a','csv'))).toBeNull()
  expect(readDraft(draftKey('a','wallet-b','csv'))).toBeNull()
  sessionStorage.setItem('unrelated','keep')
  clearSessionDrafts()
  expect(readDraft(key)).toBeNull()
  expect(sessionStorage.getItem('unrelated')).toBe('keep')
})
it('expira e ignora armazenamento corrompido', () => {
  const key = draftKey('a','w','form')
  saveDraft(key,{ price: '10' })
  vi.spyOn(Date,'now').mockReturnValue(Date.now()+9*60*60*1000)
  expect(readDraft(key)).toBeNull()
  sessionStorage.setItem(key,'invalid JSON')
  expect(readDraft(key)).toBeNull()
})
