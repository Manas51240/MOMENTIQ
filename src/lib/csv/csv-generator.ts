/**
 * RFC 4180 Compliant CSV Generator
 * Handles escaping, quotes, special characters, and formatting for financial numbers.
 */

export interface CsvColumn<T = Record<string, unknown>> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

/**
 * Escapes a single CSV cell according to RFC 4180 and defenses against CSV Formula Injection:
 * - If the field begins with =, +, -, @, \t, or \r (formula triggers in Excel/Sheets), prepend with '
 * - If the field contains comma, double-quote, or newline, enclose in double quotes.
 * - Double quotes inside the field must be escaped by preceding them with another double quote ("").
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // CSV Formula Injection Defense: neutralize spreadsheet formula execution triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Check if string contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Formats integer minor currency units (cents/paise) into a clean decimal string, e.g. 12550 -> "125.50"
 */
export function formatMinorUnitsToCsv(minorUnits: number | bigint | string): string {
  const num = Number(minorUnits);
  if (isNaN(num)) return '0.00';
  return (num / 100).toFixed(2);
}

/**
 * Formats minor units to currency representation with prefix.
 */
export function formatMinorToCurrency(minorUnits: number | bigint | string, currency = 'INR'): string {
  const num = Number(minorUnits);
  if (isNaN(num)) return `${currency} 0.00`;
  return `${currency} ${(num / 100).toFixed(2)}`;
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of typed objects and column definitions.
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const lines: string[] = [];

  // Header row
  const headerRow = columns.map((col) => escapeCsvField(col.header)).join(',');
  lines.push(headerRow);

  // Data rows
  for (const item of data) {
    const row = columns.map((col) => escapeCsvField(col.accessor(item))).join(',');
    lines.push(row);
  }

  return lines.join('\r\n');
}

export interface CsvSectionConfig<T = any> {
  title: string;
  description?: string;
  columns: Array<{
    header: string;
    accessor: (item: T) => string | number | boolean | null | undefined;
  }>;
  data: T[];
}

/**
 * Generates a multi-section CSV string with section titles and summary headers.
 */
export function generateMultiSectionCsv(
  sections: Array<CsvSectionConfig<any>>
): string {
  const lines: string[] = [];

  for (const section of sections) {
    lines.push(escapeCsvField(`=== ${section.title} ===`));
    if (section.description) {
      lines.push(escapeCsvField(section.description));
    }
    const headerRow = section.columns.map((col) => escapeCsvField(col.header)).join(',');
    lines.push(headerRow);

    for (const item of section.data) {
      const row = section.columns.map((col) => escapeCsvField(col.accessor(item))).join(',');
      lines.push(row);
    }

    lines.push(''); // Blank line separator between sections
  }

  return lines.join('\r\n');
}
