/**
 * @fileOverview AI response generation using Gemini API.
 *
 * - generateAiResponse - A function that generates AI responses based on user input.
 * - GenerateAiResponseInput - The input type for the generateAiResponse function.
 * - GenerateAiResponseOutput - The return type for the generateAiResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAiResponseInputSchema = z.object({
  userInput: z.string().describe('The user input to generate a response for.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The chat history to maintain context.'),
});

export type GenerateAiResponseInput = z.infer<typeof GenerateAiResponseInputSchema>;

const GenerateAiResponseOutputSchema = z.object({
  response: z.string().describe('The AI generated response.'),
});

export type GenerateAiResponseOutput = z.infer<typeof GenerateAiResponseOutputSchema>;

export async function generateAiResponse(input: GenerateAiResponseInput): Promise<GenerateAiResponseOutput> {
  return generateAiResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAiResponsePrompt',
  input: {schema: GenerateAiResponseInputSchema},
  output: {schema: GenerateAiResponseOutputSchema},
  prompt: `You are VictorAI, a friendly and expert AI assistant. Your goal is to provide clear, structured, and helpful answers.

You MUST format your responses using simple Markdown. Use the following formatting rules:
- Use bold text with asterisks for titles or important terms (e.g., **This is a Title**).
- Use numbered lists (1., 2., 3.) for steps or sequential information.
- Use bulleted lists with a single asterisk (*) for non-sequential items.
- Use code blocks with triple backticks (\\\'\\\'\\\'language\\ncode\\n\\\'\\\'\\\') for code snippets.
- For mathematical formulas, use LaTeX. Wrap block formulas in $$...$$ and inline formulas in $...$.

Respond to the user input below, using the chat history to maintain context.

{% if chatHistory %}
Chat History:
{% each chatHistory %}
{{this.role}}: {{this.content}}
{% endeach %}
{% endif %}

User Input: {{{userInput}}}`,
});

const generateAiResponseFlow = ai.defineFlow(
  {
    name: 'generateAiResponseFlow',
    inputSchema: GenerateAiResponseInputSchema,
    outputSchema: GenerateAiResponseOutputSchema,
  },
  async input => {
    // === INICIO DE LA MODIFICACIÓN ===
    try {
      // COMENTARIO: Intentamos obtener una respuesta real de la IA llamando al prompt.
      // Esta es la operación normal que consume tokens.
      const {output} = await prompt(input);
      return output!;

    } catch (error: any) {
      // COMENTARIO: Si la llamada a la IA falla, entramos en este bloque para manejar el error.

      // COMENTARIO: Verificamos si el mensaje de error indica que hemos excedido la cuota.
      // Buscamos el código de error '429' o la palabra 'quota'.
      const isQuotaError = error.message && (error.message.includes('429') || error.message.toLowerCase().includes('quota'));

      if (isQuotaError) {
        // COMENTARIO: Si el error es por la cuota, activamos la simulación.
        // Imprimimos un mensaje en la consola del servidor para que sepas que se está simulando.
        console.log('==> API Quota Exceeded. Returning a mock AI response. <==');
        
        // COMENTARIO: Devolvemos un objeto con una respuesta falsa (mock).
        // Este mensaje está formateado con Markdown para que puedas probar la interfaz visualmente.
        return {
          response: `**Respuesta Simulada:** ¡Hola! Soy VictorAI.

*   El sistema de IA real está en pausa temporalmente porque se ha alcanzado el límite de solicitudes gratuitas.
*   Esta es una respuesta de ejemplo para que puedas seguir trabajando en la interfaz.
*   Las respuestas reales volverán cuando la cuota se reinicie o cuando decidas habilitar la facturación en tu cuenta de Google AI.

\`\`\`javascript
// ¡El formato de código también funciona!
console.log('Desarrollo sin interrupciones!');
\`\`\``
        };
      } else {
        // COMENTARIO: Si el error es de otro tipo (no relacionado con la cuota), lo relanzamos.
        // Esto permite que el error sea manejado por el sistema general de errores de la aplicación.
        console.error('An unexpected AI error occurred:', error);
        throw error;
      }
    }
    // === FIN DE LA MODIFICACIÓN ===
  }
);
