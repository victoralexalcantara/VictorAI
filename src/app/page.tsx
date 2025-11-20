import { AnimatedTitle } from '@/components/victor-ai/animated-title';
import { ChatInterface } from '@/components/victor-ai/chat-interface';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-center p-4 border-b border-border/50 shadow-sm">
        <AnimatedTitle />
      </header>
      <ChatInterface />
      <Toaster />
    </div>
  );
}
