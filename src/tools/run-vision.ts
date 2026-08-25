import 'dotenv/config';
import { renderPdfToImages } from '../pdf-image.js';
import { extractPayrollFromImages } from '../extract.js';
import { validate } from '../validate.js';

const path = process.argv[2] ?? 'fixtures/pdf/sample-03.pdf';

console.log(`Rendering ${path}...`);
const images = await renderPdfToImages(path);
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