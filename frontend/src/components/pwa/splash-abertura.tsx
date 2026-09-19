"use client";

import { useEffect, useState } from "react";

/**
 * Decide, antes da primeira pintura, se a abertura deve aparecer.
 *
 * Roda inline no <head> para não haver piscada: quando o app está
 * instalado, a tela aparece a cada abertura; no navegador, só uma vez
 * por sessão, para não atrapalhar quem usa no computador.
 */
export const SPLASH_INIT_SCRIPT = `(function(){try{
var app=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
var visto=sessionStorage.getItem('dj-splash')==='1';
var mostrar=app||!visto;
document.documentElement.dataset.splash=mostrar?'1':'0';
if(mostrar){sessionStorage.setItem('dj-splash','1');}
}catch(e){document.documentElement.dataset.splash='0';}})();`;

/** Tempo de exibição antes de começar a sair. */
const DURACAO_MS = 1500;
/** Duração da saída — precisa bater com a animação `splash-sai`. */
const SAIDA_MS = 460;

type Fase = "visivel" | "saindo" | "oculto";

export function SplashAbertura() {
  const [fase, setFase] = useState<Fase>("visivel");

  useEffect(() => {
    if (document.documentElement.dataset.splash !== "1") {
      setFase("oculto");
      return;
    }

    const aoSair = setTimeout(() => setFase("saindo"), DURACAO_MS);
    const aoRemover = setTimeout(
      () => setFase("oculto"),
      DURACAO_MS + SAIDA_MS
    );

    return () => {
      clearTimeout(aoSair);
      clearTimeout(aoRemover);
    };
  }, []);

  if (fase === "oculto") return null;

  return (
    <div
      id="splash-abertura"
      className={fase === "saindo" ? "splash-saindo" : undefined}
      aria-hidden="true"
      role="presentation"
    >
      <div className="splash-conteudo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo-baloes.png"
          alt=""
          className="splash-baloes"
          draggable={false}
        />
        <span className="splash-nome-area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-nome.png"
            alt=""
            className="splash-nome"
            draggable={false}
          />
          <span className="splash-brilho" />
        </span>
      </div>
    </div>
  );
}
