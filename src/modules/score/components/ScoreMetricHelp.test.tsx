import { scoreConditionText } from '../utils/scoreConditionText'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ScoreCalculationHelp, ScoreMetricHelp } from './ScoreMetricHelp'
import type { ScoreRule } from '../types'
const rule: ScoreRule = { id:'r',user_id:'u',name:'Dividendos',metric:'dy',operator:'gte',threshold_min:7,threshold_max:null,points:3,created_at:'' }
it('oferece explicação por toque e efeito da condição específica', () => {
  render(<ScoreMetricHelp metric="dy" rule={rule} />)
  const summary = screen.getByText('Entender DY (%)')
  expect(summary.closest('details')).not.toHaveAttribute('open')
  fireEvent.click(summary)
  expect(summary.closest('details')).toHaveAttribute('open')
  expect(screen.getByText(/maior ou igual a 7, soma 3 pontos/)).toBeVisible()
  expect(screen.getByText(/Não garante pagamentos futuros/)).toBeVisible()
})
it('explica intervalo inclusivo, penalidades e unidade do Yahoo sem converter a regra', () => {
  expect(scoreConditionText({ operator:'between',threshold_min:0.8,threshold_max:1.1 })).toBe('entre 0,8 e 1,1 (incluindo os limites)')
  render(<ScoreMetricHelp metric="debt_equity" rule={{...rule,metric:'debt_equity',operator:'lt',threshold_min:1.5,points:-2}} />)
  fireEvent.click(screen.getByText('Entender Dívida/PL'))
  expect(screen.getByText(/limite de 1,5 compara com 1,5%/)).toBeVisible()
  expect(screen.getByText(/menor que 1,5, retira 2 pontos/)).toBeVisible()
})
it('distingue total configurado, score do ativo e média ponderada', () => {
  render(<ScoreCalculationHelp />)
  fireEvent.click(screen.getByText('Como cada campo afeta o score?'))
  expect(screen.getByText(/um grupo de até 6 pontos continua valendo até 6/)).toBeVisible()
  expect(screen.getByText(/Um ativo com mais valor pesa mais/)).toBeVisible()
})
