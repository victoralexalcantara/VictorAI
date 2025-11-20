'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { SendHorizonal, Loader, Stars, X, Plus, Mic, Wand2, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScrollAreaRef } from '@/components/ui/scroll-area';
import { Message } from './message';
import { getAiResponse, uploadAndProcessFile } from '@/app/actions';
import type { ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type FilePreview = {
  id: string;
  dataUri: string;
  name: string;
  type: string;
};

// Este es el componente principal para la interfaz de chat.
export function ChatInterface() {
  // Estados para manejar los mensajes, la entrada del usuario y el estado de carga.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<ScrollAreaRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { speak, isSpeaking, speakingId } = useTextToSpeech();
  const {
    isRecording,
    startRecording,
    stopRecording,
    transcript,
    error: speechError,
  } = useSpeechToText();
  const prevIsPending = useRef(isPending);

  // Efecto para manejar el texto transcrito
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      // Automatically focus and adjust height after transcription
      const textarea = textareaRef.current;
      if(textarea){
        textarea.focus();
        setTimeout(() => {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }, 0);
      }
    }
  }, [transcript]);

  // Efecto para mostrar errores de la API de voz
  useEffect(() => {
    if (speechError) {
      toast({
        variant: "destructive",
        title: "Error de Voz",
        description: speechError,
      });
    }
  }, [speechError, toast]);

  // Efecto para hacer scroll hacia abajo cuando llegan nuevos mensajes.
  useEffect(() => {
    if (scrollAreaRef.current && scrollAreaRef.current.viewport) {
      const viewport = scrollAreaRef.current.viewport;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Efecto para poner el foco en el textarea al cargar o cuando la IA termina de responder.
  useEffect(() => {
    if (prevIsPending.current && !isPending) {
      textareaRef.current?.focus();
    }
    prevIsPending.current = isPending;
  }, [isPending]);

  // Efecto para poner el foco en el textarea al cargar la página por primera vez.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleFileProcessing = (file: File) => {
    if (!file || isPending) return;

    // Leemos el archivo como un Data URI.
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const fileDataUri = reader.result as string;
      const newFilePreview: FilePreview = {
        id: `${file.name}-${Date.now()}`,
        dataUri: fileDataUri,
        name: file.name,
        type: file.type,
      };
      setFilePreviews(prev => [...prev, newFilePreview]);
    };
  }

  // Maneja el envío del formulario (cuando el usuario envía un mensaje).
  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e && e.preventDefault) e.preventDefault();
    if ((!input.trim() && filePreviews.length === 0) || isPending) return;

    const userInput = input;
    const currentFiles = [...filePreviews];

    // Limpiamos el input y la vista previa
    setInput('');
    setFilePreviews([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
    }

    let userMessageContent = userInput;
    if (currentFiles.length > 0) {
      const fileNames = currentFiles.map(f => f.name).join(', ');
      userMessageContent = `Archivos adjuntos: ${fileNames}\n\n${userInput}`;
    }

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: userMessageContent };
    const assistantMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', isProcessing: true };

    setMessages(prev => [...prev, userMessage, assistantMessage]);

    startTransition(async () => {
      try {
        let aiResponse: string;

        const historyForAI = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(({ role, content }) => ({ role, content }));
            
        historyForAI.push({role: 'user', content: userMessage.content})

        if (currentFiles.length > 0) {
          const fileProcessingPromises = currentFiles.map(file => 
            uploadAndProcessFile(file.dataUri, file.type)
          );
          const results = await Promise.all(fileProcessingPromises);
          const summaries = results.map((result, index) => `Resumen de "${currentFiles[index].name}": ${result.summary}`).join('\n');

          if (userInput.trim()) {
            const combinedInput = `Basado en los siguientes archivos (${currentFiles.map(f => f.name).join(', ')}):\n${summaries}\n\nResponde a lo siguiente: ${userInput}`;
            aiResponse = await getAiResponse(combinedInput, historyForAI.slice(0, -1)); // Pass history without the last user message as it is combined
          } else {
            const fileSummaries = results.map((result, index) => `Archivo "${currentFiles[index].name}" procesado.\n**Resumen:**\n${result.summary}`).join('\n\n');
            aiResponse = `${fileSummaries}\n\nAhora puedes hacer preguntas sobre estos archivos.`;
          }
        } else {
          aiResponse = await getAiResponse(userInput, historyForAI);
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id ? { ...msg, content: aiResponse, isProcessing: false } : msg
          )
        );
      } catch (error) {
        console.error("Error al obtener respuesta de la IA:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener una respuesta. Inténtalo de nuevo.",
        });
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id && msg.id !== userMessage.id));
      } finally {
        textareaRef.current?.focus();
      }
    });
  };

  const removeFile = (id: string) => {
    setFilePreviews(prev => prev.filter(file => file.id !== id));
  };

  // Maneja la subida de archivos.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(handleFileProcessing);
    }
    // Limpiamos el input de archivo para poder subir el mismo archivo de nuevo.
    e.target.value = '';
  };

  // Maneja el evento de presionar Enter para enviar el mensaje, y Shift+Enter para nueva línea.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Hacemos que el textarea crezca automáticamente con el contenido.
    const textarea = e.target;
    textarea.style.height = 'auto'; // Reset the height
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = e.clipboardData.items;
    let filesFound = false;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          filesFound = true;
          handleFileProcessing(file);
        }
      }
    }
    if(filesFound) {
      e.preventDefault();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const initialMessages = [
    {
      id: 'init1',
      role: 'assistant' as const,
      content: '¡Hola! Soy VictorAI, tu asistente creativo. ¿En qué puedo ayudarte hoy?',
    },
  ];

  const currentMessages = messages.length > 0 ? messages : initialMessages;
  const showSendButton = input.trim().length > 0 || filePreviews.length > 0;

  return (
    <div className="flex flex-col flex-1 h-full max-h-[calc(100vh-65px)] bg-background">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto w-full">
          {currentMessages.map((msg) => (
            <Message key={msg.id} message={msg} onPlayAudio={speak} isSpeaking={isSpeaking} speakingId={speakingId} />
          ))}
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t border-border/50 bg-background">
        <div className="max-w-4xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex flex-col w-full bg-card border border-border/50 rounded-2xl p-2 sm:p-3 gap-2">
              
              {filePreviews.length > 0 && (
                <div className='flex gap-2 overflow-x-auto pb-2'>
                  {filePreviews.map((file) => (
                    <div key={file.id} className='relative w-24 h-24 border rounded-md p-1 bg-card shrink-0'>
                      <Image src={file.dataUri} alt={file.name} fill={true} style={{ objectFit: "cover" }} className="rounded-sm" />
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive'
                        onClick={() => removeFile(file.id)}
                      >
                        <X className='h-4 w-4' />
                        <span className='sr-only'>Quitar archivo</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Pregúntale a VictorAI..."
                className="w-full resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base md:text-sm max-h-96 overflow-y-auto"
                rows={1}
                disabled={isPending}
              />

              <div className="flex items-center justify-between h-9">
                <div className="flex items-center gap-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="sr-only">Subir archivo</span>
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,application/pdf,.txt,.doc,.docx"
                    multiple
                  />
                  
                   <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full gap-2 text-muted-foreground"
                      disabled={isPending}
                    >
                      <Wand2 className="w-5 h-5" />
                      <span className="hidden sm:inline">Herramientas</span>
                    </Button>
                </div>

                <div className="flex items-center">
                  {isPending ? (
                     <Button size="icon" className="h-9 w-9 rounded-full bg-primary disabled:bg-primary/50" disabled>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span className="sr-only">Procesando</span>
                     </Button>
                  ) : showSendButton ? (
                    <Button type="submit" size="icon" className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90" >
                      <SendHorizonal className="w-5 h-5" />
                      <span className="sr-only">Enviar</span>
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      variant="ghost"
                      size="icon" 
                      className={cn(
                        "h-9 w-9 rounded-full text-muted-foreground",
                        isRecording && "bg-red-500/20 text-red-500 animate-pulse"
                      )}
                      onClick={handleMicClick}
                    >
                      {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                      <span className="sr-only">{isRecording ? "Detener grabación" : "Usar micrófono"}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
          <div className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-2">
            <Stars className="w-3 h-3" />
            <span>VictorAI puede cometer errores. Considera verificar la información importante.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
