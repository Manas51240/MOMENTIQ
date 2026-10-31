'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { Alert } from '@/components/ui/Alert';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'HOST' | 'PLANNER' | 'COLLABORATOR'>('HOST');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-stone-300 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Create CELEBRA Account
            </h1>
            <p className="text-sm text-stone-600">
              Start planning celebration events with enterprise tools
            </p>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-sm font-semibold text-stone-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Eleanor Vance"
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-sm font-semibold text-stone-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eleanor@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="reg-role"
                className="block text-sm font-semibold text-stone-700 mb-1"
              >
                Primary Role
              </label>
              <select
                id="reg-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'HOST' | 'PLANNER' | 'COLLABORATOR')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
              >
                <option value="HOST">Event Host (Couple, Family, or Host)</option>
                <option value="PLANNER">Professional Event Planner / Architect</option>
                <option value="COLLABORATOR">Collaborator / Team Member</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-sm font-semibold text-stone-700 mb-1"
              >
                Password (min. 8 characters)
              </label>
              <input
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="reg-confirm-password"
                className="block text-sm font-semibold text-stone-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-amber-500/40"
            >
              {loading ? 'Registering Account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-stone-200">
            <p className="text-xs text-stone-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-amber-700 hover:text-amber-800 transition-colors underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
