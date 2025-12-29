'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader, CardValue, ProgressBar } from '@/components/GlassCard';
import BottomSheet from '@/components/BottomSheet';
import { useBudget } from '@/lib/context';
import { Goal, GoalType, SavingsBucket } from '@/types/budget';
import {
  formatCurrency,
  calculateEmergencyFundTarget,
  weeklyToReachGoal,
  toWeekly,
} from '@/lib/calculations';

export default function GoalsPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingBucket, setEditingBucket] = useState<SavingsBucket | null>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { goals, savingsBuckets, budgetItems } = store;

  // Calculate emergency fund target if goal exists
  const emergencyGoal = goals.find((g) => g.type === 'emergency_fund');
  const emergencyTarget = emergencyGoal?.monthsOfExpenses
    ? calculateEmergencyFundTarget(budgetItems, emergencyGoal.monthsOfExpenses)
    : 0;

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-white/70 text-sm">Track your financial targets</p>
        </header>

        {/* Goals Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Financial Goals</h2>
            <button
              onClick={() => setShowAddGoal(true)}
              className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium"
            >
              + Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <GlassCard>
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                No goals yet. Add an emergency fund, wealth target, or time-specific goal.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const isEmergency = goal.type === 'emergency_fund';
                const target = isEmergency ? emergencyTarget : goal.targetAmount;
                const progress = target > 0 ? (goal.currentAmount / target) * 100 : 0;

                // Calculate weekly needed for time-specific goals
                let weeklyNeeded = 0;
                if (goal.targetDate && goal.targetAmount > goal.currentAmount) {
                  weeklyNeeded = weeklyToReachGoal(
                    goal.targetAmount,
                    goal.currentAmount,
                    new Date(goal.targetDate)
                  );
                }

                return (
                  <GlassCard key={goal.id} onClick={() => setEditingGoal(goal)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          goal.type === 'emergency_fund'
                            ? 'bg-ios-orange/10 text-ios-orange'
                            : goal.type === 'wealth'
                              ? 'bg-ios-green/10 text-ios-green'
                              : goal.type === 'time_specific'
                                ? 'bg-ios-purple/10 text-ios-purple'
                                : 'bg-ios-blue/10 text-ios-blue'
                        }`}>
                          {goal.type === 'emergency_fund'
                            ? `${goal.monthsOfExpenses} Month Emergency`
                            : goal.type === 'wealth'
                              ? 'Wealth Target'
                              : goal.type === 'time_specific'
                                ? 'Time Goal'
                                : 'Debt Free'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg money-display">
                          {formatCurrency(goal.currentAmount, false)}
                        </p>
                        <p className="text-xs text-gray-500">
                          of {formatCurrency(target, false)}
                        </p>
                      </div>
                    </div>

                    <ProgressBar
                      progress={progress}
                      color={progress >= 100 ? 'success' : 'primary'}
                      showLabel
                    />

                    {goal.targetDate && (
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Target Date</span>
                        <span className="font-medium">
                          {new Date(goal.targetDate).toLocaleDateString('en-NZ', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}

                    {weeklyNeeded > 0 && (
                      <div className="mt-2 p-2 rounded-ios bg-ios-blue/10 text-sm">
                        <p className="text-ios-blue">
                          Need {formatCurrency(weeklyNeeded)}/week to reach goal on time
                        </p>
                      </div>
                    )}

                    {goal.notes && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                        {goal.notes}
                      </p>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </section>

        {/* Savings Buckets Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Savings Buckets</h2>
            <button
              onClick={() => setShowAddBucket(true)}
              className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium"
            >
              + Add Bucket
            </button>
          </div>

          {savingsBuckets.length === 0 ? (
            <GlassCard>
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">
                No savings buckets yet. Create buckets for travel, tech, paternity leave, etc.
              </p>
            </GlassCard>
          ) : (
            <div className="bento-grid">
              {savingsBuckets.map((bucket) => {
                const progress = bucket.targetAmount > 0
                  ? (bucket.currentAmount / bucket.targetAmount) * 100
                  : 0;

                // Calculate time to reach target
                let weeksToTarget = 0;
                if (bucket.weeklyContribution > 0 && bucket.targetAmount > bucket.currentAmount) {
                  weeksToTarget = Math.ceil(
                    (bucket.targetAmount - bucket.currentAmount) / bucket.weeklyContribution
                  );
                }

                return (
                  <GlassCard key={bucket.id} onClick={() => setEditingBucket(bucket)}>
                    <CardHeader title={bucket.name} />

                    <div className="flex justify-between items-end mb-2">
                      <CardValue
                        value={formatCurrency(bucket.currentAmount, false)}
                        size="medium"
                      />
                      {bucket.targetAmount > 0 && (
                        <p className="text-sm text-gray-500">
                          / {formatCurrency(bucket.targetAmount, false)}
                        </p>
                      )}
                    </div>

                    {bucket.targetAmount > 0 && (
                      <ProgressBar
                        progress={progress}
                        color={progress >= 100 ? 'success' : 'primary'}
                      />
                    )}

                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Weekly</span>
                      <span className="font-medium money-display">
                        +{formatCurrency(bucket.weeklyContribution)}
                      </span>
                    </div>

                    {weeksToTarget > 0 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        ~{Math.ceil(weeksToTarget / 4)} months to target
                      </div>
                    )}

                    {bucket.targetDate && (
                      <div className="mt-1 text-xs text-gray-500">
                        Target: {new Date(bucket.targetDate).toLocaleDateString('en-NZ', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <TabBar />

      {/* Goal Sheet */}
      <GoalSheet
        isOpen={showAddGoal || !!editingGoal}
        onClose={() => {
          setShowAddGoal(false);
          setEditingGoal(null);
        }}
        goal={editingGoal}
        onSave={(data) => {
          if (editingGoal) {
            dispatch({
              type: 'UPDATE_GOAL',
              payload: { id: editingGoal.id, updates: data },
            });
          } else {
            dispatch({ type: 'ADD_GOAL', payload: data });
          }
          setShowAddGoal(false);
          setEditingGoal(null);
        }}
        onDelete={editingGoal ? () => {
          dispatch({ type: 'DELETE_GOAL', payload: editingGoal.id });
          setEditingGoal(null);
        } : undefined}
      />

      {/* Bucket Sheet */}
      <BucketSheet
        isOpen={showAddBucket || !!editingBucket}
        onClose={() => {
          setShowAddBucket(false);
          setEditingBucket(null);
        }}
        bucket={editingBucket}
        onSave={(data) => {
          if (editingBucket) {
            dispatch({
              type: 'UPDATE_SAVINGS_BUCKET',
              payload: { id: editingBucket.id, updates: data },
            });
          } else {
            dispatch({ type: 'ADD_SAVINGS_BUCKET', payload: data });
          }
          setShowAddBucket(false);
          setEditingBucket(null);
        }}
        onDelete={editingBucket ? () => {
          dispatch({ type: 'DELETE_SAVINGS_BUCKET', payload: editingBucket.id });
          setEditingBucket(null);
        } : undefined}
      />
    </main>
  );
}

