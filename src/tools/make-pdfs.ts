/**
 * Generates PDFs from the plain-text fixtures so the pipeline can be tested
 * against real files instead of pre-extracted text.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const SOURCE = 'fixtures';
const OUTPUT = 'fixtures/pdf';

if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true });

const files = readdirSync(SOURCE).filter((f) => f.endsWith('.txt'));

for (const file of files) {
  const text = readFileSync(`${SOURCE}/${file}`, 'utf-8');

  const pdf = await PDFDocument.create();
  // Courier is monospaced: column alignment survives, like a real SUA printout.
  const font = await pdf.embedFont(StandardFonts.Courier);

  const page = pdf.addPage([612, 792]); // US Letter
  const fontSize = 8;
  const lineHeight = 11;
  let y = 792 - 50;

  for (const line of text.split('\n')) {
    page.drawText(line, { x: 40, y, size: fontSize, font });
    y -= lineHeight;
  }

  const name = file.replace('.txt', '.pdf');
  writeFileSync(`${OUTPUT}/${name}`, await pdf.save());
  console.log(`created ${OUTPUT}/${name}`);
}