/**
 * Route B: render each PDF page to a PNG and send it to the model as an image.
 * This is the path that replaces OCR. Spatial layout is preserved: the model
 * sees columns as columns and an indented continuation row as what it is.
 */
import { pdf } from 'pdf-to-img';
export async function renderPdfToImages(path: string, scale = 2): Promise<string[]> {
  const pages: string[] = [];
  const document = await pdf(path, { scale });

  for await (const page of document) {
    const base64 = Buffer.from(page).toString('base64');
    console.log(`  page rendered: ${(page.length / 1024).toFixed(0)} KB at scale ${scale}`);
    pages.push(base64);
  }

  return pages;
}