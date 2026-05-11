'use client';

import React, { useState, useRef } from 'react';
import TabBar from '@/components/TabBar';
import Panel, { CardHeader, StatusDot } from '@/components/GlassCard';
import { useBudget } from '@/lib/context';
import { exportData, importData } from '@/lib/storage';
import { formatCurrency, getCurrentAge } from '@/lib/calculations';

export default function SettingsPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs tracking-[0.2em] text-phosphor-amber caret-blink">LOADING CFG MODULE</div>
      </main>
    );
  }

  const { settings } = store;
  const derivedAge = getCurrentAge(settings);

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compound-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = importData(content);
      if (imported) {
        dispatch({ type: 'IMPORT_DATA', payload: imported });
        setShowImportSuccess(true);
        setImportError('');
        setTimeout(() => setShowImportSuccess(false), 3000);
      } else {
        setImportError('Failed to import data. Check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = () => {
    if (confirm('Delete ALL data? Export a backup first!')) {
      if (confirm('Really delete everything?')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const updateSetting = (key: keyof typeof settings, value: number | string | boolean | undefined) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  };

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-5">

        <header className="mb-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-phosphor-amber/80 uppercase flex items-center gap-2">
            <StatusDot color="amber" pulse /> CONFIG · SYSTEM PARAMETERS
          </div>
          <h1 className="font-serif text-[36px] leading-none text-ink-100 mt-1">
            Config<span className="text-phosphor-amber">.</span>
          </h1>
        </header>

        {showExportSuccess && (
          <div className="mb-4 px-3 py-2 border border-phosphor-mint/40 bg-phosphor-mint/[0.06] rounded-sm font-mono text-[11px] tracking-[0.14em] uppercase text-phosphor-mint">
            ▸ DATA EXPORTED
          </div>
        )}
        {showImportSuccess && (
          <div className="mb-4 px-3 py-2 border border-phosphor-mint/40 bg-phosphor-mint/[0.06] rounded-sm font-mono text-[11px] tracking-[0.14em] uppercase text-phosphor-mint">
            ▸ DATA IMPORTED
          </div>
        )}
        {importError && (
          <div className="mb-4 px-3 py-2 border border-phosphor-red/40 bg-phosphor-red/[0.06] rounded-sm font-mono text-[11px] tracking-[0.14em] uppercase text-phosphor-red">
            ▸ {importError}
          </div>
        )}

        <div className="space-y-5">

          {/* Income */}
          <Panel brackets>
            <CardHeader title="Income" subtitle="After-tax weekly take-home" />
            <div>
              <label className="term-label-plain block mb-1.5">▸ After-tax weekly income</label>
              <input
                type="number"
                value={settings.afterTaxWeeklyIncome || ''}
                onChange={(e) => updateSetting('afterTaxWeeklyIncome', parseFloat(e.target.value) || 0)}
                placeholder="Your weekly take-home"
                step="0.01" min="0"
                className="term-input"
              />
              <p className="text-[11px] text-ink-500 mt-1.5 font-mono tracking-[0.14em] uppercase">
                ▸ MONTHLY {formatCurrency((settings.afterTaxWeeklyIncome * 52) / 12)} · YEARLY {formatCurrency(settings.afterTaxWeeklyIncome * 52)}
              </p>
            </div>
          </Panel>

          {/* Personal */}
          <Panel brackets>
            <CardHeader title="Personal · Projection Inputs" subtitle="Drives retirement drawdown" />

            <div className="space-y-4">
              <div>
                <label className="term-label-plain block mb-1.5">▸ Date of birth</label>
                <input
                  type="date"
                  value={settings.dateOfBirth || ''}
                  onChange={(e) => updateSetting('dateOfBirth', e.target.value || undefined)}
                  className="term-input"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-[11px] text-ink-500 mt-1.5 font-mono tracking-[0.14em] uppercase">
                  ▸ CURRENT AGE {settings.dateOfBirth ? `${derivedAge} YR` : 'NOT SET'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Retirement age</label>
                  <input
                    type="number"
                    value={settings.retirementAge || ''}
                    onChange={(e) => updateSetting('retirementAge', parseInt(e.target.value) || 0)}
                    placeholder="67"
                    min="40" max="100"
                    className="term-input"
                  />
                </div>
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Life expectancy</label>
                  <input
                    type="number"
                    value={settings.lifeExpectancy || ''}
                    onChange={(e) => updateSetting('lifeExpectancy', parseInt(e.target.value) || 0)}
                    placeholder="90"
                    min="60" max="120"
                    className="term-input"
                  />
                  <p className="text-[11px] text-ink-500 mt-1">Drives drawdown horizon</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Inflation %/yr</label>
                  <input
                    type="number"
                    value={settings.inflationRate || ''}
                    onChange={(e) => updateSetting('inflationRate', parseFloat(e.target.value) || 0)}
                    placeholder="2.5"
                    step="0.1" min="0" max="20"
                    className="term-input"
                  />
                  <p className="text-[11px] text-ink-500 mt-1">Real-dollar projection</p>
                </div>
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Safe withdrawal %</label>
                  <input
                    type="number"
                    value={settings.safeWithdrawalRate || ''}
                    onChange={(e) => updateSetting('safeWithdrawalRate', parseFloat(e.target.value) || 0)}
                    placeholder="4.0"
                    step="0.1" min="1" max="10"
                    className="term-input"
                  />
                  <p className="text-[11px] text-ink-500 mt-1">Default 4% (Trinity study)</p>
                </div>
              </div>
            </div>
          </Panel>

          {/* NZ Super */}
          <Panel brackets>
            <CardHeader title="NZ Super · Couple" subtitle="Adds to weekly retirement income (not certain — opt in)" />

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="term-label-plain block mb-0.5">▸ Include in projections</span>
                  <span className="text-[11px] text-ink-500">Adds NZ Super to weekly draw from eligibility age onward</span>
                </span>
                <Toggle
                  on={settings.includeNzSuper}
                  onChange={(v) => updateSetting('includeNzSuper', v)}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Combined weekly</label>
                  <input
                    type="number"
                    value={settings.nzSuperWeeklyAmount || ''}
                    onChange={(e) => updateSetting('nzSuperWeeklyAmount', parseFloat(e.target.value) || 0)}
                    placeholder="804"
                    step="1" min="0"
                    className="term-input"
                    disabled={!settings.includeNzSuper}
                  />
                  <p className="text-[11px] text-ink-500 mt-1">After-tax, today&apos;s $</p>
                </div>
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Eligibility age</label>
                  <input
                    type="number"
                    value={settings.nzSuperEligibilityAge || ''}
                    onChange={(e) => updateSetting('nzSuperEligibilityAge', parseInt(e.target.value) || 0)}
                    placeholder="65"
                    min="55" max="80"
                    className="term-input"
                    disabled={!settings.includeNzSuper}
                  />
                  <p className="text-[11px] text-ink-500 mt-1">NZ default 65</p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Benchmarks */}
          <Panel brackets>
            <CardHeader title="Reality Check · NZ Benchmarks" subtitle="Massey Retirement Expenditure + median net worth" />

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="term-label-plain block mb-0.5">▸ Show on dashboard</span>
                  <span className="text-[11px] text-ink-500">Compare against NZ medians and Massey guidelines</span>
                </span>
                <Toggle
                  on={settings.showBenchmarks}
                  onChange={(v) => updateSetting('showBenchmarks', v)}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Massey · No Frills</label>
                  <input
                    type="number"
                    value={settings.masseyTwoPersonNoFrills || ''}
                    onChange={(e) => updateSetting('masseyTwoPersonNoFrills', parseFloat(e.target.value) || 0)}
                    placeholder="902"
                    step="1" min="0"
                    className="term-input"
                  />
                  <p className="text-[11px] text-ink-500 mt-1">2-person urban /wk</p>
                </div>
                <div>
                  <label className="term-label-plain block mb-1.5">▸ Massey · Choices</label>
                  <input
                    type="number"
                    value={settings.masseyTwoPersonChoices || ''}
                    onChange={(e) => updateSetting('masseyTwoPersonChoices', parseFloat(e.target.value) || 0)}
                    placeholder="1533"
                    step="1" min="0"
                    className="term-input"
                  />
                  <p className="text-[11px] text-ink-500 mt-1">2-person urban /wk</p>
                </div>
              </div>
              <p className="text-[11px] text-ink-500 font-mono tracking-[0.14em] uppercase">
                ▸ Update annually from massey.ac.nz/fin-ed
              </p>
            </div>
          </Panel>

          {/* Data */}
          <Panel brackets>
            <CardHeader title="Data · Backup &amp; Restore" />
            <div className="space-y-2.5">
              <button onClick={handleExport} className="term-btn-ghost w-full">▸ Export Data (JSON)</button>
              <button onClick={handleImportClick} className="term-btn-ghost w-full">▸ Import Data</button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <div className="border-t border-graphite-600 my-3"></div>
              <button onClick={handleClearData} className="term-btn-danger w-full">▸ Clear All Data</button>
              <p className="text-[11px] text-ink-500 text-center font-mono tracking-[0.14em] uppercase">
                ▸ PERMANENT · EXPORT FIRST
              </p>
            </div>
          </Panel>

          {/* About */}
          <Panel>
            <CardHeader title="About" />
            <div className="space-y-2 text-sm text-ink-300">
              <p className="font-mono text-xs tracking-[0.12em] uppercase">
                <span className="text-phosphor-amber">COMPOUND</span> · AETHER-OS v2.0
              </p>
              <p className="text-xs leading-relaxed">
                A financial terminal for weekly budget thinking, long-term wealth projection, and retirement drawdown modelling.
              </p>
              <p className="text-[11px] text-ink-500 mt-3 font-mono tracking-[0.14em] uppercase">
                ▸ ALL DATA LOCAL · NO CLOUD · NO ACCOUNT
              </p>
            </div>
          </Panel>

          {/* Install */}
          <Panel>
            <CardHeader title="Install · Home Screen" />
            <div className="text-sm text-ink-300 space-y-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-phosphor-cyan mb-1">▸ iOS Safari</p>
                <ol className="list-decimal list-inside space-y-0.5 text-xs text-ink-300 ml-1">
                  <li>Tap the Share button</li>
                  <li>&quot;Add to Home Screen&quot;</li>
                  <li>Tap &quot;Add&quot;</li>
                </ol>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-phosphor-cyan mb-1">▸ Android Chrome</p>
                <ol className="list-decimal list-inside space-y-0.5 text-xs text-ink-300 ml-1">
                  <li>Tap the menu (⋮)</li>
                  <li>&quot;Add to Home screen&quot;</li>
                  <li>Tap &quot;Add&quot;</li>
                </ol>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <TabBar />
    </main>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`relative inline-flex w-11 h-6 rounded-full border transition-colors shrink-0 ${
        on
          ? 'bg-phosphor-amber/14 border-phosphor-amber'
          : 'bg-graphite-700 border-graphite-500'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
          on
            ? 'left-[22px] bg-phosphor-amber shadow-glow-amber'
            : 'left-0.5 bg-ink-500'
        }`}
      />
    </button>
  );
}
