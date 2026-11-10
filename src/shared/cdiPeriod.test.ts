import { expect, it } from 'vitest'
import { cdiPeriod } from '../../supabase/functions/_shared/cdi'

it('informa a referência econômica sem antecipar a taxa do dia de corte', () => {
  const result = cdiPeriod([{date:'2026-11-05',value:13.65},{date:'2026-11-06',value:99}], '2026-11-05','2026-11-06')
  expect(result.referenceDate).toBe('2026-11-05')
  expect(result.rows).toHaveLength(1)
})
it('preserva indisponibilidade para série vazia, lacunas internas, início ou fim sem cobertura', () => {
  expect(() => cdiPeriod([], '2026-01-01','2026-01-31')).toThrow('indisponível')
  expect(() => cdiPeriod([{date:'2026-01-01',value:10},{date:'2026-01-30',value:10}], '2026-01-01','2026-01-31')).toThrow('Lacuna')
  expect(() => cdiPeriod([{date:'2026-01-30',value:10}], '2026-01-01','2026-01-31')).toThrow('Lacuna')
  expect(() => cdiPeriod([{date:'2026-01-01',value:10}], '2026-01-01','2026-01-31')).toThrow('desatualizado')
})
it('aceita intervalos curtos sem publicação e recusa datas repetidas ou taxas inválidas', () => {
  const rate = {date:'2026-11-05',value:13.65}
  expect(cdiPeriod([rate], '2026-11-05','2026-11-09').referenceDate).toBe('2026-11-05')
  expect(() => cdiPeriod([rate,rate], '2026-11-05','2026-11-09')).toThrow('duplicada')
  expect(() => cdiPeriod([{...rate,value:NaN}], '2026-11-05','2026-11-09')).toThrow('inválida')
})
