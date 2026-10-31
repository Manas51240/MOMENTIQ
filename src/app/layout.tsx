import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CELEBRA — AI-Powered Celebration & Event Planning Platform',
  description: 'Production-grade SaaS platform for celebrations, weddings, corporate events, and milestone gatherings.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#fbf8f3] text-stone-900 selection:bg-amber-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

