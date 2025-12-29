import { BudgetItem, Investment, Mortgage, Frequency, BudgetCategory } from '@/types/budget';

// Convert any frequency to weekly amount
export function toWeekly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'weekly':
      return amount;
    case 'fortnightly':
      return amount / 2;
    case 'monthly':
      return (amount * 12) / 52;
    case 'yearly':
      return amount / 52;
    default:
      return amount;
  }
}

// Convert weekly amount to other frequencies
export function fromWeekly(weeklyAmount: number, targetFrequency: Frequency): number {
  switch (targetFrequency) {
    case 'weekly':
      return weeklyAmount;
    case 'fortnightly':
      return weeklyAmount * 2;
    case 'monthly':
      return (weeklyAmount * 52) / 12;
    case 'yearly':
      return weeklyAmount * 52;
    default:
      return weeklyAmount;
  }
}

// Calculate future value with compound interest (for lump sum)
// FV = PV * (1 + r)^n
export function futureValue(
  presentValue: number,
  annualRate: number, // as decimal, e.g., 0.07 for 7%
  years: number
): number {
  return presentValue * Math.pow(1 + annualRate, years);
}

// Calculate future value of regular contributions (DCA/regular savings)
// Using future value of annuity formula: FV = P * ((1 + r)^n - 1) / r
// Where P = contribution per period, r = rate per period, n = number of periods
export function futureValueOfContributions(
  weeklyContribution: number,
  annualRate: number, // as decimal, e.g., 0.07 for 7%
  years: number
): number {
  if (annualRate === 0) {
    return weeklyContribution * 52 * years;
  }

  // Convert annual rate to weekly rate
  const weeklyRate = Math.pow(1 + annualRate, 1 / 52) - 1;
  const totalWeeks = years * 52;

  // Future value of annuity formula
  return weeklyContribution * ((Math.pow(1 + weeklyRate, totalWeeks) - 1) / weeklyRate);
}

// Combined future value: existing balance + regular contributions
export function totalFutureValue(
  currentValue: number,
  weeklyContribution: number,
  annualRate: number,
  years: number
): number {
  const fvExisting = futureValue(currentValue, annualRate, years);
  const fvContributions = futureValueOfContributions(weeklyContribution, annualRate, years);
  return fvExisting + fvContributions;
}

// Adjust for inflation (convert future dollars to today's purchasing power)
export function adjustForInflation(
  futureAmount: number,
  inflationRate: number, // as decimal, e.g., 0.025 for 2.5%
  years: number
): number {
  return futureAmount / Math.pow(1 + inflationRate, years);
}

// Calculate investment projections
export function projectInvestment(
  investment: Investment,
  years: number,
  inflationRate: number
): { nominal: number; real: number } {
  const annualReturn = investment.expectedReturnRate / 100;
  const netReturn = annualReturn - (investment.feeRate || 0) / 100;

  const nominal = totalFutureValue(
    investment.currentValue,
    investment.weeklyContribution,
    netReturn,
    years
  );

  const real = adjustForInflation(nominal, inflationRate / 100, years);

  return { nominal, real };
}

// Calculate mortgage payoff
export function calculateMortgagePayoff(mortgage: Mortgage): {
  monthsRemaining: number;
  totalInterest: number;
  payoffDate: Date;
  totalPaid: number;
} {
  const monthlyRate = mortgage.interestRate / 100 / 12;
  const weeklyPayment = mortgage.weeklyPayment + mortgage.extraWeeklyPayment;
  const monthlyPayment = (weeklyPayment * 52) / 12;

  let balance = mortgage.principal;
  let months = 0;
  let totalInterest = 0;

  while (balance > 0 && months < 1200) { // Max 100 years safety
    const interestThisMonth = balance * monthlyRate;
    totalInterest += interestThisMonth;

    const principalPayment = monthlyPayment - interestThisMonth;

    if (principalPayment <= 0) {
      // Payment doesn't cover interest
      return {
        monthsRemaining: Infinity,
        totalInterest: Infinity,
        payoffDate: new Date(8640000000000000), // Max date
        totalPaid: Infinity,
      };
    }

    balance -= principalPayment;
    months++;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    monthsRemaining: months,
    totalInterest,
    payoffDate,
    totalPaid: mortgage.principal + totalInterest,
  };
}

// Calculate how much extra payment reduces mortgage term
export function mortgageExtraPaymentImpact(
  mortgage: Mortgage,
  extraWeeklyAmount: number
): {
  monthsSaved: number;
  interestSaved: number;
} {
  const original = calculateMortgagePayoff(mortgage);

  const modifiedMortgage = {
    ...mortgage,
    extraWeeklyPayment: mortgage.extraWeeklyPayment + extraWeeklyAmount,
  };

  const withExtra = calculateMortgagePayoff(modifiedMortgage);

  return {
    monthsSaved: original.monthsRemaining - withExtra.monthsRemaining,
    interestSaved: original.totalInterest - withExtra.totalInterest,
  };
}

