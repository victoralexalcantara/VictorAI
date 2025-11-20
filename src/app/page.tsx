'use client';

import { AnimatedTitle } from '@/components/victor-ai/animated-title';
import { ChatInterface } from '@/components/victor-ai/chat-interface';
import { Toaster } from '@/components/ui/toaster';
import { useVisualViewportHeight } from '@/hooks/use-visual-viewport-height';

export default function Home() {
  // This hook will measure the real viewport height using the visualViewport API
  // and set it as a CSS variable, which is the most robust way to handle this.
  useVisualViewportHeight();
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-center p-4 border-b border-border/50 shadow-sm">
        <AnimatedTitle />
      </header>
      <ChatInterface />
      <Toaster />
    </div>
  );
}
