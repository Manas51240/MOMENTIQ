'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { EventRole } from '@/types';

const ROLE_DEFINITIONS: Record<
  EventRole,
  { label: string; description: string; badgeVariant: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'NEUTRAL' }
> = {
  OWNER: {
    label: 'Event Owner',
    description: 'Irrevocable full control: manage collaborators, transfer ownership, delete celebration, all modules.',
    badgeVariant: 'SUCCESS',
  },
  ADMIN: {
    label: 'Event Admin',
    description: 'Operational control: invite & manage team members (below Admin), edit event, budgets, timeline, vendors.',
    badgeVariant: 'WARNING',
  },
  PLANNER: {
    label: 'Planner',
    description: 'Day-to-day planning: manage timeline, tasks, vendors, guests, risk register, and export reports.',
    badgeVariant: 'INFO',
  },
  FINANCE_MANAGER: {
    label: 'Finance Manager',
    description: 'Fiscal governance: manage budget categories, expenses, payments, vendor quotes, and financial reports.',
    badgeVariant: 'INFO',
  },
  GUEST_COORDINATOR: {
    label: 'Guest Coordinator',
    description: 'Hospitality & manifest: manage guest list, RSVPs, table seating, check-in, invitations, and guest reports.',
    badgeVariant: 'NEUTRAL',
  },
  COLLABORATOR: {
    label: 'Collaborator',
    description: 'Assigned execution: update timeline tasks and assist with door check-in.',
    badgeVariant: 'NEUTRAL',
  },
  VIEWER: {
    label: 'Viewer',
    description: 'Read-only stakeholder: view event workspace with automatic PII data minimization & masking.',
    badgeVariant: 'NEUTRAL',
  },
};

