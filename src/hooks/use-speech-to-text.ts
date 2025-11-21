'use client';

import { useState, useRef, useCallback } from 'react';
import { getTranscription } from '@/app/actions';

const MimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg'
];

export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string | null>(null);

  const immediateCleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      immediateCleanup();
    }
  }, [immediateCleanup]);

  const startRecording = useCallback(async () => {
    setTranscript('');
    setError('');
    if (mediaRecorderRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      if (!supportedMimeType) {
        setError("No se encontró un formato de audio compatible en este navegador.");
        immediateCleanup();
        return;
      }
      mimeTypeRef.current = supportedMimeType;

      const options = { mimeType: supportedMimeType };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
           console.warn("No audio chunks recorded.");
           return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current || undefined });
        audioChunksRef.current = [];
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const transcription = await getTranscription(base64Audio);
            setTranscript(transcription);
          } catch (e) {
            console.error('Transcription error:', e);
            setError('No se pudo transcribir el audio. Inténtalo de nuevo.');
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error('Microphone access error:', err);
      setError('No se pudo acceder al micrófono. Por favor, comprueba los permisos en tu navegador.');
      immediateCleanup();
      setIsRecording(false);
    }
  }, [immediateCleanup]);


  return { isRecording, startRecording, stopRecording, transcript, error };
}
