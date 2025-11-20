'use server';

/**
 * @fileOverview This flow processes uploaded files (text, documents, images) to extract content and provide insights.
 *  It also handles different file types and provides tailored processing for each.
 *
 * - processFile - A function that handles file processing and content extraction.
 * - FileUploadInput - The input type for the processFile function.
 * - FileUploadOutput - The return type for the processFile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FileUploadInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      'The uploaded file data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected the expected format
    ),
  mimeType: z.string().describe('MIME type of the uploaded file.'),
});

export type FileUploadInput = z.infer<typeof FileUploadInputSchema>;

const FileUploadOutputSchema = z.object({
  extractedText:
    z.string().describe('The extracted text content from the uploaded file.'),
  summary: z.string().describe('A summary of the file content.'),
});

export type FileUploadOutput = z.infer<typeof FileUploadOutputSchema>;

export async function processFile(input: FileUploadInput): Promise<FileUploadOutput> {
  return fileUploadAndProcessFlow(input);
}

const fileUploadAndProcessPrompt = ai.definePrompt({
  name: 'fileUploadAndProcessPrompt',
  input: {schema: FileUploadInputSchema},
  output: {schema: FileUploadOutputSchema},
  prompt: `You are an AI assistant that analyzes the content of uploaded files, including text, documents and images. You will extract content and provide a summary.

  The file has the following MIME type: {{{mimeType}}}.

  Here is the file content: {{media url=fileDataUri}}

  Summary:
  `,
});

const fileUploadAndProcessFlow = ai.defineFlow(
  {
    name: 'fileUploadAndProcessFlow',
    inputSchema: FileUploadInputSchema,
    outputSchema: FileUploadOutputSchema,
  },
  async input => {
    const {output} = await fileUploadAndProcessPrompt(input);
    return output!;
  }
);
