'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import Panel, { CardHeader, FitNumber, StatusDot, ProgressBar } from '@/components/GlassCard';
import { WealthLineGraph, DrawdownBands } from '@/components/Charts';
import PaydayModal from '@/components/PaydayModal';
import { useBudget } from '@/lib/context';
import {
  formatCurrency,
  formatCurrencyCompact,
  calculateWeeklyByCategoryEffective,
  calculateUncommittedIncomeEffective,
  calculateEmergencyFundTargetEffective,
  generateWealthProjection,
  generateDrawdownProjection,
  generateInsights,
  buildCompleteBudgetItems,
  getCurrentAge,
  yearsUntilRetirement,
  yearsInRetirement,
  calculateSharedHousing,
} from '@/lib/calculations';

export default function Dashboard() {
  const { store, isLoaded } = useBudget();
  const [showPaydayModal, setShowPaydayModal] = useState(false);

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs tracking-[0.2em] text-phosphor-amber caret-blink">
          AETHER-OS BOOTING
        </div>
      </main>
    );
  }

  const { settings, budgetItems, investments, mortgages, goals, savingsBuckets, sharedHousing } = store;
  const isNewUser = settings.afterTaxWeeklyIncome === 0;

  const allBudgetItems = buildCompleteBudgetItems(
    budgetItems,
    investments,
    savingsBuckets,
    mortgages,
    sharedHousing,
    settings.afterTaxWeeklyIncome
  );

  const weeklyByCategory = calculateWeeklyByCategoryEffective(allBudgetItems);
  const totalWeeklyCommitted = weeklyByCategory.necessity + weeklyByCategory.cost + weeklyByCategory.savings;
  const uncommittedWeekly = calculateUncommittedIncomeEffective(settings.afterTaxWeeklyIncome, allBudgetItems);

  const currentInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const weeklyInvestmentContributions = investments.reduce((sum, inv) => sum + inv.weeklyContribution, 0);

  const totalMortgageBalance = mortgages.reduce((sum, m) => sum + m.principal, 0);
  const weeklyMortgagePayments = mortgages.reduce((sum, m) => sum + m.weeklyPayment + m.extraWeeklyPayment, 0);
  const totalPropertyValue = mortgages.reduce((sum, m) => sum + (m.propertyValue || 0), 0);
  const currentNetWealth = currentInvestmentValue + totalPropertyValue - totalMortgageBalance;

  const currentAge = getCurrentAge(settings);
  const yrsToRet = Math.round(yearsUntilRetirement(settings));
  const yrsInRet = yearsInRetirement(settings);

  const drawdown = (investments.length > 0 || totalPropertyValue > 0) && currentAge > 0
    ? generateDrawdownProjection(settings, investments, mortgages, totalPropertyValue)
    : null;

  const wealthProjectionData = currentAge > 0
    ? generateWealthProjection(currentAge, settings.retirementAge, investments, mortgages, totalPropertyValue, settings.inflationRate)
    : [];

  const emergencyGoal = goals.find((g) => g.type === 'emergency_fund');
  const emergencyFundTarget = emergencyGoal?.monthsOfExpenses
    ? calculateEmergencyFundTargetEffective(allBudgetItems, emergencyGoal.monthsOfExpenses)
    : 0;
  const emergencyFundProgress = emergencyFundTarget > 0 && emergencyGoal
    ? Math.min(100, (emergencyGoal.currentAmount / emergencyFundTarget) * 100)
    : 0;
  const monthsCovered = emergencyGoal && emergencyFundTarget > 0
    ? (emergencyGoal.currentAmount / emergencyFundTarget) * (emergencyGoal.monthsOfExpenses ?? 0)
    : 0;

  const insights = generateInsights(store);

  // Partner share summary if shared housing on
  const housingCalc = sharedHousing?.enabled && sharedHousing.partnerWeeklyIncome > 0
    ? calculateSharedHousing(sharedHousing, settings.afterTaxWeeklyIncome)
    : null;

  const now = new Date();
  const dateString = now.toLocaleDateString('en-NZ', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <main className="min-h-screen pb-24 safe-top relative z-10">
      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* Terminal header */}
        <header className="mb-5 flex justify-between items-end gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] tracking-[0.24em] text-phosphor-amber/80 uppercase flex items-center gap-2">
              <StatusDot color="amber" pulse /> AETHER-OS · OPERATIONS
            </div>
            <h1 className="font-serif text-[44px] sm:text-[52px] leading-none text-ink-100 mt-1">
              compound<span className="text-phosphor-amber">.</span>
            </h1>
            <div className="font-mono text-[10px] tracking-[0.2em] text-ink-500 uppercase mt-1.5">
              {dateString} · UNIT 01
            </div>
          </div>
          {!isNewUser && (
            <button
              onClick={() => setShowPaydayModal(true)}
              className="term-btn shrink-0"
            >
              ▸ Log Payday
            </button>
          )}
        </header>

        {isNewUser ? (
          <Panel brackets glow className="mb-6">
            <CardHeader title="System · Awaiting Configuration" />
            <p className="text-ink-300 text-sm mb-4 leading-relaxed">
              Set your after-tax weekly income to bring the dashboard online. The terminal needs a baseline before projections compile.
            </p>
            <a href="/settings" className="term-btn inline-flex">▸ Configure</a>
          </Panel>
        ) : (
          <div className="space-y-4">

            {/* Insights stream */}
            {insights.length > 0 && (
              <section className="space-y-2">
                <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-500 pl-1">
                  ▸ Insight stream · {insights.length} active
                </div>
                {insights.slice(0, 5).map((ins) => (
                  <InsightRow key={ins.id} insight={ins} />
                ))}
              </section>
            )}

            {/* Hero row: cashflow + retirement drawdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Weekly cashflow */}
              <Panel className="lg:col-span-2" brackets scan>
                <CardHeader
                  title="Cashflow · Weekly"
                  subtitle={`Income ${formatCurrency(settings.afterTaxWeeklyIncome)}/wk · ${weeklyByCategory.necessity + weeklyByCategory.cost > 0 ? Math.round(((totalWeeklyCommitted) / settings.afterTaxWeeklyIncome) * 100) : 0}% committed`}
                />
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <CategoryStat label="Necessity" value={weeklyByCategory.necessity} color="red" />
                  <CategoryStat label="Cost" value={weeklyByCategory.cost} color="amber" />
                  <CategoryStat label="Savings" value={weeklyByCategory.savings} color="mint" />
                </div>
                <div className="border-t border-graphite-600 pt-3 flex justify-between items-end gap-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500">▸ Uncommitted</div>
                    <div className={`mono-num text-2xl font-medium ${uncommittedWeekly >= 0 ? 'text-phosphor-mint mono-num-glow-mint' : 'text-phosphor-red mono-num-glow-red'}`}>
                      {formatCurrency(uncommittedWeekly)}
                    </div>
                  </div>
                  <div className="flex-1 max-w-xs">
                    <ProgressBar
                      progress={(totalWeeklyCommitted / settings.afterTaxWeeklyIncome) * 100}
                      color={uncommittedWeekly >= 0 ? 'amber' : 'danger'}
                    />
                  </div>
                </div>
              </Panel>

              {/* Retirement drawdown */}
              <Panel brackets glow>
                <CardHeader title={`Retirement · Age ${settings.retirementAge}→${settings.lifeExpectancy}`} subtitle={`${yrsToRet} yr horizon · ${yrsInRet} yr drawdown`} />
                {drawdown && drawdown.portfolioAtRetirementReal > 0 ? (
                  <>
                    <div className="mb-3">
                      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500">▸ Weekly draw (real)</div>
                      <FitNumber
                        value={formatCurrency(drawdown.expectedWeekly)}
                        baseSize={42}
                        minSize={22}
                        className="text-phosphor-amber mono-num-glow font-medium"
                      />
                      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-500 mt-1">
                        ≈ {formatCurrency(drawdown.monthlyDrawdownReal)}/mo · {formatCurrencyCompact(drawdown.portfolioAtRetirementReal)} portfolio
                      </div>
                    </div>
                    <DrawdownBands
                      conservative={drawdown.conservativeWeekly}
                      expected={drawdown.expectedWeekly}
                      optimistic={drawdown.optimisticWeekly}
                      format={(n) => formatCurrency(n)}
                    />
                  </>
                ) : (
                  <p className="text-sm text-ink-500 py-4">
                    Add investments or property to project a sustainable drawdown.
                  </p>
                )}
              </Panel>
            </div>

            {/* Wealth, mortgage, EF, partner row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Panel>
                <div className="term-label-plain">▸ Net wealth</div>
                <FitNumber
                  value={formatCurrencyCompact(currentNetWealth)}
                  baseSize={28}
                  minSize={16}
                  className="text-ink-100 mt-1.5 font-medium"
                />
                <div className="font-mono text-[10px] text-ink-500 tracking-[0.14em] mt-1.5">
                  INV {formatCurrencyCompact(currentInvestmentValue)} · EQ {formatCurrencyCompact(totalPropertyValue - totalMortgageBalance)}
                </div>
              </Panel>

              <Panel>
                <div className="term-label-plain">▸ Investments</div>
                <FitNumber
                  value={formatCurrencyCompact(currentInvestmentValue)}
                  baseSize={28}
                  minSize={16}
                  className="text-phosphor-cyan font-medium mt-1.5"
                />
                <div className="font-mono text-[10px] text-phosphor-mint tracking-[0.14em] mt-1.5">
                  +{formatCurrency(weeklyInvestmentContributions)}/WK
                </div>
              </Panel>

              <Panel>
                <div className="term-label-plain">▸ {mortgages.length > 0 ? 'Mortgage' : 'Property'}</div>
                <FitNumber
                  value={formatCurrencyCompact(mortgages.length > 0 ? totalMortgageBalance : totalPropertyValue)}
                  baseSize={28}
                  minSize={16}
                  className={`font-medium mt-1.5 ${mortgages.length > 0 ? 'text-phosphor-red' : 'text-ink-100'}`}
                />
                <div className="font-mono text-[10px] text-ink-500 tracking-[0.14em] mt-1.5">
                  {mortgages.length > 0 ? `${formatCurrency(weeklyMortgagePayments)}/WK` : 'NO DEBT'}
                </div>
              </Panel>

              <Panel>
                <div className="term-label-plain">▸ Emergency</div>
                <FitNumber
                  value={emergencyGoal ? `${monthsCovered.toFixed(1)}mo` : '—'}
                  baseSize={28}
                  minSize={16}
                  className={`font-medium mt-1.5 ${monthsCovered >= (emergencyGoal?.monthsOfExpenses ?? 6) ? 'text-phosphor-mint' : 'text-phosphor-amber'}`}
                />
                {emergencyGoal && (
                  <>
                    <div className="font-mono text-[10px] text-ink-500 tracking-[0.14em] mt-1.5">
                      OF {emergencyGoal.monthsOfExpenses} TARGET · {emergencyFundProgress.toFixed(0)}%
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar progress={emergencyFundProgress} color={monthsCovered >= (emergencyGoal.monthsOfExpenses ?? 6) ? 'success' : 'amber'} />
                    </div>
                  </>
                )}
              </Panel>
            </div>

            {/* Wealth trajectory */}
            {wealthProjectionData.length > 0 && (
              <Panel brackets>
                <div className="flex justify-between items-start mb-4 gap-3">
                  <div className="min-w-0">
                    <CardHeader title="Trajectory · Wealth (Real)" subtitle={`Inflation-adjusted · ${settings.inflationRate}%/yr`} />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="term-label-plain">▸ At {settings.retirementAge}</div>
                    <div className="mono-num text-2xl text-phosphor-mint font-medium mt-0.5">
                      {formatCurrencyCompact(wealthProjectionData[wealthProjectionData.length - 1]?.netWealth ?? 0)}
                    </div>
                  </div>
                </div>
                <WealthLineGraph data={wealthProjectionData} height={180} showLegend />
              </Panel>
            )}

            {/* Partner contribution panel (Hanni) */}
            {housingCalc && housingCalc.combinedWeeklyIncome > 0 && (
              <Panel className="bento-wide">
                <CardHeader title={`Shared Household · ${sharedHousing?.partnerName || 'Partner'}`} subtitle="Income-weighted split" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <SplitStat label="You contribute" value={housingCalc.yourShare} ratio={housingCalc.yourShare / housingCalc.totalWeeklyExpenses} color="cyan" />
                  <SplitStat label={`${sharedHousing?.partnerName || 'Partner'} contributes`} value={housingCalc.partnerShare} ratio={housingCalc.partnerShare / housingCalc.totalWeeklyExpenses} color="violet" />
                  <SplitStat label="Household total" value={housingCalc.totalWeeklyExpenses} color="amber" />
                </div>
                <div className="split-bar mt-4">
                  <div style={{ width: `${(housingCalc.yourShare / housingCalc.totalWeeklyExpenses) * 100}%`, background: '#5BC8FF', boxShadow: '0 0 6px #5BC8FF' }} />
                  <div style={{ width: `${(housingCalc.partnerShare / housingCalc.totalWeeklyExpenses) * 100}%`, background: '#C599FF', boxShadow: '0 0 6px #C599FF' }} />
                </div>
              </Panel>
            )}

            {/* Savings buckets digest */}
            {savingsBuckets.length > 0 && (
              <Panel>
                <CardHeader title="Buckets · Active" subtitle={`${savingsBuckets.length} channel${savingsBuckets.length === 1 ? '' : 's'}`} action={<a href="/goals" className="font-mono text-[10px] tracking-[0.16em] uppercase text-phosphor-cyan hover:text-phosphor-amber">VIEW ALL ▸</a>} />
                <div className="space-y-2.5">
                  {savingsBuckets.slice(0, 4).map((bucket) => {
                    const pct = bucket.targetAmount > 0
                      ? Math.min(100, (bucket.currentAmount / bucket.targetAmount) * 100)
                      : 0;
                    return (
                      <div key={bucket.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-ink-300 truncate">{bucket.name}</span>
                          <span className="mono-num text-ink-100 ml-3 shrink-0">
                            {formatCurrencyCompact(bucket.currentAmount)}
                            {bucket.targetAmount > 0 && <span className="text-ink-500"> / {formatCurrencyCompact(bucket.targetAmount)}</span>}
                          </span>
                        </div>
                        {bucket.targetAmount > 0 && <ProgressBar progress={pct} color="primary" />}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </div>
        )}
      </div>

      <TabBar />

      {showPaydayModal && <PaydayModal onClose={() => setShowPaydayModal(false)} />}
    </main>
  );
}

// ----- Helpers --------------------------------------------------------------

function CategoryStat({ label, value, color }: { label: string; value: number; color: 'red' | 'amber' | 'mint' }) {
  const cls = color === 'red' ? 'text-phosphor-red' : color === 'amber' ? 'text-phosphor-amber' : 'text-phosphor-mint';
  return (
    <div>
      <div className="term-label-plain mb-1">▸ {label}</div>
      <FitNumber
        value={formatCurrency(value)}
        baseSize={20}
        minSize={14}
        className={`${cls} font-medium`}
      />
    </div>
  );
}

function SplitStat({ label, value, ratio, color }: { label: string; value: number; ratio?: number; color: 'cyan' | 'violet' | 'amber' }) {
  const cls = color === 'cyan' ? 'text-phosphor-cyan' : color === 'violet' ? 'text-phosphor-violet' : 'text-phosphor-amber';
  return (
    <div>
      <div className="term-label-plain mb-1 truncate">▸ {label}</div>
      <FitNumber
        value={formatCurrency(value)}
        baseSize={22}
        minSize={14}
        className={`${cls} font-medium`}
      />
      <div className="font-mono text-[10px] text-ink-500 tracking-[0.14em] mt-1">
        {ratio != null ? `${(ratio * 100).toFixed(0)}% · ` : ''}per week
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: ReturnType<typeof generateInsights>[number] }) {
  const sev = insight.severity;
  const meta = {
    critical: { dot: 'red' as const, accent: 'border-phosphor-red/40 bg-phosphor-red/[0.04]', label: 'text-phosphor-red' },
    warn:     { dot: 'amber' as const, accent: 'border-phosphor-amber/40 bg-phosphor-amber/[0.04]', label: 'text-phosphor-amber' },
    info:     { dot: 'cyan' as const, accent: 'border-graphite-500 bg-graphite-800/60', label: 'text-phosphor-cyan' },
    positive: { dot: 'mint' as const, accent: 'border-phosphor-mint/30 bg-phosphor-mint/[0.04]', label: 'text-phosphor-mint' },
  }[sev];

  return (
    <div className={`border ${meta.accent} rounded-sm px-3.5 py-2.5 flex items-start gap-3`}>
      <div className="pt-1.5"><StatusDot color={meta.dot} /></div>
      <div className="flex-1 min-w-0">
        <div className={`font-mono text-[10px] tracking-[0.2em] uppercase ${meta.label}`}>{insight.label}</div>
        <div className="text-sm text-ink-100 mt-0.5 leading-snug">{insight.headline}</div>
        {insight.detail && (
          <div className="text-xs text-ink-500 mt-0.5 leading-snug">{insight.detail}</div>
        )}
      </div>
      {insight.actionHref && (
        <a href={insight.actionHref} className="font-mono text-[10px] tracking-[0.16em] uppercase text-phosphor-amber hover:underline shrink-0 self-center">
          {insight.actionLabel ?? 'OPEN'} ▸
        </a>
      )}
    </div>
  );
}
