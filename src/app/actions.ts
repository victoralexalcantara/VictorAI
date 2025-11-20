'use server';

import { generateAiResponse } from '@/ai/flows/generate-ai-responses';
import { processFile } from '@/ai/flows/file-upload-and-process';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { transcribeAudio } from '@/ai/flows/transcribe-chat-text';
import type { ChatMessage } from '@/lib/types';
import { z } from 'zod';

const chatHistorySchema = z.array(z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
}));

export async function getAiResponse(userInput: string, history: Omit<ChatMessage, 'id' | 'isProcessing'>[]) {
  // Validamos el historial para asegurarnos de que cumple con el esquema esperado.
  const validatedHistory = chatHistorySchema.parse(history);
  
  // Esta es la función que llama a la IA de Gemini para obtener una respuesta.
  // Le pasamos lo que escribió el usuario y el historial de la conversación.
  const result = await generateAiResponse({ userInput, chatHistory: validatedHistory });
  return result.response;
}

export async function uploadAndProcessFile(fileDataUri: string, mimeType: string) {
  // Esta función procesa el archivo que el usuario sube.
  // Llama a una función de IA que extrae texto y resume el archivo.
  const result = await processFile({ fileDataUri, mimeType });
  return result;
}

export async function getAudioResponse(text: string) {
  const result = await textToSpeech(text);
  return result.media;
}

export async function getTranscription(audioDataUri: string, context?: string) {
  const result = await transcribeAudio({ audioDataUri, context });
  return result.transcription;
}
