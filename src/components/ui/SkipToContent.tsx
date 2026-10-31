import React from 'react';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-stone-900 text-amber-300 font-semibold rounded-md shadow-lg outline outline-2 outline-amber-400 transition-all"
    >
      Skip to main content
    </a>
  );
}

