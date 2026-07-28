import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar | DJ Decor",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col lg:min-h-screen lg:flex-row">
      {/* Formulário primeiro no mobile — uso com polegar */}
      <section className="relative order-1 flex flex-1 items-center justify-center px-4 py-8 safe-top sm:px-8 sm:py-10 lg:order-2 lg:max-w-md lg:border-l lg:border-border/60 lg:px-10 lg:py-14">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>

      {/* Hero compacto no mobile, completo no desktop */}
      <section className="relative order-2 flex min-h-0 flex-none items-center overflow-hidden border-t border-border/60 px-4 py-8 sm:px-8 lg:order-1 lg:min-h-screen lg:flex-1 lg:border-t-0 lg:px-20 lg:py-14">
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
            className="animate-fade-up mt-3 text-balance font-display text-4xl leading-tight text-foreground sm:mt-5 sm:text-6xl sm:leading-[0.95] lg:text-8xl"
            style={{ animationDelay: "0.15s" }}
          >
            DJ <span className="text-champagne">Decoradora</span>
          </h1>
          <p
            className="animate-fade-up mt-4 max-w-md text-base leading-relaxed text-foreground/70 sm:mt-6 sm:text-lg"
            style={{ animationDelay: "0.3s" }}
          >
            Cada orçamento, cada festa, cada salão iluminado — tudo reunido
            à meia-luz do seu painel.
          </p>
        </div>
      </section>
    </main>
  );
}
