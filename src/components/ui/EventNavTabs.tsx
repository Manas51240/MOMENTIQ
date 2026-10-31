'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface EventNavTabsProps {
  eventId: string;
}

export function EventNavTabs({ eventId }: EventNavTabsProps) {
  const pathname = usePathname();

  const tabs = [
    { label: 'Overview', href: `/events/${eventId}` },
    { label: 'AI Architect', href: `/events/${eventId}/ai-architect` },
    { label: 'Budget & Finance', href: `/events/${eventId}/budget` },
    { label: 'Timeline & Tasks', href: `/events/${eventId}/timeline` },
    { label: 'Vendors & Quotes', href: `/events/${eventId}/vendors` },
    { label: 'Guests & Seating', href: `/events/${eventId}/guests` },
    { label: 'Creative Studio', href: `/events/${eventId}/creative-studio` },
    { label: 'Risk Register', href: `/events/${eventId}/risks` },
    { label: 'Collaborators', href: `/events/${eventId}/collaborators` },
    { label: 'Reports & Exports', href: `/events/${eventId}/reports` },
  ];

  return (
    <nav
      aria-label="Event workspace modules"
      className="flex items-center overflow-x-auto gap-2 py-2 border-b border-stone-200 no-scrollbar"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`px-3.5 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              isActive
                ? 'bg-amber-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

