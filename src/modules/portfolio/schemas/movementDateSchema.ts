import { z } from 'zod'
import { parseIsoDate, toIsoDate } from '../../../shared/utils/isoDate'

/** Data civil de uma operação realizada; vencimentos não usam esta regra. */
export const movementDateSchema = z.string().refine(
  value => /^\d{4}-\d{2}-\d{2}$/.test(value) && parseIsoDate(value) !== null && value <= toIsoDate(new Date()),
  'Informe uma data válida, até hoje.',
)
