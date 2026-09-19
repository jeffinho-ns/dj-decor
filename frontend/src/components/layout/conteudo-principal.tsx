"use client";

import { usePathname } from "next/navigation";

/**
 * Área de conteúdo do shell. A `key` pelo pathname faz o React remontar a
 * região a cada troca de tela, disparando a animação de entrada — é o que
 * dá a sensação de transição em vez de "a página piscou e trocou".
 */
export function ConteudoPrincipal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main
      key={pathname}
      className="page-enter relative z-10 min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-nav sm:px-4 md:px-8 md:py-6 md:pb-6"
    >
      {children}
    </main>
  );
}
