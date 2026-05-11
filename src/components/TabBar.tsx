'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TabItem {
  href: string;
  code: string;   // 3-letter terminal code
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  {
    href: '/',
    code: 'OPS',
    label: 'Ops',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/budget',
    code: 'BGT',
    label: 'Budget',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" d="M4 19V8m6 11V4m6 15v-7m6 7v-3" />
        <path strokeLinecap="round" d="M2 19h20" />
      </svg>
    ),
  },
  {
    href: '/wealth',
    code: 'WLT',
    label: 'Wealth',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 4 8-8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 8h6v6" />
      </svg>
    ),
  },
  {
    href: '/goals',
    code: 'TGT',
    label: 'Goals',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/settings',
    code: 'CFG',
    label: 'Config',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 01-4 0v-.08a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 010-4h.08A1.7 1.7 0 004.64 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001.03-1.56V3a2 2 0 014 0v.08a1.7 1.7 0 001.03 1.56 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.56 1.03H21a2 2 0 010 4h-.08a1.7 1.7 0 00-1.52 1.03z" />
      </svg>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      <div className="flex justify-around items-center max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tab-item ${isActive ? 'active' : ''}`}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className="mt-1">{tab.code}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
