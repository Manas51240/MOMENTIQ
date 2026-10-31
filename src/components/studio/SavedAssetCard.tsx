/**
 * @fileoverview Saved Asset Card component for approved workspace artifacts.
 * Provides quick preview, version metadata, formatted JSON export, and deletion.
 * @module components/studio/SavedAssetCard
 */

import React from 'react';
import { CATEGORY_LABELS, SavedAsset } from './types';
import { RenderContentSnippet } from './RenderContentSnippet';

export interface SavedAssetCardProps {
  asset: SavedAsset;
  copiedId: string | null;
  onCopyJson: (text: string, id: string) => void;
  onDelete: (assetId: string) => void;
}

/**
 * Individual approved asset card in Event Workspace tab.
 */
export function SavedAssetCard({
  asset,
  copiedId,
  onCopyJson,
  onDelete,
}: SavedAssetCardProps) {
  const categoryMeta = CATEGORY_LABELS[asset.category] || { label: asset.category, icon: '📁' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
            <span>{categoryMeta.icon}</span>
            <span>{categoryMeta.label}</span>
          </span>
          <span className="text-xs text-stone-400">
            v{asset.version} • {new Date(asset.createdAt).toLocaleDateString()}
          </span>
        </div>

        <h4 className="text-base font-bold text-stone-900 mb-2">{asset.title}</h4>

        {asset.notes && (
          <p className="text-xs text-stone-600 italic mb-3 bg-stone-50 p-2 rounded">
            &quot;{asset.notes}&quot;
          </p>
        )}

        {/* Snippet preview */}
        <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-lg max-h-48 overflow-y-auto no-scrollbar border border-stone-100">
          <RenderContentSnippet category={asset.category} content={asset.content} />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCopyJson(JSON.stringify(asset.content, null, 2), asset.id)}
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 focus:outline-none"
        >
          {copiedId === asset.id ? '✓ Copied JSON' : 'Copy JSON'}
        </button>

        <button
          type="button"
          onClick={() => onDelete(asset.id)}
          className="text-xs font-semibold text-red-600 hover:text-red-800 focus:outline-none"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

