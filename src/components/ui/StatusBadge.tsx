import React from 'react';

export type StatusVariant =
  | 'SUCCESS'
  | 'WARNING'
  | 'DANGER'
  | 'INFO'
  | 'NEUTRAL'
  | 'PENDING';

interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
  className?: string;
}

export function StatusBadge({ label, variant, className = '' }: StatusBadgeProps) {
  let colorStyles = '';
  let icon: React.ReactNode = null;

  switch (variant) {
    case 'SUCCESS':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      icon = (
        <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
      break;

    case 'WARNING':
      colorStyles = 'bg-amber-50 text-amber-900 border-amber-300';
      icon = (
        <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;

    case 'DANGER':
      colorStyles = 'bg-rose-50 text-rose-800 border-rose-300';
      icon = (
        <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;

    case 'INFO':
      colorStyles = 'bg-sky-50 text-sky-800 border-sky-300';
      icon = (
        <svg className="w-3.5 h-3.5 text-sky-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;

    case 'PENDING':
      colorStyles = 'bg-indigo-50 text-indigo-800 border-indigo-300';
      icon = (
        <svg className="w-3.5 h-3.5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="9" strokeWidth={2} stroke="currentColor" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
        </svg>
      );
      break;

    default:
      colorStyles = 'bg-stone-100 text-stone-800 border-stone-300';
      icon = (
        <span className="w-2 h-2 rounded-full bg-stone-500 shrink-0" aria-hidden="true" />
      );
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorStyles} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

