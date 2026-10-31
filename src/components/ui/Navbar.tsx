'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check active session
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fdfbf7]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-stone-900 font-extrabold text-xl tracking-tight hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-black text-lg shadow-sm">
                C
              </div>
              <span>CELEBRA</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
              <Link href="/dashboard" className="hover:text-amber-700 transition-colors">
                Dashboard
              </Link>
              <Link href="/events/new" className="hover:text-amber-700 transition-colors">
                New Celebration
              </Link>
              <Link href="/api/health" className="hover:text-amber-700 transition-colors">
                System Diagnostics
              </Link>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-stone-800">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="p-2 text-stone-600 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 flex flex-col gap-3">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-stone-800 rounded-md hover:bg-stone-100"
            >
              Dashboard
            </Link>
            <Link
              href="/events/new"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-stone-800 rounded-md hover:bg-stone-100"
            >
              New Celebration
            </Link>
            <Link
              href="/api/health"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-stone-800 rounded-md hover:bg-stone-100"
            >
              System Diagnostics
            </Link>
            <div className="pt-2 border-t border-stone-200">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-stone-700">{user.name}</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-sm font-semibold text-rose-600 hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 text-sm font-semibold rounded-lg bg-stone-200 text-stone-800"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

