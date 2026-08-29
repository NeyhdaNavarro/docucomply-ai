import { readFileSync } from 'node:fs';
import { extractTextFromPdf } from '../pdf-text';

const path = process.argv[2] ?? 'fixtures/pdf/sample-03.pdf';
const data = new Uint8Array(readFileSync(path));
const text = await extractTextFromPdf(data);

console.log('--- extracted text ---');
console.log(text);
console.log('--- end ---');
console.log(`\n${text.length} characters`);