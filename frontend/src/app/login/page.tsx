import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar | DJ Decor",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col lg:flex-row">
      {/* Lado visual — atmosfera de salão à meia-luz, sem depender de foto externa */}
      <section className="relative flex min-h-[38vh] flex-1 items-center overflow-hidden px-8 py-14 sm:px-14 lg:min-h-screen lg:px-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-ambient absolute -left-28 -top-24 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(228,197,138,0.22),transparent_65%)] blur-3xl" />
          <div
            className="animate-ambient absolute -bottom-32 right-[-10%] size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(224,122,95,0.16),transparent_65%)] blur-3xl"
            style={{ animationDelay: "2.4s" }}
          />
          <div className="animate-shimmer absolute inset-x-0 top-[62%] h-px opacity-40" />
        </div>

        <div className="relative z-10 max-w-xl">
          <p
            className="animate-fade-up text-xs font-medium uppercase tracking-[0.32em] text-champagne/80"
            style={{ animationDelay: "0.05s" }}
          >
            Gestão de festas &amp; decoração
          </p>
          <h1
            className="animate-fade-up mt-5 text-balance font-display text-6xl leading-[0.95] text-foreground sm:text-7xl lg:text-8xl"
            style={{ animationDelay: "0.15s" }}
          >
            DJ <span className="text-champagne">Decor</span>
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-md text-lg leading-relaxed text-foreground/70"
            style={{ animationDelay: "0.3s" }}
          >
            Cada orçamento, cada festa, cada salão iluminado — tudo reunido
            à meia-luz do seu painel.
          </p>
        </div>
      </section>

      {/* Painel de acesso */}
      <section className="relative flex flex-1 items-center justify-center border-t border-border/60 bg-[#0b1524]/70 px-6 py-14 sm:px-10 lg:max-w-md lg:border-l lg:border-t-0">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
