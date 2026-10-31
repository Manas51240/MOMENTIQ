/**
 * @fileoverview Universal content snippet renderer for cards & list previews.
 * Formats structured JSON outputs into human-readable previews across 14 creative disciplines.
 * @module components/studio/RenderContentSnippet
 */

import React from 'react';

interface RenderContentSnippetProps {
  category: string;
  content: Record<string, any> | null | undefined;
}

/**
 * Formats minor currency units into Indian Rupee (INR) representation.
 */
function formatRupeeMinor(minorUnits: number | undefined): string {
  if (typeof minorUnits !== 'number' || isNaN(minorUnits)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

/**
 * Universal content preview component for AI Creative Studio outputs.
 */
export function RenderContentSnippet({ category, content }: RenderContentSnippetProps) {
  if (!content) {
    return <span className="text-stone-400 italic">No content available</span>;
  }

  if (category === 'WEDDING_THEME') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">{content.conceptName}</h5>
        <p className="italic text-stone-600 mb-2">&quot;{content.tagline}&quot;</p>
        <p className="mb-2 text-stone-700">{content.narrative}</p>
        <p className="text-stone-500 text-[11px]">
          <strong>Motifs:</strong> {content.keyMotifs?.join(', ') || 'N/A'}
        </p>
      </div>
    );
  }

  if (category === 'BIRTHDAY_CONCEPT') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">{content.themeTitle}</h5>
        <p className="italic text-stone-600 mb-2">&quot;{content.tagline}&quot;</p>
        <p className="mb-1 text-stone-700">
          <strong>Cake:</strong> {content.cakeConcept}
        </p>
        <p className="text-stone-500 text-[11px]">
          <strong>Entrance:</strong> {content.entranceFeature}
        </p>
      </div>
    );
  }

  if (category === 'CULTURAL_CONCEPT') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">{content.culturalTradition}</h5>
        <ul className="list-disc list-inside space-y-1 text-stone-600 mb-2">
          {content.ritualsAndCeremonies?.map((r: { ritualName: string; meaning: string }, idx: number) => (
            <li key={idx}>
              <strong>{r.ritualName}:</strong> {r.meaning}
            </li>
          ))}
        </ul>
        <p className="text-stone-500 text-[11px]">
          <strong>Modern Twist:</strong> {content.modernTwistSuggestion}
        </p>
      </div>
    );
  }

  if (category === 'EVENT_BRANDING') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">Monogram: {content.monogramOrInitials}</h5>
        <p className="text-stone-600 mb-2">
          <strong>Hashtags:</strong> {content.officialHashtags?.join(' ')}
        </p>
        <p className="text-stone-500 text-[11px]">
          <strong>Typography:</strong> {content.typographyRecommendation?.primaryFont}
        </p>
      </div>
    );
  }

  if (category === 'SOCIAL_MEDIA_CAPTIONS') {
    return (
      <div>
        <strong className="text-stone-900 block mb-1">Instagram Hooks:</strong>
        {content.instagramCaptions?.map((c: { hook: string }, idx: number) => (
          <p key={idx} className="text-stone-600 mb-1 italic">&quot;{c.hook}&quot;</p>
        ))}
      </div>
    );
  }

  if (category === 'WELCOME_MESSAGE') {
    return (
      <div>
        <strong className="text-stone-900 block mb-1">Easel Welcome:</strong>
        <p className="text-stone-700 mb-2">&quot;{content.easelBoardText}&quot;</p>
        <p className="text-stone-500 text-[11px]">
          <strong>Emcee Opening:</strong> {content.emceeWelcomeScript}
        </p>
      </div>
    );
  }

  if (category === 'ENTERTAINMENT_IDEAS') {
    return (
      <div>
        <h5 className="font-bold text-stone-900 mb-1">Performance: {content.livePerformance}</h5>
        <p className="text-stone-600 mb-1">
          <strong>Soundtrack:</strong> {content.soundtrackStyle}
        </p>
        <p className="text-stone-500 text-[11px]">
          <strong>Photo Booth:</strong> {content.photoBoothConcept?.backdrop}
        </p>
      </div>
    );
  }

  if (category === 'RETURN_GIFTS') {
    return (
      <div className="space-y-1">
        <h5 className="font-bold text-stone-900">{content.giftConcept}</h5>
        <p className="text-stone-600">
          Est: {formatRupeeMinor(content.estimatedPerUnitCostMinor)} / unit
        </p>
        <p className="text-stone-500 text-[11px]">{content.packagingStyle}</p>
      </div>
    );
  }

  // Fallback for custom or novel categories
  return (
    <pre className="font-mono text-[11px] whitespace-pre-wrap text-stone-600">
      {JSON.stringify(content, null, 2).slice(0, 300)}...
    </pre>
  );
}

