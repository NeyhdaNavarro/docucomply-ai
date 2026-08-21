// Carga las variables del archivo .env hacia process.env
import 'dotenv/config';

// Importa el cliente oficial de Anthropic
import Anthropic from '@anthropic-ai/sdk';

// El cliente busca ANTHROPIC_API_KEY en el entorno automáticamente.
// Por eso la llave nunca aparece en el código.
const client = new Anthropic();

console.log('Enviando pregunta a Claude...\n');

const respuesta = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',  // el más barato y rápido
  max_tokens: 300,                      // tope de la respuesta = control de costo
  messages: [
    {
      role: 'user',
      content: 'Explícame en dos frases qué es un token en un modelo de lenguaje.',
    },
  ],
});

// content es un ARREGLO de bloques, no un string
console.log(respuesta.content[0].text);

console.log('\n--- consumo ---');
console.log('Tokens de entrada:', respuesta.usage.input_tokens);
console.log('Tokens de salida: ', respuesta.usage.output_tokens);

const costo =
  (respuesta.usage.input_tokens / 1_000_000) * 1 +
  (respuesta.usage.output_tokens / 1_000_000) * 5;

console.log('Costo aproximado: $' + costo.toFixed(6), 'USD');