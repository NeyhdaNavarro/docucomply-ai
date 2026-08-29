import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { extractPayroll } from './extract';
import { validate } from './validate';

const fixture = process.argv[2] ?? 'fixtures/sample-01.txt';
const text = readFileSync(fixture, 'utf-8');

const result = await extractPayroll(text);
console.log(JSON.stringify(result, null, 2));

const validation = validate(result);

console.log('\n--- validation ---');
console.log('Passed:', validation.passed);

for (const finding of validation.findings) {
  console.log(`[${finding.severity.toUpperCase()}] ${finding.code} @ ${finding.path}`);
  console.log(`  ${finding.message}`);
}

if (validation.findings.length === 0) {
  console.log('No findings.');
}