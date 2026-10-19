import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Bytes accepted by the PDF text-only path. Never hand unbounded network input to a parser. */
export const PDF_TEXT_MAX_BYTES = 8_000_000;
export const PDF_TEXT_MAX_PAGES = 50;
export const PDF_TEXT_MAX_CHARS = 16_000;

export interface PdfTextExtraction {
  text: string;
  pagesRead: number;
  totalPages: number;
  truncated: boolean;
}

/**
 * Extract text only. This does not render pages, execute document actions, or OCR image-only PDFs.
 * The caller must bound the downloaded bytes and decide whether the extracted text is claim-grade.
 */
export async function extractPdfText(
  bytes: Uint8Array,
  options: { maxPages?: number; maxChars?: number } = {},
): Promise<PdfTextExtraction> {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("PDF input must be a Uint8Array");
  if (bytes.byteLength === 0) throw new Error("PDF input is empty");
  if (bytes.byteLength > PDF_TEXT_MAX_BYTES) throw new Error("PDF input exceeds the bounded byte limit");

  const maxPages = Math.max(1, Math.min(PDF_TEXT_MAX_PAGES, Math.floor(options.maxPages ?? PDF_TEXT_MAX_PAGES)));
  const maxChars = Math.max(256, Math.min(PDF_TEXT_MAX_CHARS, Math.floor(options.maxChars ?? PDF_TEXT_MAX_CHARS)));
  const loadingTask = getDocument({
    data: Uint8Array.from(bytes),
    isEvalSupported: false,
    useWorkerFetch: false,
    stopAtErrors: true,
  });

  try {
    const document = await loadingTask.promise;
    const pagesToRead = Math.min(document.numPages, maxPages);
    let text = "";
    let truncated = document.numPages > pagesToRead;
    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => item && typeof item === "object" && "str" in item && typeof item.str === "string" ? item.str : "")
          .filter(Boolean)
          .join(" ")
          .replace(/\\s+/g, " ")
          .trim();
        if (!pageText) continue;

        const prefix = `[Page ${pageNumber}] `;
        const separator = text ? "\n" : "";
        const remaining = maxChars - text.length - separator.length - prefix.length;
        if (remaining <= 0) {
          truncated = true;
          break;
        }
        if (pageText.length > remaining) {
          text += separator + prefix + pageText.slice(0, remaining);
          truncated = true;
          break;
        }
        text += separator + prefix + pageText;
      } finally {
        page.cleanup();
      }
    }

    return {
      text: text.trim(),
      pagesRead: pagesToRead,
      totalPages: document.numPages,
      truncated,
    };
  } finally {
    // Text extraction doesn't need the parser to retain document buffers after the result is built.
    await loadingTask.destroy().catch(() => undefined);
  }
}
