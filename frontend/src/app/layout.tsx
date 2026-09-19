import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import {
  SPLASH_INIT_SCRIPT,
  SplashAbertura,
} from "@/components/pwa/splash-abertura";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  arquivoSplash,
  mediaSplash,
  SPLASHES_IOS,
} from "@/lib/splash-ios";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DJ festas | Gestão de Festas",
  description: "Sistema de gestão de agendamento de decorações de festas",
  applicationName: "DJ festas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Faz o iOS abrir em tela cheia quando instalado na tela de início.
  appleWebApp: {
    capable: true,
    title: "DJ festas",
    statusBarStyle: "black-translucent",
  },
  // Evita o iOS transformar números de OS e valores em links de telefone.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9edf5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f2e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fredoka.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          O Next emite só `mobile-web-app-capable`. iOS anterior ao 17.4 ainda
          depende da tag legada para abrir em tela cheia quando instalado.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {SPLASHES_IOS.map((tela) => (
          <link
            key={arquivoSplash(tela) + tela.densidade}
            rel="apple-touch-startup-image"
            media={mediaSplash(tela)}
            href={arquivoSplash(tela)}
          />
        ))}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: SPLASH_INIT_SCRIPT }}
        />
      </head>
      <body className="relative z-0 antialiased">
        <SplashAbertura />
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
