'use client';

import React, { useEffect, useState } from 'react';
import { useBudget } from '@/lib/context';
import { StatusDot } from '@/components/GlassCard';
import { downloadExport, getLastExportedAt, shouldRemindExport, snoozeExportReminder } from '@/lib/storage';
import { formatRelativeTime } from '@/lib/calculations';

// Nudge to back up: all data is localStorage-only, so a cleared browser
// cache wipes everything. Shown when there's data and no recent export.
export default function ExportReminder() {
  const { store, isLoaded } = useBudget();
  const [visible, setVisible] = useState(false);
  const [lastExport, setLastExport] = useState<number | null>(null);

  const hasData =
    store.budgetItems.length > 0 ||
    store.investments.length > 0 ||
    store.mortgages.length > 0 ||
    store.savingsBuckets.length > 0 ||
    store.goals.length > 0;

  useEffect(() => {
    if (!isLoaded) return;
    setVisible(shouldRemindExport(hasData));
    setLastExport(getLastExportedAt());
  }, [isLoaded, hasData]);

  if (!visible) return null;

  return (
    <div className="border border-phosphor-amber/40 bg-phosphor-amber/[0.04] rounded-sm px-3.5 py-2.5 flex items-start gap-3">
      <div className="pt-1.5"><StatusDot color="amber" /></div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-phosphor-amber">DATA · BACKUP</div>
        <div className="text-sm text-ink-100 mt-0.5 leading-snug">
          {lastExport
            ? `Last backup ${formatRelativeTime(lastExport)}.`
            : 'No backup yet.'}{' '}
          All data lives in this browser only.
        </div>
        <div className="flex gap-4 mt-2">
          <button
            type="button"
            onClick={() => {
              downloadExport();
              setVisible(false);
            }}
            className="font-mono text-[10px] tracking-[0.16em] uppercase text-phosphor-amber hover:underline"
          >
            EXPORT NOW ▸
          </button>
          <button
            type="button"
            onClick={() => {
              snoozeExportReminder();
              setVisible(false);
            }}
            className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-500 hover:underline"
          >
            LATER
          </button>
        </div>
      </div>
    </div>
  );
}
