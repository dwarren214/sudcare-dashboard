export type CsvCell = string | number | null | undefined;

export interface CsvMetadataEntry {
  label: string;
  value: string;
}

export interface CsvSection {
  title?: string;
  headers: string[];
  rows: CsvCell[][];
}

export interface CsvDocument {
  metadata?: CsvMetadataEntry[];
  sections: CsvSection[];
}

export function buildCsvDocument(document: CsvDocument): string {
  const lines: string[] = [];

  if (document.metadata && document.metadata.length > 0) {
    document.metadata.forEach((entry) => {
      lines.push(`${escapeCsv(entry.label)},${escapeCsv(entry.value)}`);
    });
    lines.push("");
  }

  document.sections.forEach((section, index) => {
    if (section.title) {
      lines.push(escapeCsv(section.title));
    }
    lines.push(section.headers.map(escapeCsv).join(","));
    section.rows.forEach((row) => {
      lines.push(row.map(escapeCsv).join(","));
    });
    if (index < document.sections.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\r\n");
}

function escapeCsv(value: CsvCell): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const stringValue = typeof value === "string" ? value : String(value);
  const needsEscaping = /[",\r\n]/.test(stringValue);

  if (needsEscaping) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue.length === 0 ? '""' : stringValue;
}
