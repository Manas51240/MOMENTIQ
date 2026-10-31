'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';

export default function CollaboratorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'PLANNER' | 'COLLABORATOR' | 'VIEWER'>('COLLABORATOR');
  const [submitting, setSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/collaborators`);
      const resData = await res.json();
      if (resData.success && resData.collaborators) {
        setCollaborators(resData.collaborators);
      }
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load collaborators',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to add collaborator');
      }

      setEmail('');
      setAlertInfo({
        type: 'success',
        message: `Collaborator with role ${role} added successfully!`,
      });
      await loadCollaborators();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error adding collaborator',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Remove collaborator from this celebration?')) return;

    try {
      const res = await fetch(`/api/events/${id}/collaborators?collaboratorId=${collaboratorId}`, {
        method: 'DELETE',
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to remove collaborator');
      }

      setAlertInfo({
        type: 'success',
        message: 'Collaborator removed successfully.',
      });
      await loadCollaborators();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error removing collaborator',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfbf7]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
            <Link href={`/events/${id}`} className="hover:underline">
              Celebration
            </Link>
            <span>/</span>
            <span>Collaborator Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Collaborators & Role-Based Access Control
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Enforces strict multi-tenant isolation, IDOR defenses, and PII data minimization
          </p>
        </div>

        <EventNavTabs eventId={id} />

        {alertInfo && (
          <div className="mt-6">
            <Alert
              type={alertInfo.type}
              message={alertInfo.message}
              onClose={() => setAlertInfo(null)}
            />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Collaborator Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-stone-300 shadow-sm h-fit space-y-4">
            <h2 className="text-lg font-bold text-stone-900">Add Team Member</h2>
            <p className="text-xs text-stone-600">
              User must have a registered CELEBRA account to be granted event access.
            </p>

            <form onSubmit={handleAddCollaborator} className="space-y-4">
              <div>
                <label htmlFor="collab-email" className="block text-xs font-semibold text-stone-700 mb-1">
                  User Email Address *
                </label>
                <input
                  id="collab-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="planner@example.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
                />
              </div>

              <div>
                <label htmlFor="collab-role" className="block text-xs font-semibold text-stone-700 mb-1">
                  Assigned RBAC Role *
                </label>
                <select
                  id="collab-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
                >
                  <option value="PLANNER">Planner (Budgets, Vendors, Risks, Tasks)</option>
                  <option value="COLLABORATOR">Collaborator (Timeline & Guest Check-In)</option>
                  <option value="VIEWER">Viewer (Read-only with PII Masking)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? 'Granting Access...' : 'Invite Collaborator'}
              </button>
            </form>
          </div>

          {/* Members Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Authorized Team Members</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fbf8f3] text-stone-700 text-xs uppercase font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">RBAC Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {collaborators.map((c: any) => (
                    <tr key={c.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {c.user?.name || 'Authorized Member'}
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-600">
                        {c.user?.email}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          label={c.role}
                          variant={c.role === 'OWNER' ? 'SUCCESS' : c.role === 'PLANNER' ? 'INFO' : 'NEUTRAL'}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.role !== 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(c.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
