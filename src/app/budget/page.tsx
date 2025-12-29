'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader, CategoryBadge, ProgressBar } from '@/components/GlassCard';
import BottomSheet from '@/components/BottomSheet';
import { useBudget } from '@/lib/context';
import { BudgetItem, BudgetCategory, Frequency } from '@/types/budget';
import {
  formatCurrency,
  toWeekly,
  fromWeekly,
  calculateWeeklyByCategory,
  calculateUncommittedIncome,
} from '@/lib/calculations';

export default function BudgetPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [filter, setFilter] = useState<BudgetCategory | 'all'>('all');

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { settings, budgetItems } = store;

  // Filter and group items
  const filteredItems = filter === 'all'
    ? budgetItems
    : budgetItems.filter((item) => item.category === filter);

  // Group by parent (for sub-items)
  const parentItems = filteredItems.filter((item) => !item.parentId);
  const childItems = filteredItems.filter((item) => item.parentId);

  // Calculate totals
  const weeklyByCategory = calculateWeeklyByCategory(budgetItems);
  const uncommitted = calculateUncommittedIncome(settings.afterTaxWeeklyIncome, budgetItems);

  const handleDelete = (id: string) => {
    if (confirm('Delete this budget item?')) {
      dispatch({ type: 'DELETE_BUDGET_ITEM', payload: id });
    }
  };

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Budget</h1>
          <p className="text-white/70 text-sm">Weekly spending plan</p>
        </header>

        {/* Summary Card */}
        <GlassCard className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Income</p>
              <p className="text-2xl font-bold money-display">
                {formatCurrency(settings.afterTaxWeeklyIncome)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Uncommitted</p>
              <p className={`text-2xl font-bold money-display ${uncommitted >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                {formatCurrency(uncommitted)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-ios bg-ios-red/10">
              <p className="text-xs text-ios-red">Necessity</p>
              <p className="font-semibold money-display">{formatCurrency(weeklyByCategory.necessity)}</p>
            </div>
            <div className="text-center p-2 rounded-ios bg-ios-orange/10">
              <p className="text-xs text-ios-orange">Cost</p>
              <p className="font-semibold money-display">{formatCurrency(weeklyByCategory.cost)}</p>
            </div>
            <div className="text-center p-2 rounded-ios bg-ios-green/10">
              <p className="text-xs text-ios-green">Savings</p>
              <p className="font-semibold money-display">{formatCurrency(weeklyByCategory.savings)}</p>
            </div>
          </div>
        </GlassCard>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
          {(['all', 'necessity', 'cost', 'savings'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === cat
                  ? 'bg-white text-gray-900 shadow-ios'
                  : 'bg-white/30 text-white'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Budget Items List */}
        <div className="space-y-3">
          {parentItems.length === 0 ? (
            <GlassCard>
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No budget items yet. Add your first one!
              </p>
            </GlassCard>
          ) : (
            parentItems.map((item) => {
              const weeklyAmount = toWeekly(item.amount, item.frequency);
              const itemChildren = childItems.filter((c) => c.parentId === item.id);

              return (
                <GlassCard
                  key={item.id}
                  onClick={() => setEditingItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h3>
                        <CategoryBadge category={item.category} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(item.amount)}/{item.frequency}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg money-display">
                        {formatCurrency(weeklyAmount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">per week</p>
                    </div>
                  </div>

                  {/* Sub-items */}
                  {itemChildren.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      {itemChildren.map((child) => (
                        <div key={child.id} className="flex justify-between text-sm pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-300">{child.name}</span>
                          <span className="money-display">{formatCurrency(toWeekly(child.amount, child.frequency))}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                      {item.notes}
                    </p>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-ios-blue text-white shadow-ios-lg flex items-center justify-center"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      <TabBar />

      {/* Add/Edit Sheet */}
      <BudgetItemSheet
        isOpen={showAddSheet || !!editingItem}
        onClose={() => {
          setShowAddSheet(false);
          setEditingItem(null);
        }}
        item={editingItem}
        parentItems={parentItems}
        onSave={(data) => {
          if (editingItem) {
            dispatch({
              type: 'UPDATE_BUDGET_ITEM',
              payload: { id: editingItem.id, updates: data },
            });
          } else {
            dispatch({ type: 'ADD_BUDGET_ITEM', payload: data });
          }
          setShowAddSheet(false);
          setEditingItem(null);
        }}
        onDelete={editingItem ? () => {
          handleDelete(editingItem.id);
          setEditingItem(null);
        } : undefined}
      />
    </main>
  );
}

// Budget Item Form Sheet
function BudgetItemSheet({
  isOpen,
  onClose,
  item,
  parentItems,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: BudgetItem | null;
  parentItems: BudgetItem[];
  onSave: (data: Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [amount, setAmount] = useState(item?.amount?.toString() || '');
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency || 'weekly');
  const [category, setCategory] = useState<BudgetCategory>(item?.category || 'cost');
  const [parentId, setParentId] = useState(item?.parentId || '');
  const [notes, setNotes] = useState(item?.notes || '');

  // Reset form when item changes
  React.useEffect(() => {
    setName(item?.name || '');
    setAmount(item?.amount?.toString() || '');
    setFrequency(item?.frequency || 'weekly');
    setCategory(item?.category || 'cost');
    setParentId(item?.parentId || '');
    setNotes(item?.notes || '');
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    onSave({
      name,
      amount: parseFloat(amount),
      frequency,
      category,
      parentId: parentId || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Edit Budget Item' : 'Add Budget Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Groceries, Rent, ETF Savings"
            className="ios-input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount
            </label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="ios-input"
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['necessity', 'cost', 'savings'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2 px-3 rounded-ios text-sm font-medium transition-all ${
                  category === cat
                    ? cat === 'necessity'
                      ? 'bg-ios-red text-white'
                      : cat === 'cost'
                        ? 'bg-ios-orange text-white'
                        : 'bg-ios-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {parentItems.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent Item (optional)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="ios-input"
            >
              <option value="">None (top-level item)</option>
              {parentItems.filter((p) => p.id !== item?.id).map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            className="ios-input min-h-[80px] resize-none"
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
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
