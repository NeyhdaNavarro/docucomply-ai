import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { payrollTool } from './schema.js';
import type { PayrollDocument } from './types.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You extract structured data from Mexican IMSS/SUA payroll documents.

Rules:
- Transcribe values exactly as printed. Do not normalize, round or reformat.
- Stated totals and subtotals must be copied from the document, never recalculated.
- If a required field is absent or unreadable, list its name in missingFields and do not invent a value.

- Report every inference in anomalies. Reconstructing a split row, separating run-together numbers, or ignoring a value in an unexpected position all count as inference, even when you are confident.`;

export async function extractPayroll(documentText: string): Promise<PayrollDocument> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    temperature: 0,          // deterministic: same input should give same output
    system: SYSTEM_PROMPT,
    tools: [payrollTool],
    tool_choice: { type: 'tool', name: 'record_payroll_document' },
    messages: [{ role: 'user', content: documentText }],
  });

  // With tool_choice forced, the model must answer with a tool_use block.
  const toolUse = response.content.find((block) => block.type === 'tool_use');

  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Model did not return a tool_use block');
  }

  console.log('--- usage ---');
  console.log('Input tokens: ', response.usage.input_tokens);
  console.log('Output tokens:', response.usage.output_tokens);

  return toolUse.input as PayrollDocument;
}

// Run directly for a quick manual check
import { validate } from './validate.js';

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