export default function CollaboratorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Active Workspace Sub-Tab: 'MEMBERS' | 'ACTIVITY' | 'NOTIFICATIONS'
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'ACTIVITY' | 'NOTIFICATIONS'>('MEMBERS');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Invite Member Form State
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<EventRole>('PLANNER');
  const [submitting, setSubmitting] = useState(false);

  // Ownership Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState('');
  const [transferring, setTransferring] = useState(false);

  const loadCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/collaborators`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
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

  const loadActivityFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/collaborators/activity?limit=40`);
      const resData = await res.json();
      if (resData.success) {
        setActivityLogs(resData.logs || []);
      }
    } catch {
      // Quiet fail
    }
  }, [id]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/collaborators/notifications`);
      const resData = await res.json();
      if (resData.success) {
        setNotifications(resData.notifications || []);
      }
    } catch {
      // Quiet fail
    }
  }, [id]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  useEffect(() => {
    if (activeTab === 'ACTIVITY') loadActivityFeed();
    if (activeTab === 'NOTIFICATIONS') loadNotifications();
  }, [activeTab, loadActivityFeed, loadNotifications]);

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
        throw new Error(resData.error?.message || resData.error || 'Failed to add collaborator');
      }

      setEmail('');
      setAlertInfo({
        type: 'success',
        message: resData.type === 'INVITATION_CREATED'
          ? `Invitation token generated and sent to ${email} with role ${role}!`
          : `Collaborator with role ${role} added to celebration workspace!`,
      });
      await loadCollaborators();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error inviting collaborator',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: EventRole) => {
    setAlertInfo(null);
    try {
      const res = await fetch(`/api/events/${id}/collaborators/${memberUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || resData.error || 'Failed to update member role');
      }

      setAlertInfo({
        type: 'success',
        message: `Member role updated to ${newRole} with updated server-side permissions.`,
      });
      await loadCollaborators();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Privilege update rejected',
      });
    }
  };

  const handleRemoveCollaborator = async (memberUserId: string) => {
    if (!confirm('Revoke access for this collaborator? Their task assignments will be unassigned.')) return;
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/collaborators/${memberUserId}`, {
        method: 'DELETE',
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || resData.error || 'Failed to remove collaborator');
      }

      setAlertInfo({
        type: 'success',
        message: 'Collaborator access revoked successfully.',
      });
      await loadCollaborators();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error removing collaborator',
      });
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetUserId) return;
    if (!confirm('TRANSFER OWNERSHIP CONFIRMATION:\nYou will transfer full irrevocable control to this user and become an Event Admin. Proceed?')) return;

    setTransferring(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/collaborators/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerUserId: transferTargetUserId }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || resData.error || 'Failed to transfer ownership');
      }

      setIsTransferModalOpen(false);
      setAlertInfo({
        type: 'success',
        message: resData.message || 'Event ownership transferred successfully!',
      });
      await loadCollaborators();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Ownership transfer failed',
      });
    } finally {
      setTransferring(false);
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

  const isEventOwner = data?.isOwner === true;
  const canManageMembers = data?.canManageMembers === true;
  const members = data?.members || [];
  const invitations = data?.invitations || [];
  const owner = data?.owner;

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <Link href={`/events/${id}`} className="hover:underline">
                Celebration Hub
              </Link>
              <span>/</span>
              <span>Team & Governance</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-3">
              Collaborator Management & RBAC
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Enforce server-side privilege boundaries across 6 granular roles, audit activity history, and retain owner authority.
            </p>
          </div>

          {/* Sub-Navigation Buttons */}
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'MEMBERS' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              👥 Team ({members.length + 1})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVITY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'ACTIVITY' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📜 Audit Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'NOTIFICATIONS' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🔔 Notifications
              {notifications.some((n) => !n.read) && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>
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

        {/* TAB 1: MEMBERS & RBAC */}
        {activeTab === 'MEMBERS' && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Invite Form Card */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-stone-300 shadow-sm h-fit space-y-4">
              <h2 className="text-lg font-bold text-stone-900">Invite Team Member</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Add an existing account or dispatch an invitation token. Access is strictly authorized server-side.
              </p>

              {canManageMembers ? (
                <form onSubmit={handleAddCollaborator} className="space-y-4">
                  <div>
                    <label htmlFor="collab-email" className="block text-xs font-semibold text-stone-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      id="collab-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="coordinator@example.com"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7] focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="collab-role" className="block text-xs font-semibold text-stone-700 mb-1">
                      Assigned Granular Role *
                    </label>
                    <select
                      id="collab-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as EventRole)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7] focus:ring-2 focus:ring-amber-500"
                    >
                      {isEventOwner && <option value="ADMIN">Event Admin (Team management & full modules)</option>}
                      <option value="PLANNER">Planner (Timeline, vendors, risks & reports)</option>
                      <option value="FINANCE_MANAGER">Finance Manager (Budgets, payments & quotes)</option>
                      <option value="GUEST_COORDINATOR">Guest Coordinator (Guests, RSVPs, seating & check-in)</option>
                      <option value="COLLABORATOR">Collaborator (Timeline execution & check-in)</option>
                      <option value="VIEWER">Viewer (Read-only with PII masking)</option>
                    </select>
                    <p className="mt-1.5 text-[11px] text-stone-500 italic">
                      {ROLE_DEFINITIONS[role]?.description}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Granting Access...' : 'Invite Collaborator'}
                  </button>
                </form>
              ) : (
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs text-stone-600">
                  You are viewing as <strong>{data?.callerRole}</strong>. Member invitations require Event Owner or Event Admin privileges.
                </div>
              )}

              {/* Ownership Transfer Action for Event Owner */}
              {isEventOwner && (
                <div className="pt-4 border-t border-stone-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Event Ownership Control</h3>
                  <p className="text-xs text-stone-600 mb-3">
                    As Event Owner, you retain irrevocable authority over this celebration. You may transfer ownership to another team member.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="w-full py-2 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all"
                  >
                    👑 Transfer Event Ownership
                  </button>
                </div>
              )}
            </div>

            {/* Team Members List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Owner Highlight Card */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded">
                      👑 Event Owner
                    </span>
                    <span className="text-xs text-amber-800 font-semibold">(Irrevocable Authority)</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900">{owner?.name || 'Primary Host'}</h3>
                  <p className="text-xs text-stone-600">{owner?.email}</p>
                </div>
                <StatusBadge label="OWNER" variant="SUCCESS" />
              </div>

              {/* Members Table */}
              <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-4">Authorized Team Members ({members.length})</h2>

                {members.length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center italic">
                    No additional team members added yet. Invite planners, finance managers, or coordinators on the left.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#fbf8f3] text-stone-700 text-xs uppercase font-bold border-b border-stone-200">
                        <tr>
                          <th scope="col" className="py-3 px-4">Member Name</th>
                          <th scope="col" className="py-3 px-4">Email</th>
                          <th scope="col" className="py-3 px-4">RBAC Role</th>
                          <th scope="col" className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {members.map((m: any) => {
                          const roleMeta = ROLE_DEFINITIONS[m.role as EventRole] || ROLE_DEFINITIONS.VIEWER;
                          return (
                            <tr key={m.id} className="hover:bg-stone-50/50">
                              <td className="py-3 px-4 font-semibold text-stone-900">
                                {m.user?.name || 'Team Member'}
                              </td>
                              <td className="py-3 px-4 text-xs text-stone-600">
                                {m.user?.email}
                              </td>
                              <td className="py-3 px-4">
                                {canManageMembers && isEventOwner ? (
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleRoleChange(m.userId, e.target.value as EventRole)}
                                    className="text-xs rounded-md border-stone-300 py-1 px-2 font-medium bg-stone-50 border focus:ring-1 focus:ring-amber-500"
                                  >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="PLANNER">PLANNER</option>
                                    <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                                    <option value="GUEST_COORDINATOR">GUEST_COORDINATOR</option>
                                    <option value="COLLABORATOR">COLLABORATOR</option>
                                    <option value="VIEWER">VIEWER</option>
                                  </select>
                                ) : (
                                  <StatusBadge label={m.role} variant={roleMeta.badgeVariant} />
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {canManageMembers && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCollaborator(m.userId)}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                                  >
                                    Revoke Access
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pending Invitations Table */}
              {invitations.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
                  <h3 className="text-base font-bold text-stone-900 mb-3">
                    Pending Dispatched Invitations ({invitations.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fbf8f3] text-stone-700 uppercase font-bold border-b border-stone-200">
                        <tr>
                          <th scope="col" className="py-2.5 px-3">Invited Email</th>
                          <th scope="col" className="py-2.5 px-3">Intended Role</th>
                          <th scope="col" className="py-2.5 px-3">Token Code</th>
                          <th scope="col" className="py-2.5 px-3">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {invitations.map((inv: any) => (
                          <tr key={inv.id}>
                            <td className="py-2.5 px-3 font-semibold text-stone-800">{inv.email}</td>
                            <td className="py-2.5 px-3">
                              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px]">
                                {inv.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-stone-500">{inv.token.slice(0, 12)}...</td>
                            <td className="py-2.5 px-3 text-stone-400">
                              {new Date(inv.expiresAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY FEED & AUDIT TRAIL */}
        {activeTab === 'ACTIVITY' && (
          <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Event Activity &amp; Audit Trail</h2>
                <p className="text-xs text-stone-500">
                  Immutable tamper-evident record of team actions, permissions, budgets, and milestones.
                </p>
              </div>
              <button
                type="button"
                onClick={loadActivityFeed}
                className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200"
              >
                ↻ Refresh Feed
              </button>
            </div>

            {activityLogs.length === 0 ? (
              <p className="text-xs text-stone-500 py-8 text-center italic">
                No activity recorded yet for this event.
              </p>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-stone-900">{log.performedBy?.name || 'System'}</span>
                        <span className="text-[10px] text-stone-400">({log.performedBy?.email})</span>
                        <span className="font-mono text-[10px] bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded font-bold">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-stone-600">
                        Entity: <strong>{log.entityType}</strong> • ID: <span className="font-mono">{log.entityId}</span>
                      </p>
                      {log.details && (
                        <p className="mt-1 text-stone-500 font-mono text-[11px]">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-stone-900 mb-1">Team Notifications</h2>
            <p className="text-xs text-stone-500 mb-4">
              Real-time alerts regarding role assignments, task delegations, and budget warnings.
            </p>

            {notifications.length === 0 ? (
              <p className="text-xs text-stone-500 py-8 text-center italic">
                No notifications for this event yet.
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 text-xs ${
                      n.read ? 'bg-stone-50 border-stone-200 text-stone-600' : 'bg-amber-50/70 border-amber-200 text-stone-900 font-medium'
                    }`}
                  >
                    <div>
                      <span className="font-bold block mb-0.5">{n.title}</span>
                      <p>{n.message}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OWNERSHIP TRANSFER MODAL */}
        {isTransferModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsTransferModalOpen(false)}
            title="Transfer Event Ownership"
          >
            <form onSubmit={handleTransferOwnership} className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <strong>Warning:</strong> You are transferring the Event Owner role. The new owner will have full irrevocable authority. You will become an Event Admin.
              </div>

              <div>
                <label htmlFor="target-user-select" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Select New Owner
                </label>
                <select
                  id="target-user-select"
                  required
                  value={transferTargetUserId}
                  onChange={(e) => setTransferTargetUserId(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-sm bg-white"
                >
                  <option value="">Choose an existing collaborator...</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.name} ({m.user?.email}) - Current: {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferTargetUserId}
                  className="px-4 py-2 text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {transferring ? 'Transferring...' : 'Confirm Ownership Transfer'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
}
