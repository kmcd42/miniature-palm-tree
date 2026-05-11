'use client';

import React, { useState } from 'react';
import TabBar from '@/components/TabBar';
import Panel, { CardHeader, FitNumber, StatusDot, ProgressBar } from '@/components/GlassCard';
import { WealthLineGraph } from '@/components/Charts';
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
import {
  nzMedianNetWorthForAge,
  masseyBracket,
  NZ_AVG_SAVINGS_RATE,
} from '@/lib/benchmarks';

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

              {/* Retirement drawdown — deplete + perpetual + optional super */}
              <Panel brackets glow>
                <CardHeader title={`Retirement · Age ${settings.retirementAge}→${settings.lifeExpectancy}`} subtitle={`${yrsToRet} yr horizon · ${yrsInRet} yr drawdown`} />
                {drawdown && drawdown.portfolioAtRetirementReal > 0 ? (
                  <>
                    <div className="mb-3">
                      <div className="term-label-plain mb-0.5">Deplete · to age {settings.lifeExpectancy}</div>
                      <FitNumber
                        value={`${formatCurrency(drawdown.expectedWeekly + drawdown.nzSuperWeekly)}/wk`}
                        baseSize={34}
                        minSize={18}
                        className="text-phosphor-amber mono-num-glow font-medium"
                      />
                    </div>
                    <div className="pt-3 border-t border-graphite-600 mb-3">
                      <div className="term-label-plain mb-0.5">Perpetual · live off returns</div>
                      <FitNumber
                        value={`${formatCurrency(drawdown.perpetualWeekly + drawdown.nzSuperWeekly)}/wk`}
                        baseSize={28}
                        minSize={16}
                        className="text-phosphor-mint mono-num-glow-mint font-medium"
                      />
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 leading-relaxed">
                      PORTFOLIO {formatCurrencyCompact(drawdown.portfolioAtRetirementReal)} REAL
                      {drawdown.nzSuperEligible && ` · +SUPER ${formatCurrency(drawdown.nzSuperWeekly)}/WK`}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ink-500 py-4">
                    Add investments to project a sustainable drawdown. House stays a house.
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

            {/* Reality Check — NZ benchmarks */}
            {settings.showBenchmarks && currentAge > 0 && (
              <RealityCheck
                age={currentAge}
                netWealth={currentNetWealth}
                weeklyIncome={settings.afterTaxWeeklyIncome}
                weeklySavings={weeklyByCategory.savings}
                drawdownDeplete={drawdown ? drawdown.expectedWeekly + drawdown.nzSuperWeekly : 0}
                drawdownPerpetual={drawdown ? drawdown.perpetualWeekly + drawdown.nzSuperWeekly : 0}
                masseyNoFrills={settings.masseyTwoPersonNoFrills}
                masseyChoices={settings.masseyTwoPersonChoices}
              />
            )}

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
      <div className="term-label-plain mb-1">{label}</div>
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
      <div className="term-label-plain mb-1">{label}</div>
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

function RealityCheck({
  age,
  netWealth,
  weeklyIncome,
  weeklySavings,
  drawdownDeplete,
  drawdownPerpetual,
  masseyNoFrills,
  masseyChoices,
}: {
  age: number;
  netWealth: number;
  weeklyIncome: number;
  weeklySavings: number;
  drawdownDeplete: number;
  drawdownPerpetual: number;
  masseyNoFrills: number;
  masseyChoices: number;
}) {
  const median = nzMedianNetWorthForAge(age);
  const wealthDelta = median > 0 ? ((netWealth - median) / median) * 100 : 0;
  const wealthAhead = netWealth >= median;

  const savingsRate = weeklyIncome > 0 ? weeklySavings / weeklyIncome : 0;
  const avgRate = NZ_AVG_SAVINGS_RATE.rate;
  const savingsAhead = savingsRate >= avgRate;

  const masseyMax = Math.max(drawdownDeplete, masseyChoices) * 1.1;
  const bracket = drawdownDeplete > 0
    ? masseyBracket(drawdownDeplete, masseyNoFrills, masseyChoices)
    : null;

  return (
    <Panel brackets>
      <CardHeader title="Reality Check · NZ Benchmarks" subtitle="Approximate — verify in Config" />

      <div className="space-y-4">
        {/* Net wealth vs median */}
        <div>
          <div className="flex justify-between items-baseline gap-3 mb-1.5">
            <span className="term-label-plain">Net wealth vs NZ median (age {age})</span>
            <span className={`mono-num text-sm font-medium ${wealthAhead ? 'text-phosphor-mint' : 'text-phosphor-amber'}`}>
              {wealthAhead ? '+' : ''}{wealthDelta.toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mb-1.5">
            <span>YOU {formatCurrencyCompact(netWealth)}</span>
            <span>MEDIAN {formatCurrencyCompact(median)}</span>
          </div>
          <BenchmarkBar
            value={netWealth}
            reference={median}
            valueColor={wealthAhead ? '#7FF0BD' : '#FFB453'}
          />
        </div>

        {/* Savings rate vs NZ avg */}
        <div>
          <div className="flex justify-between items-baseline gap-3 mb-1.5">
            <span className="term-label-plain">Savings rate vs NZ avg</span>
            <span className={`mono-num text-sm font-medium ${savingsAhead ? 'text-phosphor-mint' : 'text-phosphor-amber'}`}>
              {(savingsRate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mb-1.5">
            <span>YOU {(savingsRate * 100).toFixed(0)}%</span>
            <span>NZ AVG {(avgRate * 100).toFixed(0)}%</span>
          </div>
          <BenchmarkBar
            value={savingsRate}
            reference={Math.max(avgRate, savingsRate, 0.001)}
            valueColor={savingsAhead ? '#7FF0BD' : '#FFB453'}
            normaliseAgainst={Math.max(savingsRate, avgRate) * 1.4}
          />
        </div>

        {/* Drawdown vs Massey */}
        {bracket && drawdownDeplete > 0 && (
          <div>
            <div className="flex justify-between items-baseline gap-3 mb-1.5">
              <span className="term-label-plain">Retirement draw vs Massey</span>
              <span className={`mono-num text-sm font-medium ${
                bracket.bracket === 'above' || bracket.bracket === 'choices'
                  ? 'text-phosphor-mint'
                  : bracket.bracket === 'between' || bracket.bracket === 'no_frills'
                  ? 'text-phosphor-amber'
                  : 'text-phosphor-red'
              }`}>
                {bracket.label}
              </span>
            </div>
            <div className="flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mb-1.5">
              <span>YOU {formatCurrency(drawdownDeplete)}/WK</span>
              <span>NF {formatCurrency(masseyNoFrills)} · CH {formatCurrency(masseyChoices)}</span>
            </div>
            <div className="relative h-2 bg-graphite-700 rounded-sm overflow-hidden">
              {/* No-frills marker */}
              <span className="absolute top-0 bottom-0 w-px bg-phosphor-amber/60" style={{ left: `${Math.min(100, (masseyNoFrills / masseyMax) * 100)}%` }} />
              {/* Choices marker */}
              <span className="absolute top-0 bottom-0 w-px bg-phosphor-mint/60" style={{ left: `${Math.min(100, (masseyChoices / masseyMax) * 100)}%` }} />
              {/* Your position */}
              <span
                className="absolute top-0 bottom-0 w-1 rounded-sm"
                style={{
                  left: `${Math.min(100, (drawdownDeplete / masseyMax) * 100)}%`,
                  background: '#FFB453',
                  boxShadow: '0 0 6px #FFB453',
                }}
              />
            </div>
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 mt-2 leading-relaxed">
              {drawdownPerpetual > 0 && drawdownPerpetual !== drawdownDeplete && (
                <>▸ PERPETUAL MODE: {formatCurrency(drawdownPerpetual)}/WK</>
              )}
            </div>
          </div>
        )}

        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-500 leading-relaxed pt-1 border-t border-graphite-600">
          ▸ Source: Stats NZ Household Net Worth 2021 · Massey Retirement Expenditure Guidelines · update figures in Config.
        </div>
      </div>
    </Panel>
  );
}

function BenchmarkBar({
  value,
  reference,
  valueColor,
  normaliseAgainst,
}: {
  value: number;
  reference: number;
  valueColor: string;
  normaliseAgainst?: number;
}) {
  const max = normaliseAgainst ?? Math.max(value, reference) * 1.25;
  const valPct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const refPct = max > 0 ? Math.min(100, (reference / max) * 100) : 0;
  return (
    <div className="relative h-2 bg-graphite-700 rounded-sm overflow-hidden">
      <span
        className="absolute top-0 bottom-0 w-px bg-ink-300"
        style={{ left: `${refPct}%`, opacity: 0.7 }}
      />
      <span
        className="absolute top-0 bottom-0 rounded-sm"
        style={{
          width: `${valPct}%`,
          background: valueColor,
          boxShadow: `0 0 6px ${valueColor}`,
        }}
      />
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
