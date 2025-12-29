import { BudgetItem, Investment, Mortgage, Frequency, BudgetCategory, SavingsBucket, SharedHousing, HouseExpense } from '@/types/budget';

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

// Swedish rounding - round to nearest dollar
export function swedishRound(amount: number): number {
  return Math.round(amount);
}

// Format currency (NZD) with Swedish rounding
export function formatCurrency(amount: number, showCents: boolean = false): string {
  // Apply Swedish rounding (nearest dollar)
  const roundedAmount = swedishRound(amount);
  const formatter = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(roundedAmount);
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Calculate the effective weekly amount for a budget item
// If the item has children, sum their weekly amounts instead of using its own
export function getEffectiveWeeklyAmount(
  item: BudgetItem,
  allItems: BudgetItem[]
): number {
  const children = allItems.filter((i) => i.parentId === item.id);

  if (children.length > 0) {
    // This is a parent - sum children's weekly amounts
    return children.reduce((sum, child) => {
      return sum + getEffectiveWeeklyAmount(child, allItems);
    }, 0);
  }

  // No children - use own amount
  return toWeekly(item.amount, item.frequency);
}

// Check if an item has children (is a parent)
export function hasChildren(itemId: string, allItems: BudgetItem[]): boolean {
  return allItems.some((i) => i.parentId === itemId);
}

// Calculate weekly totals by category, respecting parent auto-calculation
// IMPORTANT: Uses children's categories when parent has children
export function calculateWeeklyByCategoryEffective(
  items: BudgetItem[]
): Record<BudgetCategory, number> {
  const result: Record<BudgetCategory, number> = {
    necessity: 0,
    cost: 0,
    savings: 0,
  };

  // Helper to recursively sum items by their own category
  function sumByCategory(item: BudgetItem): void {
    const children = items.filter((i) => i.parentId === item.id);

    if (children.length > 0) {
      // This is a parent - recurse into children (use THEIR categories)
      for (const child of children) {
        sumByCategory(child);
      }
    } else {
      // This is a leaf item - add to its own category
      const weekly = toWeekly(item.amount, item.frequency);
      result[item.category] += weekly;
    }
  }

  // Only start with top-level items to avoid double-counting
  const topLevelItems = items.filter((item) => !item.parentId);

  for (const item of topLevelItems) {
    sumByCategory(item);
  }

  return result;
}

// Project investment value since last update
export function projectCurrentInvestmentValue(investment: Investment): {
  projectedValue: number;
  weeksSinceUpdate: number;
  contributionsSinceUpdate: number;
  growthSinceUpdate: number;
} {
  const now = Date.now();
  const lastUpdate = investment.currentValueUpdatedAt || investment.createdAt;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceUpdate = (now - lastUpdate) / msPerWeek;

  // Contributions since last update
  const contributionsSinceUpdate = investment.weeklyContribution * weeksSinceUpdate;

  // Growth on existing balance
  const weeklyRate = Math.pow(1 + investment.expectedReturnRate / 100, 1 / 52) - 1;
  const netWeeklyRate = weeklyRate - Math.pow(1 + (investment.feeRate || 0) / 100, 1 / 52) + 1;
  const growthMultiplier = Math.pow(1 + netWeeklyRate, weeksSinceUpdate);

  // Project value: (existing * growth) + FV of contributions
  const existingWithGrowth = investment.currentValue * growthMultiplier;
  const contributionsWithGrowth = netWeeklyRate > 0
    ? investment.weeklyContribution * ((growthMultiplier - 1) / netWeeklyRate)
    : contributionsSinceUpdate;

  const projectedValue = existingWithGrowth + contributionsWithGrowth;
  const growthSinceUpdate = projectedValue - investment.currentValue - contributionsSinceUpdate;

  return {
    projectedValue,
    weeksSinceUpdate,
    contributionsSinceUpdate,
    growthSinceUpdate,
  };
}

// Project savings bucket value since last update
export function projectCurrentSavingsValue(bucket: SavingsBucket): {
  projectedValue: number;
  weeksSinceUpdate: number;
  contributionsSinceUpdate: number;
  interestSinceUpdate: number;
} {
  const now = Date.now();
  const lastUpdate = bucket.currentAmountUpdatedAt || bucket.createdAt;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceUpdate = (now - lastUpdate) / msPerWeek;

  const contributionsSinceUpdate = bucket.weeklyContribution * weeksSinceUpdate;

  if (!bucket.expectedReturnRate || bucket.expectedReturnRate === 0) {
    return {
      projectedValue: bucket.currentAmount + contributionsSinceUpdate,
      weeksSinceUpdate,
      contributionsSinceUpdate,
      interestSinceUpdate: 0,
    };
  }

  const weeklyRate = Math.pow(1 + bucket.expectedReturnRate / 100, 1 / 52) - 1;
  const growthMultiplier = Math.pow(1 + weeklyRate, weeksSinceUpdate);

  const existingWithInterest = bucket.currentAmount * growthMultiplier;
  const contributionsWithInterest = weeklyRate > 0
    ? bucket.weeklyContribution * ((growthMultiplier - 1) / weeklyRate)
    : contributionsSinceUpdate;

  const projectedValue = existingWithInterest + contributionsWithInterest;
  const interestSinceUpdate = projectedValue - bucket.currentAmount - contributionsSinceUpdate;

  return {
    projectedValue,
    weeksSinceUpdate,
    contributionsSinceUpdate,
    interestSinceUpdate,
  };
}

// Project mortgage balance since last update
export function projectCurrentMortgageBalance(mortgage: Mortgage): {
  projectedBalance: number;
  weeksSinceUpdate: number;
  principalPaidSinceUpdate: number;
  interestPaidSinceUpdate: number;
} {
  const now = Date.now();
  const lastUpdate = mortgage.principalUpdatedAt || mortgage.createdAt;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceUpdate = (now - lastUpdate) / msPerWeek;

  const weeklyPayment = mortgage.weeklyPayment + mortgage.extraWeeklyPayment;
  const monthlyPayment = (weeklyPayment * 52) / 12;
  const monthlyRate = mortgage.interestRate / 100 / 12;

  const monthsSinceUpdate = weeksSinceUpdate / (52 / 12);
  const fullMonths = Math.floor(monthsSinceUpdate);

  let balance = mortgage.principal;
  let totalInterest = 0;
  let totalPrincipal = 0;

  for (let m = 0; m < fullMonths && balance > 0; m++) {
    const interestThisMonth = balance * monthlyRate;
    totalInterest += interestThisMonth;
    const principalThisMonth = Math.min(monthlyPayment - interestThisMonth, balance);
    totalPrincipal += principalThisMonth;
    balance -= principalThisMonth;
  }

  return {
    projectedBalance: Math.max(0, balance),
    weeksSinceUpdate,
    principalPaidSinceUpdate: totalPrincipal,
    interestPaidSinceUpdate: totalInterest,
  };
}

// Calculate shared housing expenses
export function calculateSharedHousing(
  housing: SharedHousing,
  yourWeeklyIncome: number
): {
  totalWeeklyExpenses: number;
  combinedWeeklyIncome: number;
  percentageOfIncome: number;
  yourShare: number;
  partnerShare: number;
  yourExpenses: { name: string; amount: number; category: string }[];
} {
  // Calculate total weekly expenses
  const totalWeeklyExpenses = housing.expenses.reduce((sum, exp) => {
    return sum + toWeekly(exp.amount, exp.frequency);
  }, 0);

  const combinedWeeklyIncome = yourWeeklyIncome + housing.partnerWeeklyIncome;

  // Percentage of combined income needed for housing
  const percentageOfIncome = combinedWeeklyIncome > 0
    ? (totalWeeklyExpenses / combinedWeeklyIncome) * 100
    : 0;

  // Your share based on income proportion
  const yourIncomeRatio = combinedWeeklyIncome > 0
    ? yourWeeklyIncome / combinedWeeklyIncome
    : 0.5;

  const yourShare = totalWeeklyExpenses * yourIncomeRatio;
  const partnerShare = totalWeeklyExpenses * (1 - yourIncomeRatio);

  // Break down your share by expense
  const yourExpenses = housing.expenses.map((exp) => {
    const weeklyAmount = toWeekly(exp.amount, exp.frequency);
    return {
      name: exp.name,
      amount: weeklyAmount * yourIncomeRatio,
      category: exp.category,
    };
  });

  return {
    totalWeeklyExpenses,
    combinedWeeklyIncome,
    percentageOfIncome,
    yourShare,
    partnerShare,
    yourExpenses,
  };
}

// Generate wealth projection data points for graphing
export function generateWealthProjection(
  currentAge: number,
  retirementAge: number,
  investments: Investment[],
  mortgages: Mortgage[],
  propertyValue: number,
  inflationRate: number
): { age: number; investments: number; property: number; debt: number; netWealth: number }[] {
  const dataPoints: { age: number; investments: number; property: number; debt: number; netWealth: number }[] = [];

  // Current state
  const currentInvestments = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const currentDebt = mortgages.reduce((sum, m) => sum + m.principal, 0);

  dataPoints.push({
    age: currentAge,
    investments: currentInvestments,
    property: propertyValue,
    debt: currentDebt,
    netWealth: currentInvestments + propertyValue - currentDebt,
  });

  // Generate yearly projections
  for (let age = currentAge + 1; age <= retirementAge; age++) {
    const years = age - currentAge;

    // Project investments
    let projectedInvestments = 0;
    for (const inv of investments) {
      const projection = projectInvestment(inv, years, inflationRate);
      projectedInvestments += projection.real; // Use real value
    }

    // Project mortgage (assume property value grows with inflation)
    const projectedPropertyValue = propertyValue * Math.pow(1 + inflationRate / 100, years);

    // Calculate remaining debt
    let remainingDebt = 0;
    for (const mortgage of mortgages) {
      const payoff = calculateMortgagePayoff(mortgage);
      const yearsToPayoff = payoff.monthsRemaining / 12;

      if (yearsToPayoff > years) {
        // Calculate remaining balance at this point
        const monthlyRate = mortgage.interestRate / 100 / 12;
        const monthsFromNow = years * 12;
        const weeklyPayment = mortgage.weeklyPayment + mortgage.extraWeeklyPayment;
        const monthlyPayment = (weeklyPayment * 52) / 12;

        let balance = mortgage.principal;
        for (let m = 0; m < monthsFromNow && balance > 0; m++) {
          const interest = balance * monthlyRate;
          balance = balance + interest - monthlyPayment;
        }
        remainingDebt += Math.max(0, balance);
      }
    }

    // Adjust debt for inflation (real terms)
    const realDebt = adjustForInflation(remainingDebt, inflationRate / 100, years);

    dataPoints.push({
      age,
      investments: projectedInvestments,
      property: projectedPropertyValue / Math.pow(1 + inflationRate / 100, years), // Real property value
      debt: realDebt,
      netWealth: projectedInvestments + projectedPropertyValue / Math.pow(1 + inflationRate / 100, years) - realDebt,
    });
  }

  return dataPoints;
}

// Format relative time (e.g., "2 weeks ago")
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}
