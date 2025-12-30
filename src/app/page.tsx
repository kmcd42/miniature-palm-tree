'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader, CardValue, ProgressBar } from '@/components/GlassCard';
import { WealthLineGraph } from '@/components/Charts';
import PaydayModal from '@/components/PaydayModal';
import { useBudget } from '@/lib/context';
import {
  formatCurrency,
  calculateWeeklyByCategoryEffective,
  calculateUncommittedIncomeEffective,
  projectWealthAtAge,
  calculateEmergencyFundTargetEffective,
  generateWealthProjection,
  buildCompleteBudgetItems,
} from '@/lib/calculations';

export default function Dashboard() {
  const { store, isLoaded } = useBudget();
  const [showPaydayModal, setShowPaydayModal] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { settings, budgetItems, investments, mortgages, goals, savingsBuckets, sharedHousing } = store;

  // Build complete budget items list including synced items from investments, savings buckets, and housing
  const allBudgetItems = buildCompleteBudgetItems(
    budgetItems,
    investments,
    savingsBuckets,
    mortgages,
    sharedHousing,
    settings.afterTaxWeeklyIncome
  );

  // Calculate key metrics (using effective calculation to handle parent-child relationships)
  const weeklyByCategory = calculateWeeklyByCategoryEffective(allBudgetItems);
  const totalWeeklyCommitted = weeklyByCategory.necessity + weeklyByCategory.cost + weeklyByCategory.savings;
  const uncommittedWeekly = calculateUncommittedIncomeEffective(settings.afterTaxWeeklyIncome, allBudgetItems);

  // Investment projections
  const currentInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const weeklyInvestmentContributions = investments.reduce((sum, inv) => sum + inv.weeklyContribution, 0);

  // Wealth projections
  const wealthRetirement = projectWealthAtAge(settings.age, settings.retirementAge, investments, mortgages, settings.inflationRate);

  // Mortgage stats
  const totalMortgageBalance = mortgages.reduce((sum, m) => sum + m.principal, 0);
  const weeklyMortgagePayments = mortgages.reduce((sum, m) => sum + m.weeklyPayment + m.extraWeeklyPayment, 0);
  const totalPropertyValue = mortgages.reduce((sum, m) => sum + (m.propertyValue || 0), 0);

  // Emergency fund goal (if exists) - uses effective calculation with all items
  const emergencyGoal = goals.find((g) => g.type === 'emergency_fund');
  const emergencyFundTarget = emergencyGoal?.monthsOfExpenses
    ? calculateEmergencyFundTargetEffective(allBudgetItems, emergencyGoal.monthsOfExpenses)
    : 0;
  const emergencyFundProgress = emergencyFundTarget > 0 && emergencyGoal
    ? (emergencyGoal.currentAmount / emergencyFundTarget) * 100
    : 0;

  // Top financial goal (first non-emergency goal or emergency if that's all there is)
  const topGoal = goals.find((g) => g.type !== 'emergency_fund') || emergencyGoal;

  // Current net wealth
  const currentNetWealth = currentInvestmentValue + totalPropertyValue - totalMortgageBalance;

  // Generate wealth projection data for the chart
  const wealthProjectionData = generateWealthProjection(
    settings.age,
    settings.retirementAge,
    investments,
    mortgages,
    totalPropertyValue,
    settings.inflationRate
  );

  // Check if this is a new user (no income set)
  const isNewUser = settings.afterTaxWeeklyIncome === 0;

  return (
    <main className="min-h-screen pb-24 safe-top relative z-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">Compound</h1>
            <p className="text-white/70 text-sm">Your wealth dashboard</p>
          </div>
          {!isNewUser && (
            <button
              onClick={() => setShowPaydayModal(true)}
              className="ios-button text-sm py-2 px-4"
            >
              Log Payday
            </button>
          )}
        </header>

        {isNewUser ? (
          <GlassCard variant="wide" className="mb-6">
            <CardHeader title="Welcome!" subtitle="Let's set up your budget" />
            <p className="text-gray-600 mb-4">
              Start by adding your after-tax weekly income in Settings, then add your budget items.
            </p>
            <a href="/settings" className="ios-button inline-block">
              Get Started
            </a>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {/* Weekly Budget + Log Payday Row */}
            <GlassCard>
              <CardHeader
                title="Weekly Budget"
                subtitle={`${formatCurrency(settings.afterTaxWeeklyIncome, false)}/week income`}
              />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Necessities</span>
                  <span className="font-semibold money-display text-money-red">
                    {formatCurrency(weeklyByCategory.necessity)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Costs</span>
                  <span className="font-semibold money-display text-ios-orange">
                    {formatCurrency(weeklyByCategory.cost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Savings</span>
                  <span className="font-semibold money-display text-money-green">
                    {formatCurrency(weeklyByCategory.savings)}
                  </span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Uncommitted</span>
                  <span className={`font-bold text-lg money-display-large ${uncommittedWeekly >= 0 ? 'text-money-green' : 'text-money-red'}`}>
                    {formatCurrency(uncommittedWeekly)}
                  </span>
                </div>
                <ProgressBar
                  progress={(totalWeeklyCommitted / settings.afterTaxWeeklyIncome) * 100}
                  color={uncommittedWeekly >= 0 ? 'primary' : 'danger'}
                />
              </div>
            </GlassCard>

            {/* Scorecard Row - Investments, Mortgage, Top Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Investments Scorecard */}
              <GlassCard className="text-center">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Investments</div>
                <div className="text-2xl font-bold money-display-large text-gray-900">
                  {formatCurrency(currentInvestmentValue, false)}
                </div>
                <div className="text-xs text-money-green mt-1">
                  +{formatCurrency(weeklyInvestmentContributions)}/wk
                </div>
              </GlassCard>

              {/* Mortgage Scorecard */}
              <GlassCard className="text-center">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  {mortgages.length > 0 ? 'Mortgage' : 'Property'}
                </div>
                <div className={`text-2xl font-bold money-display-large ${mortgages.length > 0 ? 'text-money-red' : 'text-gray-900'}`}>
                  {mortgages.length > 0
                    ? formatCurrency(totalMortgageBalance, false)
                    : formatCurrency(totalPropertyValue, false)
                  }
                </div>
                {mortgages.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatCurrency(weeklyMortgagePayments)}/wk
                  </div>
                )}
              </GlassCard>

              {/* Top Goal Scorecard */}
              <GlassCard className="text-center">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1 truncate">
                  {topGoal?.name || 'No Goals'}
                </div>
                {topGoal ? (
                  <>
                    <div className="text-2xl font-bold money-display-large text-gray-900">
                      {topGoal.type === 'emergency_fund'
                        ? `${Math.round(emergencyFundProgress)}%`
                        : formatCurrency(topGoal.currentAmount, false)
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {topGoal.type === 'emergency_fund'
                        ? `of ${formatCurrency(emergencyFundTarget, false)}`
                        : `of ${formatCurrency(topGoal.targetAmount, false)}`
                      }
                    </div>
                  </>
                ) : (
                  <div className="text-lg text-gray-400">—</div>
                )}
              </GlassCard>
            </div>

            {/* Wealth Projection Visualization */}
            <GlassCard>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-base text-gray-900">Wealth Over Time</h3>
                  <p className="text-sm text-gray-500">Inflation-adjusted projection</p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-gray-500">At {settings.retirementAge}</div>
                  <div className="text-xl font-bold money-display-large text-money-green">
                    {formatCurrency(wealthRetirement.netWealthReal, false)}
                  </div>
                </div>
              </div>
              <WealthLineGraph
                data={wealthProjectionData}
                height={160}
                showLegend={false}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Now: {formatCurrency(currentNetWealth, false)}</span>
                <span className="text-money-green">+{formatCurrency(wealthRetirement.netWealthReal - currentNetWealth, false)}</span>
              </div>
            </GlassCard>

            {/* Savings Buckets Summary */}
            {savingsBuckets.length > 0 && (
              <GlassCard>
                <CardHeader title="Savings Buckets" subtitle={`${savingsBuckets.length} active`} />
                <div className="space-y-2">
                  {savingsBuckets.slice(0, 3).map((bucket) => (
                    <div key={bucket.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 truncate mr-2">
                        {bucket.name}
                      </span>
                      <span className="font-medium money-display text-gray-900">
                        {formatCurrency(bucket.currentAmount, false)}
                      </span>
                    </div>
                  ))}
                  {savingsBuckets.length > 3 && (
                    <p className="text-xs text-gray-500">+{savingsBuckets.length - 3} more</p>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Quick Actions - more compact */}
            <div className="grid grid-cols-2 gap-4">
              <a href="/budget" className="ios-button-secondary block text-center text-sm py-3">
                Add Budget Item
              </a>
              <a href="/wealth" className="ios-button-secondary block text-center text-sm py-3">
                Update Investments
              </a>
            </div>
          </div>
        )}
      </div>

      <TabBar />

      {/* Payday Modal */}
      {showPaydayModal && (
        <PaydayModal onClose={() => setShowPaydayModal(false)} />
      )}
    </main>
  );
}
