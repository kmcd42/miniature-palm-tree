import { BudgetItem, Investment, Mortgage, Frequency, BudgetCategory, SavingsBucket, SharedHousing, HouseExpense, UserSettings, Goal, BudgetStore } from '@/types/budget';

// =========================================================================
// AGE / DATE helpers
// =========================================================================

// Compute current age in whole years from a DOB string (YYYY-MM-DD).
// Falls back to settings.age if DOB is missing.
export function getCurrentAge(settings: UserSettings | undefined): number {
  if (!settings) return 0;
  if (settings.dateOfBirth) {
    const dob = new Date(settings.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
      return Math.max(0, age);
    }
  }
  return settings.age ?? 0;
}

// Precise age in fractional years (useful for projections starting mid-year)
export function getCurrentAgeFractional(settings: UserSettings | undefined): number {
  if (!settings) return 0;
  if (settings.dateOfBirth) {
    const dob = new Date(settings.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const ms = Date.now() - dob.getTime();
      return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  return settings.age ?? 0;
}

// Years until retirement (can be fractional)
export function yearsUntilRetirement(settings: UserSettings): number {
  return Math.max(0, settings.retirementAge - getCurrentAgeFractional(settings));
}

// Years of expected retirement (retirement → life expectancy)
export function yearsInRetirement(settings: UserSettings): number {
  return Math.max(1, settings.lifeExpectancy - settings.retirementAge);
}

// =========================================================================

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

// Calculate remaining uncommitted income using effective calculation
export function calculateUncommittedIncomeEffective(
  weeklyIncome: number,
  items: BudgetItem[]
): number {
  const totals = calculateWeeklyByCategoryEffective(items);
  const totalCommitted = totals.necessity + totals.cost + totals.savings;
  return weeklyIncome - totalCommitted;
}

// Calculate emergency fund target (X months of necessities + costs) using effective calculation
export function calculateEmergencyFundTargetEffective(
  items: BudgetItem[],
  monthsOfExpenses: number
): number {
  const totals = calculateWeeklyByCategoryEffective(items);
  // Emergency fund should cover necessities AND costs (not just necessities)
  const monthlyExpenses = fromWeekly(totals.necessity + totals.cost, 'monthly');
  return monthlyExpenses * monthsOfExpenses;
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

// Build complete budget items list including linked items from investments, savings buckets, and shared housing
export function buildCompleteBudgetItems(
  budgetItems: BudgetItem[],
  investments: Investment[],
  savingsBuckets: SavingsBucket[],
  mortgages: Mortgage[],
  sharedHousing: SharedHousing | undefined,
  yourWeeklyIncome: number
): BudgetItem[] {
  // Start with manual budget items
  const result: BudgetItem[] = [...budgetItems];

  // Calculate housing share if enabled
  const housingCalc = sharedHousing?.enabled
    ? calculateSharedHousing(sharedHousing, yourWeeklyIncome)
    : null;

  // Track which items are already linked manually
  const manuallyLinkedIds = new Set(
    budgetItems.filter((i) => i.linkedToId).map((i) => i.linkedToId)
  );

  // Add linked investments (non-KiwiSaver with weekly contributions)
  for (const inv of investments) {
    if (inv.weeklyContribution > 0 && inv.type !== 'kiwisaver' && !manuallyLinkedIds.has(inv.id)) {
      result.push({
        id: `linked-inv-${inv.id}`,
        name: inv.name,
        amount: inv.weeklyContribution,
        frequency: 'weekly' as Frequency,
        category: 'savings' as BudgetCategory,
        linkedToId: inv.id,
        linkedToType: 'investment',
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      });
    }
  }

  // Add linked savings buckets
  for (const bucket of savingsBuckets) {
    if (bucket.weeklyContribution > 0 && !manuallyLinkedIds.has(bucket.id)) {
      result.push({
        id: `linked-bucket-${bucket.id}`,
        name: bucket.name,
        amount: bucket.weeklyContribution,
        frequency: 'weekly' as Frequency,
        category: 'savings' as BudgetCategory,
        linkedToId: bucket.id,
        linkedToType: 'savings_bucket',
        createdAt: bucket.createdAt,
        updatedAt: bucket.updatedAt,
      });
    }
  }

  // Add housing expenses if enabled
  if (sharedHousing?.enabled && housingCalc && sharedHousing.expenses.length > 0) {
    const parentId = 'linked-housing-parent';
    const incomeRatio = housingCalc.combinedWeeklyIncome > 0
      ? yourWeeklyIncome / housingCalc.combinedWeeklyIncome
      : 0.5;

    // Add parent "Housing" item
    result.push({
      id: parentId,
      name: 'Housing',
      amount: 0,
      frequency: 'weekly' as Frequency,
      category: 'necessity' as BudgetCategory,
      linkedToId: 'shared-housing',
      linkedToType: 'housing',
      createdAt: sharedHousing.createdAt,
      updatedAt: sharedHousing.updatedAt,
    });

    // Add mortgage payments as children
    for (const mortgage of mortgages) {
      const weeklyPayment = mortgage.weeklyPayment + mortgage.extraWeeklyPayment;
      const yourShare = weeklyPayment * incomeRatio;

      result.push({
        id: `linked-housing-mortgage-${mortgage.id}`,
        name: `${mortgage.name} (your share)`,
        amount: yourShare,
        frequency: 'weekly' as Frequency,
        category: 'necessity' as BudgetCategory,
        parentId: parentId,
        linkedToId: mortgage.id,
        linkedToType: 'mortgage',
        createdAt: mortgage.createdAt,
        updatedAt: mortgage.updatedAt,
      });
    }

    // Add house expenses as children
    for (const expense of sharedHousing.expenses) {
      const weeklyAmount = toWeekly(expense.amount, expense.frequency);
      const yourShare = weeklyAmount * incomeRatio;

      result.push({
        id: `linked-housing-expense-${expense.id}`,
        name: `${expense.name} (your share)`,
        amount: yourShare,
        frequency: 'weekly' as Frequency,
        category: 'necessity' as BudgetCategory,
        parentId: parentId,
        linkedToId: expense.id,
        linkedToType: 'housing_expense',
        createdAt: sharedHousing.createdAt,
        updatedAt: sharedHousing.updatedAt,
      });
    }
  }

  return result;
}

// =========================================================================
// RETIREMENT DRAWDOWN
// =========================================================================

// Calculate a sustainable weekly drawdown from a retirement portfolio that
// would deplete the balance to zero by `years` in retirement, using a real
// (inflation-adjusted) annual return rate.
//
// Inputs are all in REAL (today's-dollars) terms — we use a real return rate.
// Result is REAL weekly drawdown.
//
// Formula: weekly payment of an annuity that depletes principal.
//   PMT = P * r / (1 - (1 + r)^-n)
// where r = weekly real return, n = total weeks in retirement.
export function calculateWeeklyDrawdown(
  portfolioAtRetirement: number,
  years: number,
  realAnnualReturnRate: number, // e.g. 0.03 for 3% real return
): number {
  if (portfolioAtRetirement <= 0 || years <= 0) return 0;
  const weeks = years * 52;
  const weeklyRate = Math.pow(1 + realAnnualReturnRate, 1 / 52) - 1;
  if (weeklyRate === 0) return portfolioAtRetirement / weeks;
  const pmt = (portfolioAtRetirement * weeklyRate) / (1 - Math.pow(1 + weeklyRate, -weeks));
  return Math.max(0, pmt);
}

// Drawdown projection bundle for display
export interface DrawdownProjection {
  portfolioAtRetirementReal: number;
  weeklyDrawdownReal: number;
  monthlyDrawdownReal: number;
  yearlyDrawdownReal: number;
  yearsCovered: number;
  // Sensitivity bands (conservative / expected / optimistic real returns)
  conservativeWeekly: number;
  expectedWeekly: number;
  optimisticWeekly: number;
}

export function generateDrawdownProjection(
  settings: UserSettings,
  investments: Investment[],
  mortgages: Mortgage[],
  propertyValue: number,
): DrawdownProjection {
  const currentAge = getCurrentAgeFractional(settings);
  const projection = projectWealthAtAge(
    Math.floor(currentAge),
    settings.retirementAge,
    investments,
    mortgages,
    settings.inflationRate,
  );

  // Real liquid portfolio at retirement = investments(real) + equity(real)
  // (Equity assumed to grow with inflation so equity_real ≈ today's equity. Already real-priced in projection.)
  const equityNow = Math.max(0, propertyValue - mortgages.reduce((s, m) => s + m.principal, 0));
  const portfolioReal = projection.real + equityNow; // equity considered roughly inflation-flat in real terms

  const yearsInRet = yearsInRetirement(settings);

  // Use the user's stated SWR as the "expected" rate, with ±1.5% bands.
  const swr = (settings.safeWithdrawalRate ?? 4) / 100;
  const conservativeRate = Math.max(0, swr - 0.015);
  const optimisticRate = swr + 0.015;

  // Pure SWR: portfolio * rate. Annuity formula is also useful but the
  // industry-standard SWR is simpler and what most retirement guides cite.
  const swrWeekly = (rate: number) => (portfolioReal * rate) / 52;

  const expectedWeekly = swrWeekly(swr);

  return {
    portfolioAtRetirementReal: portfolioReal,
    weeklyDrawdownReal: expectedWeekly,
    monthlyDrawdownReal: expectedWeekly * (52 / 12),
    yearlyDrawdownReal: expectedWeekly * 52,
    yearsCovered: yearsInRet,
    conservativeWeekly: swrWeekly(conservativeRate),
    expectedWeekly,
    optimisticWeekly: swrWeekly(optimisticRate),
  };
}

// =========================================================================
// MORTGAGE PROGRESS
// =========================================================================

// Years elapsed since the mortgage was drawn down
export function mortgageYearsElapsed(mortgage: Mortgage): number {
  if (!mortgage.startDate) return 0;
  const ms = Date.now() - mortgage.startDate;
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
}

export function mortgageProgressPercent(mortgage: Mortgage): number {
  const op = mortgage.originalPrincipal || mortgage.principal;
  if (op <= 0) return 0;
  return Math.max(0, Math.min(100, ((op - mortgage.principal) / op) * 100));
}

// =========================================================================
// PARTNER SPLIT
// =========================================================================

// For a budget item that originated as a shared housing item, return the
// implied total (your share + partner share) and partner share.
export function partnerSplit(
  yourWeeklyAmount: number,
  yourIncome: number,
  partnerIncome: number,
): { total: number; yourShare: number; partnerShare: number; yourRatio: number } {
  const combined = yourIncome + partnerIncome;
  const yourRatio = combined > 0 ? yourIncome / combined : 0.5;
  if (yourRatio <= 0) {
    return { total: yourWeeklyAmount, yourShare: yourWeeklyAmount, partnerShare: 0, yourRatio: 1 };
  }
  const total = yourWeeklyAmount / yourRatio;
  return {
    total,
    yourShare: yourWeeklyAmount,
    partnerShare: total - yourWeeklyAmount,
    yourRatio,
  };
}

// =========================================================================
// COMPACT CURRENCY FORMATTING (for hero numbers that risk overflow)
// =========================================================================

export function formatCurrencyCompact(amount: number, currency: string = 'NZD'): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = currency === 'NZD' || currency === 'USD' || currency === 'AUD' || currency === 'CAD' ? '$' : '';
  if (abs >= 10_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `${sign}${symbol}${Math.round(abs / 1000)}K`;
  if (abs >= 10_000) return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
  return formatCurrency(amount, false);
}

// =========================================================================
// INSIGHTS ENGINE
// =========================================================================

export type InsightSeverity = 'critical' | 'warn' | 'info' | 'positive';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  label: string;          // short uppercase status label, e.g. "BUDGET · TIGHT"
  headline: string;       // 1-line takeaway
  detail?: string;        // optional secondary line
  actionHref?: string;    // optional deep link
  actionLabel?: string;
}

// Generate proactive insights from the full store. Ordered by severity.
export function generateInsights(store: BudgetStore): Insight[] {
  const insights: Insight[] = [];
  const { settings, investments, mortgages, goals, sharedHousing, savingsBuckets } = store;

  if (!settings.afterTaxWeeklyIncome || settings.afterTaxWeeklyIncome <= 0) {
    insights.push({
      id: 'no-income',
      severity: 'warn',
      label: 'SETUP · INCOME',
      headline: 'Set your after-tax weekly income to unlock projections.',
      actionHref: '/settings',
      actionLabel: 'Open settings',
    });
    return insights;
  }

  const allItems = buildCompleteBudgetItems(
    store.budgetItems,
    investments,
    savingsBuckets,
    mortgages,
    sharedHousing,
    settings.afterTaxWeeklyIncome,
  );

  const byCat = calculateWeeklyByCategoryEffective(allItems);
  const totalCommitted = byCat.necessity + byCat.cost + byCat.savings;
  const uncommitted = settings.afterTaxWeeklyIncome - totalCommitted;
  const uncommittedPct = (uncommitted / settings.afterTaxWeeklyIncome) * 100;

  // 1) Cashflow status
  if (uncommitted < 0) {
    insights.push({
      id: 'overcommitted',
      severity: 'critical',
      label: 'CASHFLOW · OVER',
      headline: `Committed ${formatCurrency(Math.abs(uncommitted))}/wk beyond income.`,
      detail: 'Reduce a cost line or raise income to balance the budget.',
      actionHref: '/budget',
      actionLabel: 'Review budget',
    });
  } else if (uncommittedPct < 5) {
    insights.push({
      id: 'tight',
      severity: 'warn',
      label: 'CASHFLOW · TIGHT',
      headline: `Only ${formatCurrency(uncommitted)}/wk uncommitted (${uncommittedPct.toFixed(1)}%).`,
      detail: 'Little slack for unplanned spending. Consider trimming costs.',
      actionHref: '/budget',
    });
  } else if (uncommittedPct > 20 && byCat.savings / settings.afterTaxWeeklyIncome < 0.15) {
    insights.push({
      id: 'underinvested',
      severity: 'info',
      label: 'OPPORTUNITY · INVEST',
      headline: `${formatCurrency(uncommitted)}/wk uncommitted but only ${((byCat.savings / settings.afterTaxWeeklyIncome) * 100).toFixed(0)}% to savings.`,
      detail: 'Direct surplus into an investment or bucket to compound it.',
      actionHref: '/wealth',
      actionLabel: 'Open Wealth',
    });
  }

  // 2) Emergency fund coverage
  const ef = goals.find((g) => g.type === 'emergency_fund');
  if (ef) {
    const months = ef.monthsOfExpenses ?? 6;
    const target = calculateEmergencyFundTargetEffective(allItems, months);
    if (target > 0) {
      const coverage = ef.currentAmount / target; // 0-1
      const monthsCovered = coverage * months;
      if (coverage < 0.5) {
        insights.push({
          id: 'ef-low',
          severity: 'warn',
          label: 'EMERGENCY · LOW',
          headline: `Emergency fund covers ${monthsCovered.toFixed(1)} of ${months} months.`,
          detail: `${formatCurrency(target - ef.currentAmount, false)} to go.`,
          actionHref: '/goals',
        });
      } else if (coverage >= 1) {
        insights.push({
          id: 'ef-full',
          severity: 'positive',
          label: 'EMERGENCY · FULL',
          headline: `Emergency fund is fully stocked (${months} months).`,
          detail: 'Excess can be redirected to higher-return savings.',
        });
      } else {
        insights.push({
          id: 'ef-on-track',
          severity: 'info',
          label: 'EMERGENCY · BUILDING',
          headline: `${monthsCovered.toFixed(1)} of ${months} months banked.`,
          detail: `${formatCurrency(target - ef.currentAmount, false)} remaining.`,
        });
      }
    }
  }

  // 3) Retirement drawdown
  const totalPropertyValue = mortgages.reduce((s, m) => s + (m.propertyValue || 0), 0);
  if (investments.length > 0 || mortgages.length > 0) {
    const dd = generateDrawdownProjection(settings, investments, mortgages, totalPropertyValue);
    if (dd.portfolioAtRetirementReal > 0) {
      insights.push({
        id: 'drawdown',
        severity: 'info',
        label: `RETIREMENT · AGE ${settings.retirementAge}`,
        headline: `Trajectory: draw ${formatCurrency(dd.weeklyDrawdownReal)}/wk to age ${settings.lifeExpectancy} (real).`,
        detail: `Portfolio ${formatCurrencyCompact(dd.portfolioAtRetirementReal)} · range ${formatCurrency(dd.conservativeWeekly)}–${formatCurrency(dd.optimisticWeekly)}/wk.`,
        actionHref: '/wealth',
        actionLabel: 'Run projection',
      });
    }
  }

  // 4) Partner contribution summary (when shared housing is enabled)
  if (sharedHousing?.enabled && sharedHousing.partnerWeeklyIncome > 0 && sharedHousing.expenses.length > 0) {
    const calc = calculateSharedHousing(sharedHousing, settings.afterTaxWeeklyIncome);
    const partnerName = sharedHousing.partnerName || 'Partner';
    insights.push({
      id: 'partner',
      severity: 'info',
      label: 'SHARED · HOUSEHOLD',
      headline: `${partnerName} contributes ${formatCurrency(calc.partnerShare)}/wk to housing.`,
      detail: `Your share: ${formatCurrency(calc.yourShare)}/wk (${((calc.yourShare / calc.totalWeeklyExpenses) * 100).toFixed(0)}% of household).`,
    });
  }

  // 5) Mortgage payoff
  for (const m of mortgages) {
    const payoff = calculateMortgagePayoff(m);
    if (payoff.monthsRemaining < Infinity) {
      const years = Math.floor(payoff.monthsRemaining / 12);
      const months = payoff.monthsRemaining % 12;
      insights.push({
        id: `mortgage-${m.id}`,
        severity: 'info',
        label: 'MORTGAGE · TRAJECTORY',
        headline: `${m.name} clears in ${years}y ${months}m (${payoff.payoffDate.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}).`,
        detail: `+$50/wk extra would save ${formatCurrency(mortgageExtraPaymentImpact(m, 50).interestSaved, false)} interest.`,
      });
    }
  }

  // 6) Goal pacing — flag goals that are off-pace
  for (const goal of goals) {
    if (goal.type === 'emergency_fund') continue;
    if (!goal.targetDate || goal.currentAmount >= goal.targetAmount) continue;
    const needed = weeklyToReachGoal(goal.targetAmount, goal.currentAmount, new Date(goal.targetDate));
    if (needed > 0 && needed > settings.afterTaxWeeklyIncome * 0.4) {
      insights.push({
        id: `goal-${goal.id}`,
        severity: 'warn',
        label: 'GOAL · OFF-PACE',
        headline: `"${goal.name}" needs ${formatCurrency(needed)}/wk to hit deadline.`,
        detail: 'Push the date or raise the contribution.',
        actionHref: '/goals',
      });
    }
  }

  // Sort by severity
  const order: Record<InsightSeverity, number> = { critical: 0, warn: 1, info: 2, positive: 3 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);
  return insights;
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
