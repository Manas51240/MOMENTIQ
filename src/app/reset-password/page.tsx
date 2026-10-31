'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { Alert } from '@/components/ui/Alert';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-stone-300 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Create New Password
        </h1>
        <p className="text-sm text-stone-600">
          Enter your reset token and new account password
        </p>
      </div>

      {success && (
        <Alert
          type="success"
          message="Password updated successfully! Redirecting to sign in page..."
        />
      )}

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-token"
              className="block text-sm font-semibold text-stone-700 mb-1"
            >
              Reset Token
            </label>
            <input
              id="reset-token"
              name="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste security token"
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-semibold text-stone-700 mb-1"
            >
              New Password (min. 8 characters)
            </label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-[#fdfbf7] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-semibold text-stone-700 mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
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
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      )}

      <div className="text-center pt-2 border-t border-stone-200">
        <Link
          href="/login"
          className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors underline"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<div className="text-stone-500">Loading reset parameters...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}

