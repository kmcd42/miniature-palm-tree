'use client';

import React from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader, CardValue, ProgressBar } from '@/components/GlassCard';
import { useBudget } from '@/lib/context';
import {
  formatCurrency,
  calculateWeeklyByCategory,
  calculateUncommittedIncome,
  projectWealthAtAge,
  calculateEmergencyFundTarget,
  toWeekly,
} from '@/lib/calculations';

export default function Dashboard() {
  const { store, isLoaded } = useBudget();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { settings, budgetItems, investments, mortgages, goals, savingsBuckets } = store;

  // Calculate key metrics
  const weeklyByCategory = calculateWeeklyByCategory(budgetItems);
  const totalWeeklyCommitted = weeklyByCategory.necessity + weeklyByCategory.cost + weeklyByCategory.savings;
  const uncommittedWeekly = calculateUncommittedIncome(settings.afterTaxWeeklyIncome, budgetItems);

  // Investment projections
  const currentInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const weeklyInvestmentContributions = investments.reduce((sum, inv) => sum + inv.weeklyContribution, 0);

  // Wealth projections
  const wealth1Year = projectWealthAtAge(settings.age, settings.age + 1, investments, mortgages, settings.inflationRate);
  const wealth5Year = projectWealthAtAge(settings.age, settings.age + 5, investments, mortgages, settings.inflationRate);
  const wealthRetirement = projectWealthAtAge(settings.age, settings.retirementAge, investments, mortgages, settings.inflationRate);

  // Mortgage stats
  const totalMortgageBalance = mortgages.reduce((sum, m) => sum + m.principal, 0);
  const weeklyMortgagePayments = mortgages.reduce((sum, m) => sum + m.weeklyPayment + m.extraWeeklyPayment, 0);

  // Emergency fund goal (if exists)
  const emergencyGoal = goals.find((g) => g.type === 'emergency_fund');
  const emergencyFundTarget = emergencyGoal?.monthsOfExpenses
    ? calculateEmergencyFundTarget(budgetItems, emergencyGoal.monthsOfExpenses)
    : 0;
  const emergencyFundProgress = emergencyFundTarget > 0 && emergencyGoal
    ? (emergencyGoal.currentAmount / emergencyFundTarget) * 100
    : 0;

  // Check if this is a new user (no income set)
  const isNewUser = settings.afterTaxWeeklyIncome === 0;

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Budget Clarity</h1>
          <p className="text-white/70 text-sm">Your financial dashboard</p>
        </header>

        {isNewUser ? (
          <GlassCard variant="wide" className="mb-6">
            <CardHeader title="Welcome!" subtitle="Let's set up your budget" />
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Start by adding your after-tax weekly income in Settings, then add your budget items.
            </p>
            <a href="/settings" className="ios-button inline-block">
              Get Started
            </a>
          </GlassCard>
        ) : (
          <div className="bento-grid">
            {/* Weekly Budget Overview */}
            <GlassCard variant="wide">
              <CardHeader
                title="Weekly Budget"
                subtitle={`${formatCurrency(settings.afterTaxWeeklyIncome, false)}/week income`}
              />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Necessities</span>
                  <span className="font-semibold money-display text-ios-red">
                    {formatCurrency(weeklyByCategory.necessity)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Costs</span>
                  <span className="font-semibold money-display text-ios-orange">
                    {formatCurrency(weeklyByCategory.cost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Savings</span>
                  <span className="font-semibold money-display text-ios-green">
                    {formatCurrency(weeklyByCategory.savings)}
                  </span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Uncommitted</span>
                  <span className={`font-bold text-lg money-display ${uncommittedWeekly >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                    {formatCurrency(uncommittedWeekly)}
                  </span>
                </div>
                <ProgressBar
                  progress={(totalWeeklyCommitted / settings.afterTaxWeeklyIncome) * 100}
                  color={uncommittedWeekly >= 0 ? 'primary' : 'danger'}
                />
              </div>
            </GlassCard>

            {/* Net Wealth Now */}
            <GlassCard>
              <CardHeader title="Net Wealth" subtitle="Current" />
              <CardValue
                value={formatCurrency(currentInvestmentValue - totalMortgageBalance, false)}
                label="Assets minus debt"
                size="large"
              />
            </GlassCard>

            {/* Wealth at Retirement */}
            <GlassCard>
              <CardHeader title={`Wealth at ${settings.retirementAge}`} subtitle="Inflation-adjusted" />
              <CardValue
                value={formatCurrency(wealthRetirement.netWealthReal, false)}
                label={`${settings.retirementAge - settings.age} years away`}
                trend="up"
                size="large"
              />
            </GlassCard>

            {/* 1 Year Projection */}
            <GlassCard>
              <CardHeader title="In 1 Year" subtitle="Projected net wealth" />
              <CardValue
                value={formatCurrency(wealth1Year.netWealthReal, false)}
                size="medium"
              />
            </GlassCard>

            {/* 5 Year Projection */}
            <GlassCard>
              <CardHeader title="In 5 Years" subtitle="Projected net wealth" />
              <CardValue
                value={formatCurrency(wealth5Year.netWealthReal, false)}
                size="medium"
              />
            </GlassCard>

            {/* Investments */}
            <GlassCard>
              <CardHeader title="Investments" subtitle={`${investments.length} accounts`} />
              <CardValue
                value={formatCurrency(currentInvestmentValue, false)}
                label={`+${formatCurrency(weeklyInvestmentContributions)}/week`}
                size="medium"
              />
            </GlassCard>

            {/* Mortgage */}
            {mortgages.length > 0 && (
              <GlassCard>
                <CardHeader title="Mortgage" subtitle="Remaining" />
                <CardValue
                  value={formatCurrency(totalMortgageBalance, false)}
                  label={`${formatCurrency(weeklyMortgagePayments)}/week payments`}
                  size="medium"
                  trend="down"
                />
              </GlassCard>
            )}

            {/* Emergency Fund */}
            {emergencyGoal && (
              <GlassCard>
                <CardHeader
                  title="Emergency Fund"
                  subtitle={`${emergencyGoal.monthsOfExpenses} months target`}
                />
                <CardValue
                  value={formatCurrency(emergencyGoal.currentAmount, false)}
                  label={`of ${formatCurrency(emergencyFundTarget, false)} target`}
                  size="medium"
                />
                <ProgressBar
                  progress={emergencyFundProgress}
                  color={emergencyFundProgress >= 100 ? 'success' : 'primary'}
                  showLabel
                />
              </GlassCard>
            )}

            {/* Savings Buckets Summary */}
            {savingsBuckets.length > 0 && (
              <GlassCard>
                <CardHeader title="Savings Buckets" subtitle={`${savingsBuckets.length} active`} />
                <div className="space-y-2">
                  {savingsBuckets.slice(0, 3).map((bucket) => (
                    <div key={bucket.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300 truncate mr-2">
                        {bucket.name}
                      </span>
                      <span className="font-medium money-display">
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

            {/* Quick Actions */}
            <GlassCard>
              <CardHeader title="Quick Add" />
              <div className="space-y-2">
                <a href="/budget" className="ios-button-secondary block text-center text-sm">
                  Add Budget Item
                </a>
                <a href="/wealth" className="ios-button-secondary block text-center text-sm">
                  Update Investments
                </a>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <TabBar />
    </main>
  );
}
