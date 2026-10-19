import { describe, expect, it } from "vitest";
import { classifyPdfTextExtractionFailure, extractPdfText, PDF_TEXT_MAX_BYTES } from "./pdf-text-extractor";

function encodePdf(objects: string[]): Uint8Array {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function minimalPdf(text: string): Uint8Array {
  const escapedText = text.replace(/[\\()]/g, "\\$&");
  const chunks = Array.from({ length: Math.max(1, Math.ceil(escapedText.length / 100)) }, (_, index) => escapedText.slice(index * 100, (index + 1) * 100));
  const textOperators = chunks.map((chunk, index) => `(${chunk}) Tj${index + 1 < chunks.length ? "\n0 -15 Td" : ""}`).join("\n");
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n${textOperators}\nET`;
  return encodePdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ]);
}

function imageOnlyPdf(): Uint8Array {
  const content = "q 100 0 0 100 0 0 cm /Im1 Do Q";
  const pixel = "\u0000\u0000\u0000";
  return encodePdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 6 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\n${pixel}\nendstream`,
  ]);
}

function mixedPdfWithImageOnlyFirstPage(): Uint8Array {
  const imageContent = "q 100 0 0 100 0 0 cm /Im1 Do Q";
  const textContent = "BT\n/F1 12 Tf\n72 720 Td\n(Readable second page) Tj\nET";
  const pixel = "\u0000\u0000\u0000";
  return encodePdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 7 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 8 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${Buffer.byteLength(imageContent, "latin1")} >>\nstream\n${imageContent}\nendstream`,
    `<< /Length ${Buffer.byteLength(textContent, "latin1")} >>\nstream\n${textContent}\nendstream`,
    `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\n${pixel}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]);
}
describe("bounded PDF text extraction", () => {
  it("extracts text from a valid one-page PDF without leaking its Node-only import bootstrap", async () => {
    const runtime = globalThis as unknown as { DOMMatrix?: unknown };
    const previousDomMatrix = runtime.DOMMatrix;
    const result = await extractPdfText(minimalPdf("Official filing: Apex Example GmbH"));
    expect(result.text).toContain("[Page 1]");
    expect(result.text).toContain("Official filing: Apex Example GmbH");
    expect(result).toMatchObject({ pagesRead: 1, totalPages: 1, truncated: false });
    expect(runtime.DOMMatrix).toBe(previousDomMatrix);
  });

  it("returns no text for a blank PDF instead of manufacturing content", async () => {
    const result = await extractPdfText(minimalPdf(""));
    expect(result.text).toBe("");
    expect(result).toMatchObject({ pagesRead: 1, totalPages: 1, ocrRequired: false });
  });

  it("fails malformed PDF bytes with a structured parser reason rather than returning an empty document", async () => {
    const malformed = new TextEncoder().encode("%PDF-this-is-not-a-valid-document");
    await expect(extractPdfText(malformed)).rejects.toMatchObject({ reason: "pdf_malformed" });
  });

  it("classifies encrypted and unsupported parser failures explicitly", () => {
    expect(classifyPdfTextExtractionFailure(Object.assign(new Error("No password provided"), { name: "PasswordException" })))
      .toBe("pdf_encrypted");
    expect(classifyPdfTextExtractionFailure(Object.assign(new Error("Unsupported PDF feature"), { name: "UnsupportedFeatureException" })))
      .toBe("pdf_unsupported");
  });

  it("marks image-only PDFs as requiring OCR without manufacturing text", async () => {
    const result = await extractPdfText(imageOnlyPdf());
    expect(result.text).toBe("");
    expect(result).toMatchObject({ pagesRead: 1, totalPages: 1, ocrRequired: true, ocrRequiredPages: [1] });
  });

  it("marks scanned pages OCR-required even when another page has readable text", async () => {
    const result = await extractPdfText(mixedPdfWithImageOnlyFirstPage());
    expect(result.text).toContain("[Page 2] Readable second page");
    expect(result).toMatchObject({ pagesRead: 2, totalPages: 2, ocrRequired: true, ocrRequiredPages: [1] });
  });

  it("caps extracted text and refuses oversized input before parsing", async () => {
    const result = await extractPdfText(minimalPdf("A".repeat(500)), { maxChars: 256 });
    expect(result.text.length).toBeLessThanOrEqual(256);
    expect(result.truncated).toBe(true);
    await expect(extractPdfText(new Uint8Array(PDF_TEXT_MAX_BYTES + 1))).rejects.toThrow(/bounded byte limit/i);
  });
});
