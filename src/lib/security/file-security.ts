// ==============================================================================
// CELEBRA — File Storage Security, MIME Validation & Path Traversal Shield
// ASVS Level 2: Prevention of Path Traversal, Executable Uploads & Spoofing
// ==============================================================================

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.csv',
  '.docx',
] as const;

export const BLOCKED_EXECUTABLE_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.phtml',
  '.jsp',
  '.asp',
  '.aspx',
  '.ps1',
  '.py',
  '.rb',
  '.js',
  '.vbs',
  '.cgi',
  '.pl',
  '.htm',
  '.html',
  '.svg',
] as const;

const MAGIC_BYTES: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47], // \x89PNG
  jpg: [0xff, 0xd8, 0xff],       // JPEG
};

/**
 * Validates storage keys for path traversal attempts and ensures safe naming.
 * Keys must not contain "..", backslashes, leading slashes, or dangerous characters.
 */
export function validateStorageKey(
  storageKey: string | null | undefined,
  expectedEventId?: string
): { isValid: boolean; error?: string } {
  if (!storageKey) {
    return { isValid: true };
  }

  // 1. Check for path traversal sequences
  if (
    storageKey.includes('..') ||
    storageKey.includes('\\') ||
    storageKey.startsWith('/') ||
    storageKey.includes('\0') ||
    /%2e%2e/i.test(storageKey)
  ) {
    return {
      isValid: false,
      error: 'Path traversal attempt detected in document storage key',
    };
  }

  // 2. Enforce strict character set: alphanumeric, hyphens, underscores, dots, slashes
  if (!/^[a-zA-Z0-9_\-\.\/]+$/.test(storageKey)) {
    return {
      isValid: false,
      error: 'Invalid characters in document storage key',
    };
  }

  // 3. Block executable and script file extensions
  const lowerKey = storageKey.toLowerCase();
  for (const ext of BLOCKED_EXECUTABLE_EXTENSIONS) {
    if (lowerKey.endsWith(ext) || lowerKey.includes(`${ext}.`)) {
      return {
        isValid: false,
        error: `Executable or script extension "${ext}" is strictly forbidden`,
      };
    }
  }

  // 4. If scoped to an event, ensure the key belongs to that event namespace
  if (expectedEventId && storageKey.includes('events/')) {
    const expectedPrefix = `events/${expectedEventId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      return {
        isValid: false,
        error: 'Cross-event document access attempt detected: Storage key outside event namespace',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates file buffer magic bytes against declared extension to prevent MIME spoofing.
 */
export function validateFileBufferMagicBytes(
  filename: string,
  buffer: Buffer
): { isValid: boolean; error?: string } {
  const lower = filename.toLowerCase();

  if (buffer.length < 4) {
    return { isValid: false, error: 'File is too small or truncated' };
  }

  if (lower.endsWith('.pdf')) {
    const expected = MAGIC_BYTES.pdf;
    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) {
        return {
          isValid: false,
          error: 'MIME spoofing detected: File content does not match PDF signature (%PDF)',
        };
      }
    }
  } else if (lower.endsWith('.png')) {
    const expected = MAGIC_BYTES.png;
    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) {
        return {
          isValid: false,
          error: 'MIME spoofing detected: File content does not match PNG signature',
        };
      }
    }
  } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    const expected = MAGIC_BYTES.jpg;
    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) {
        return {
          isValid: false,
          error: 'MIME spoofing detected: File content does not match JPEG signature',
        };
      }
    }
  }

  return { isValid: true };
}
