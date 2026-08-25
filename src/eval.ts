import 'dotenv/config';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extractPayroll } from './extract.js';
import { compare } from './compare.js';
import type { PayrollDocument } from './types.js';

const FIXTURES = 'fixtures';
const EXPECTED = 'fixtures/expected';
const CACHE = 'cache';

/**
 * Extractions are cached on disk keyed by fixture name.
 * The eval loop is run many times while iterating on the comparison logic;
 * without this, every run costs money for identical results.
 * Delete the cache folder after changing the prompt or the schema.
 */
async function extractCached(name: string, text: string): Promise<PayrollDocument> {
  if (!existsSync(CACHE)) mkdirSync(CACHE);
  const cachePath = `${CACHE}/${name}.json`;

  if (existsSync(cachePath)) {
    console.log(`  (cached)`);
    return JSON.parse(readFileSync(cachePath, 'utf-8')) as PayrollDocument;
  }

  const result = await extractPayroll(text);
  writeFileSync(cachePath, JSON.stringify(result, null, 2));
  return result;
}

const cases = readdirSync(EXPECTED)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));

let totalFields = 0;
let totalCorrect = 0;
const failures: string[] = [];

for (const name of cases) {
  console.log(`\n=== ${name} ===`);

  const text = readFileSync(`${FIXTURES}/${name}.txt`, 'utf-8');
  const expected = JSON.parse(readFileSync(`${EXPECTED}/${name}.json`, 'utf-8')) as PayrollDocument;

  const actual = await extractCached(name, text);
  const result = compare(expected, actual);

  totalFields += result.totalFields;
  totalCorrect += result.correctFields;

  const pct = (result.accuracy * 100).toFixed(1);
  console.log(`  ${result.correctFields}/${result.totalFields} fields correct (${pct}%)`);

  if (result.structuralMismatch) {
    console.log('  STRUCTURAL MISMATCH: rows missing or invented');
  }

  for (const m of result.mismatches) {
    console.log(`  ✗ ${m.path}`);
    console.log(`      expected: ${JSON.stringify(m.expected)}`);
    console.log(`      actual:   ${JSON.stringify(m.actual)}`);
    failures.push(m.path);
  }
}

const overall = totalFields === 0 ? 0 : (totalCorrect / totalFields) * 100;

console.log('\n========================================');
console.log(`Documents evaluated: ${cases.length}`);
console.log(`Field accuracy: ${totalCorrect}/${totalFields} (${overall.toFixed(1)}%)`);
console.log('========================================');