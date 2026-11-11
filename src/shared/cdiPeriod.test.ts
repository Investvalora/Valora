import { expect, it } from 'vitest'
import { cdiPeriod } from '../../supabase/functions/_shared/cdi'
const rate = (date:string) => ({date,value:13.65})
it('não antecipa a taxa do corte e informa a referência econômica', () => {
 const result=cdiPeriod([rate('2026-11-05'),rate('2026-11-06')],'2026-11-05','2026-11-06','2026-11-06')
 expect(result.rows).toHaveLength(1); expect(result.referenceDate).toBe('2026-11-05')
})
it('detecta um único dia útil ausente no meio, início ou fim histórico', () => {
 for(const rows of [[rate('2026-11-04'),rate('2026-11-06')],[rate('2026-11-05'),rate('2026-11-06')],[rate('2026-11-04'),rate('2026-11-05')]])
  expect(()=>cdiPeriod(rows,'2026-11-04','2026-11-07','2026-11-11')).toThrow('Lacuna CDI')
})
it('tolera somente a última publicação útil recente sem antecipar rendimento', () => {
 expect(cdiPeriod([rate('2026-11-05')],'2026-11-05','2026-11-09','2026-11-09').referenceDate).toBe('2026-11-05')
 expect(()=>cdiPeriod([rate('2026-11-04')],'2026-11-04','2026-11-09','2026-11-09')).toThrow('Lacuna CDI')
})
it('respeita fins de semana, Carnaval, Corpus Christi e Consciência Negra', () => {
 for(const [from,to,asOf] of [['2026-02-13','2026-02-18','2026-02-18'],['2026-06-03','2026-06-05','2026-06-05'],['2026-11-19','2026-11-23','2026-11-23']])
  expect(cdiPeriod([rate(from)],from,to,asOf).referenceDate).toBe(from)
})
it('não confunde ausência de atendimento em 31/12 com feriado bancário', () => {
 expect(()=>cdiPeriod([rate('2026-12-30')],'2026-12-30','2027-01-01','2027-01-05')).toThrow('2026-12-31')
})
it('rejeita série vazia, duplicatas, datas impossíveis e taxas inválidas', () => {
 expect(()=>cdiPeriod([],'2026-11-05','2026-11-06','2026-11-06')).toThrow('indisponível')
 expect(()=>cdiPeriod([rate('2026-11-05'),rate('2026-11-05')],'2026-11-05','2026-11-06','2026-11-06')).toThrow('duplicada')
 expect(()=>cdiPeriod([{...rate('2026-11-05'),value:NaN}],'2026-11-05','2026-11-06','2026-11-06')).toThrow('inválida')
 expect(()=>cdiPeriod([rate('2026-02-30')],'2026-02-01','2026-03-01','2026-03-02')).toThrow('inválida')
})
it('não inventa calendário fora dos anos verificados nem aceita CDI em feriado', () => {
 expect(()=>cdiPeriod([rate('2031-01-02')],'2031-01-02','2031-01-03','2031-01-03')).toThrow('Calendário')
 expect(()=>cdiPeriod([rate('2026-11-20')],'2026-11-20','2026-11-21','2026-11-23')).toThrow('inválida')
})
