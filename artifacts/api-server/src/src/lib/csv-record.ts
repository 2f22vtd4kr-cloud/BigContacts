/**
 * Parse one RFC 4180-style CSV record without splitting embedded commas.
 * Returns null for an unterminated quoted field so a malformed source row is
 * counted as an error rather than silently shifted into unrelated columns.
 */
export function parseCsvRecord(line: string): string[] | null {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;

    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "," ) {
      fields.push(field);
      field = "";
      closedQuote = false;
      continue;
    }

    if (char === '"' && field.length === 0 && !closedQuote) {
      quoted = true;
      continue;
    }

    // Whitespace after a closing quote is permitted; preserve other characters.
    if (closedQuote && /\s/.test(char)) continue;
    if (closedQuote) return null;
    field += char;
  }

  if (quoted) return null;
  fields.push(field);
  return fields;
}
