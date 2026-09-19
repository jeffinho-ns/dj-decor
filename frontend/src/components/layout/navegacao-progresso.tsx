"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra fina no topo enquanto a próxima tela carrega.
 * Só CSS + um flag — sem biblioteca, não pesa em celular antigo.
 */
export function NavegacaoProgresso() {
  const pathname = usePathname();
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    setAtivo(false);
  }, [pathname]);

  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      if (evento.defaultPrevented) return;
      if (evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
        return;
      }

      const alvo = (evento.target as Element | null)?.closest?.("a[href]");
      if (!(alvo instanceof HTMLAnchorElement)) return;

      const href = alvo.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (alvo.target === "_blank" || alvo.hasAttribute("download")) return;

      try {
        const url = new URL(alvo.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      setAtivo(true);
    }

    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  if (!ativo) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2.5px] overflow-hidden"
      aria-hidden="true"
      role="presentation"
    >
      <div className="rota-progresso h-full w-full origin-left rounded-r-full bg-gradient-to-r from-balloon-pink via-balloon-sky to-balloon-sun" />
    </div>
  );
}