// Calculate total weekly budget by category
export function calculateWeeklyByCategory(
  items: BudgetItem[]
): Record<BudgetCategory, number> {
  const result: Record<BudgetCategory, number> = {
    necessity: 0,
    cost: 0,
    savings: 0,
  };

  for (const item of items) {
    const weekly = toWeekly(item.amount, item.frequency);
    result[item.category] += weekly;
  }

  return result;
}

// Calculate remaining uncommitted income
export function calculateUncommittedIncome(
  weeklyIncome: number,
  items: BudgetItem[]
): number {
  const totals = calculateWeeklyByCategory(items);
  const totalCommitted = totals.necessity + totals.cost + totals.savings;
  return weeklyIncome - totalCommitted;
}

// Calculate emergency fund target (X months of necessities)
export function calculateEmergencyFundTarget(
  items: BudgetItem[],
  monthsOfExpenses: number
): number {
  const totals = calculateWeeklyByCategory(items);
  const monthlyNecessities = fromWeekly(totals.necessity, 'monthly');
  return monthlyNecessities * monthsOfExpenses;
}

// Calculate how much to save weekly to reach goal by date
export function weeklyToReachGoal(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
  annualReturnRate: number = 0
): number {
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksRemaining = Math.max(1, (targetDate.getTime() - now.getTime()) / msPerWeek);

  const needed = targetAmount - currentAmount;

  if (needed <= 0) return 0;

  if (annualReturnRate === 0) {
    return needed / weeksRemaining;
  }

  // With compound interest, solve for P in: FV = P * ((1+r)^n - 1) / r
  const weeklyRate = Math.pow(1 + annualReturnRate, 1 / 52) - 1;
  const multiplier = (Math.pow(1 + weeklyRate, weeksRemaining) - 1) / weeklyRate;

  // Account for growth of current amount
  const futureCurrentAmount = currentAmount * Math.pow(1 + weeklyRate, weeksRemaining);
  const remainingNeeded = targetAmount - futureCurrentAmount;

  if (remainingNeeded <= 0) return 0;

  return remainingNeeded / multiplier;
}

// Project total wealth at a given age
export function projectWealthAtAge(
  currentAge: number,
  targetAge: number,
  investments: Investment[],
  mortgages: Mortgage[],
  inflationRate: number
): {
  nominal: number;
  real: number;
  mortgageRemaining: number;
  netWealth: number;
  netWealthReal: number;
} {
  const years = targetAge - currentAge;

  if (years <= 0) {
    const currentInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const currentMortgage = mortgages.reduce((sum, m) => sum + m.principal, 0);
    return {
      nominal: currentInvestmentValue,
      real: currentInvestmentValue,
      mortgageRemaining: currentMortgage,
      netWealth: currentInvestmentValue - currentMortgage,
      netWealthReal: currentInvestmentValue - currentMortgage,
    };
  }

  // Project all investments
  let totalNominal = 0;
  let totalReal = 0;

  for (const inv of investments) {
    const projection = projectInvestment(inv, years, inflationRate);
    totalNominal += projection.nominal;
    totalReal += projection.real;
  }

  // Calculate remaining mortgage balance
  let mortgageRemaining = 0;
  for (const mortgage of mortgages) {
    const payoff = calculateMortgagePayoff(mortgage);
    const yearsToPayoff = payoff.monthsRemaining / 12;

    if (yearsToPayoff > years) {
      // Mortgage not paid off yet - calculate remaining balance
      const monthlyRate = mortgage.interestRate / 100 / 12;
      const monthsFromNow = years * 12;
      const weeklyPayment = mortgage.weeklyPayment + mortgage.extraWeeklyPayment;
      const monthlyPayment = (weeklyPayment * 52) / 12;

      let balance = mortgage.principal;
      for (let m = 0; m < monthsFromNow; m++) {
        const interest = balance * monthlyRate;
        balance = balance + interest - monthlyPayment;
      }
      mortgageRemaining += Math.max(0, balance);
    }
  }

  return {
    nominal: totalNominal,
    real: totalReal,
    mortgageRemaining,
    netWealth: totalNominal - mortgageRemaining,
    netWealthReal: totalReal - adjustForInflation(mortgageRemaining, inflationRate / 100, years),
  };
}

// Calculate cumulative savings over time
export function cumulativeSavings(
  weeklyContributions: number,
  annualReturnRate: number,
  years: number
): { year: number; nominal: number; contributed: number }[] {
  const results: { year: number; nominal: number; contributed: number }[] = [];

  for (let y = 1; y <= years; y++) {
    const nominal = futureValueOfContributions(weeklyContributions, annualReturnRate / 100, y);
    const contributed = weeklyContributions * 52 * y;
    results.push({ year: y, nominal, contributed });
  }

  return results;
}

// Format currency (NZD)
export function formatCurrency(amount: number, showCents: boolean = true): string {
  const formatter = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
  return formatter.format(amount);
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
