'use client';

import { useState, useRef, useCallback } from 'react';
import { getTranscription } from '@/app/actions';

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 2000; // 2 segundos de silencio

export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);


  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    // La lógica de limpieza se mueve al 'onstop' del mediaRecorder para asegurar la finalización del procesamiento.
  }, []);
  
  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if(sourceRef.current){
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  },[]);


  const startRecording = useCallback(async () => {
    setTranscript('');
    setError('');
    if (mediaRecorderRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
           console.warn("No audio chunks recorded.");
           cleanup();
           return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
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
          } finally {
            cleanup();
          }
        };
      };

      const detectSilence = () => {
        if (!analyserRef.current || !dataArrayRef.current) {
          return;
        }
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const maxVolume = Math.max(...dataArrayRef.current) / 255;

        if (maxVolume < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stopRecording();
            }, SILENCE_DURATION);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
        animationFrameRef.current = requestAnimationFrame(detectSilence);
      };

      mediaRecorder.start();
      setIsRecording(true);
      detectSilence();

    } catch (err) {
      console.error('Microphone access error:', err);
      setError('No se pudo acceder al micrófono. Por favor, comprueba los permisos en tu navegador.');
      cleanup();
    }
  }, [stopRecording, cleanup]);


  return { isRecording, startRecording, stopRecording, transcript, error };
}
