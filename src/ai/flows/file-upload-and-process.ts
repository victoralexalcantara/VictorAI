'use server';

/**
 * @fileOverview Este flujo procesa archivos subidos (texto, documentos, imágenes) para extraer contenido y proporcionar información.
 *  También maneja diferentes tipos de archivos y proporciona un procesamiento adaptado para cada uno.
 *
 * - processFile - Una función que maneja el procesamiento de archivos y la extracción de contenido.
 * - FileUploadInput - El tipo de entrada para la función processFile.
 * - FileUploadOutput - El tipo de retorno para la función processFile.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FileUploadInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "Los datos del archivo subido como una URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  mimeType: z.string().describe('Tipo MIME del archivo subido.'),
});

export type FileUploadInput = z.infer<typeof FileUploadInputSchema>;

const FileUploadOutputSchema = z.object({
  extractedText:
    z.string().describe('El contenido de texto extraído del archivo subido.'),
  summary: z.string().describe('Un resumen del contenido del archivo.'),
});

export type FileUploadOutput = z.infer<typeof FileUploadOutputSchema>;

export async function processFile(input: FileUploadInput): Promise<FileUploadOutput> {
  return fileUploadAndProcessFlow(input);
}

const fileUploadAndProcessPrompt = ai.definePrompt({
  name: 'fileUploadAndProcessPrompt',
  input: {schema: FileUploadInputSchema},
  output: {schema: FileUploadOutputSchema},
  prompt: `Eres un asistente de IA que analiza el contenido de los archivos subidos, incluyendo texto, documentos e imágenes. Extraerás el contenido y proporcionarás un resumen.

  El archivo tiene el siguiente tipo MIME: {{{mimeType}}}.

  Aquí está el contenido del archivo: {{media url=fileDataUri}}

  Resumen:
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
