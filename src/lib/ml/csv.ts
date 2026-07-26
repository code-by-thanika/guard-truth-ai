/**
 * Minimal RFC-4180 CSV parser used to ingest Kaggle's Fake.csv / True.csv.
 * Handles quoted fields, embedded commas, escaped quotes and CRLF.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Turn a Kaggle news CSV into plain text documents.
 * Uses the `title` + `text` columns when present, otherwise the longest column.
 */
export function csvToDocuments(csv: string, maxRows = 4000): string[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes("text") || header.includes("title");
  const body = hasHeader ? rows.slice(1) : rows;

  const titleIdx = header.indexOf("title");
  const textIdx = header.indexOf("text");

  const docs: string[] = [];
  for (const row of body) {
    let doc: string;
    if (hasHeader && (titleIdx >= 0 || textIdx >= 0)) {
      doc = [titleIdx >= 0 ? row[titleIdx] : "", textIdx >= 0 ? row[textIdx] : ""]
        .filter(Boolean)
        .join(". ");
    } else {
      doc = row.reduce((longest, cell) => (cell.length > longest.length ? cell : longest), "");
    }
    doc = doc.trim();
    if (doc.length > 40) docs.push(doc.slice(0, 4000));
    if (docs.length >= maxRows) break;
  }

  return docs;
}
