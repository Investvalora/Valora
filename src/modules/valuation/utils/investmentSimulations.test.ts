import { expect, it } from 'vitest'
import { monthlyRate, simulateCompound, simulateFii, passiveIncomeGoal, fiiCeiling } from './investmentSimulations'

it('converte taxa efetiva e respeita aportes ao fim do mês, inclusive juros zero', () => {
  expect((1 + monthlyRate(0.12)) ** 12).toBeCloseTo(1.12, 12)
  expect(simulateCompound(1000, 0, 0.12, 12)[11].balance).toBeCloseTo(1120)
  expect(simulateCompound(1000, 200, 0, 12)[11].balance).toBe(3400)
  expect(simulateCompound(0, 200, 0.12, 1)[0].balance).toBe(200)
  expect(simulateCompound(0, 100, 0, 13, 0.1)[12].balance).toBeCloseTo(1310)
})
it('compra somente cotas inteiras e mantém o saldo dos proventos', () => {
  const months = simulateFii(105, 0, 10, 0.12, 6)
  expect(months[0].shares).toBe(10)
  expect(months[0].cash).toBeCloseTo(6)
  expect(months[4].shares).toBe(11)
  expect(months[4].cash).toBeCloseTo(0)
  expect(months[5].income).toBeCloseTo(1.1)
})
it('retira proventos sem reinvestimento e não antecipa rendimento de novas cotas', () => {
  const first = simulateFii(0, 200, 10, 0.12, 2)
  expect(first[0].income).toBe(0)
  expect(first[1].income).toBe(2)
  const last = simulateFii(100, 0, 10, 0.12, 12, false)[11]
  expect(last.shares).toBe(10)
  expect(last.balance).toBe(100)
  expect(last.earnings).toBeCloseTo(12)
})
it('resolve o aporte da meta e desconta inflação de forma composta', () => {
  const goal = passiveIncomeGoal(1000, 0.12, 1000, 120, 0.05)
  expect(simulateCompound(1000, goal.contribution, 0.12, 120)[119].balance).toBeCloseTo(goal.target)
  expect(goal.realIncome).toBeCloseTo(1000 / 1.05 ** 10)
  expect(passiveIncomeGoal(1, 0.12, 100000, 12).contribution).toBe(0)
})
it('compõe inflação, juro real e prêmio como no método apresentado', () => {
  const result = fiiCeiling(1.2, 0.0439, 0.083, 0.15, 0.01)
  expect(result.gross).toBeCloseTo(0.1305437)
  expect(result.requiredYield).toBeCloseTo((1 + result.net) * 1.01 - 1)
  const higherPremium = fiiCeiling(1.2, 0.0439, 0.083, 0.15, 0.02)
  expect(higherPremium.ceiling).toBeLessThan(result.ceiling)
  expect(result.ceiling * result.requiredYield).toBeCloseTo(1.2)
})
it('rejeita campos inválidos, prazo excessivo e meta sem taxa positiva', () => {
  expect(() => simulateCompound(NaN, 200, 0.12, 12)).toThrow()
  expect(() => simulateCompound(0, 200, 0.12, 601)).toThrow()
  expect(() => simulateFii(1000, 200, 0, 0.12, 12)).toThrow()
  expect(() => passiveIncomeGoal(1000, 0, 0, 12)).toThrow()
  expect(() => fiiCeiling(1.2, 0.05, 0.08, 1, 0.01)).toThrow()
})
