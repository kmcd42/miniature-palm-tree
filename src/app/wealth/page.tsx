'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader, CardValue, ProgressBar } from '@/components/GlassCard';
import BottomSheet from '@/components/BottomSheet';
import { useBudget } from '@/lib/context';
import { Investment, Mortgage } from '@/types/budget';
import {
  formatCurrency,
  formatPercent,
  projectInvestment,
  projectWealthAtAge,
  calculateMortgagePayoff,
  mortgageExtraPaymentImpact,
  cumulativeSavings,
} from '@/lib/calculations';

export default function WealthPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [showAddMortgage, setShowAddMortgage] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingMortgage, setEditingMortgage] = useState<Mortgage | null>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { settings, investments, mortgages } = store;

  // Calculate totals
  const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalWeeklyContributions = investments.reduce((sum, inv) => sum + inv.weeklyContribution, 0);
  const totalMortgageBalance = mortgages.reduce((sum, m) => sum + m.principal, 0);

  // Projections
  const yearsToRetirement = settings.retirementAge - settings.age;
  const wealth1Year = projectWealthAtAge(settings.age, settings.age + 1, investments, mortgages, settings.inflationRate);
  const wealth5Year = projectWealthAtAge(settings.age, settings.age + 5, investments, mortgages, settings.inflationRate);
  const wealthRetirement = projectWealthAtAge(settings.age, settings.retirementAge, investments, mortgages, settings.inflationRate);

  // Average expected return
  const avgReturn = investments.length > 0
    ? investments.reduce((sum, inv) => sum + inv.expectedReturnRate * inv.weeklyContribution, 0) /
      Math.max(1, totalWeeklyContributions)
    : 0;

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Wealth</h1>
          <p className="text-white/70 text-sm">Investments, mortgage & projections</p>
        </header>

        {/* Net Worth Summary */}
        <GlassCard variant="wide" className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Net Wealth</p>
              <p className="text-3xl font-bold money-display text-gray-900 dark:text-white">
                {formatCurrency(totalInvestmentValue - totalMortgageBalance, false)}
              </p>
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
              {investments.map((inv) => {
                const projection = projectInvestment(inv, yearsToRetirement, settings.inflationRate);

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
                          {formatCurrency(inv.currentValue, false)}
                        </p>
                        <p className="text-xs text-gray-500">current value</p>
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
              {mortgages.map((mortgage) => {
                const payoff = calculateMortgagePayoff(mortgage);
                const extra50Impact = mortgageExtraPaymentImpact(mortgage, 50);

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
                          {formatCurrency(mortgage.principal, false)}
                        </p>
                        <p className="text-xs text-gray-500">remaining</p>
                      </div>
                    </div>

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
  onSave: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => void;
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
            placeholder="e.g., S&P 500 ETF, KiwiSaver"
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
  onSave: (data: Omit<Mortgage, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(mortgage?.name || 'Home Mortgage');
  const [principal, setPrincipal] = useState(mortgage?.principal?.toString() || '');
  const [originalPrincipal, setOriginalPrincipal] = useState(mortgage?.originalPrincipal?.toString() || '');
  const [interestRate, setInterestRate] = useState(mortgage?.interestRate?.toString() || '');
  const [weeklyPayment, setWeeklyPayment] = useState(mortgage?.weeklyPayment?.toString() || '');
  const [extraWeeklyPayment, setExtraWeeklyPayment] = useState(mortgage?.extraWeeklyPayment?.toString() || '0');
  const [termYears, setTermYears] = useState(mortgage?.termYears?.toString() || '30');
  const [notes, setNotes] = useState(mortgage?.notes || '');

  React.useEffect(() => {
    setName(mortgage?.name || 'Home Mortgage');
    setPrincipal(mortgage?.principal?.toString() || '');
    setOriginalPrincipal(mortgage?.originalPrincipal?.toString() || '');
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
