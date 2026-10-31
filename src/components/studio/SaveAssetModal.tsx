/**
 * @fileoverview Modal dialog for saving approved creative assets to the event workspace.
 * Captures custom title and optional organizer directives/notes.
 * @module components/studio/SaveAssetModal
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CreativeCategory } from '@/lib/ai/creative-schemas';

export interface SaveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToSave: { category: CreativeCategory; title: string; content: any } | null;
  saveCustomTitle: string;
  onChangeCustomTitle: (val: string) => void;
  saveNotes: string;
  onChangeNotes: (val: string) => void;
  isSavingAsset: boolean;
  onSave: () => void;
}

/**
 * Dialog for committing an approved creative asset to the workspace repository.
 */
export function SaveAssetModal({
  isOpen,
  onClose,
  assetToSave,
  saveCustomTitle,
  onChangeCustomTitle,
  saveNotes,
  onChangeNotes,
  isSavingAsset,
  onSave,
}: SaveAssetModalProps) {
  if (!isOpen || !assetToSave) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Approved Asset to Workspace"
    >
      <div className="space-y-4">
        <p className="text-xs text-stone-600">
          Saving this asset locks it into your official event workspace, making it accessible to event collaborators and planners.
        </p>

        <div>
          <label htmlFor="save-asset-title" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
            Asset Title
          </label>
          <input
            id="save-asset-title"
            type="text"
            value={saveCustomTitle}
            onChange={(e) => onChangeCustomTitle(e.target.value)}
            className="w-full rounded-lg border border-stone-300 p-2 text-sm focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="save-asset-notes" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
            Organizer Notes / Implementation Directives (Optional)
          </label>
          <textarea
            id="save-asset-notes"
            rows={3}
            value={saveNotes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="e.g. Approved by couple for main reception dining tables..."
            className="w-full rounded-lg border border-stone-300 p-2 text-sm focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingAsset}
            className="px-5 py-2 text-sm font-bold bg-amber-800 hover:bg-amber-900 text-white rounded-lg shadow-sm disabled:opacity-60"
          >
            {isSavingAsset ? 'Saving...' : 'Confirm & Save Asset'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

