import { expect, it } from 'vitest'
import { nextCollection } from './collectionSchedule'
it('projeta fundamentos após o horário de hoje e atravessa fim de semana em UTC', () => {
  expect(nextCollection('Fundamentos', Date.parse('2026-11-27T21:00:00Z'))).toBe('2026-11-30T21:00:00.000Z')
})
it('mantém as duas janelas do Tesouro e usa minuto estritamente futuro', () => {
  expect(nextCollection('Tesouro', Date.parse('2026-11-24T11:30:00Z'))).toBe('2026-11-24T22:30:00.000Z')
})
it('projeta o próximo lote de proventos e preserva cripto no fim de semana', () => {
  expect(nextCollection('Proventos', Date.parse('2026-11-28T10:00:00Z'))).toBe('2026-11-28T10:02:00.000Z')
  expect(nextCollection('Cotações', Date.parse('2026-11-28T10:00:00Z'))).toBe('2026-11-28T10:10:00.000Z')
})
