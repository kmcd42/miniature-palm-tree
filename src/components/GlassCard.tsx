'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

// ----- Panel (the new Nostromo card) -----------------------------------------

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'wide' | 'tall' | 'large';
  brackets?: boolean;   // amber corner ticks
  scan?: boolean;       // scanline overlay (hero panels)
  glow?: boolean;       // amber glow border
  raised?: boolean;
  as?: 'div' | 'section' | 'article';
}

export default function Panel({
  children,
  className = '',
  onClick,
  variant = 'default',
  brackets = false,
  scan = false,
  glow = false,
  raised = false,
  as: Tag = 'div',
}: PanelProps) {
  const variantClasses = {
    default: '',
    wide: 'bento-wide',
    tall: 'bento-tall',
    large: 'bento-large',
  };

  const cls = [
    'panel',
    'p-4',
    raised ? 'panel-raised' : '',
    onClick ? 'panel-interactive' : '',
    brackets ? 'panel-brackets' : '',
    scan ? 'panel-scan' : '',
    glow ? 'panel-glow' : '',
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={cls} onClick={onClick}>
      {children}
    </Tag>
  );
}

// Legacy alias — every existing import of `GlassCard` keeps working
export { Panel as GlassCard };

// ----- Subcomponents ---------------------------------------------------------

export function CardHeader({
  title,
  subtitle,
  action,
  prefix = '▸',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  prefix?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-500 flex items-center gap-2">
          <span className="text-phosphor-amber/80">{prefix}</span>
          <span className="truncate">{title}</span>
        </h3>
        {subtitle && (
          <p className="text-xs text-ink-300 mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardValue({
  value,
  label,
  trend,
  size = 'large',
  glow = false,
}: {
  value: string;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'small' | 'medium' | 'large' | 'xl';
  glow?: boolean;
}) {
  const baseSize = { small: 24, medium: 32, large: 44, xl: 56 }[size];
  const minSize = { small: 14, medium: 18, large: 22, xl: 26 }[size];

  const trendClass = trend === 'up'
    ? 'text-phosphor-mint'
    : trend === 'down'
    ? 'text-phosphor-red'
    : trend === 'neutral'
    ? 'text-ink-300'
    : 'text-ink-100';

  const glowClass = glow
    ? (trend === 'up' ? 'mono-num-glow-mint' : trend === 'down' ? 'mono-num-glow-red' : 'mono-num-glow')
    : '';

  return (
    <div>
      <FitNumber
        value={value}
        baseSize={baseSize}
        minSize={minSize}
        className={`mono-num font-medium ${trendClass} ${glowClass}`}
      />
      {label && (
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-500 mt-1">
          {label}
        </p>
      )}
    </div>
  );
}

export function ProgressBar({
  progress,
  color = 'primary',
  showLabel = false,
}: {
  progress: number;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'amber';
  showLabel?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, progress));
  const colorClasses = {
    primary: 'bg-phosphor-cyan',
    amber: 'bg-phosphor-amber',
    success: 'bg-phosphor-mint',
    warning: 'bg-phosphor-amber',
    danger: 'bg-phosphor-red',
  };
  return (
    <div className="w-full">
      <div className="progress-bar">
        <div
          className={`progress-bar-fill ${colorClasses[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="font-mono text-[10px] tracking-[0.16em] text-ink-500 mt-1 text-right">
          {clamped.toFixed(0)}%
        </p>
      )}
    </div>
  );
}

export function CategoryBadge({
  category,
}: {
  category: 'necessity' | 'cost' | 'savings';
}) {
  const cls = {
    necessity: 'pill pill-red',
    cost: 'pill pill-amber',
    savings: 'pill pill-mint',
  }[category];
  const labels = { necessity: 'NEC', cost: 'COST', savings: 'SAV' };
  return <span className={cls}>{labels[category]}</span>;
}

// ----- FitNumber: tabular numerals that shrink to fit container --------------

export function FitNumber({
  value,
  baseSize = 44,
  minSize = 18,
  className = '',
}: {
  value: string;
  baseSize?: number;
  minSize?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(baseSize);

  useLayoutEffect(() => {
    if (!containerRef.current || !innerRef.current) return;
    const container = containerRef.current;
    const inner = innerRef.current;
    let s = baseSize;
    inner.style.fontSize = `${s}px`;
    inner.style.lineHeight = '1.05';
    // Walk down until it fits, with a hard floor
    let guard = 0;
    while (inner.scrollWidth > container.clientWidth && s > minSize && guard < 200) {
      s -= 1;
      inner.style.fontSize = `${s}px`;
      guard += 1;
    }
    setSize(s);
  }, [value, baseSize, minSize]);

  // Re-fit on container resize
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !innerRef.current) return;
      const container = containerRef.current;
      const inner = innerRef.current;
      let s = baseSize;
      inner.style.fontSize = `${s}px`;
      let guard = 0;
      while (inner.scrollWidth > container.clientWidth && s > minSize && guard < 200) {
        s -= 1;
        inner.style.fontSize = `${s}px`;
        guard += 1;
      }
      setSize(s);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [baseSize, minSize]);

  return (
    <div ref={containerRef} className={`overflow-hidden w-full ${className}`}>
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap mono-num"
        style={{ fontSize: size, lineHeight: 1.05 }}
      >
        {value}
      </span>
    </div>
  );
}

// ----- Status dot -----------------------------------------------------------

export function StatusDot({ color = 'amber', pulse = false }: { color?: 'amber' | 'mint' | 'red' | 'cyan' | 'dim'; pulse?: boolean }) {
  const map = {
    amber: 'bg-phosphor-amber shadow-glow-amber',
    mint: 'bg-phosphor-mint shadow-glow-mint',
    red: 'bg-phosphor-red shadow-glow-red',
    cyan: 'bg-phosphor-cyan shadow-glow-cyan',
    dim: 'bg-ink-500',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[color]} ${pulse ? 'animate-pulse-glow' : ''}`} />;
}
