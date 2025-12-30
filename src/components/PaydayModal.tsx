'use client';

import React, { useState, useMemo } from 'react';
import { useBudget } from '@/lib/context';
import { formatCurrency, toWeekly, fromWeekly, buildCompleteBudgetItems } from '@/lib/calculations';
import { Frequency } from '@/types/budget';

interface PaydayModalProps {
  onClose: () => void;
}

export default function PaydayModal({ onClose }: PaydayModalProps) {
  const { store, dispatch } = useBudget();
  const { settings, budgetItems, savingsBuckets, investments, mortgages, sharedHousing } = store;

  // Pay frequency setting
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>(
    settings.payFrequency || 'fortnightly'
  );

  // Calculate amounts based on pay frequency
  const multiplier = payFrequency === 'weekly' ? 1 : payFrequency === 'fortnightly' ? 2 : 52 / 12;

  // Build complete budget items including synced investments, savings buckets, and housing
  const allBudgetItems = useMemo(() =>
    buildCompleteBudgetItems(
      budgetItems,
      investments,
      savingsBuckets,
      mortgages,
      sharedHousing,
      settings.afterTaxWeeklyIncome
    ),
    [budgetItems, investments, savingsBuckets, mortgages, sharedHousing, settings.afterTaxWeeklyIncome]
  );

  // Group budget items by category, converting to pay period amounts
  const budgetByCategory = useMemo(() => {
    const savings: Array<{
      id: string;
      name: string;
      weeklyAmount: number;
      periodAmount: number;
      adjustedAmount: number;
      linkedToType?: string;
      linkedToId?: string;
    }> = [];

    allBudgetItems.forEach((item) => {
      if (item.category === 'savings' && !item.parentId) {
        const weeklyAmount = toWeekly(item.amount, item.frequency);
        savings.push({
          id: item.id,
          name: item.name,
          weeklyAmount,
          periodAmount: weeklyAmount * multiplier,
          adjustedAmount: weeklyAmount * multiplier,
          linkedToType: item.linkedToType,
          linkedToId: item.linkedToId,
        });
      }
    });

    return { savings };
  }, [allBudgetItems, multiplier]);

  // State for adjusted amounts
  const [adjustments, setAdjustments] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    budgetByCategory.savings.forEach((item) => {
      initial[item.id] = item.periodAmount;
    });
    return initial;
  });

  // Calculate new balances for savings buckets
  const newBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    budgetByCategory.savings.forEach((item) => {
      if (item.linkedToType === 'savings_bucket' && item.linkedToId) {
        const bucket = savingsBuckets.find((b) => b.id === item.linkedToId);
        if (bucket) {
          balances[item.linkedToId] = bucket.currentAmount + (adjustments[item.id] || 0);
        }
      } else if (item.linkedToType === 'investment' && item.linkedToId) {
        const inv = investments.find((i) => i.id === item.linkedToId);
        if (inv) {
          balances[item.linkedToId] = inv.currentValue + (adjustments[item.id] || 0);
        }
      }
    });

    return balances;
  }, [adjustments, budgetByCategory.savings, savingsBuckets, investments]);

  const handleAdjustment = (id: string, delta: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const handleSubmit = () => {
    // Update pay frequency in settings if changed
    if (payFrequency !== settings.payFrequency) {
      dispatch({
        type: 'UPDATE_SETTINGS',
        payload: { payFrequency },
      });
    }

    // Update savings buckets with new balances
    budgetByCategory.savings.forEach((item) => {
      const amount = adjustments[item.id] || 0;

      if (item.linkedToType === 'savings_bucket' && item.linkedToId) {
        const bucket = savingsBuckets.find((b) => b.id === item.linkedToId);
        if (bucket) {
          dispatch({
            type: 'UPDATE_SAVINGS_BUCKET',
            payload: {
              id: item.linkedToId,
              updates: {
                currentAmount: bucket.currentAmount + amount,
              },
            },
          });
        }
      } else if (item.linkedToType === 'investment' && item.linkedToId) {
        const inv = investments.find((i) => i.id === item.linkedToId);
        if (inv) {
          dispatch({
            type: 'UPDATE_INVESTMENT',
            payload: {
              id: item.linkedToId,
              updates: {
                currentValue: inv.currentValue + amount,
              },
            },
          });
        }
      }
    });

    onClose();
  };

  const totalSavings = Object.values(adjustments).reduce((sum, val) => sum + val, 0);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="payday-modal">
        <div className="payday-modal-content">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Log Payday</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Record your savings contributions for this pay period
            </p>
          </div>

          {/* Pay Frequency Selector */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 block mb-2">
              Pay Frequency
            </label>
            <div className="flex gap-2">
              {(['weekly', 'fortnightly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setPayFrequency(freq)}
                  className={`flex-1 py-2 px-3 rounded-ios text-sm font-medium transition-all ${
                    payFrequency === freq
                      ? 'bg-ios-blue text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Savings Items */}
          <div className="p-4 max-h-[50vh] overflow-y-auto">
            {budgetByCategory.savings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No savings items in your budget.</p>
                <p className="text-sm mt-2">Add savings items in the Budget tab to track them here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {budgetByCategory.savings.map((item) => {
                  const currentAmount = adjustments[item.id] || 0;
                  const linkedBucket = item.linkedToType === 'savings_bucket' && item.linkedToId
                    ? savingsBuckets.find((b) => b.id === item.linkedToId)
                    : null;
                  const linkedInvestment = item.linkedToType === 'investment' && item.linkedToId
                    ? investments.find((i) => i.id === item.linkedToId)
                    : null;

                  return (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-ios-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.weeklyAmount)}/week
                          </div>
                        </div>
                        {(linkedBucket || linkedInvestment) && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500">New Balance</div>
                            <div className="text-sm font-semibold text-money-green">
                              {formatCurrency(
                                linkedBucket
                                  ? linkedBucket.currentAmount + currentAmount
                                  : linkedInvestment
                                  ? linkedInvestment.currentValue + currentAmount
                                  : currentAmount,
                                false
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => handleAdjustment(item.id, -10)}
                          className="stepper-btn"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => handleAdjustment(item.id, -1)}
                          className="stepper-btn"
                        >
                          -
                        </button>
                        <div className="text-2xl font-bold money-display-large text-gray-900 min-w-[100px] text-center">
                          {formatCurrency(currentAmount, false)}
                        </div>
                        <button
                          onClick={() => handleAdjustment(item.id, 1)}
                          className="stepper-btn"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleAdjustment(item.id, 10)}
                          className="stepper-btn"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Total Savings This Period</span>
              <span className="text-xl font-bold money-display-large text-money-green">
                {formatCurrency(totalSavings, false)}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              className="ios-button w-full"
              disabled={budgetByCategory.savings.length === 0}
            >
              Confirm Payday
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
