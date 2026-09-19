import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DJ festas | Gestão de Festas",
    short_name: "DJ festas",
    description:
      "Agenda, montagem, atendimento e financeiro da DJ festas no seu celular.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    // standalone = abre sem barra do navegador, em tela cheia.
    display: "standalone",
    orientation: "portrait",
    background_color: "#e9edf5",
    theme_color: "#ff5c8a",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Atalhos no toque longo do ícone (Android e iOS 17+).
    shortcuts: [
      {
        name: "Montagem de hoje",
        short_name: "Montagem",
        url: "/montagem",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Atendimento",
        short_name: "Inbox",
        url: "/atendimento",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Nova venda",
        short_name: "Nova venda",
        url: "/vendas/nova",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
