'use client';

import React, { useState, useRef } from 'react';
import TabBar from '@/components/TabBar';
import GlassCard, { CardHeader } from '@/components/GlassCard';
import { useBudget } from '@/lib/context';
import { exportData, importData } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';

export default function SettingsPage() {
  const { store, dispatch, isLoaded } = useBudget();
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="shimmer w-32 h-6 rounded" />
        </div>
      </div>
    );
  }

  const { settings } = store;

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-clarity-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

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
        setImportError('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone!')) {
      if (confirm('Really delete everything? Export a backup first!')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const updateSetting = (key: keyof typeof settings, value: number | string) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [key]: value },
    });
  };

  return (
    <main className="min-h-screen pb-24 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-white/70 text-sm">Configure your budget</p>
        </header>

        {/* Success Messages */}
        {showExportSuccess && (
          <div className="mb-4 p-3 rounded-ios bg-ios-green/20 text-ios-green text-sm">
            Data exported successfully!
          </div>
        )}
        {showImportSuccess && (
          <div className="mb-4 p-3 rounded-ios bg-ios-green/20 text-ios-green text-sm">
            Data imported successfully!
          </div>
        )}
        {importError && (
          <div className="mb-4 p-3 rounded-ios bg-ios-red/20 text-ios-red text-sm">
            {importError}
          </div>
        )}

        <div className="space-y-6">
          {/* Income Settings */}
          <GlassCard>
            <CardHeader title="Income" subtitle="Your after-tax weekly income" />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  After-Tax Weekly Income
                </label>
                <input
                  type="number"
                  value={settings.afterTaxWeeklyIncome || ''}
                  onChange={(e) => updateSetting('afterTaxWeeklyIncome', parseFloat(e.target.value) || 0)}
                  placeholder="Enter your weekly take-home pay"
                  step="0.01"
                  min="0"
                  className="ios-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monthly: {formatCurrency((settings.afterTaxWeeklyIncome * 52) / 12)} |
                  Yearly: {formatCurrency(settings.afterTaxWeeklyIncome * 52)}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Personal Settings */}
          <GlassCard>
            <CardHeader title="Personal" subtitle="Used for projections" />

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Age
                  </label>
                  <input
                    type="number"
                    value={settings.age || ''}
                    onChange={(e) => updateSetting('age', parseInt(e.target.value) || 0)}
                    placeholder="28"
                    min="18"
                    max="100"
                    className="ios-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Retirement Age
                  </label>
                  <input
                    type="number"
                    value={settings.retirementAge || ''}
                    onChange={(e) => updateSetting('retirementAge', parseInt(e.target.value) || 0)}
                    placeholder="70"
                    min="40"
                    max="100"
                    className="ios-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assumed Inflation Rate %
                </label>
                <input
                  type="number"
                  value={settings.inflationRate || ''}
                  onChange={(e) => updateSetting('inflationRate', parseFloat(e.target.value) || 0)}
                  placeholder="2.5"
                  step="0.1"
                  min="0"
                  max="20"
                  className="ios-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to calculate real (inflation-adjusted) future values
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Data Management */}
          <GlassCard>
            <CardHeader title="Data" subtitle="Backup and restore" />

            <div className="space-y-3">
              <button
                onClick={handleExport}
                className="ios-button-secondary w-full"
              >
                Export Data (JSON)
              </button>

              <button
                onClick={handleImportClick}
                className="ios-button-secondary w-full"
              >
                Import Data
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />

              <hr className="border-gray-200 dark:border-gray-700 my-4" />

              <button
                onClick={handleClearData}
                className="w-full px-6 py-3 rounded-ios font-semibold text-ios-red bg-ios-red/10"
              >
                Clear All Data
              </button>
              <p className="text-xs text-gray-500 text-center">
                This permanently deletes everything. Export a backup first!
              </p>
            </div>
          </GlassCard>

          {/* About */}
          <GlassCard>
            <CardHeader title="About" />

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Budget Clarity</strong> v1.0.0</p>
              <p>A personal budgeting PWA focused on weekly budget thinking and long-term wealth projections.</p>
              <p className="text-xs text-gray-500 mt-4">
                Data stored locally on this device only. No accounts, no cloud sync.
              </p>
            </div>
          </GlassCard>

          {/* PWA Install Hint */}
          <GlassCard>
            <CardHeader title="Install as App" />

            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p><strong>iOS Safari:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Tap the Share button</li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot;</li>
              </ol>

              <p className="mt-4"><strong>Android Chrome:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Tap the menu (three dots)</li>
                <li>Tap &quot;Add to Home screen&quot;</li>
                <li>Tap &quot;Add&quot;</li>
              </ol>
            </div>
          </GlassCard>
        </div>
      </div>

      <TabBar />
    </main>
  );
}
