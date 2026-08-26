import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
//import { readFileSync } from 'node:fs';
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

/**
 * Same schema, same rules, image input instead of text.
 * Kept as a separate function so both routes can be measured independently.
 */
export async function extractPayrollFromImages(
  images: string[],
): Promise<PayrollDocument> {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    tools: [payrollTool],
    tool_choice: { type: 'tool', name: 'record_payroll_document' },
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((data) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: 'image/png' as const, data },
          })),
          {
            type: 'text' as const,
            text: 'Extract the payroll document shown in these page images.',
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');

  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Model did not return a tool_use block');
  }

  console.log('--- usage (vision) ---');
  console.log('Input tokens: ', response.usage.input_tokens);
  console.log('Output tokens:', response.usage.output_tokens);

  return toolUse.input as PayrollDocument;
}


