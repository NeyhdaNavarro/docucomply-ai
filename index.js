// Loads variables from .env into process.env
import 'dotenv/config';

// Official Anthropic SDK client
import Anthropic from '@anthropic-ai/sdk';

// The client reads ANTHROPIC_API_KEY from the environment automatically,
// which is why the key never appears in source code.
const client = new Anthropic();

console.log('Sending prompt to Claude...\n');

const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',  // cheapest and fastest tier
  max_tokens: 300,                      // hard cap on output = cost control
  messages: [
    {
      role: 'user',
      content: 'Explain in two sentences what a token is in a language model.',
    },
  ],
});

// content is an ARRAY of blocks, not a string
console.log(response.content[0].text);

console.log('\n--- usage ---');
console.log('Input tokens: ', response.usage.input_tokens);
console.log('Output tokens:', response.usage.output_tokens);

const cost =
  (response.usage.input_tokens / 1_000_000) * 1 +
  (response.usage.output_tokens / 1_000_000) * 5;

console.log('Approx. cost: $' + cost.toFixed(6), 'USD');