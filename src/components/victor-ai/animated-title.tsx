'use client';

// Este componente muestra el título "VictorAI" con una animación de revelado y un gradiente de color.
export function AnimatedTitle() {
  const title = 'VictorAI';
  return (
    <h1 className="flex items-center text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
      {/* Dividimos el título en letras para animar cada una por separado. */}
      {title.split('').map((char, index) => (
        <span
          key={index}
          // La clase `inline-block` es crucial para que `clip-path` y `transform` funcionen correctamente.
          className="inline-block animate-reveal-up"
          // Cada letra tiene un pequeño retraso en la animación para un efecto escalonado.
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
}
