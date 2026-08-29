import 'dotenv/config';
import { renderPdfToImages } from '../pdf-image';
import { extractPayrollFromImages } from '../extract';
import { validate } from '../validate';

const path = process.argv[2] ?? 'fixtures/pdf/sample-03.pdf';
const scale = Number(process.argv[3] ?? 2);

console.log(`Rendering ${path} at scale ${scale}...`);
const images = await renderPdfToImages(path, scale);
console.log(`${images.length} page(s) rendered\n`);

const result = await extractPayrollFromImages(images);
console.log(JSON.stringify(result, null, 2));

const validation = validate(result);
console.log('\n--- validation ---');
console.log('Passed:', validation.passed);
for (const f of validation.findings) {
  console.log(`[${f.severity.toUpperCase()}] ${f.code} @ ${f.path}`);
  console.log(`  ${f.message}`);
}