function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvWithBom(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines: string[] = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  // UTF-8 BOM so Microsoft Excel reads Indonesian characters & formatting properly
  return `\uFEFF${lines.join('\r\n')}`;
}

