/**
 * CSV export utility.
 *
 * Converts an array of objects to a CSV string and triggers a browser download.
 * Handles commas, quotes, and newlines by wrapping fields in double quotes
 * and escaping internal double quotes.
 *
 * Per SKILL §14.6: client-side only — no server round-trip needed.
 */

/**
 * Escape a single CSV field value.
 * Wraps in double quotes if the value contains comma, quote, or newline.
 * Escapes internal double quotes by doubling them (RFC 4180).
 */
function escapeCSVField(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = '';
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    str = String(value);
  } else {
    str = JSON.stringify(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to a CSV string.
 *
 * @param data Array of objects with string keys
 * @returns CSV string with header row + data rows
 */
export function arrayToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]!);
  const headerRow = headers.map(escapeCSVField).join(',');
  const dataRows = data.map((row) =>
    headers.map((h) => escapeCSVField(row[h])).join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 *
 * @param data Array of objects to export
 * @param filename Name of the downloaded file (without extension)
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  const csv = arrayToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
