// ==============================================================================
// CELEBRA — Guest List CSV Parser & Validation Engine
// ASVS Level 2: Strict Input Validation, Duplicate Detection & Safe Error Reporting
// ==============================================================================

import { stripInvisibleCharacters, detectPromptInjection } from '@/lib/ai/sanitizer';

export interface ParsedGuestRow {
  name: string;
  email?: string;
  phone?: string;
  groupName?: string;
  dietaryRequirements?: string;
  accessibilityNotes?: string;
  attendingCount: number;
  isPlusOne: boolean;
}

export interface CsvValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawRow: string;
}

export interface CsvParseResult {
  validRows: ParsedGuestRow[];
  errors: CsvValidationError[];
  duplicateCount: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parses raw CSV guest text into validated structured records.
 * Detects malformed rows, missing mandatory headers, and duplicate records.
 */
export function parseGuestListCsv(csvText: string): CsvParseResult {
  const validRows: ParsedGuestRow[] = [];
  const errors: CsvValidationError[] = [];
  let duplicateCount = 0;

  if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
    errors.push({
      rowNumber: 0,
      field: 'file',
      message: 'CSV file is empty',
      rawRow: '',
    });
    return { validRows, errors, duplicateCount };
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    errors.push({
      rowNumber: 1,
      field: 'header',
      message: 'CSV must contain at least a header row and one data row',
      rawRow: lines[0] || '',
    });
    return { validRows, errors, duplicateCount };
  }

  // Parse header
  const header = lines[0]
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

  const nameIndex = header.findIndex((h) => h === 'name' || h === 'guest name' || h === 'full name');
  const emailIndex = header.findIndex((h) => h === 'email' || h === 'email address');
  const phoneIndex = header.findIndex((h) => h === 'phone' || h === 'mobile' || h === 'telephone');
  const groupIndex = header.findIndex((h) => h === 'group' || h === 'family' || h === 'group name');
  const dietaryIndex = header.findIndex((h) => h === 'dietary' || h === 'diet' || h === 'dietary requirements');
  const accessibilityIndex = header.findIndex((h) => h === 'accessibility' || h === 'accessibility notes');
  const countIndex = header.findIndex((h) => h === 'count' || h === 'guests' || h === 'attending count');
  const plusOneIndex = header.findIndex((h) => h === 'plusone' || h === 'plus one' || h === 'isplusone');

  if (nameIndex === -1) {
    errors.push({
      rowNumber: 1,
      field: 'header',
      message: 'CSV header is missing mandatory "name" column',
      rawRow: lines[0],
    });
    return { validRows, errors, duplicateCount };
  }

  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const rowNumber = i + 1;

    // Handle standard CSV commas with optional quotes
    const cells = rawLine
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const name = cells[nameIndex]?.trim();
    if (!name || name.length < 2) {
      errors.push({
        rowNumber,
        field: 'name',
        message: 'Name is mandatory and must be at least 2 characters',
        rawRow: rawLine,
      });
      continue;
    }

    const email = emailIndex !== -1 ? cells[emailIndex]?.trim() : undefined;
    if (email && email.length > 0 && !EMAIL_REGEX.test(email)) {
      errors.push({
        rowNumber,
        field: 'email',
        message: `Invalid email format: "${email}"`,
        rawRow: rawLine,
      });
      continue;
    }

    // Duplicate check within file (by name or by email)
    const lowerName = name.toLowerCase();
    const lowerEmail = email && email.length > 0 ? email.toLowerCase() : null;

    if (seenNames.has(lowerName) || (lowerEmail && seenEmails.has(lowerEmail))) {
      duplicateCount++;
      errors.push({
        rowNumber,
        field: seenNames.has(lowerName) ? 'name' : 'email',
        message: seenNames.has(lowerName)
          ? `Duplicate guest name detected in CSV: "${name}"`
          : `Duplicate email detected in CSV: "${email}"`,
        rawRow: rawLine,
      });
      continue;
    }

    seenNames.add(lowerName);
    if (lowerEmail) seenEmails.add(lowerEmail);

    const phone = phoneIndex !== -1 ? cells[phoneIndex]?.trim() : undefined;
    const groupName = groupIndex !== -1 ? cells[groupIndex]?.trim() : undefined;
    let dietaryRequirements = dietaryIndex !== -1 ? cells[dietaryIndex]?.trim() : undefined;
    let accessibilityNotes = accessibilityIndex !== -1 ? cells[accessibilityIndex]?.trim() : undefined;

    // Sanitize invisible characters & defend against prompt injection inside notes
    if (dietaryRequirements) {
      dietaryRequirements = stripInvisibleCharacters(dietaryRequirements);
      const injCheck = detectPromptInjection(dietaryRequirements);
      if (injCheck.isMalicious) {
        errors.push({
          rowNumber,
          field: 'dietaryRequirements',
          message: `Malicious prompt injection intercepted in dietary notes: ${injCheck.reasons.join(', ')}`,
          rawRow: rawLine,
        });
        continue;
      }
    }

    if (accessibilityNotes) {
      accessibilityNotes = stripInvisibleCharacters(accessibilityNotes);
      const injCheck = detectPromptInjection(accessibilityNotes);
      if (injCheck.isMalicious) {
        errors.push({
          rowNumber,
          field: 'accessibilityNotes',
          message: `Malicious prompt injection intercepted in accessibility notes: ${injCheck.reasons.join(', ')}`,
          rawRow: rawLine,
        });
        continue;
      }
    }

    let attendingCount = 1;
    if (countIndex !== -1 && cells[countIndex]) {
      const parsedCount = parseInt(cells[countIndex], 10);
      if (!isNaN(parsedCount) && parsedCount > 0) {
        attendingCount = Math.min(20, parsedCount);
      }
    }

    const isPlusOne =
      plusOneIndex !== -1 &&
      (cells[plusOneIndex]?.toLowerCase() === 'true' ||
        cells[plusOneIndex]?.toLowerCase() === 'yes' ||
        cells[plusOneIndex] === '1');

    validRows.push({
      name,
      email: email || undefined,
      phone: phone || undefined,
      groupName: groupName || undefined,
      dietaryRequirements: dietaryRequirements || undefined,
      accessibilityNotes: accessibilityNotes || undefined,
      attendingCount,
      isPlusOne,
    });
  }

  return {
    validRows,
    errors,
    duplicateCount,
  };
}
