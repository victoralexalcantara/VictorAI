'use client';

import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Clipboard, Volume2, Square, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';

// Props (propiedades) que recibe nuestro componente de mensaje.
type MessageProps = {
  message: ChatMessage; // El objeto del mensaje
  onPlayAudio: (text: string, id: string) => void; // Función para reproducir el audio
  isSpeaking: boolean; // Para saber si se está reproduciendo audio
  speakingId: string | null; // El ID del mensaje que se está reproduciendo
};

const renderTextWithMath = (text: string) => {
  // Regex to find all occurrences of $...$ and $$...$$
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const math = part.substring(2, part.length - 2);
      return <BlockMath key={index}>{math}</BlockMath>;
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.substring(1, part.length - 1);
      return <InlineMath key={index}>{math}</InlineMath>;
    }
    // Render bold text
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((boldPart, boldIndex) =>
        boldPart.startsWith('**') && boldPart.endsWith('**') ? (
          <strong key={`${index}-${boldIndex}`}>{boldPart.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={`${index}-${boldIndex}`}>{boldPart}</React.Fragment>
        )
      )
  });
};

// Este es el componente que muestra un solo mensaje en el chat.
export function Message({ message, onPlayAudio, isSpeaking, speakingId }: MessageProps) {
  const { toast } = useToast(); // Hook para mostrar notificaciones (toasts).
  const isAssistant = message.role === 'assistant'; // Verificamos si el mensaje es del asistente (IA).
  const isUser = message.role === 'user';

  // Función que se ejecuta al hacer clic en el botón de copiar.
  const onCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      description: "Copiado al portapapeles.",
    });
  };

  const renderContent = () => {
    if (isUser) {
      const parts = message.content.split('\n\n');
      const fileAttachment = parts[0].startsWith('Archivos adjuntos:') ? parts[0] : null;
      const textContent = fileAttachment ? parts.slice(1).join('\n\n') : message.content;

      return (
        <>
          {fileAttachment && <p className="text-sm text-muted-foreground italic mb-2">{fileAttachment}</p>}
          {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
        </>
      )
    }

    // Procesa el contenido del asistente para renderizar Markdown, incluyendo LaTeX.
    const blocks = message.content.split(/(\n\n|```[\s\S]*?```)/g).filter(block => block && block.trim() !== '');

    return blocks.map((block, index) => {
      // Bloques de código
      if (block.startsWith('```')) {
        const codeBlock = block.replace(/```/g, '');
        const language = codeBlock.split('\n')[0].trim();
        const code = codeBlock.substring(language.length).trim();
        return (
          <div key={index} className="bg-gray-800 rounded-md my-4">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-900 rounded-t-md">
              <span className="text-xs text-gray-400">{language || 'código'}</span>
              <Button
                variant="ghost"
                size="sm"
                className='h-auto py-1'
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast({ description: "Código copiado." });
                }}
              >
                <Clipboard className="w-4 h-4 mr-2" />
                Copiar
              </Button>
            </div>
            <pre className="p-4 text-sm overflow-x-auto"><code className={`language-${language}`}>{code}</code></pre>
          </div>
        );
      }

      // Listas
      const isList = /^\s*([*-]|\d+\.)\s/.test(block);
      if (isList) {
        const items = block.split('\n').filter(item => item.trim() !== '');
        const ListTag = /^\s*\d+\.\s/.test(items[0]) ? 'ol' : 'ul';
        return (
          <ListTag key={index} className={cn('list-inside my-2 pl-4', ListTag === 'ol' ? 'list-decimal' : 'list-disc')}>
            {items.map((item, itemIndex) => {
              const content = item.replace(/^\s*([*-]|\d+\.)\s/, '');
              return <li key={itemIndex} className="mb-1">{renderTextWithMath(content)}</li>;
            })}
          </ListTag>
        );
      }

      // Párrafos normales (con soporte para LaTeX y negritas)
      return (
        <p key={index} className="whitespace-pre-wrap my-2">
          {renderTextWithMath(block)}
        </p>
      );
    });
  }

  return (
    <div
      className={cn(
        'flex items-start gap-4 py-6 animate-fade-in-up',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && (
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 animate-gradient">
            <Bot className="w-5 h-5 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          // Se agregó la clase `break-words` para asegurar que el texto se ajuste y no se desborde.
          'max-w-xl lg:max-w-3xl text-sm md:text-base break-words',
          isAssistant ? '' : 'rounded-lg px-4 py-3 bg-primary/20'
        )}
      >
        {message.isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Procesando...</span>
          </div>
        ) : (
          renderContent()
        )}
        {isAssistant && !message.isProcessing && message.content && (
          <div className="mt-3 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onCopy}>
              <Clipboard className="w-4 h-4" />
              <span className="sr-only">Copiar</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onPlayAudio(message.content, message.id)}>
              {isSpeaking && speakingId === message.id ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span className="sr-only">Reproducir audio</span>
            </Button>
          </div>
        )}
      </div>
      {!isAssistant && message.role === 'user' && (
        <Avatar className="w-8 h-8">
          <AvatarFallback>
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
