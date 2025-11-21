'use server';
/**
 * @fileOverview Flow for transcribing audio using the Gemini API.
 *
 * - transcribeAudio - Function to transcribe audio.
 * - TranscribeAudioInput - Input type for the transcribeAudio function.
 * - TranscribeAudioOutput - Output type for the transcribeAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to transcribe, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  context: z
    .string()
    .optional()
    .describe('Context of the conversation to help with transcription accuracy.'),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcription: z
    .string()
    .describe('The transcribed text from the audio, incorporating context.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const transcribeAudioPrompt = ai.definePrompt({
  name: 'transcribeAudioPrompt',
  input: {schema: TranscribeAudioInputSchema},
  output: {schema: TranscribeAudioOutputSchema},
  prompt: `Transcribe the following audio. If context is provided, use it to improve accuracy. Your response must be only the transcribed text, without any formatting or timestamps.\n\nContext: {{{context}}}\n\nAudio: {{media url=audioDataUri}}`,
});

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async input => {
    const {output} = await transcribeAudioPrompt(input);
    return output!;
  }
);
