'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader } from '@/components/GlassCard';
import BottomSheet from '@/components/BottomSheet';
import { WealthLineGraph } from '@/components/Charts';
import { useBudget } from '@/lib/context';
import { Investment, Mortgage, HouseExpense } from '@/types/budget';
import {
  formatCurrency,
  formatPercent,
  projectInvestment,
  projectWealthAtAge,
  calculateMortgagePayoff,
  mortgageExtraPaymentImpact,
  cumulativeSavings,
  projectCurrentInvestmentValue,
  projectCurrentMortgageBalance,
  generateWealthProjection,
  formatRelativeTime,
  calculateSharedHousing,
} from '@/lib/calculations';

export default function WealthPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [showAddMortgage, setShowAddMortgage] = useState(false);
  const [showAddHouseExpense, setShowAddHouseExpense] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingMortgage, setEditingMortgage] = useState<Mortgage | null>(null);
  const [editingHouseExpense, setEditingHouseExpense] = useState<HouseExpense | null>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { settings, investments, mortgages, sharedHousing } = store;

  // Calculate totals with projected values
  const investmentProjections = investments.map((inv) => ({
    ...inv,
    projectedValue: projectCurrentInvestmentValue(inv).projectedValue,
  }));

  const mortgageProjections = mortgages.map((m) => ({
    ...m,
    projectedBalance: projectCurrentMortgageBalance(m).projectedBalance,
  }));

  const totalInvestmentValue = investmentProjections.reduce((sum, inv) => sum + inv.projectedValue, 0);
  const totalWeeklyContributions = investments.reduce((sum, inv) => sum + inv.weeklyContribution, 0);
  const totalMortgageBalance = mortgageProjections.reduce((sum, m) => sum + m.projectedBalance, 0);
  const totalPropertyValue = mortgages.reduce((sum, m) => sum + (m.propertyValue || 0), 0);
  const totalEquity = totalPropertyValue - totalMortgageBalance;

  // Projections
  const yearsToRetirement = settings.retirementAge - settings.age;
  const wealth1Year = projectWealthAtAge(settings.age, settings.age + 1, investments, mortgages, settings.inflationRate);
  const wealth5Year = projectWealthAtAge(settings.age, settings.age + 5, investments, mortgages, settings.inflationRate);
  const wealthRetirement = projectWealthAtAge(settings.age, settings.retirementAge, investments, mortgages, settings.inflationRate);

  // Generate wealth projection data for line graph
  const wealthProjectionData = generateWealthProjection(
    settings.age,
    settings.retirementAge,
    investments,
    mortgages,
    totalPropertyValue,
    settings.inflationRate
  );

  // Average expected return
  const avgReturn = investments.length > 0
    ? investments.reduce((sum, inv) => sum + inv.expectedReturnRate * inv.weeklyContribution, 0) /
      Math.max(1, totalWeeklyContributions)
    : 0;

  // Shared housing calculations
  const housingCalc = sharedHousing?.enabled
    ? calculateSharedHousing(sharedHousing, settings.afterTaxWeeklyIncome)
    : null;

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Wealth</h1>
          <p className="text-white/70 text-sm">Investments, mortgage &amp; projections</p>
        </header>

        {/* Net Worth Summary */}
        <GlassCard variant="wide" className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Net Wealth</p>
              <p className="text-3xl font-bold money-display text-gray-900 dark:text-white">
                {formatCurrency(totalInvestmentValue + totalEquity, false)}
              </p>
              {totalPropertyValue > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Investments: {formatCurrency(totalInvestmentValue, false)} | Equity: {formatCurrency(totalEquity, false)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">At {settings.retirementAge} (real)</p>
              <p className="text-3xl font-bold money-display text-ios-green">
                {formatCurrency(wealthRetirement.netWealthReal, false)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-2 rounded-ios bg-ios-blue/10">
              <p className="text-xs text-ios-blue">1 Year</p>
              <p className="font-semibold money-display">{formatCurrency(wealth1Year.netWealthReal, false)}</p>
            </div>
            <div className="text-center p-2 rounded-ios bg-ios-purple/10">
              <p className="text-xs text-ios-purple">5 Years</p>
              <p className="font-semibold money-display">{formatCurrency(wealth5Year.netWealthReal, false)}</p>
            </div>
            <div className="text-center p-2 rounded-ios bg-ios-green/10">
              <p className="text-xs text-ios-green">{yearsToRetirement} Years</p>
              <p className="font-semibold money-display">{formatCurrency(wealthRetirement.netWealthReal, false)}</p>
            </div>
          </div>
        </GlassCard>

        {/* Wealth Projection Graph */}
        {investments.length > 0 && (
          <GlassCard variant="wide" className="mb-6">
            <CardHeader title="Wealth Projection" subtitle="Net wealth over time (inflation-adjusted)" />
            <WealthLineGraph data={wealthProjectionData} height={180} />
          </GlassCard>
        )}

        {/* Investments Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Investments</h2>
            <button
              onClick={() => setShowAddInvestment(true)}
              className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium"
            >
              + Add
            </button>
          </div>

          {investments.length === 0 ? (
            <GlassCard>
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                No investments tracked yet. Add your ETFs, KiwiSaver, etc.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {investmentProjections.map((inv) => {
                const projection = projectInvestment(inv, yearsToRetirement, settings.inflationRate);
                const valueChanged = inv.projectedValue !== inv.currentValue;

                return (
                  <GlassCard key={inv.id} onClick={() => setEditingInvestment(inv)}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{inv.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ios-blue/10 text-ios-blue">
                          {inv.type === 'kiwisaver' ? 'KiwiSaver' : inv.type === 'etf' ? 'ETF' : 'Other'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg money-display">
                          {formatCurrency(inv.projectedValue, false)}
                        </p>
                        {inv.currentValueUpdatedAt && (
                          <p className="text-xs text-gray-500">
                            {valueChanged ? 'projected' : 'updated'} {formatRelativeTime(inv.currentValueUpdatedAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Weekly</p>
                        <p className="font-medium money-display">{formatCurrency(inv.weeklyContribution)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Return</p>
                        <p className="font-medium">{formatPercent(inv.expectedReturnRate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400">At {settings.retirementAge}</p>
                        <p className="font-medium text-ios-green money-display">
                          {formatCurrency(projection.real, false)}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

              {/* Total Row */}
              <div className="flex justify-between items-center px-4 py-2 text-white/80">
                <span className="text-sm">Total Weekly Contributions:</span>
                <span className="font-semibold money-display">{formatCurrency(totalWeeklyContributions)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Mortgages Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Mortgage</h2>
            <button
              onClick={() => setShowAddMortgage(true)}
              className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium"
            >
              + Add
            </button>
          </div>

          {mortgages.length === 0 ? (
            <GlassCard>
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                No mortgage tracked. Add one to see payoff projections.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {mortgageProjections.map((mortgage) => {
                const payoff = calculateMortgagePayoff(mortgage);
                const extra50Impact = mortgageExtraPaymentImpact(mortgage, 50);
                const balanceChanged = mortgage.projectedBalance !== mortgage.principal;
                const equity = (mortgage.propertyValue || 0) - mortgage.projectedBalance;

                return (
                  <GlassCard key={mortgage.id} onClick={() => setEditingMortgage(mortgage)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{mortgage.name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatPercent(mortgage.interestRate)} interest
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg money-display text-ios-red">
                          {formatCurrency(mortgage.projectedBalance, false)}
                        </p>
                        {mortgage.principalUpdatedAt && (
                          <p className="text-xs text-gray-500">
                            {balanceChanged ? 'projected' : 'updated'} {formatRelativeTime(mortgage.principalUpdatedAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {mortgage.propertyValue && mortgage.propertyValue > 0 && (
                      <div className="mb-3 p-2 rounded-ios bg-ios-purple/10">
                        <div className="flex justify-between text-sm">
                          <span className="text-ios-purple">Property Value</span>
                          <span className="font-medium">{formatCurrency(mortgage.propertyValue, false)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-ios-purple">Equity</span>
                          <span className="font-medium text-ios-green">{formatCurrency(equity, false)}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Payment</p>
                        <p className="font-medium money-display">
                          {formatCurrency(mortgage.weeklyPayment + mortgage.extraWeeklyPayment)}
                          {mortgage.extraWeeklyPayment > 0 && (
                            <span className="text-ios-green text-xs ml-1">
                              (+{formatCurrency(mortgage.extraWeeklyPayment)} extra)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Paid Off</p>
                        <p className="font-medium">
                          {payoff.payoffDate.toLocaleDateString('en-NZ', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-ios bg-ios-green/10 text-sm">
                      <p className="text-ios-green font-medium">
                        +$50/week extra = {Math.floor(extra50Impact.monthsSaved / 12)} years,{' '}
                        {extra50Impact.monthsSaved % 12} months saved
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Saves {formatCurrency(extra50Impact.interestSaved, false)} in interest
                      </p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </section>

        {/* Shared Housing Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Shared Housing</h2>
            <button
              onClick={() => {
                if (!sharedHousing?.enabled) {
                  dispatch({
                    type: 'UPDATE_SHARED_HOUSING',
                    payload: { enabled: true },
                  });
                }
              }}
              className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium"
            >
              {sharedHousing?.enabled ? 'Settings' : 'Enable'}
            </button>
          </div>

          {!sharedHousing?.enabled ? (
            <GlassCard>
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                Enable shared housing to split expenses equitably with your partner based on income ratios.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {/* Partner Settings */}
              <GlassCard>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Partner Name</label>
                    <input
                      type="text"
                      value={sharedHousing.partnerName || ''}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_SHARED_HOUSING',
                          payload: { partnerName: e.target.value },
                        })
                      }
                      placeholder="Partner"
                      className="ios-input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Partner Weekly Income</label>
                    <input
                      type="number"
                      value={sharedHousing.partnerWeeklyIncome || ''}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_SHARED_HOUSING',
                          payload: { partnerWeeklyIncome: parseFloat(e.target.value) || 0 },
                        })
                      }
                      placeholder="0"
                      step="0.01"
                      min="0"
                      className="ios-input text-sm"
                    />
                  </div>
                </div>

                {housingCalc && housingCalc.combinedWeeklyIncome > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Your Share</p>
                        <p className="font-semibold text-lg">
                          {((settings.afterTaxWeeklyIncome / housingCalc.combinedWeeklyIncome) * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500">{sharedHousing.partnerName || 'Partner'}&apos;s Share</p>
                        <p className="font-semibold text-lg">
                          {((sharedHousing.partnerWeeklyIncome / housingCalc.combinedWeeklyIncome) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Expenses List */}
              <div className="flex justify-between items-center mt-4">
                <h3 className="text-sm font-medium text-white/80">Shared Expenses</h3>
                <button
                  onClick={() => setShowAddHouseExpense(true)}
                  className="text-xs px-2 py-1 rounded-full bg-white/20 text-white"
                >
                  + Add
                </button>
              </div>

              {sharedHousing.expenses.length === 0 ? (
                <GlassCard>
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                    No shared expenses. Add rent, utilities, etc.
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {sharedHousing.expenses.map((expense) => {
                    const weeklyAmount =
                      expense.frequency === 'monthly'
                        ? (expense.amount * 12) / 52
                        : expense.frequency === 'yearly'
                        ? expense.amount / 52
                        : expense.amount;
                    const incomeRatio = housingCalc?.combinedWeeklyIncome && housingCalc.combinedWeeklyIncome > 0
                      ? settings.afterTaxWeeklyIncome / housingCalc.combinedWeeklyIncome
                      : 0.5;
                    const yourPortion = weeklyAmount * incomeRatio;

                    return (
                      <GlassCard
                        key={expense.id}
                        onClick={() => setEditingHouseExpense(expense)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{expense.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(expense.amount)}/{expense.frequency}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold money-display">{formatCurrency(yourPortion)}</p>
                            <p className="text-xs text-gray-500">your share/week</p>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}

                  {/* Totals */}
                  {housingCalc && (
                    <div className="px-4 py-3 rounded-ios bg-white/5">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Total Weekly Expenses</span>
                        <span className="font-semibold text-white">{formatCurrency(housingCalc.totalWeeklyExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-white/70">Your Weekly Share</span>
                        <span className="font-semibold text-ios-blue">{formatCurrency(housingCalc.yourShare)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-white/70">{sharedHousing.partnerName || 'Partner'}&apos;s Share</span>
                        <span className="font-semibold text-ios-purple">{formatCurrency(housingCalc.partnerShare)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Disable button */}
              <button
                onClick={() =>
                  dispatch({
                    type: 'UPDATE_SHARED_HOUSING',
                    payload: { enabled: false },
                  })
                }
                className="w-full text-center text-sm text-ios-red py-2"
              >
                Disable Shared Housing
              </button>
            </div>
          )}
        </section>

        {/* Projection Chart (simplified) */}
        {investments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Cumulative Savings</h2>
            <GlassCard>
              <div className="space-y-2">
                {[1, 5, 10, 20, yearsToRetirement].filter((y, i, arr) => y <= yearsToRetirement && arr.indexOf(y) === i).map((year) => {
                  const projection = cumulativeSavings(totalWeeklyContributions, avgReturn, year);
                  const lastYear = projection[projection.length - 1];

                  return (
                    <div key={year} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{year} year{year > 1 ? 's' : ''}</span>
                      <div className="text-right">
                        <span className="font-semibold money-display">{formatCurrency(lastYear.nominal, false)}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({formatCurrency(lastYear.contributed, false)} contributed)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </section>
        )}
      </div>

      <TabBar />

      {/* Investment Sheet */}
      <InvestmentSheet
        isOpen={showAddInvestment || !!editingInvestment}
        onClose={() => {
          setShowAddInvestment(false);
          setEditingInvestment(null);
        }}
        investment={editingInvestment}
        onSave={(data) => {
          if (editingInvestment) {
            dispatch({
              type: 'UPDATE_INVESTMENT',
              payload: { id: editingInvestment.id, updates: data },
            });
          } else {
            dispatch({ type: 'ADD_INVESTMENT', payload: data });
          }
          setShowAddInvestment(false);
          setEditingInvestment(null);
        }}
        onDelete={editingInvestment ? () => {
          dispatch({ type: 'DELETE_INVESTMENT', payload: editingInvestment.id });
          setEditingInvestment(null);
        } : undefined}
      />

      {/* Mortgage Sheet */}
      <MortgageSheet
        isOpen={showAddMortgage || !!editingMortgage}
        onClose={() => {
          setShowAddMortgage(false);
          setEditingMortgage(null);
        }}
        mortgage={editingMortgage}
        onSave={(data) => {
          if (editingMortgage) {
            dispatch({
              type: 'UPDATE_MORTGAGE',
              payload: { id: editingMortgage.id, updates: data },
            });
          } else {
            dispatch({ type: 'ADD_MORTGAGE', payload: data });
          }
          setShowAddMortgage(false);
          setEditingMortgage(null);
        }}
        onDelete={editingMortgage ? () => {
          dispatch({ type: 'DELETE_MORTGAGE', payload: editingMortgage.id });
          setEditingMortgage(null);
        } : undefined}
      />

      {/* House Expense Sheet */}
      <HouseExpenseSheet
        isOpen={showAddHouseExpense || !!editingHouseExpense}
        onClose={() => {
          setShowAddHouseExpense(false);
          setEditingHouseExpense(null);
        }}
        expense={editingHouseExpense}
        onSave={(data) => {
          if (editingHouseExpense) {
            dispatch({
              type: 'UPDATE_HOUSE_EXPENSE',
              payload: { id: editingHouseExpense.id, updates: data },
            });
          } else {
            dispatch({ type: 'ADD_HOUSE_EXPENSE', payload: data });
          }
          setShowAddHouseExpense(false);
          setEditingHouseExpense(null);
        }}
        onDelete={editingHouseExpense ? () => {
          dispatch({ type: 'DELETE_HOUSE_EXPENSE', payload: editingHouseExpense.id });
          setEditingHouseExpense(null);
        } : undefined}
      />
    </main>
  );
}

// Investment Form Sheet
function InvestmentSheet({
  isOpen,
  onClose,
  investment,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  investment: Investment | null;
  onSave: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValueUpdatedAt'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(investment?.name || '');
  const [type, setType] = useState<Investment['type']>(investment?.type || 'etf');
  const [currentValue, setCurrentValue] = useState(investment?.currentValue?.toString() || '');
  const [weeklyContribution, setWeeklyContribution] = useState(investment?.weeklyContribution?.toString() || '');
  const [expectedReturnRate, setExpectedReturnRate] = useState(investment?.expectedReturnRate?.toString() || '7');
  const [feeRate, setFeeRate] = useState(investment?.feeRate?.toString() || '');
  const [notes, setNotes] = useState(investment?.notes || '');

  React.useEffect(() => {
    setName(investment?.name || '');
    setType(investment?.type || 'etf');
    setCurrentValue(investment?.currentValue?.toString() || '');
    setWeeklyContribution(investment?.weeklyContribution?.toString() || '');
    setExpectedReturnRate(investment?.expectedReturnRate?.toString() || '7');
    setFeeRate(investment?.feeRate?.toString() || '');
    setNotes(investment?.notes || '');
  }, [investment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onSave({
      name,
      type,
      currentValue: parseFloat(currentValue) || 0,
      weeklyContribution: parseFloat(weeklyContribution) || 0,
      expectedReturnRate: parseFloat(expectedReturnRate) || 0,
      feeRate: feeRate ? parseFloat(feeRate) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={investment ? 'Edit Investment' : 'Add Investment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., S&amp;P 500 ETF, KiwiSaver"
            className="ios-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['etf', 'kiwisaver', 'other'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 px-3 rounded-ios text-sm font-medium transition-all ${
                  type === t
                    ? 'bg-ios-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t === 'kiwisaver' ? 'KiwiSaver' : t === 'etf' ? 'ETF' : 'Other'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value</label>
            <input
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="ios-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weekly Contribution</label>
            <input
              type="number"
              value={weeklyContribution}
              onChange={(e) => setWeeklyContribution(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="ios-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Return %</label>
            <input
              type="number"
              value={expectedReturnRate}
              onChange={(e) => setExpectedReturnRate(e.target.value)}
              placeholder="7"
              step="0.1"
              className="ios-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Rate % (optional)</label>
            <input
              type="number"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              placeholder="0.5"
              step="0.01"
              min="0"
              className="ios-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., platform, account number..."
            className="ios-input min-h-[60px] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-6 py-3 rounded-ios font-semibold text-ios-red bg-ios-red/10"
            >
              Delete
            </button>
          )}
          <button type="submit" className="ios-button flex-1">
            {investment ? 'Save Changes' : 'Add Investment'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

// Mortgage Form Sheet
function MortgageSheet({
  isOpen,
  onClose,
  mortgage,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  mortgage: Mortgage | null;
  onSave: (data: Omit<Mortgage, 'id' | 'createdAt' | 'updatedAt' | 'principalUpdatedAt'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(mortgage?.name || 'Home Mortgage');
  const [principal, setPrincipal] = useState(mortgage?.principal?.toString() || '');
  const [originalPrincipal, setOriginalPrincipal] = useState(mortgage?.originalPrincipal?.toString() || '');
  const [propertyValue, setPropertyValue] = useState(mortgage?.propertyValue?.toString() || '');
  const [interestRate, setInterestRate] = useState(mortgage?.interestRate?.toString() || '');
  const [weeklyPayment, setWeeklyPayment] = useState(mortgage?.weeklyPayment?.toString() || '');
  const [extraWeeklyPayment, setExtraWeeklyPayment] = useState(mortgage?.extraWeeklyPayment?.toString() || '0');
  const [termYears, setTermYears] = useState(mortgage?.termYears?.toString() || '30');
  const [notes, setNotes] = useState(mortgage?.notes || '');

  React.useEffect(() => {
    setName(mortgage?.name || 'Home Mortgage');
    setPrincipal(mortgage?.principal?.toString() || '');
    setOriginalPrincipal(mortgage?.originalPrincipal?.toString() || '');
    setPropertyValue(mortgage?.propertyValue?.toString() || '');
    setInterestRate(mortgage?.interestRate?.toString() || '');
    setWeeklyPayment(mortgage?.weeklyPayment?.toString() || '');
    setExtraWeeklyPayment(mortgage?.extraWeeklyPayment?.toString() || '0');
    setTermYears(mortgage?.termYears?.toString() || '30');
    setNotes(mortgage?.notes || '');
  }, [mortgage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principal || !interestRate || !weeklyPayment) return;

    onSave({
      name,
      principal: parseFloat(principal),
      originalPrincipal: parseFloat(originalPrincipal) || parseFloat(principal),
      propertyValue: propertyValue ? parseFloat(propertyValue) : undefined,
      interestRate: parseFloat(interestRate),
      weeklyPayment: parseFloat(weeklyPayment),
      extraWeeklyPayment: parseFloat(extraWeeklyPayment) || 0,
      startDate: mortgage?.startDate || Date.now(),
      termYears: parseInt(termYears) || 30,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={mortgage ? 'Edit Mortgage' : 'Add Mortgage'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Home Mortgage"
            className="ios-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Balance</label>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="500000"
              step="1"
              min="0"
              className="ios-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Original Amount</label>
            <input
              type="number"
              value={originalPrincipal}
              onChange={(e) => setOriginalPrincipal(e.target.value)}
              placeholder="600000"
              step="1"
              min="0"
              className="ios-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Value (CV)</label>
          <input
            type="number"
            value={propertyValue}
            onChange={(e) => setPropertyValue(e.target.value)}
            placeholder="750000"
            step="1"
            min="0"
            className="ios-input"
          />
          <p className="text-xs text-gray-500 mt-1">Used to calculate equity</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest Rate %</label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="6.5"
              step="0.01"
              min="0"
              className="ios-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term (years)</label>
            <input
              type="number"
              value={termYears}
              onChange={(e) => setTermYears(e.target.value)}
              placeholder="30"
              min="1"
              max="50"
              className="ios-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weekly Payment</label>
            <input
              type="number"
              value={weeklyPayment}
              onChange={(e) => setWeeklyPayment(e.target.value)}
              placeholder="800"
              step="0.01"
              min="0"
              className="ios-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Weekly</label>
            <input
              type="number"
              value={extraWeeklyPayment}
              onChange={(e) => setExtraWeeklyPayment(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              className="ios-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bank, account details..."
            className="ios-input min-h-[60px] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-6 py-3 rounded-ios font-semibold text-ios-red bg-ios-red/10"
            >
              Delete
            </button>
          )}
          <button type="submit" className="ios-button flex-1">
            {mortgage ? 'Save Changes' : 'Add Mortgage'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

// House Expense Form Sheet
function HouseExpenseSheet({
  isOpen,
  onClose,
  expense,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  expense: HouseExpense | null;
  onSave: (data: Omit<HouseExpense, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(expense?.name || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [frequency, setFrequency] = useState<HouseExpense['frequency']>(expense?.frequency || 'weekly');
  const [category, setCategory] = useState<HouseExpense['category']>(expense?.category || 'other');

  React.useEffect(() => {
    setName(expense?.name || '');
    setAmount(expense?.amount?.toString() || '');
    setFrequency(expense?.frequency || 'weekly');
    setCategory(expense?.category || 'other');
  }, [expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    onSave({
      name,
      amount: parseFloat(amount),
      frequency,
      category,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Expense' : 'Add Shared Expense'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Rent, Power, Internet"
            className="ios-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="ios-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(['weekly', 'monthly', 'yearly'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`py-2 px-3 rounded-ios text-sm font-medium transition-all ${
                  frequency === f
                    ? 'bg-ios-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as HouseExpense['category'])}
            className="ios-input"
          >
            <option value="mortgage">Mortgage/Rent</option>
            <option value="rates">Rates</option>
            <option value="body_corporate">Body Corporate</option>
            <option value="utilities">Utilities</option>
            <option value="insurance">Insurance</option>
            <option value="food">Food/Groceries</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-6 py-3 rounded-ios font-semibold text-ios-red bg-ios-red/10"
            >
              Delete
            </button>
          )}
          <button type="submit" className="ios-button flex-1">
            {expense ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
