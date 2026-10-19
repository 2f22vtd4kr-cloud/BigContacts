/** Bytes accepted by the PDF text-only path. Never hand unbounded network input to a parser. */
export const PDF_TEXT_MAX_BYTES = 8_000_000;
export const PDF_TEXT_MAX_PAGES = 50;
export const PDF_TEXT_MAX_CHARS = 16_000;

export type PdfTextExtractionFailureReason =
  | "pdf_encrypted"
  | "pdf_malformed"
  | "pdf_unsupported"
  | "pdf_extraction_failed";

export class PdfTextExtractionError extends Error {
  readonly reason: PdfTextExtractionFailureReason;

  constructor(reason: PdfTextExtractionFailureReason) {
    const message = reason === "pdf_encrypted"
      ? "PDF is encrypted or password protected"
      : reason === "pdf_malformed"
        ? "PDF is malformed or unreadable"
        : reason === "pdf_unsupported"
          ? "PDF uses an unsupported document feature"
          : "PDF text extraction failed";
    super(message);
    this.name = "PdfTextExtractionError";
    this.reason = reason;
  }
}

export function classifyPdfTextExtractionFailure(error: unknown): PdfTextExtractionFailureReason {
  const value = error && typeof error === "object" ? error as { name?: unknown; message?: unknown } : {};
  const name = typeof value.name === "string" ? value.name : "";
  const message = typeof value.message === "string" ? value.message : "";
  if (name === "PasswordException" || /password (?:required|incorrect)|encrypted pdf/i.test(message)) return "pdf_encrypted";
  if (name === "UnsupportedFeatureException" || /unsupported pdf feature/i.test(message)) return "pdf_unsupported";
  if (name === "InvalidPDFException" || /invalid pdf structure|missing pdf header|invalid xref|malformed pdf/i.test(message)) return "pdf_malformed";
  return "pdf_extraction_failed";
}

export interface PdfTextExtraction {
  text: string;
  pagesRead: number;
  totalPages: number;
  truncated: boolean;
  /** True when any inspected page has image content with no extractable text. */
  ocrRequired: boolean;
  /** One-based pages that need OCR because image content was detected without text. */
  ocrRequiredPages: number[];
}

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

/**
 * PDF.js 5.7's Node legacy bundle references DOMMatrix at module evaluation time,
 * despite its optional-canvas fallback. Apex deliberately excludes native canvas
 * because this capability only extracts text and never renders pages. Bootstrap
 * the one render-only module-scope constructor just for import, then restore the
 * global. If PDF.js or this path ever starts rendering, this must be replaced with
 * a real DOMMatrix implementation rather than extending this text-only shim.
 */
async function loadPdfJsForTextOnlyUse(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = (async () => {
      const runtime = globalThis as unknown as { DOMMatrix?: unknown };
      const previousDomMatrix = runtime.DOMMatrix;
      const installTextOnlyBootstrap = typeof previousDomMatrix !== "function";

      if (installTextOnlyBootstrap) {
        class TextOnlyDomMatrixBootstrap {
          // PDF.js initializes a module-scope matrix used only by canvas rendering.
          // Text extraction uses its own numeric transform arrays and never invokes this object.
          constructor(..._args: unknown[]) {}
        }
        Object.defineProperty(globalThis, "DOMMatrix", {
          configurable: true,
          writable: true,
          value: TextOnlyDomMatrixBootstrap,
        });
      }

      try {
        return await import("pdfjs-dist/legacy/build/pdf.mjs");
      } finally {
        if (installTextOnlyBootstrap) {
          delete runtime.DOMMatrix;
        }
      }
    })().catch((error: unknown) => {
      // A failed import should not permanently poison later attempts in this process.
      pdfJsModulePromise = null;
      throw error;
    });
  }

  return pdfJsModulePromise;
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
  const { getDocument } = await loadPdfJsForTextOnlyUse();
  const loadingTask = getDocument({
    data: Uint8Array.from(bytes),
    // Only getTextContent() is called; no annotations, links, or document actions are executed.
    useWorkerFetch: false,
    stopAtErrors: true,
  });

  try {
    let document: Awaited<typeof loadingTask.promise>;
    try {
      document = await loadingTask.promise;
    } catch (error) {
      throw new PdfTextExtractionError(classifyPdfTextExtractionFailure(error));
    }
    const pagesToRead = Math.min(document.numPages, maxPages);
    let text = "";
    let pagesRead = 0;
    const ocrRequiredPages: number[] = [];
    let truncated = document.numPages > pagesToRead;
    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      pagesRead = pageNumber;
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => item && typeof item === "object" && "str" in item && typeof item.str === "string" ? item.str : "")
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (!pageText) {
          // Inspect parsed operators without rendering. This separates image-only/scanned
          // content that needs OCR from a genuinely blank/textless PDF where OCR is not implied.
          const operators = await page.getOperatorList();
          const pdfOps = (await loadPdfJsForTextOnlyUse()).OPS as unknown as Record<string, number>;
          const imageOperatorNames = [
            "paintImageXObject",
            "paintInlineImageXObject",
            "paintImageMaskXObject",
            "paintImageMaskXObjectGroup",
            "paintImageXObjectRepeat",
            "paintSolidColorImageMask",
          ];
          const imageOperatorIds = new Set(imageOperatorNames.map((name) => pdfOps[name]).filter((id): id is number => typeof id === "number"));
          if (operators.fnArray.some((operator) => imageOperatorIds.has(operator))) ocrRequiredPages.push(pageNumber);
          continue;
        }

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
      pagesRead,
      totalPages: document.numPages,
      truncated,
      ocrRequired: ocrRequiredPages.length > 0,
      ocrRequiredPages,
    };
  } catch (error) {
    if (error instanceof PdfTextExtractionError) throw error;
    throw new PdfTextExtractionError(classifyPdfTextExtractionFailure(error));
  } finally {
    // Text extraction doesn't need the parser to retain document buffers after the result is built.
    await loadingTask.destroy().catch(() => undefined);
  }
}
