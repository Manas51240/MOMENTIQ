import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOMENTIQ — Intelligent Event Planning & Celebration Platform',
  description: 'Production-grade AI-powered platform for unforgettable celebrations, weddings, birthdays, and community gatherings.',
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

