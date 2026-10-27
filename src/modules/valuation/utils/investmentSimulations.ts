function finite(value: number, min: number, label: string) {
  if (!Number.isFinite(value) || value < min) throw new Error(`Confira ${label}.`)
}
function horizon(months: number) {
  if (!Number.isInteger(months) || months < 1 || months > 600) throw new Error('Use um prazo entre 1 e 600 meses.')
}
export function monthlyRate(annual: number) {
  if (!Number.isFinite(annual) || annual <= -1) throw new Error('A taxa anual deve ser maior que -100%.')
  return Math.expm1(Math.log1p(annual) / 12)
}
export interface SimulationMonth { month: number; balance: number; invested: number; earnings: number; income: number; shares?: number; cash?: number }

export function simulateCompound(initial: number, contribution: number, annual: number, months: number, adjustment = 0): SimulationMonth[] {
  finite(initial, 0, 'o valor inicial'); finite(contribution, 0, 'o aporte'); finite(adjustment, 0, 'o reajuste'); horizon(months)
  const rate = monthlyRate(annual)
  let balance = initial, invested = initial
  return Array.from({ length: months }, (_, index) => {
    const income = balance * rate
    const deposit = contribution * (1 + adjustment) ** Math.floor(index / 12)
    balance += income + deposit
    invested += deposit
    if (!Number.isFinite(balance)) throw new Error('Os valores excedem o limite da simulação.')
    return { month: index + 1, balance, invested, earnings: balance - invested, income }
  })
}

export function simulateFii(initial: number, contribution: number, price: number, annualYield: number, months: number, reinvest = true): SimulationMonth[] {
  finite(initial, 0, 'o valor inicial'); finite(contribution, 0, 'o aporte'); finite(price, 0.01, 'o preço da cota'); finite(annualYield, 0, 'o DY'); horizon(months)
  let shares = Math.floor(initial / price), cash = initial - shares * price, invested = initial, distributed = 0
  return Array.from({ length: months }, (_, index) => {
    // DY de distribuição não é taxa efetiva de juros: dividimos os proventos anuais em 12.
    const income = shares * price * annualYield / 12
    distributed += reinvest ? 0 : income
    cash += contribution + (reinvest ? income : 0)
    const bought = Math.floor((cash + 1e-9) / price)
    shares += bought
    cash = Math.max(0, cash - bought * price)
    invested += contribution
    const balance = shares * price + cash
    if (!Number.isFinite(balance) || !Number.isSafeInteger(shares)) throw new Error('Os valores excedem o limite da simulação.')
    return { month: index + 1, balance, invested, earnings: balance + distributed - invested, income, shares, cash }
  })
}

export function passiveIncomeGoal(income: number, annual: number, initial: number, months: number, inflation = 0) {
  finite(income, 0.01, 'a renda desejada'); finite(initial, 0, 'o valor inicial'); finite(inflation, 0, 'a inflação'); horizon(months)
  const rate = monthlyRate(annual)
  if (rate <= 0) throw new Error('A meta de renda exige uma taxa positiva.')
  const target = income / rate
  const growth = (1 + rate) ** months
  const contribution = Math.max(0, (target - initial * growth) * rate / (growth - 1))
  const realIncome = income / (1 + inflation) ** (months / 12)
  if (![target, contribution, realIncome].every(Number.isFinite)) throw new Error('Os valores excedem o limite da simulação.')
  return { target, contribution, realIncome }
}

/** Comparação anual simplificada do vídeo: prêmio composto sobre a referência líquida. */
export function fiiCeiling(annualDividend: number, inflation: number, realTreasury: number, tax: number, premium: number) {
  finite(annualDividend, 0.01, 'os proventos'); finite(inflation, 0, 'a inflação'); finite(realTreasury, 0, 'a taxa real'); finite(premium, 0, 'o prêmio')
  if (!Number.isFinite(tax) || tax < 0 || tax >= 1) throw new Error('O imposto deve estar entre 0% e menos de 100%.')
  const gross = (1 + inflation) * (1 + realTreasury) - 1
  const net = gross * (1 - tax)
  const requiredYield = (1 + net) * (1 + premium) - 1
  if (requiredYield <= 0 || requiredYield > 1) throw new Error('O DY exigido deve ser positivo e no máximo 100%.')
  return { gross, net, requiredYield, ceiling: annualDividend / requiredYield }
}
