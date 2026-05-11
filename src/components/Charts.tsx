'use client';

import React from 'react';

// =========================================================================
// Wealth projection line graph — terminal-styled
// =========================================================================

interface WealthDataPoint {
  age: number;
  investments: number;
  property: number;
  debt: number;
  netWealth: number;
}

interface LineGraphProps {
  data: WealthDataPoint[];
  height?: number;
  showLegend?: boolean;
}

export function WealthLineGraph({ data, height = 200, showLegend = true }: LineGraphProps) {
  if (data.length < 2) return null;

  const allValues = data.flatMap((d) => [d.netWealth, d.investments, d.property, -d.debt]);
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const scaleX = (index: number) => (index / (data.length - 1)) * 100;
  const scaleY = (value: number) => 100 - ((value - minVal) / range) * 100;

  const generatePath = (getValue: (d: WealthDataPoint) => number) => {
    return data
      .map((d, i) => {
        const x = scaleX(i);
        const y = scaleY(getValue(d));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 100`}
        preserveAspectRatio="none"
        style={{ height, width: '100%' }}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="netWealthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7FF0BD" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7FF0BD" stopOpacity="0" />
          </linearGradient>
          <pattern id="termGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(91,200,255,0.06)" strokeWidth="0.3" />
          </pattern>
        </defs>

        {/* Terminal grid background */}
        <rect width="100" height="100" fill="url(#termGrid)" />

        {/* Zero line */}
        {minVal < 0 && (
          <line
            x1="0" y1={scaleY(0)} x2="100" y2={scaleY(0)}
            stroke="rgba(122, 139, 145, 0.4)"
            strokeWidth="0.4"
            strokeDasharray="1,1"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Net wealth area */}
        <path
          d={`${generatePath((d) => d.netWealth)} L 100 100 L 0 100 Z`}
          fill="url(#netWealthGradient)"
        />

        {/* Net wealth — primary mint phosphor */}
        <path
          d={generatePath((d) => d.netWealth)}
          fill="none"
          stroke="#7FF0BD"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: 'drop-shadow(0 0 4px rgba(127,240,189,0.5))' }}
        />

        {/* Investments — cyan */}
        <path
          d={generatePath((d) => d.investments)}
          fill="none"
          stroke="#5BC8FF"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3,2"
          vectorEffect="non-scaling-stroke"
          opacity="0.85"
        />

        {/* Property — violet */}
        <path
          d={generatePath((d) => d.property)}
          fill="none"
          stroke="#C599FF"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1,2"
          vectorEffect="non-scaling-stroke"
          opacity="0.85"
        />

        {/* Debt — red (shown as negative) */}
        <path
          d={generatePath((d) => -d.debt)}
          fill="none"
          stroke="#FF6B5C"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3,2"
          vectorEffect="non-scaling-stroke"
          opacity="0.75"
        />
      </svg>

      <div className="flex justify-between font-mono text-[10px] tracking-[0.16em] text-ink-500 mt-2 px-1 uppercase">
        <span>AGE {data[0]?.age}</span>
        <span>{data[Math.floor(data.length / 2)]?.age}</span>
        <span>{data[data.length - 1]?.age}</span>
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-3 font-mono text-[10px] tracking-[0.14em] uppercase">
          <LegendChip color="#7FF0BD" label="Net" />
          <LegendChip color="#5BC8FF" label="Invest" dashed />
          <LegendChip color="#C599FF" label="Property" dashed />
          <LegendChip color="#FF6B5C" label="Debt" dashed />
        </div>
      )}
    </div>
  );
}

function LegendChip({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-ink-300">
      <span
        className="inline-block w-4 h-0.5"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 3px, transparent 3px, transparent 5px)`
            : color,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// =========================================================================
// Horizontal stacked bar — budget breakdown
// =========================================================================

interface BudgetBreakdownItem {
  id: string;
  name: string;
  amount: number;
  category: 'necessity' | 'cost' | 'savings';
}

interface StackedBarProps {
  items: BudgetBreakdownItem[];
  totalIncome: number;
  height?: number;
}

export function BudgetStackedBar({ items, totalIncome, height = 22 }: StackedBarProps) {
  if (totalIncome <= 0 || items.length === 0) return null;

  const sortedItems = [...items].sort((a, b) => {
    const order = { necessity: 0, cost: 1, savings: 2 };
    if (order[a.category] !== order[b.category]) return order[a.category] - order[b.category];
    return b.amount - a.amount;
  });

  const itemsWithPercent = sortedItems.map((item) => ({
    ...item,
    percent: (item.amount / totalIncome) * 100,
  }));

  const totalPercent = itemsWithPercent.reduce((s, i) => s + i.percent, 0);
  const uncommittedPercent = Math.max(0, 100 - totalPercent);

  const categoryColors = {
    necessity: '#FF6B5C',
    cost: '#FFB453',
    savings: '#7FF0BD',
  };

  return (
    <div className="w-full">
      <div
        className="w-full flex border border-graphite-600 rounded-sm overflow-hidden bg-graphite-850"
        style={{ height }}
      >
        {itemsWithPercent.map((item, index) => (
          <div
            key={item.id}
            className="relative group"
            style={{
              width: `${item.percent}%`,
              background: categoryColors[item.category],
              opacity: 0.65 + (index % 3) * 0.12,
              borderRight: '1px solid rgba(0,0,0,0.3)',
            }}
            title={`${item.name}: ${item.percent.toFixed(1)}%`}
          />
        ))}
        {uncommittedPercent > 0 && (
          <div
            className="bg-graphite-700"
            style={{
              width: `${uncommittedPercent}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,180,83,0.12) 4px, rgba(255,180,83,0.12) 5px)',
            }}
            title={`Uncommitted: ${uncommittedPercent.toFixed(1)}%`}
          />
        )}
      </div>

      <div className="flex justify-between items-center mt-2 font-mono text-[10px] tracking-[0.14em] uppercase">
        <div className="flex gap-3">
          <CatChip color={categoryColors.necessity} label="Nec" value={itemsWithPercent.filter((i) => i.category === 'necessity').reduce((s, i) => s + i.percent, 0)} />
          <CatChip color={categoryColors.cost} label="Cost" value={itemsWithPercent.filter((i) => i.category === 'cost').reduce((s, i) => s + i.percent, 0)} />
          <CatChip color={categoryColors.savings} label="Sav" value={itemsWithPercent.filter((i) => i.category === 'savings').reduce((s, i) => s + i.percent, 0)} />
        </div>
        {uncommittedPercent > 0 && (
          <span className="text-ink-300">{uncommittedPercent.toFixed(0)}% FREE</span>
        )}
      </div>
    </div>
  );
}

function CatChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-ink-300">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
      {label} {value.toFixed(0)}%
    </span>
  );
}

// =========================================================================
// Progress ring
// =========================================================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 3,
  color = '#7FF0BD',
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, progress) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(122,139,145,0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Drawdown bands — visual for retirement weekly drawdown range
// =========================================================================

export function DrawdownBands({
  conservative,
  expected,
  optimistic,
  format,
}: {
  conservative: number;
  expected: number;
  optimistic: number;
  format: (n: number) => string;
}) {
  const max = Math.max(conservative, expected, optimistic, 1);
  return (
    <div className="space-y-2">
      <BandRow label="Conservative" value={conservative} max={max} color="#FF6B5C" format={format} />
      <BandRow label="Expected"     value={expected}     max={max} color="#FFB453" format={format} bold />
      <BandRow label="Optimistic"   value={optimistic}   max={max} color="#7FF0BD" format={format} />
    </div>
  );
}

function BandRow({
  label, value, max, color, format, bold = false,
}: { label: string; value: number; max: number; color: string; format: (n: number) => string; bold?: boolean }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] tracking-[0.14em] uppercase mb-1">
        <span className="text-ink-500">{label}</span>
        <span className={bold ? 'text-ink-100' : 'text-ink-300'}>{format(value)}/wk</span>
      </div>
      <div className="h-1.5 bg-graphite-700 rounded-sm overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            opacity: bold ? 1 : 0.7,
          }}
        />
      </div>
    </div>
  );
}
