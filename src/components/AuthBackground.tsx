import { ReactNode } from "react";
import { authBackground } from "@/config/background";

interface AuthBackgroundProps {
  children: ReactNode;
}

/**
 * Container full-screen com imagem de fundo centralizada e overlay escuro.
 * Usa background-attachment: fixed no desktop (md+) via classe utilitária.
 * Preserva foco no centro da imagem em qualquer resolução.
 */
export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: `url(${authBackground.image})`,
        backgroundPosition: authBackground.position,
        backgroundSize: authBackground.size,
        backgroundRepeat: authBackground.repeat,
      }}
    >
      {/* Preload hint / decorative image for LCP + acessibilidade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/40 dark:bg-black/60"
      />
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
