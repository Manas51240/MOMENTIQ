'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { EventNavTabs } from '@/components/ui/EventNavTabs';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string;
  isMilestone: boolean;
  isUserLocked: boolean;
  dependencies?: any[];
}

export default function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'ITINERARY'>('KANBAN');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [isMilestone, setIsMilestone] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Regenerate State
  const [regenerating, setRegenerating] = useState(false);

  const loadTimelineData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}/timeline`);
      const data = await res.json();
      if (data.success && data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load timeline tasks',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTimelineData();
  }, [loadTimelineData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTask(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/timeline/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          dueDate: new Date(taskDueDate).toISOString(),
          priority: taskPriority,
          isMilestone,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create task');
      }

      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setAlertInfo({
        type: 'success',
        message: 'Task created and added to intelligent planning DAG.',
      });
      await loadTimelineData();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error creating task',
      });
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskItem['status']) => {
    try {
      const res = await fetch(`/api/events/${id}/timeline/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update task status');
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Status update failed',
      });
    }
  };

  const handleRegenerateTimeline = async () => {
    setRegenerating(true);
    setAlertInfo(null);

    try {
      const res = await fetch(`/api/events/${id}/timeline/generate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to regenerate timeline');
      }

      setAlertInfo({
        type: 'success',
        message: 'Timeline dynamically regenerated while preserving all your manual tasks!',
      });
      await loadTimelineData();
    } catch (err: unknown) {
      setAlertInfo({
        type: 'error',
        message: err instanceof Error ? err.message : 'Regeneration failed',
      });
    } finally {
      setRegenerating(false);
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

  const kanbanColumns: Array<{ key: TaskItem['status']; title: string }> = [
    { key: 'TODO', title: 'To Do' },
    { key: 'IN_PROGRESS', title: 'In Progress' },
    { key: 'REVIEW', title: 'Under Review' },
    { key: 'DONE', title: 'Completed' },
  ];

  const getPriorityVariant = (priority: string): StatusVariant => {
    switch (priority) {
      case 'CRITICAL':
        return 'DANGER';
      case 'HIGH':
        return 'WARNING';
      case 'MEDIUM':
        return 'INFO';
      default:
        return 'NEUTRAL';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-stone-900">
      <SkipToContent />
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
              <Link href={`/events/${id}`} className="hover:underline">
                Celebration
              </Link>
              <span>/</span>
              <span>Intelligent Timeline DAG</span>
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Timeline, Tasks & Itinerary
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Graph-theory schedule DAG with DFS cycle detection and user edit preservation
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="p-1 bg-stone-200/80 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('KANBAN')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === 'KANBAN' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === 'LIST' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Milestones
              </button>
            </div>

            <button
              type="button"
              onClick={handleRegenerateTimeline}
              disabled={regenerating}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>{regenerating ? 'Calibrating...' : 'Regenerate Schedule'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 focus:ring-4 focus:ring-amber-500/40"
            >
              <span>+</span>
              <span>Add Task</span>
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

        {/* Kanban Board View */}
        {viewMode === 'KANBAN' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {kanbanColumns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div
                  key={col.key}
                  className="bg-[#f7f3eb] p-4 rounded-2xl border border-stone-300 shadow-sm flex flex-col gap-3 min-h-[450px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-300">
                    <span className="font-bold text-xs uppercase tracking-wider text-stone-700">
                      {col.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-stone-700 font-bold text-xs border border-stone-200">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:border-amber-400 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <StatusBadge label={t.priority} variant={getPriorityVariant(t.priority)} />
                          {t.isMilestone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                              Milestone
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-stone-900 leading-snug">
                          {t.title}
                        </h3>

                        {t.description && (
                          <p className="text-xs text-stone-600 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 text-[11px] text-stone-500 border-t border-stone-100">
                          <span>📅 {new Date(t.dueDate).toLocaleDateString()}</span>

                          {/* Quick Status Shift Select */}
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value as TaskItem['status'])}
                            className="bg-stone-50 text-stone-700 font-semibold px-2 py-0.5 rounded border border-stone-200 focus:outline-none"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Milestone List View */}
        {viewMode === 'LIST' && (
          <div className="mt-8 bg-white rounded-2xl border border-stone-300 shadow-sm p-6">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Milestones & Planning Roadmap</h2>
            <div className="divide-y divide-stone-100">
              {tasks.map((t) => (
                <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-sm">{t.title}</h3>
                      {t.isMilestone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                          Milestone
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600">{t.description}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-stone-500">{new Date(t.dueDate).toLocaleDateString()}</span>
                    <StatusBadge label={t.priority} variant={getPriorityVariant(t.priority)} />
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value as TaskItem['status'])}
                      className="bg-stone-100 text-stone-800 font-semibold px-2 py-1 rounded border border-stone-300 text-xs"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Planning Task"
        description="Creates task with automatic calendar integration and dependency cycle validation."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label htmlFor="task-t" className="block text-xs font-semibold text-stone-700 mb-1">
              Task Title *
            </label>
            <input
              id="task-t"
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Finalize Catering Tasting Menu"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div>
            <label htmlFor="task-d" className="block text-xs font-semibold text-stone-700 mb-1">
              Description
            </label>
            <textarea
              id="task-d"
              rows={3}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Review dietary restrictions with executive chef..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-date" className="block text-xs font-semibold text-stone-700 mb-1">
                Due Date *
              </label>
              <input
                id="task-date"
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              />
            </div>

            <div>
              <label htmlFor="task-pri" className="block text-xs font-semibold text-stone-700 mb-1">
                Priority
              </label>
              <select
                id="task-pri"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-[#fdfbf7]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="task-mile"
              type="checkbox"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
              className="rounded text-amber-800 focus:ring-amber-800"
            />
            <label htmlFor="task-mile" className="text-xs font-semibold text-stone-700">
              Designate as Key Milestone
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingTask}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {submittingTask ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
