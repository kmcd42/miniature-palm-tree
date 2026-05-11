'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import Panel, { CategoryBadge, StatusDot, FitNumber } from '@/components/GlassCard';
import BottomSheet from '@/components/BottomSheet';
import { BudgetStackedBar } from '@/components/Charts';
import { useBudget } from '@/lib/context';
import { BudgetItem, BudgetCategory, Frequency } from '@/types/budget';
import {
  formatCurrency,
  toWeekly,
  getEffectiveWeeklyAmount,
  calculateWeeklyByCategoryEffective,
  calculateSharedHousing,
  partnerSplit,
} from '@/lib/calculations';

export default function BudgetPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [filter, setFilter] = useState<BudgetCategory | 'all'>('all');
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs tracking-[0.2em] text-phosphor-amber caret-blink">LOADING BGT MODULE</div>
      </main>
    );
  }

  const { settings, budgetItems, investments, savingsBuckets, sharedHousing, mortgages } = store;
  const partnerName = sharedHousing?.partnerName || 'Partner';
  const partnerIncome = sharedHousing?.partnerWeeklyIncome || 0;
  const sharingActive = !!sharedHousing?.enabled && partnerIncome > 0;

  const toggleCollapse = (itemId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const housingCalc = sharedHousing?.enabled
    ? calculateSharedHousing(sharedHousing, settings.afterTaxWeeklyIncome)
    : null;

  // Build effective budget items list including linked investments/savings
  const linkedBudgetItems: BudgetItem[] = [
    ...investments
      .filter((inv) => inv.weeklyContribution > 0 && inv.type !== 'kiwisaver')
      .map((inv) => ({
        id: `linked-inv-${inv.id}`,
        name: inv.name,
        amount: inv.weeklyContribution,
        frequency: 'weekly' as Frequency,
        category: 'savings' as BudgetCategory,
        linkedToId: inv.id,
        linkedToType: 'investment' as const,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      })),
    ...savingsBuckets
      .filter((b) => b.weeklyContribution > 0)
      .map((b) => ({
        id: `linked-bucket-${b.id}`,
        name: b.name,
        amount: b.weeklyContribution,
        frequency: 'weekly' as Frequency,
        category: 'savings' as BudgetCategory,
        linkedToId: b.id,
        linkedToType: 'savings_bucket' as const,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
  ];

  const housingLinkedItems: BudgetItem[] = [];
  if (sharedHousing?.enabled && housingCalc && (sharedHousing.expenses.length > 0 || mortgages.length > 0)) {
    const parentId = 'linked-housing-parent';
    housingLinkedItems.push({
      id: parentId,
      name: 'Housing',
      amount: 0,
      frequency: 'weekly' as Frequency,
      category: 'necessity' as BudgetCategory,
      linkedToId: 'shared-housing',
      linkedToType: 'housing' as const,
      createdAt: sharedHousing.createdAt,
      updatedAt: sharedHousing.updatedAt,
    });

    const incomeRatio = housingCalc.combinedWeeklyIncome > 0
      ? settings.afterTaxWeeklyIncome / housingCalc.combinedWeeklyIncome
      : 0.5;

    for (const mortgage of mortgages) {
      const weeklyPayment = mortgage.weeklyPayment + mortgage.extraWeeklyPayment;
      const yourShare = weeklyPayment * incomeRatio;
      housingLinkedItems.push({
        id: `linked-housing-mortgage-${mortgage.id}`,
        name: `${mortgage.name} (your share)`,
        amount: yourShare,
        frequency: 'weekly' as Frequency,
        category: 'necessity' as BudgetCategory,
        parentId,
        linkedToId: mortgage.id,
        linkedToType: 'mortgage' as const,
        createdAt: mortgage.createdAt,
        updatedAt: mortgage.updatedAt,
      });
    }

    for (const expense of sharedHousing.expenses) {
      const weeklyAmount = toWeekly(expense.amount, expense.frequency);
      const yourShare = weeklyAmount * incomeRatio;
      housingLinkedItems.push({
        id: `linked-housing-expense-${expense.id}`,
        name: `${expense.name} (your share)`,
        amount: yourShare,
        frequency: 'weekly' as Frequency,
        category: 'necessity' as BudgetCategory,
        parentId,
        linkedToId: expense.id,
        linkedToType: 'housing_expense' as const,
        createdAt: sharedHousing.createdAt,
        updatedAt: sharedHousing.updatedAt,
      });
    }
  }

  const allLinkedItems = [...linkedBudgetItems, ...housingLinkedItems];
  const manualItemIds = new Set(budgetItems.filter(i => i.linkedToId).map(i => i.linkedToId));
  const effectiveLinkedItems = allLinkedItems.filter((li) => !manualItemIds.has(li.linkedToId));
  const allBudgetItems = [...budgetItems, ...effectiveLinkedItems];

  const filteredItems = filter === 'all'
    ? allBudgetItems
    : allBudgetItems.filter((item) => item.category === filter);

  const parentItems = filteredItems.filter((item) => !item.parentId);
  const childItems = filteredItems.filter((item) => item.parentId);

  const weeklyByCategory = calculateWeeklyByCategoryEffective(allBudgetItems);
  const totalWeeklyCommitted = weeklyByCategory.necessity + weeklyByCategory.cost + weeklyByCategory.savings;
  const uncommitted = settings.afterTaxWeeklyIncome - totalWeeklyCommitted;

  const barChartData = parentItems.map((item) => ({
    id: item.id,
    name: item.name,
    amount: getEffectiveWeeklyAmount(item, allBudgetItems),
    category: item.category,
  }));

  const handleDelete = (id: string) => {
    if (id.startsWith('linked-')) {
      alert('Synced from Wealth — edit it there.');
      return;
    }
    if (confirm('Delete this budget item?')) {
      dispatch({ type: 'DELETE_BUDGET_ITEM', payload: id });
    }
  };

  // Identify if a given item is shared (i.e. came from shared housing)
  function isHousingShared(item: BudgetItem): boolean {
    return !!item.parentId && item.parentId === 'linked-housing-parent';
  }
  function housingParent(): BudgetItem | undefined {
    return parentItems.find((p) => p.id === 'linked-housing-parent');
  }

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-4xl mx-auto px-4 py-5">

        <header className="mb-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-phosphor-amber/80 uppercase flex items-center gap-2">
            <StatusDot color="amber" pulse /> BUDGET · WEEKLY ALLOCATION
          </div>
          <h1 className="font-serif text-[36px] leading-none text-ink-100 mt-1">
            Budget<span className="text-phosphor-amber">.</span>
          </h1>
        </header>

        {/* Allocation bar */}
        {settings.afterTaxWeeklyIncome > 0 && barChartData.length > 0 && (
          <Panel className="mb-4">
            <div className="term-label-plain mb-3">▸ Allocation · {formatCurrency(settings.afterTaxWeeklyIncome)}/wk income</div>
            <BudgetStackedBar items={barChartData} totalIncome={settings.afterTaxWeeklyIncome} height={22} />
          </Panel>
        )}

        {/* Summary */}
        <Panel brackets className="mb-5">
          <div className="flex justify-between items-end gap-4 mb-4 flex-wrap">
            <div>
              <div className="term-label-plain mb-1">▸ Weekly income</div>
              <FitNumber value={formatCurrency(settings.afterTaxWeeklyIncome)} baseSize={28} minSize={16} className="text-ink-100 font-medium" />
            </div>
            <div className="text-right">
              <div className="term-label-plain mb-1">▸ Uncommitted</div>
              <FitNumber
                value={formatCurrency(uncommitted)}
                baseSize={28}
                minSize={16}
                className={`font-medium ${uncommitted >= 0 ? 'text-phosphor-mint mono-num-glow-mint' : 'text-phosphor-red mono-num-glow-red'}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <BlockStat label="Necessity" value={weeklyByCategory.necessity} color="red" />
            <BlockStat label="Cost" value={weeklyByCategory.cost} color="amber" />
            <BlockStat label="Savings" value={weeklyByCategory.savings} color="mint" />
          </div>
        </Panel>

        {/* Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
          {(['all', 'necessity', 'cost', 'savings'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase rounded-sm border whitespace-nowrap transition-all ${
                filter === cat
                  ? 'border-phosphor-amber text-phosphor-amber bg-phosphor-amber/8'
                  : 'border-graphite-600 text-ink-500 hover:text-ink-300 hover:border-graphite-500'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-2.5">
          {parentItems.length === 0 ? (
            <Panel><p className="text-center text-ink-500 py-8 text-sm">No budget items yet. Add your first one.</p></Panel>
          ) : (
            parentItems.map((item) => {
              const itemChildren = childItems.filter((c) => c.parentId === item.id);
              const isParent = itemChildren.length > 0;
              const weeklyAmount = getEffectiveWeeklyAmount(item, allBudgetItems);
              const isLinked = item.id.startsWith('linked-');
              const isCollapsed = collapsedItems.has(item.id);
              const isHousingParent = item.id === 'linked-housing-parent';

              // Partner split metadata for the parent
              let parentSplitInfo: ReturnType<typeof partnerSplit> | null = null;
              if (isHousingParent && sharingActive) {
                parentSplitInfo = partnerSplit(weeklyAmount, settings.afterTaxWeeklyIncome, partnerIncome);
              }

              return (
                <Panel
                  key={item.id}
                  onClick={() => {
                    if (isLinked) {
                      alert('Synced from Wealth — edit it there.');
                    } else {
                      setEditingItem(item);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isParent && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id); }}
                            className="w-5 h-5 flex items-center justify-center rounded-sm border border-graphite-600 hover:border-phosphor-amber/40 text-ink-500 hover:text-phosphor-amber transition-colors"
                            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                          >
                            <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        <h3 className="font-medium text-ink-100 truncate">{item.name}</h3>
                        <CategoryBadge category={item.category} />
                        {isParent && <span className="pill pill-cyan">AUTO</span>}
                        {isLinked && <span className="pill pill-violet">SYNC</span>}
                        {isHousingParent && sharingActive && <span className="pill pill-violet">SHARED</span>}
                      </div>
                      {!isParent && (
                        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">
                          {formatCurrency(item.amount)}/{item.frequency}
                        </div>
                      )}
                      {isParent && !isHousingParent && (
                        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">
                          {itemChildren.length} ITEM{itemChildren.length === 1 ? '' : 'S'} COMBINED
                        </div>
                      )}
                      {isHousingParent && parentSplitInfo && (
                        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">
                          HOUSEHOLD {formatCurrency(parentSplitInfo.total)}/WK · {itemChildren.length} ITEMS
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <FitNumber value={formatCurrency(weeklyAmount)} baseSize={20} minSize={13} className="text-ink-100 font-medium" />
                      <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">PER WEEK</div>
                    </div>
                  </div>

                  {/* Housing parent split bar */}
                  {isHousingParent && parentSplitInfo && (
                    <div className="mt-3 pt-3 border-t border-graphite-600">
                      <div className="split-bar mb-1.5">
                        <div style={{ width: `${parentSplitInfo.yourRatio * 100}%`, background: '#5BC8FF', boxShadow: '0 0 4px #5BC8FF' }} />
                        <div style={{ width: `${(1 - parentSplitInfo.yourRatio) * 100}%`, background: '#C599FF', boxShadow: '0 0 4px #C599FF' }} />
                      </div>
                      <div className="flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase">
                        <span className="text-phosphor-cyan/90">YOU {formatCurrency(parentSplitInfo.yourShare)}</span>
                        <span className="text-phosphor-violet/90">{partnerName.toUpperCase()} {formatCurrency(parentSplitInfo.partnerShare)}</span>
                      </div>
                    </div>
                  )}

                  {/* Sub-items */}
                  {itemChildren.length > 0 && !isCollapsed && (
                    <div className="mt-3 pt-3 border-t border-graphite-600 space-y-1.5">
                      {itemChildren.map((child) => {
                        const childWeekly = toWeekly(child.amount, child.frequency);
                        const childSplit = sharingActive && isHousingShared(child)
                          ? partnerSplit(childWeekly, settings.afterTaxWeeklyIncome, partnerIncome)
                          : null;
                        return (
                          <div
                            key={child.id}
                            className="flex justify-between items-start pl-3 border-l border-graphite-550 cursor-pointer hover:bg-graphite-800/60 py-1.5 rounded-r-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!child.id.startsWith('linked-')) setEditingItem(child);
                            }}
                          >
                            <div className="min-w-0">
                              <div className="text-ink-300 text-sm truncate">{child.name}</div>
                              {childSplit && (
                                <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">
                                  <span className="text-phosphor-violet/90">{partnerName.toUpperCase()} +{formatCurrency(childSplit.partnerShare)}</span>
                                  <span className="text-ink-700 mx-1.5">·</span>
                                  <span>TOTAL {formatCurrency(childSplit.total)}</span>
                                </div>
                              )}
                            </div>
                            <span className="mono-num text-ink-100 ml-3 shrink-0">{formatCurrency(childWeekly)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.notes && (
                    <p className="mt-2 text-xs text-ink-500 italic">{item.notes}</p>
                  )}
                </Panel>
              );
            })
          )}
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-24 right-4 w-12 h-12 rounded-sm bg-phosphor-amber/8 border border-phosphor-amber text-phosphor-amber flex items-center justify-center hover:bg-phosphor-amber/14 transition-all shadow-glow-amber z-40"
          aria-label="Add budget item"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      <TabBar />

      <BudgetItemSheet
        isOpen={showAddSheet || !!editingItem}
        onClose={() => { setShowAddSheet(false); setEditingItem(null); }}
        item={editingItem}
        parentItems={budgetItems.filter((i) => !i.parentId && !i.linkedToId)}
        onSave={(data) => {
          if (editingItem) {
            dispatch({ type: 'UPDATE_BUDGET_ITEM', payload: { id: editingItem.id, updates: data } });
          } else {
            dispatch({ type: 'ADD_BUDGET_ITEM', payload: data });
          }
          setShowAddSheet(false); setEditingItem(null);
        }}
        onDelete={editingItem && !editingItem.id.startsWith('linked-') ? () => {
          handleDelete(editingItem.id);
          setEditingItem(null);
        } : undefined}
      />
    </main>
  );
}

function BlockStat({ label, value, color }: { label: string; value: number; color: 'red' | 'amber' | 'mint' }) {
  const cls = color === 'red' ? 'text-phosphor-red' : color === 'amber' ? 'text-phosphor-amber' : 'text-phosphor-mint';
  const bg = color === 'red' ? 'bg-phosphor-red/[0.05] border-phosphor-red/25'
    : color === 'amber' ? 'bg-phosphor-amber/[0.05] border-phosphor-amber/25'
    : 'bg-phosphor-mint/[0.05] border-phosphor-mint/25';
  return (
    <div className={`p-2.5 rounded-sm border ${bg}`}>
      <div className="term-label-plain mb-1">▸ {label}</div>
      <FitNumber value={formatCurrency(value)} baseSize={18} minSize={12} className={`${cls} font-medium`} />
    </div>
  );
}

// ----- Budget item sheet ----------------------------------------------------

function BudgetItemSheet({
  isOpen, onClose, item, parentItems, onSave, onDelete,
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
    if (!name) return;
    const amountValue = parseFloat(amount) || 0;
    onSave({
      name,
      amount: amountValue,
      frequency,
      category,
      parentId: parentId || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} code="BGT" title={item ? 'Edit Item' : 'Add Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="term-label-plain block mb-1.5">▸ Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Groceries, Rent" className="term-input" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="term-label-plain block mb-1.5">▸ Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" className="term-input" />
            <p className="text-[11px] text-ink-500 mt-1">Leave 0 for parent items</p>
          </div>
          <div>
            <label className="term-label-plain block mb-1.5">▸ Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="term-input">
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="term-label-plain block mb-1.5">▸ Category</label>
          <div className="grid grid-cols-3 gap-2">
            {(['necessity', 'cost', 'savings'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2 px-2 font-mono text-[10px] tracking-[0.14em] uppercase border rounded-sm transition-all ${
                  category === cat
                    ? cat === 'necessity'
                      ? 'border-phosphor-red text-phosphor-red bg-phosphor-red/8'
                      : cat === 'cost'
                      ? 'border-phosphor-amber text-phosphor-amber bg-phosphor-amber/8'
                      : 'border-phosphor-mint text-phosphor-mint bg-phosphor-mint/8'
                    : 'border-graphite-600 text-ink-500 hover:text-ink-300 hover:border-graphite-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {parentItems.length > 0 && (
          <div>
            <label className="term-label-plain block mb-1.5">▸ Parent (optional)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="term-input">
              <option value="">None — top-level item</option>
              {parentItems.filter((p) => p.id !== item?.id).map((parent) => (
                <option key={parent.id} value={parent.id}>{parent.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-ink-500 mt-1">Parents auto-sum their children</p>
          </div>
        )}

        <div>
          <label className="term-label-plain block mb-1.5">▸ Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details..." className="term-input min-h-[60px] resize-none" />
        </div>

        <div className="flex gap-3 pt-3">
          {onDelete && (
            <button type="button" onClick={onDelete} className="term-btn-danger">Delete</button>
          )}
          <button type="submit" className="term-btn flex-1">▸ {item ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </BottomSheet>
  );
}
