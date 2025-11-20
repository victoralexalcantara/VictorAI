'use client';

// Este componente muestra el título "VictorAI" con una animación.
export function AnimatedTitle() {
  const title = 'VictorAI';
  return (
    <h1 className="flex items-center text-2xl font-headline font-bold text-primary">
      {/* Dividimos el título en letras para animar cada una por separado. */}
      {title.split('').map((char, index) => (
        <span
          key={index}
          className="animate-fade-in-up opacity-0"
          // Cada letra tiene un pequeño retraso en la animación para un efecto escalonado.
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
}
