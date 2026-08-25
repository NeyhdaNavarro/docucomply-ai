/**
 * Route B: render each PDF page to a PNG and send it to the model as an image.
 * This is the path that replaces OCR. Spatial layout is preserved: the model
 * sees columns as columns and an indented continuation row as what it is.
 */
import { pdf } from 'pdf-to-img';

export async function renderPdfToImages(path: string): Promise<string[]> {
  const pages: string[] = [];
  // Scale 2 roughly doubles resolution: better small-digit legibility,
  // at the cost of more image tokens per page.
  const document = await pdf(path, { scale: 4 });

  for await (const page of document) {
    pages.push(Buffer.from(page).toString('base64'));
  }

  return pages;
}