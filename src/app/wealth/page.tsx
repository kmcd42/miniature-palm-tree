'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import Panel, { CardHeader, FitNumber, StatusDot, ProgressBar } from '@/components/GlassCard';
import BottomSheet from '@/components/BottomSheet';
import { WealthLineGraph, DrawdownBands } from '@/components/Charts';
import { useBudget } from '@/lib/context';
import { Investment, Mortgage, HouseExpense } from '@/types/budget';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  projectInvestment,
  calculateMortgagePayoff,
  mortgageExtraPaymentImpact,
  projectCurrentInvestmentValue,
  projectCurrentMortgageBalance,
  generateWealthProjection,
  formatRelativeTime,
  calculateSharedHousing,
  generateDrawdownProjection,
  getCurrentAge,
  yearsUntilRetirement,
  yearsInRetirement,
  mortgageYearsElapsed,
  mortgageProgressPercent,
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
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs tracking-[0.2em] text-phosphor-amber caret-blink">LOADING WLT MODULE</div>
      </main>
    );
  }

  const { settings, investments, mortgages, sharedHousing } = store;
  const currentAge = getCurrentAge(settings);

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
  const netWealth = totalInvestmentValue + totalEquity;

  const yrsToRet = yearsUntilRetirement(settings);
  const yrsInRet = yearsInRetirement(settings);

  const drawdown = (investments.length > 0 || totalPropertyValue > 0) && currentAge > 0
    ? generateDrawdownProjection(settings, investments, mortgages, totalPropertyValue)
    : null;

  const wealthProjectionData = currentAge > 0
    ? generateWealthProjection(currentAge, settings.retirementAge, investments, mortgages, totalPropertyValue, settings.inflationRate)
    : [];

  const housingCalc = sharedHousing?.enabled
    ? calculateSharedHousing(sharedHousing, settings.afterTaxWeeklyIncome)
    : null;

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <header className="mb-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-phosphor-amber/80 uppercase flex items-center gap-2">
            <StatusDot color="amber" pulse /> WEALTH · PROJECTIONS
          </div>
          <h1 className="font-serif text-[36px] leading-none text-ink-100 mt-1">
            Wealth<span className="text-phosphor-amber">.</span>
          </h1>
        </header>

        {/* Net wealth headline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Panel className="lg:col-span-2" brackets scan>
            <CardHeader title="Net Wealth · Today" subtitle="Investments + property − debt" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Total" value={formatCurrencyCompact(netWealth)} accent="amber" size={36} />
              <Stat label="Investments" value={formatCurrencyCompact(totalInvestmentValue)} accent="cyan" />
              <Stat label="Equity" value={formatCurrencyCompact(totalEquity)} accent="violet" />
            </div>
          </Panel>

          <Panel brackets glow>
            <CardHeader title={`Drawdown · ${settings.retirementAge}→${settings.lifeExpectancy}`} subtitle={`${Math.round(yrsToRet)} yr horizon · ${yrsInRet} yr retirement`} />
            {drawdown && drawdown.portfolioAtRetirementReal > 0 ? (
              <>
                {/* Mode A — deplete */}
                <div className="mb-3">
                  <div className="term-label-plain mb-0.5">Deplete · spend to zero</div>
                  <FitNumber
                    value={`${formatCurrency(drawdown.expectedWeekly + drawdown.nzSuperWeekly)}/wk`}
                    baseSize={28}
                    minSize={16}
                    className="text-phosphor-amber mono-num-glow font-medium"
                  />
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-1">
                    PORTFOLIO {formatCurrency(drawdown.expectedWeekly)}{drawdown.nzSuperEligible ? ` + SUPER ${formatCurrency(drawdown.nzSuperWeekly)}` : ''} · TO AGE {settings.lifeExpectancy}
                  </div>
                </div>

                {/* Mode B — perpetual */}
                <div className="mb-3 pt-3 border-t border-graphite-600">
                  <div className="term-label-plain mb-0.5">Perpetual · live off returns</div>
                  <FitNumber
                    value={`${formatCurrency(drawdown.perpetualWeekly + drawdown.nzSuperWeekly)}/wk`}
                    baseSize={28}
                    minSize={16}
                    className="text-phosphor-mint mono-num-glow-mint font-medium"
                  />
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-1">
                    PORTFOLIO {formatCurrency(drawdown.perpetualWeekly)}{drawdown.nzSuperEligible ? ` + SUPER ${formatCurrency(drawdown.nzSuperWeekly)}` : ''} · PRINCIPAL PRESERVED
                  </div>
                </div>

                <DrawdownBands
                  conservative={drawdown.conservativeWeekly}
                  expected={drawdown.expectedWeekly}
                  optimistic={drawdown.optimisticWeekly}
                  format={(n) => formatCurrency(n)}
                />
                <div className="mt-3 text-[10px] font-mono tracking-[0.14em] uppercase text-ink-500 leading-relaxed">
                  ▸ Portfolio (investments only): {formatCurrencyCompact(drawdown.portfolioAtRetirementReal)} real · expected real return {(drawdown.realReturnRate * 100).toFixed(1)}%/yr.
                  Deplete = SWR {settings.safeWithdrawalRate}% · perpetual = SWR − 1% (sequence-of-returns buffer). Bands = SWR ±1.5%.
                  {!drawdown.nzSuperEligible && settings.includeNzSuper && ` Super activates at age ${drawdown.nzSuperEligibilityAge}.`}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-500 py-4">
                Add investments to compute a sustainable drawdown. House equity isn&apos;t counted — it stays a house.
              </p>
            )}
          </Panel>
        </div>

        {/* Trajectory chart */}
        {wealthProjectionData.length > 1 && (
          <Panel brackets className="mb-6">
            <CardHeader title="Trajectory · Inflation-Adjusted" subtitle={`Age ${currentAge} → ${settings.retirementAge}`} />
            <WealthLineGraph data={wealthProjectionData} height={220} />
          </Panel>
        )}

        {/* Investments */}
        <section className="mb-6">
          <SectionHeader code="INV" title="Investments" onAdd={() => setShowAddInvestment(true)} />

          {investments.length === 0 ? (
            <Panel><p className="text-center text-ink-500 py-6 text-sm">No investments tracked. Add ETFs, KiwiSaver, etc.</p></Panel>
          ) : (
            <div className="space-y-3">
              {investmentProjections.map((inv) => {
                const projection = projectInvestment(inv, yrsToRet, settings.inflationRate);
                const valueChanged = inv.projectedValue !== inv.currentValue;
                return (
                  <Panel key={inv.id} onClick={() => setEditingInvestment(inv)}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-ink-100 font-medium truncate">{inv.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="pill pill-cyan">
                            {inv.type === 'kiwisaver' ? 'KIWISAVER' : inv.type === 'etf' ? 'ETF' : 'OTHER'}
                          </span>
                          {inv.currentValueUpdatedAt && (
                            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500">
                              {valueChanged ? 'PROJ' : 'UPD'} {formatRelativeTime(inv.currentValueUpdatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <FitNumber
                          value={formatCurrencyCompact(inv.projectedValue)}
                          baseSize={22}
                          minSize={14}
                          className="text-ink-100 font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-graphite-600">
                      <MiniStat label="Weekly" value={formatCurrency(inv.weeklyContribution)} />
                      <MiniStat label="Return" value={formatPercent(inv.expectedReturnRate)} />
                      <MiniStat label={`At ${settings.retirementAge}`} value={formatCurrencyCompact(projection.real)} accent="mint" />
                    </div>
                  </Panel>
                );
              })}
              <div className="flex justify-between font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500 px-2 pt-1">
                <span>▸ Total weekly contributions</span>
                <span className="text-ink-100">{formatCurrency(totalWeeklyContributions)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Mortgages */}
        <section className="mb-6">
          <SectionHeader code="MTG" title="Mortgage" onAdd={() => setShowAddMortgage(true)} />

          {mortgages.length === 0 ? (
            <Panel><p className="text-center text-ink-500 py-6 text-sm">No mortgage tracked.</p></Panel>
          ) : (
            <div className="space-y-3">
              {mortgageProjections.map((mortgage) => {
                const payoff = calculateMortgagePayoff(mortgage);
                const extra50Impact = mortgageExtraPaymentImpact(mortgage, 50);
                const balanceChanged = mortgage.projectedBalance !== mortgage.principal;
                const equity = (mortgage.propertyValue || 0) - mortgage.projectedBalance;
                const elapsed = mortgageYearsElapsed(mortgage);
                const progressPct = mortgageProgressPercent(mortgage);

                return (
                  <Panel key={mortgage.id} onClick={() => setEditingMortgage(mortgage)}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-ink-100 font-medium truncate">{mortgage.name}</h3>
                        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-1">
                          {formatPercent(mortgage.interestRate)} · {mortgage.termYears}YR TERM · {elapsed.toFixed(1)}YR ELAPSED
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <FitNumber
                          value={formatCurrencyCompact(mortgage.projectedBalance)}
                          baseSize={22}
                          minSize={14}
                          className="text-phosphor-red font-medium"
                        />
                        {mortgage.principalUpdatedAt && (
                          <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-1">
                            {balanceChanged ? 'PROJ' : 'UPD'} {formatRelativeTime(mortgage.principalUpdatedAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between font-mono text-[10px] tracking-[0.16em] uppercase text-ink-500 mb-1">
                        <span>▸ Paid off {progressPct.toFixed(0)}%</span>
                        <span>{formatCurrencyCompact(mortgage.originalPrincipal - mortgage.projectedBalance)} of {formatCurrencyCompact(mortgage.originalPrincipal)}</span>
                      </div>
                      <ProgressBar progress={progressPct} color="amber" />
                    </div>

                    {mortgage.propertyValue && mortgage.propertyValue > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <MiniStat label="CV" value={formatCurrencyCompact(mortgage.propertyValue)} accent="violet" />
                        <MiniStat label="Equity" value={formatCurrencyCompact(equity)} accent="mint" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <MiniStat
                        label="Weekly"
                        value={`${formatCurrency(mortgage.weeklyPayment + mortgage.extraWeeklyPayment)}${mortgage.extraWeeklyPayment > 0 ? ` (+${formatCurrency(mortgage.extraWeeklyPayment)})` : ''}`}
                      />
                      <MiniStat
                        label="Clears"
                        value={payoff.payoffDate.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}
                      />
                    </div>

                    <div className="border-l-2 border-phosphor-mint/40 pl-3 py-1.5 bg-phosphor-mint/[0.04] rounded-r-sm">
                      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-phosphor-mint">▸ Acceleration scenario</div>
                      <div className="text-sm text-ink-100 mt-0.5">
                        +$50/wk extra → {Math.floor(extra50Impact.monthsSaved / 12)}y {extra50Impact.monthsSaved % 12}m sooner
                      </div>
                      <div className="text-xs text-ink-500">Saves {formatCurrency(extra50Impact.interestSaved, false)} interest</div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </section>

        {/* Shared housing */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-100 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-phosphor-amber px-1.5 py-0.5 border border-phosphor-amber/40 rounded-sm">SHR</span>
              Shared Household
            </div>
            <button
              onClick={() => {
                if (!sharedHousing?.enabled) {
                  dispatch({ type: 'UPDATE_SHARED_HOUSING', payload: { enabled: true } });
                }
              }}
              className="term-btn-ghost text-[10px]"
            >
              {sharedHousing?.enabled ? '▸ Settings' : '▸ Enable'}
            </button>
          </div>

          {!sharedHousing?.enabled ? (
            <Panel><p className="text-center text-ink-500 py-6 text-sm">Enable to split expenses with your partner by income ratio.</p></Panel>
          ) : (
            <div className="space-y-3">
              <Panel>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="term-label-plain block mb-1.5">▸ Partner name</label>
                    <input
                      type="text"
                      value={sharedHousing.partnerName || ''}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHARED_HOUSING', payload: { partnerName: e.target.value } })}
                      placeholder="Partner"
                      className="term-input"
                    />
                  </div>
                  <div>
                    <label className="term-label-plain block mb-1.5">▸ Partner income/wk</label>
                    <input
                      type="number"
                      value={sharedHousing.partnerWeeklyIncome || ''}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHARED_HOUSING', payload: { partnerWeeklyIncome: parseFloat(e.target.value) || 0 } })}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      className="term-input"
                    />
                  </div>
                </div>

                {housingCalc && housingCalc.combinedWeeklyIncome > 0 && (
                  <div className="mt-4 pt-4 border-t border-graphite-600 grid grid-cols-2 gap-4">
                    <MiniStat
                      label="Your share"
                      value={`${((settings.afterTaxWeeklyIncome / housingCalc.combinedWeeklyIncome) * 100).toFixed(0)}%`}
                      accent="cyan"
                    />
                    <MiniStat
                      label={`${sharedHousing.partnerName || 'Partner'}'s share`}
                      value={`${((sharedHousing.partnerWeeklyIncome / housingCalc.combinedWeeklyIncome) * 100).toFixed(0)}%`}
                      accent="violet"
                    />
                  </div>
                )}
              </Panel>

              <div className="flex justify-between items-center pt-2">
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500">▸ Shared expenses</span>
                <button onClick={() => setShowAddHouseExpense(true)} className="term-btn-ghost text-[10px]">▸ Add</button>
              </div>

              {sharedHousing.expenses.length === 0 ? (
                <Panel><p className="text-center text-ink-500 py-4 text-sm">No shared expenses yet.</p></Panel>
              ) : (
                <div className="space-y-2">
                  {sharedHousing.expenses.map((expense) => {
                    const weeklyAmount = expense.frequency === 'monthly' ? (expense.amount * 12) / 52 : expense.frequency === 'yearly' ? expense.amount / 52 : expense.amount;
                    const incomeRatio = housingCalc?.combinedWeeklyIncome && housingCalc.combinedWeeklyIncome > 0
                      ? settings.afterTaxWeeklyIncome / housingCalc.combinedWeeklyIncome
                      : 0.5;
                    const yourPortion = weeklyAmount * incomeRatio;
                    const partnerPortion = weeklyAmount - yourPortion;
                    return (
                      <Panel key={expense.id} onClick={() => setEditingHouseExpense(expense)}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <p className="text-ink-100 font-medium truncate">{expense.name}</p>
                            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">
                              {formatCurrency(expense.amount)}/{expense.frequency}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="mono-num text-ink-100">{formatCurrency(yourPortion)}</div>
                            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-0.5">YOUR SHARE/WK</div>
                          </div>
                        </div>
                        <div className="split-bar mt-2.5">
                          <div style={{ width: `${incomeRatio * 100}%`, background: '#5BC8FF', boxShadow: '0 0 4px #5BC8FF' }} />
                          <div style={{ width: `${(1 - incomeRatio) * 100}%`, background: '#C599FF', boxShadow: '0 0 4px #C599FF' }} />
                        </div>
                        <div className="flex justify-between font-mono text-[9px] tracking-[0.14em] uppercase text-ink-500 mt-1.5">
                          <span className="text-phosphor-cyan/80">YOU {formatCurrency(yourPortion)}</span>
                          <span className="text-phosphor-violet/80">{sharedHousing.partnerName?.toUpperCase() || 'PTNR'} {formatCurrency(partnerPortion)}</span>
                        </div>
                      </Panel>
                    );
                  })}

                  {housingCalc && (
                    <Panel raised>
                      <div className="grid grid-cols-3 gap-3">
                        <MiniStat label="Total/wk" value={formatCurrency(housingCalc.totalWeeklyExpenses)} accent="amber" />
                        <MiniStat label="You" value={formatCurrency(housingCalc.yourShare)} accent="cyan" />
                        <MiniStat label={sharedHousing.partnerName || 'Partner'} value={formatCurrency(housingCalc.partnerShare)} accent="violet" />
                      </div>
                    </Panel>
                  )}
                </div>
              )}

              <button
                onClick={() => dispatch({ type: 'UPDATE_SHARED_HOUSING', payload: { enabled: false } })}
                className="w-full text-center font-mono text-[10px] tracking-[0.18em] uppercase text-phosphor-red/70 hover:text-phosphor-red py-2 mt-2"
              >
                Disable shared household
              </button>
            </div>
          )}
        </section>
      </div>

      <TabBar />

      <InvestmentSheet
        isOpen={showAddInvestment || !!editingInvestment}
        onClose={() => { setShowAddInvestment(false); setEditingInvestment(null); }}
        investment={editingInvestment}
        onSave={(data) => {
          if (editingInvestment) {
            dispatch({ type: 'UPDATE_INVESTMENT', payload: { id: editingInvestment.id, updates: data } });
          } else {
            dispatch({ type: 'ADD_INVESTMENT', payload: data });
          }
          setShowAddInvestment(false); setEditingInvestment(null);
        }}
        onDelete={editingInvestment ? () => {
          dispatch({ type: 'DELETE_INVESTMENT', payload: editingInvestment.id });
          setEditingInvestment(null);
        } : undefined}
      />

      <MortgageSheet
        isOpen={showAddMortgage || !!editingMortgage}
        onClose={() => { setShowAddMortgage(false); setEditingMortgage(null); }}
        mortgage={editingMortgage}
        onSave={(data) => {
          if (editingMortgage) {
            dispatch({ type: 'UPDATE_MORTGAGE', payload: { id: editingMortgage.id, updates: data } });
          } else {
            dispatch({ type: 'ADD_MORTGAGE', payload: data });
          }
          setShowAddMortgage(false); setEditingMortgage(null);
        }}
        onDelete={editingMortgage ? () => {
          dispatch({ type: 'DELETE_MORTGAGE', payload: editingMortgage.id });
          setEditingMortgage(null);
        } : undefined}
      />

      <HouseExpenseSheet
        isOpen={showAddHouseExpense || !!editingHouseExpense}
        onClose={() => { setShowAddHouseExpense(false); setEditingHouseExpense(null); }}
        expense={editingHouseExpense}
        onSave={(data) => {
          if (editingHouseExpense) {
            dispatch({ type: 'UPDATE_HOUSE_EXPENSE', payload: { id: editingHouseExpense.id, updates: data } });
          } else {
            dispatch({ type: 'ADD_HOUSE_EXPENSE', payload: data });
          }
          setShowAddHouseExpense(false); setEditingHouseExpense(null);
        }}
        onDelete={editingHouseExpense ? () => {
          dispatch({ type: 'DELETE_HOUSE_EXPENSE', payload: editingHouseExpense.id });
          setEditingHouseExpense(null);
        } : undefined}
      />
    </main>
  );
}

// ----- UI helpers -----------------------------------------------------------

function Stat({ label, value, accent, size = 28 }: { label: string; value: string; accent: 'amber' | 'cyan' | 'mint' | 'violet' | 'red'; size?: number }) {
  const cls = {
    amber: 'text-phosphor-amber',
    cyan: 'text-phosphor-cyan',
    mint: 'text-phosphor-mint',
    violet: 'text-phosphor-violet',
    red: 'text-phosphor-red',
  }[accent];
  return (
    <div>
      <div className="term-label-plain mb-1">{label}</div>
      <FitNumber value={value} baseSize={size} minSize={14} className={`${cls} font-medium`} />
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'cyan' | 'mint' | 'violet' | 'red' }) {
  const cls = accent === 'amber' ? 'text-phosphor-amber'
    : accent === 'cyan' ? 'text-phosphor-cyan'
    : accent === 'mint' ? 'text-phosphor-mint'
    : accent === 'violet' ? 'text-phosphor-violet'
    : accent === 'red' ? 'text-phosphor-red'
    : 'text-ink-100';
  return (
    <div>
      <div className="term-label-plain mb-0.5">{label}</div>
      <FitNumber value={value} baseSize={16} minSize={11} className={`${cls} font-medium`} />
    </div>
  );
}

function SectionHeader({ code, title, onAdd }: { code: string; title: string; onAdd: () => void }) {
  return (
    <div className="flex justify-between items-center mb-3">
      <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-100 flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-phosphor-amber px-1.5 py-0.5 border border-phosphor-amber/40 rounded-sm">{code}</span>
        {title}
      </div>
      <button onClick={onAdd} className="term-btn-ghost text-[10px]">▸ Add</button>
    </div>
  );
}

// ----- Investment sheet -----------------------------------------------------

function InvestmentSheet({
  isOpen, onClose, investment, onSave, onDelete,
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
    <BottomSheet isOpen={isOpen} onClose={onClose} code="INV" title={investment ? 'Edit Investment' : 'Add Investment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., S&P 500 ETF" className="term-input" required /></Field>
        <Field label="Type">
          <div className="grid grid-cols-3 gap-2">
            {(['etf', 'kiwisaver', 'other'] as const).map((t) => (
              <PillToggle key={t} active={type === t} onClick={() => setType(t)} label={t === 'kiwisaver' ? 'KiwiSaver' : t.toUpperCase()} />
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current value"><input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0" step="0.01" min="0" className="term-input" /></Field>
          <Field label="Weekly contribution"><input type="number" value={weeklyContribution} onChange={(e) => setWeeklyContribution(e.target.value)} placeholder="0" step="0.01" min="0" className="term-input" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Expected return %"><input type="number" value={expectedReturnRate} onChange={(e) => setExpectedReturnRate(e.target.value)} placeholder="7" step="0.1" className="term-input" /></Field>
          <Field label="Fee % (optional)"><input type="number" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} placeholder="0.5" step="0.01" min="0" className="term-input" /></Field>
        </div>
        <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="term-input min-h-[60px] resize-none" /></Field>
        <SheetActions onDelete={onDelete} submitLabel={investment ? 'Save' : 'Add'} />
      </form>
    </BottomSheet>
  );
}

// ----- Mortgage sheet -------------------------------------------------------

function MortgageSheet({
  isOpen, onClose, mortgage, onSave, onDelete,
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
  const [startDate, setStartDate] = useState(
    mortgage?.startDate ? new Date(mortgage.startDate).toISOString().split('T')[0] : ''
  );
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
    setStartDate(mortgage?.startDate ? new Date(mortgage.startDate).toISOString().split('T')[0] : '');
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
      startDate: startDate ? new Date(startDate).getTime() : (mortgage?.startDate || Date.now()),
      termYears: parseInt(termYears) || 30,
      notes: notes || undefined,
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} code="MTG" title={mortgage ? 'Edit Mortgage' : 'Add Mortgage'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="term-input" /></Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Current balance"><input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="500000" step="1" min="0" className="term-input" required /></Field>
          <Field label="Original amount"><input type="number" value={originalPrincipal} onChange={(e) => setOriginalPrincipal(e.target.value)} placeholder="600000" step="1" min="0" className="term-input" /></Field>
        </div>

        <Field label="Property value (CV)" hint="Used to calculate equity">
          <input type="number" value={propertyValue} onChange={(e) => setPropertyValue(e.target.value)} placeholder="750000" step="1" min="0" className="term-input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Interest rate %"><input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="6.5" step="0.01" min="0" className="term-input" required /></Field>
          <Field label="Term (years)"><input type="number" value={termYears} onChange={(e) => setTermYears(e.target.value)} placeholder="30" min="1" max="50" className="term-input" /></Field>
        </div>

        <Field label="Draw-down date" hint="When the mortgage was first drawn down — used to track years elapsed">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="term-input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Weekly payment"><input type="number" value={weeklyPayment} onChange={(e) => setWeeklyPayment(e.target.value)} placeholder="800" step="0.01" min="0" className="term-input" required /></Field>
          <Field label="Extra weekly"><input type="number" value={extraWeeklyPayment} onChange={(e) => setExtraWeeklyPayment(e.target.value)} placeholder="0" step="0.01" min="0" className="term-input" /></Field>
        </div>

        <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="term-input min-h-[60px] resize-none" /></Field>
        <SheetActions onDelete={onDelete} submitLabel={mortgage ? 'Save' : 'Add'} />
      </form>
    </BottomSheet>
  );
}

// ----- House expense sheet --------------------------------------------------

function HouseExpenseSheet({
  isOpen, onClose, expense, onSave, onDelete,
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
    onSave({ name, amount: parseFloat(amount), frequency, category });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} code="SHR" title={expense ? 'Edit Expense' : 'Add Shared Expense'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Rent, Power" className="term-input" required /></Field>
        <Field label="Amount"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" step="0.01" min="0" className="term-input" required /></Field>
        <Field label="Frequency">
          <div className="grid grid-cols-4 gap-2">
            {(['weekly', 'fortnightly', 'monthly', 'yearly'] as const).map((f) => (
              <PillToggle key={f} active={frequency === f} onClick={() => setFrequency(f)} label={f.slice(0, 4).toUpperCase()} />
            ))}
          </div>
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as HouseExpense['category'])} className="term-input">
            <option value="mortgage">Mortgage / Rent</option>
            <option value="rates">Rates</option>
            <option value="body_corporate">Body Corporate</option>
            <option value="utilities">Utilities</option>
            <option value="insurance">Insurance</option>
            <option value="food">Food / Groceries</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <SheetActions onDelete={onDelete} submitLabel={expense ? 'Save' : 'Add'} />
      </form>
    </BottomSheet>
  );
}

// ----- Form primitives ------------------------------------------------------

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="term-label-plain block mb-1.5">▸ {label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

function PillToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-2 font-mono text-[10px] tracking-[0.14em] uppercase border rounded-sm transition-all ${
        active
          ? 'border-phosphor-amber text-phosphor-amber bg-phosphor-amber/8'
          : 'border-graphite-600 text-ink-500 hover:text-ink-300 hover:border-graphite-500'
      }`}
    >
      {label}
    </button>
  );
}

function SheetActions({ onDelete, submitLabel }: { onDelete?: () => void; submitLabel: string }) {
  return (
    <div className="flex gap-3 pt-4">
      {onDelete && (
        <button type="button" onClick={onDelete} className="term-btn-danger">Delete</button>
      )}
      <button type="submit" className="term-btn flex-1">▸ {submitLabel}</button>
    </div>
  );
}
