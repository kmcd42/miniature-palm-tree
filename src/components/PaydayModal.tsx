'use client';

import React, { useState, useMemo } from 'react';
import { useBudget } from '@/lib/context';
import { formatCurrency, toWeekly, buildCompleteBudgetItems } from '@/lib/calculations';
import { FitNumber } from '@/components/GlassCard';

interface PaydayModalProps {
  onClose: () => void;
}

export default function PaydayModal({ onClose }: PaydayModalProps) {
  const { store, dispatch } = useBudget();
  const { settings, budgetItems, savingsBuckets, investments, mortgages, sharedHousing } = store;

  const [payFrequency, setPayFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>(
    settings.payFrequency || 'fortnightly'
  );

  const multiplier = payFrequency === 'weekly' ? 1 : payFrequency === 'fortnightly' ? 2 : 52 / 12;

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

  const savingsItems = useMemo(() => {
    const out: Array<{
      id: string;
      name: string;
      weeklyAmount: number;
      periodAmount: number;
      linkedToType?: string;
      linkedToId?: string;
    }> = [];
    allBudgetItems.forEach((item) => {
      if (item.category === 'savings' && !item.parentId) {
        const weeklyAmount = toWeekly(item.amount, item.frequency);
        out.push({
          id: item.id,
          name: item.name,
          weeklyAmount,
          periodAmount: weeklyAmount * multiplier,
          linkedToType: item.linkedToType,
          linkedToId: item.linkedToId,
        });
      }
    });
    return out;
  }, [allBudgetItems, multiplier]);

  const [adjustments, setAdjustments] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    savingsItems.forEach((item) => { initial[item.id] = item.periodAmount; });
    return initial;
  });

  const handleAdjustment = (id: string, delta: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const handleSubmit = () => {
    if (payFrequency !== settings.payFrequency) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { payFrequency } });
    }
    savingsItems.forEach((item) => {
      const amount = adjustments[item.id] || 0;
      if (item.linkedToType === 'savings_bucket' && item.linkedToId) {
        const bucket = savingsBuckets.find((b) => b.id === item.linkedToId);
        if (bucket) {
          dispatch({
            type: 'UPDATE_SAVINGS_BUCKET',
            payload: { id: item.linkedToId, updates: { currentAmount: bucket.currentAmount + amount } },
          });
        }
      } else if (item.linkedToType === 'investment' && item.linkedToId) {
        const inv = investments.find((i) => i.id === item.linkedToId);
        if (inv) {
          dispatch({
            type: 'UPDATE_INVESTMENT',
            payload: { id: item.linkedToId, updates: { currentValue: inv.currentValue + amount } },
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
          <div className="px-5 py-4 border-b border-graphite-600 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-phosphor-amber px-1.5 py-0.5 border border-phosphor-amber/40 rounded-sm">
                PAY-LOG
              </span>
              <h2 className="font-mono text-xs tracking-[0.16em] uppercase text-ink-100">
                LOG PAYDAY
              </h2>
            </div>
            <button onClick={onClose} className="text-ink-500 hover:text-phosphor-amber transition-colors p-1" aria-label="Close">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Pay frequency selector */}
          <div className="px-5 py-3 border-b border-graphite-600 bg-graphite-850">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500 mb-2">
              ▸ Pay Frequency
            </div>
            <div className="flex gap-1">
              {(['weekly', 'fortnightly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setPayFrequency(freq)}
                  className={`flex-1 py-2 px-2 font-mono text-[10px] tracking-[0.14em] uppercase border rounded-sm transition-all ${
                    payFrequency === freq
                      ? 'border-phosphor-amber text-phosphor-amber bg-phosphor-amber/8'
                      : 'border-graphite-600 text-ink-500 hover:text-ink-300 hover:border-graphite-500'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="px-5 py-4 overflow-y-auto flex-1" style={{ maxHeight: '50vh' }}>
            {savingsItems.length === 0 ? (
              <div className="text-center py-8 text-ink-500 font-mono text-xs">
                <p className="mb-2">NO SAVINGS ITEMS</p>
                <p className="text-ink-700 text-[11px]">Add savings items in the Budget tab.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savingsItems.map((item) => {
                  const currentAmount = adjustments[item.id] || 0;
                  const linkedBucket = item.linkedToType === 'savings_bucket' && item.linkedToId
                    ? savingsBuckets.find((b) => b.id === item.linkedToId)
                    : null;
                  const linkedInvestment = item.linkedToType === 'investment' && item.linkedToId
                    ? investments.find((i) => i.id === item.linkedToId)
                    : null;
                  const newBalance = linkedBucket
                    ? linkedBucket.currentAmount + currentAmount
                    : linkedInvestment
                    ? linkedInvestment.currentValue + currentAmount
                    : currentAmount;

                  return (
                    <div key={item.id} className="panel p-3">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0">
                          <div className="font-medium text-ink-100 text-sm truncate">{item.name}</div>
                          <div className="font-mono text-[10px] tracking-[0.14em] text-ink-500 uppercase mt-0.5">
                            {formatCurrency(item.weeklyAmount)}/wk plan
                          </div>
                        </div>
                        {(linkedBucket || linkedInvestment) && (
                          <div className="text-right shrink-0 ml-3">
                            <div className="font-mono text-[9px] tracking-[0.18em] text-ink-500 uppercase">New</div>
                            <div className="font-mono text-xs text-phosphor-mint font-medium">
                              {formatCurrency(newBalance, false)}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleAdjustment(item.id, -10)} className="stepper-btn">−10</button>
                        <button onClick={() => handleAdjustment(item.id, -1)} className="stepper-btn">−</button>
                        <div className="min-w-[110px] text-center px-2">
                          <FitNumber
                            value={formatCurrency(currentAmount, false)}
                            baseSize={22}
                            minSize={14}
                            className="text-phosphor-amber font-medium text-center"
                          />
                        </div>
                        <button onClick={() => handleAdjustment(item.id, 1)} className="stepper-btn">+</button>
                        <button onClick={() => handleAdjustment(item.id, 10)} className="stepper-btn">+10</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-graphite-600 bg-graphite-850">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500">▸ Total this period</span>
              <span className="mono-num text-lg text-phosphor-mint font-medium mono-num-glow-mint">
                {formatCurrency(totalSavings, false)}
              </span>
            </div>
            <button onClick={handleSubmit} className="term-btn w-full" disabled={savingsItems.length === 0}>
              Confirm Payday
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
