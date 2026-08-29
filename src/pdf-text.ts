/**
 * Route A: extract the PDF's text layer and feed it to the model as plain text.
 * Equivalent to a PdfPig-based pipeline. Fast and cheap, but all spatial
 * information — column positions, row alignment — is lost in the conversion.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  const pdf = await getDocument({ data }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Naive join: every text item separated by a space, in reading order.
    // This is exactly where layout is destroyed.
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    pages.push(text);
  }

  return pages.join('\n\n');
}