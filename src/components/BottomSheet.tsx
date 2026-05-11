'use client';

import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  code?: string; // optional terminal code shown to the left of title
  children: React.ReactNode;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  code,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.18s ease-out' }}
      />

      <div
        className="bottom-sheet"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="sheet-handle" />

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-graphite-600">
            <div className="flex items-center gap-3 min-w-0">
              {code && (
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-phosphor-amber px-1.5 py-0.5 border border-phosphor-amber/40 rounded-sm">
                  {code}
                </span>
              )}
              <h2 className="font-mono text-xs tracking-[0.16em] uppercase text-ink-100 truncate">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1 text-ink-500 hover:text-phosphor-amber transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 py-5 overflow-y-auto max-h-[70vh] text-ink-100">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
}
