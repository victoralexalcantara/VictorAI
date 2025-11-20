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
- Use code blocks with triple backticks ('''language\ncode\n''') for code snippets.
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
    const {output} = await prompt(input);
    return output!;
  }
);
