/**
 * RFC 4180 Compliant CSV Generator
 * Handles escaping, quotes, special characters, and formatting for financial numbers.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

/**
 * Escapes a single CSV cell according to RFC 4180:
 * - If the field contains comma, double-quote, or newline, enclose in double quotes.
 * - Double quotes inside the field must be escaped by preceding them with another double quote ("").
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if string contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Formats integer minor currency units (cents) into a clean decimal string, e.g. 12550 -> "125.50"
 */
export function formatMinorToCurrency(minor: number | bigint | string, currency = 'USD'): string {
  const num = typeof minor === 'bigint' ? Number(minor) : Number(minor || 0);
  const formatted = (num / 100).toFixed(2);
  return `${currency} ${formatted}`;
}

/**
 * Generates an RFC 4180 compliant CSV string from a dataset and column definitions.
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const headerRow = columns.map((col) => escapeCsvField(col.header)).join(',');
  const rows = data.map((item) =>
    columns.map((col) => escapeCsvField(col.accessor(item))).join(',')
  );

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Generates a multi-section CSV string with section titles and summary headers.
 */
export function generateMultiSectionCsv(
  sections: Array<{
    title: string;
    description?: string;
    columns: CsvColumn<any>[];
    data: any[];
  }>
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

    lines.push(''); // blank row between sections
  }

  return lines.join('\r\n');
}

