'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import Panel, { CardHeader, ProgressBar, StatusDot, FitNumber } from '@/components/GlassCard';
import BottomSheet, { ConfirmDeleteButton } from '@/components/BottomSheet';
import { useBudget } from '@/lib/context';
import { Goal, GoalType, SavingsBucket } from '@/types/budget';
import {
  formatCurrency,
  formatCurrencyCompact,
  calculateEmergencyFundTargetEffective,
  weeklyToReachGoal,
  buildCompleteBudgetItems,
} from '@/lib/calculations';

export default function GoalsPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingBucket, setEditingBucket] = useState<SavingsBucket | null>(null);

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs tracking-[0.2em] text-phosphor-amber caret-blink">LOADING TGT MODULE</div>
      </main>
    );
  }

  const { settings, goals, savingsBuckets, budgetItems, investments, mortgages, sharedHousing } = store;

  // FIX: build complete budget items (incl. synced housing) and use the
  // effective calculation that counts BOTH necessity + cost.
  const allBudgetItems = buildCompleteBudgetItems(
    budgetItems,
    investments,
    savingsBuckets,
    mortgages,
    sharedHousing,
    settings.afterTaxWeeklyIncome,
  );

  const emergencyGoal = goals.find((g) => g.type === 'emergency_fund');
  const emergencyTarget = emergencyGoal?.monthsOfExpenses
    ? calculateEmergencyFundTargetEffective(allBudgetItems, emergencyGoal.monthsOfExpenses)
    : 0;

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-5">

        <header className="mb-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-phosphor-amber/80 uppercase flex items-center gap-2">
            <StatusDot color="amber" pulse /> GOALS · TARGETS &amp; BUCKETS
          </div>
          <h1 className="font-mono text-[30px] sm:text-[34px] font-semibold leading-none tracking-tight text-ink-100 mt-1">
            goals<span className="text-phosphor-amber">.</span>
          </h1>
        </header>

        {/* Goals */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-100 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-phosphor-amber px-1.5 py-0.5 border border-phosphor-amber/40 rounded-sm">TGT</span>
              Financial Goals
            </div>
            <button onClick={() => setShowAddGoal(true)} className="term-btn-ghost text-[10px]">▸ Add Goal</button>
          </div>

          {goals.length === 0 ? (
            <Panel><p className="text-center text-ink-500 py-6 text-sm">No goals yet. Add an emergency fund or wealth target.</p></Panel>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const isEmergency = goal.type === 'emergency_fund';
                const target = isEmergency ? emergencyTarget : goal.targetAmount;
                const progress = target > 0 ? Math.min(100, (goal.currentAmount / target) * 100) : 0;
                let weeklyNeeded = 0;
                if (goal.targetDate && goal.targetAmount > goal.currentAmount) {
                  weeklyNeeded = weeklyToReachGoal(goal.targetAmount, goal.currentAmount, new Date(goal.targetDate));
                }

                const typePillCls = {
                  emergency_fund: 'pill pill-amber',
                  wealth: 'pill pill-mint',
                  time_specific: 'pill pill-violet',
                  debt_free: 'pill pill-cyan',
                }[goal.type];
                const typeLabel = {
                  emergency_fund: `${goal.monthsOfExpenses ?? 6}MO EF`,
                  wealth: 'WEALTH',
                  time_specific: 'TIME',
                  debt_free: 'DEBT-FREE',
                }[goal.type];

                // For emergency fund, also compute months covered
                const monthsCovered = isEmergency && target > 0
                  ? (goal.currentAmount / target) * (goal.monthsOfExpenses ?? 0)
                  : 0;

                return (
                  <Panel key={goal.id} onClick={() => setEditingGoal(goal)}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-ink-100 font-medium truncate">{goal.name}</h3>
                        <span className={typePillCls + ' mt-1.5 inline-block'}>{typeLabel}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <FitNumber value={formatCurrencyCompact(goal.currentAmount)} baseSize={20} minSize={13} className="text-ink-100 font-medium" />
                        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">
                          OF {formatCurrencyCompact(target)}
                        </div>
                      </div>
                    </div>

                    <ProgressBar progress={progress} color={progress >= 100 ? 'success' : 'amber'} showLabel />

                    {isEmergency && target > 0 && (
                      <div className="mt-2 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500">
                        ▸ COVERS {monthsCovered.toFixed(1)} OF {goal.monthsOfExpenses ?? 6} MONTHS · NECESSITY + COST
                      </div>
                    )}

                    {goal.targetDate && (
                      <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                        <span className="text-ink-500">▸ Target date</span>
                        <span className="text-ink-100">{new Date(goal.targetDate).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}

                    {weeklyNeeded > 0 && (
                      <div className="mt-2 border-l-2 border-phosphor-cyan/40 pl-3 py-1.5 bg-phosphor-cyan/[0.04] rounded-r-sm">
                        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-phosphor-cyan">
                          ▸ Need {formatCurrency(weeklyNeeded)}/WK to hit deadline
                        </span>
                      </div>
                    )}

                    {goal.notes && <p className="mt-2 text-xs text-ink-500 italic">{goal.notes}</p>}
                  </Panel>
                );
              })}
            </div>
          )}
        </section>

        {/* Savings buckets */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-100 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-phosphor-amber px-1.5 py-0.5 border border-phosphor-amber/40 rounded-sm">BKT</span>
              Savings Buckets
            </div>
            <button onClick={() => setShowAddBucket(true)} className="term-btn-ghost text-[10px]">▸ Add Bucket</button>
          </div>

          {savingsBuckets.length === 0 ? (
            <Panel><p className="text-center text-ink-500 py-6 text-sm">No buckets yet. Create one for travel, tech, etc.</p></Panel>
          ) : (
            <div className="bento-grid">
              {savingsBuckets.map((bucket) => {
                const progress = bucket.targetAmount > 0 ? Math.min(100, (bucket.currentAmount / bucket.targetAmount) * 100) : 0;
                let weeksToTarget = 0;
                if (bucket.weeklyContribution > 0 && bucket.targetAmount > bucket.currentAmount) {
                  weeksToTarget = Math.ceil((bucket.targetAmount - bucket.currentAmount) / bucket.weeklyContribution);
                }
                return (
                  <Panel key={bucket.id} onClick={() => setEditingBucket(bucket)}>
                    <CardHeader title={bucket.name} />
                    <div className="flex justify-between items-end mb-2 gap-3">
                      <FitNumber
                        value={formatCurrencyCompact(bucket.currentAmount)}
                        baseSize={26}
                        minSize={16}
                        className="text-ink-100 font-medium"
                      />
                      {bucket.targetAmount > 0 && (
                        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 shrink-0">
                          /{formatCurrencyCompact(bucket.targetAmount)}
                        </div>
                      )}
                    </div>
                    {bucket.targetAmount > 0 && <ProgressBar progress={progress} color="primary" />}
                    <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                      <span className="text-ink-500">▸ Weekly</span>
                      <span className="text-phosphor-mint">+{formatCurrency(bucket.weeklyContribution)}</span>
                    </div>
                    {weeksToTarget > 0 && (
                      <div className="mt-1 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500">
                        ▸ ~{Math.ceil(weeksToTarget / 4)} MO TO TARGET
                      </div>
                    )}
                    {bucket.targetDate && (
                      <div className="mt-1 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500">
                        ▸ {new Date(bucket.targetDate).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </Panel>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <TabBar />

      <GoalSheet
        isOpen={showAddGoal || !!editingGoal}
        onClose={() => { setShowAddGoal(false); setEditingGoal(null); }}
        goal={editingGoal}
        onSave={(data) => {
          if (editingGoal) {
            dispatch({ type: 'UPDATE_GOAL', payload: { id: editingGoal.id, updates: data } });
          } else {
            dispatch({ type: 'ADD_GOAL', payload: data });
          }
          setShowAddGoal(false); setEditingGoal(null);
        }}
        onDelete={editingGoal ? () => {
          dispatch({ type: 'DELETE_GOAL', payload: editingGoal.id });
          setEditingGoal(null);
        } : undefined}
      />

      <BucketSheet
        isOpen={showAddBucket || !!editingBucket}
        onClose={() => { setShowAddBucket(false); setEditingBucket(null); }}
        bucket={editingBucket}
        onSave={(data) => {
          if (editingBucket) {
            dispatch({ type: 'UPDATE_SAVINGS_BUCKET', payload: { id: editingBucket.id, updates: data } });
          } else {
            dispatch({ type: 'ADD_SAVINGS_BUCKET', payload: data });
          }
          setShowAddBucket(false); setEditingBucket(null);
        }}
        onDelete={editingBucket ? () => {
          dispatch({ type: 'DELETE_SAVINGS_BUCKET', payload: editingBucket.id });
          setEditingBucket(null);
        } : undefined}
      />
    </main>
  );
}

// ----- Goal sheet -----------------------------------------------------------

function GoalSheet({
  isOpen, onClose, goal, onSave, onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSave: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(goal?.name || '');
  const [type, setType] = useState<GoalType>(goal?.type || 'wealth');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount?.toString() || '0');
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
  );
  const [monthsOfExpenses, setMonthsOfExpenses] = useState(goal?.monthsOfExpenses?.toString() || '6');
  const [notes, setNotes] = useState(goal?.notes || '');

  React.useEffect(() => {
    setName(goal?.name || '');
    setType(goal?.type || 'wealth');
    setTargetAmount(goal?.targetAmount?.toString() || '');
    setCurrentAmount(goal?.currentAmount?.toString() || '0');
    setTargetDate(goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setMonthsOfExpenses(goal?.monthsOfExpenses?.toString() || '6');
    setNotes(goal?.notes || '');
  }, [goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({
      name,
      type,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      monthsOfExpenses: type === 'emergency_fund' ? parseInt(monthsOfExpenses) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} code="TGT" title={goal ? 'Edit Goal' : 'Add Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="term-label-plain block mb-1.5">▸ Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Emergency Fund" className="term-input" required />
        </div>

        <div>
          <label className="term-label-plain block mb-1.5">▸ Type</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'emergency_fund', label: 'Emergency' },
              { value: 'wealth', label: 'Wealth Target' },
              { value: 'time_specific', label: 'Time Goal' },
              { value: 'debt_free', label: 'Debt-Free' },
            ] as const).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`py-2 px-3 font-mono text-[10px] tracking-[0.14em] uppercase border rounded-sm transition-all ${
                  type === t.value
                    ? 'border-phosphor-amber text-phosphor-amber bg-phosphor-amber/8'
                    : 'border-graphite-600 text-ink-500 hover:text-ink-300 hover:border-graphite-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'emergency_fund' && (
          <div>
            <label className="term-label-plain block mb-1.5">▸ Months of expenses</label>
            <input type="number" value={monthsOfExpenses} onChange={(e) => setMonthsOfExpenses(e.target.value)} placeholder="6" min="1" max="24" className="term-input" />
            <p className="text-[11px] text-ink-500 mt-1">Target = (necessity + cost) × months</p>
          </div>
        )}

        {type !== 'emergency_fund' && (
          <div>
            <label className="term-label-plain block mb-1.5">▸ Target amount</label>
            <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="10000" step="1" min="0" className="term-input" />
          </div>
        )}

        <div>
          <label className="term-label-plain block mb-1.5">▸ Current amount</label>
          <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="0" step="0.01" min="0" className="term-input" />
        </div>

        {(type === 'time_specific' || type === 'wealth') && (
          <div>
            <label className="term-label-plain block mb-1.5">▸ Target date (optional)</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="term-input" />
          </div>
        )}

        <div>
          <label className="term-label-plain block mb-1.5">▸ Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="term-input min-h-[60px] resize-none" />
        </div>

        <div className="flex gap-3 pt-3">
          {onDelete && <ConfirmDeleteButton onDelete={onDelete} />}
          <button type="submit" className="term-btn flex-1">▸ {goal ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </BottomSheet>
  );
}

// ----- Bucket sheet ---------------------------------------------------------

function BucketSheet({
  isOpen, onClose, bucket, onSave, onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  bucket: SavingsBucket | null;
  onSave: (data: Omit<SavingsBucket, 'id' | 'createdAt' | 'updatedAt' | 'currentAmountUpdatedAt'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(bucket?.name || '');
  const [targetAmount, setTargetAmount] = useState(bucket?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(bucket?.currentAmount?.toString() || '0');
  const [weeklyContribution, setWeeklyContribution] = useState(bucket?.weeklyContribution?.toString() || '');
  const [targetDate, setTargetDate] = useState(
    bucket?.targetDate ? new Date(bucket.targetDate).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(bucket?.notes || '');

  React.useEffect(() => {
    setName(bucket?.name || '');
    setTargetAmount(bucket?.targetAmount?.toString() || '');
    setCurrentAmount(bucket?.currentAmount?.toString() || '0');
    setWeeklyContribution(bucket?.weeklyContribution?.toString() || '');
    setTargetDate(bucket?.targetDate ? new Date(bucket.targetDate).toISOString().split('T')[0] : '');
    setNotes(bucket?.notes || '');
  }, [bucket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({
      name,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      weeklyContribution: parseFloat(weeklyContribution) || 0,
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} code="BKT" title={bucket ? 'Edit Bucket' : 'Add Bucket'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="term-label-plain block mb-1.5">▸ Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Travel, Tech" className="term-input" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="term-label-plain block mb-1.5">▸ Target</label>
            <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="5000" step="1" min="0" className="term-input" />
          </div>
          <div>
            <label className="term-label-plain block mb-1.5">▸ Current</label>
            <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="0" step="0.01" min="0" className="term-input" />
          </div>
        </div>
        <div>
          <label className="term-label-plain block mb-1.5">▸ Weekly contribution</label>
          <input type="number" value={weeklyContribution} onChange={(e) => setWeeklyContribution(e.target.value)} placeholder="50" step="0.01" min="0" className="term-input" />
        </div>
        <div>
          <label className="term-label-plain block mb-1.5">▸ Target date (optional)</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="term-input" />
        </div>
        <div>
          <label className="term-label-plain block mb-1.5">▸ Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="term-input min-h-[60px] resize-none" />
        </div>
        <div className="flex gap-3 pt-3">
          {onDelete && <ConfirmDeleteButton onDelete={onDelete} />}
          <button type="submit" className="term-btn flex-1">▸ {bucket ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </BottomSheet>
  );
}
