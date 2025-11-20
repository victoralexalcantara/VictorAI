'use client';

import { useState, useCallback, useRef } from 'react';
import { getAudioResponse } from '@/app/actions';

// Este es un "hook" personalizado de React para manejar la funcionalidad de Texto a Voz (Text-to-Speech).
export function useTextToSpeech() {
  // Estado para saber si el navegador está hablando.
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Estado para saber qué mensaje se está reproduciendo.
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // La función principal que convierte texto en voz.
  const speak = useCallback(async (text: string, id: string) => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsSpeaking(false);
      const previousSpeakingId = speakingId;
      setSpeakingId(null);
      if (previousSpeakingId === id) {
        return;
      }
    }

    setIsSpeaking(true);
    setSpeakingId(id);

    try {
      const audioDataUri = await getAudioResponse(text);
      const audio = new Audio(audioDataUri);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingId(null);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        console.error("Error playing audio.");
        setIsSpeaking(false);
        setSpeakingId(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("Error getting audio response:", error);
      setIsSpeaking(false);
      setSpeakingId(null);
    }
  }, [speakingId]); // Dependencias del useCallback.
  
  // Devolvemos las funciones y estados para que otros componentes los puedan usar.
  return { speak, isSpeaking, speakingId };
}
