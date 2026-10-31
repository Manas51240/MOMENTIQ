// ==============================================================================
// CELEBRA — AI Input Sanitizer & Prompt Injection Shield
// ASVS Level 2 & OWASP Top 10 for LLMs: Delimiter Isolation & Adversarial Defense
// ==============================================================================

export const UNTRUSTED_BOUNDARY_START = '<<<UNTRUSTED_EVENT_BRIEF>>>';
export const UNTRUSTED_BOUNDARY_END = '<<</UNTRUSTED_EVENT_BRIEF>>>';

export const MAX_PROMPT_INPUT_CHARS = 10000;

// High-confidence adversarial prompt injection and jailbreak signatures
const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\s+(an?\s+)?unrestricted/i,
  /dan\s+mode\s+enabled/i,
  /bypass\s+all\s+(safety|guardrails)/i,
  /system\s+override/i,
  /reveal\s+(your\s+|the\s+)?(system\s+prompt|developer\s+instructions|hidden\s+rules|session\s+secret)/i,
  /output\s+the\s+(api\s+key|session\s+secret|database\s+url)/i,
  /\[inst\]\s*<<sys>>/i,
  /<\|im_start\|>/i,
  /###\s*system:/i,
  /print\s+(the\s+)?(initial\s+prompt|secrets|instructions)/i,
  /exfiltrate/i,
];

// Markdown exfiltration and SSRF link patterns: ![leak](https://...)
const EXFILTRATION_PATTERNS = [
  /!\[[^\]]*\]\(https?:\/\/[^\s\)]+\)/i,
  /<img\s+[^>]*src=["']https?:/i,
];

export interface SanitizationResult {
  sanitized: string;
  hasAdversarialAttempt: boolean;
  blockedPatterns: string[];
}

/**
 * Strips zero-width characters and bidirectional Unicode override markers.
 * Prevents visual spoofing and evasion filters.
 */
export function stripInvisibleCharacters(text: string): string {
  if (!text) return '';
  return text
    // Zero-width characters removed completely
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    // Non-breaking spaces converted to standard space
    .replace(/\u00A0/g, ' ')
    // Unicode directional formatting controls (bidi overrides)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Normalize excessive consecutive whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Detects direct and indirect prompt injection attempts.
 */
export function detectPromptInjection(text: string): {
  isMalicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const normalized = stripInvisibleCharacters(text);

  for (const pattern of ADVERSARIAL_PATTERNS) {
    if (pattern.test(normalized)) {
      reasons.push(`Adversarial directive detected: ${pattern.toString()}`);
    }
  }

  for (const pattern of EXFILTRATION_PATTERNS) {
    if (pattern.test(normalized)) {
      reasons.push(`Potential data exfiltration vector detected: ${pattern.toString()}`);
    }
  }

  return {
    isMalicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Safely wraps untrusted user brief into delimited boundaries.
 * Escapes boundary closing tags within user input to prevent jailbreak escapes.
 */
export function wrapUntrustedEventBrief(input: string): string {
  // Enforce max input length
  const bounded = input.slice(0, MAX_PROMPT_INPUT_CHARS);
  const stripped = stripInvisibleCharacters(bounded);

  // Neutralize closing delimiter evasion: replace any occurrence of <<< or >>>
  const safeText = stripped
    .replace(/<<<UNTRUSTED_EVENT_BRIEF>>>/g, '[BOUNDARY_STRIPPED]')
    .replace(/<<<\/UNTRUSTED_EVENT_BRIEF>>>/g, '[BOUNDARY_STRIPPED]');

  return `${UNTRUSTED_BOUNDARY_START}\n${safeText}\n${UNTRUSTED_BOUNDARY_END}`;
}