// Goal Form Sheet
function GoalSheet({
  isOpen,
  onClose,
  goal,
  onSave,
  onDelete,
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title={goal ? 'Edit Goal' : 'Add Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Emergency Fund, Paternity Leave"
            className="ios-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'emergency_fund', label: 'Emergency Fund' },
              { value: 'wealth', label: 'Wealth Target' },
              { value: 'time_specific', label: 'Time Specific' },
              { value: 'debt_free', label: 'Debt Free' },
            ] as const).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`py-2 px-3 rounded-ios text-sm font-medium transition-all ${
                  type === t.value
                    ? 'bg-ios-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'emergency_fund' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Months of Expenses
            </label>
            <input
              type="number"
              value={monthsOfExpenses}
              onChange={(e) => setMonthsOfExpenses(e.target.value)}
              placeholder="6"
              min="1"
              max="24"
              className="ios-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Target calculated from your &quot;necessity&quot; budget items
            </p>
          </div>
        )}

        {type !== 'emergency_fund' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Amount
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="10000"
              step="1"
              min="0"
              className="ios-input"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current Amount Saved
          </label>
          <input
            type="number"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="0"
            step="0.01"
            min="0"
            className="ios-input"
          />
        </div>

        {(type === 'time_specific' || type === 'wealth') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Date (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="ios-input"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any details about this goal..."
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
            {goal ? 'Save Changes' : 'Add Goal'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

// Savings Bucket Form Sheet
function BucketSheet({
  isOpen,
  onClose,
  bucket,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  bucket: SavingsBucket | null;
  onSave: (data: Omit<SavingsBucket, 'id' | 'createdAt' | 'updatedAt'>) => void;
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title={bucket ? 'Edit Bucket' : 'Add Savings Bucket'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Travel, Technology, Paternity"
            className="ios-input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Amount
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="5000"
              step="1"
              min="0"
              className="ios-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Amount
            </label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              className="ios-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weekly Contribution
          </label>
          <input
            type="number"
            value={weeklyContribution}
            onChange={(e) => setWeeklyContribution(e.target.value)}
            placeholder="50"
            step="0.01"
            min="0"
            className="ios-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Date (optional)
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="ios-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What is this bucket for?"
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
            {bucket ? 'Save Changes' : 'Add Bucket'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
