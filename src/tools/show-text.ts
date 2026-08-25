import { extractTextFromPdf } from '../pdf-text.js';

const path = process.argv[2] ?? 'fixtures/pdf/sample-03.pdf';
const text = await extractTextFromPdf(path);

console.log('--- extracted text ---');
console.log(text);
console.log('--- end ---');
console.log(`\n${text.length} characters`);