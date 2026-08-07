import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar | DJ festas",
};

export default function LoginPage() {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col lg:min-h-screen lg:flex-row">
      <section className="relative order-1 flex flex-1 items-center justify-center px-4 py-8 safe-top safe-bottom sm:px-8 sm:py-10 lg:order-2 lg:max-w-md lg:px-10 lg:py-14">
        <div className="w-full max-w-sm rounded-3xl p-6 neo sm:p-8">
          <div className="mb-5 flex justify-center gap-2 lg:hidden">
            <span className="balloon-dot size-3 bg-balloon-pink animate-float" />
            <span
              className="balloon-dot size-3 bg-balloon-sky animate-float"
              style={{ animationDelay: "0.4s" }}
            />
            <span
              className="balloon-dot size-3 bg-balloon-sun animate-float"
              style={{ animationDelay: "0.8s" }}
            />
            <span
              className="balloon-dot size-3 bg-balloon-mint animate-float"
              style={{ animationDelay: "1.2s" }}
            />
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>

      <section className="relative order-2 flex min-h-0 flex-none items-center overflow-hidden px-4 py-10 sm:px-8 lg:order-1 lg:min-h-screen lg:flex-1 lg:px-20 lg:py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute left-[8%] top-[18%] size-24 rounded-full bg-balloon-pink/30 blur-xl" />
          <div
            className="animate-float absolute right-[12%] top-[12%] size-20 rounded-full bg-balloon-sky/35 blur-xl"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="animate-float absolute bottom-[20%] left-[22%] size-28 rounded-full bg-balloon-sun/30 blur-xl"
            style={{ animationDelay: "1.6s" }}
          />
          <div
            className="animate-float absolute bottom-[28%] right-[18%] size-16 rounded-full bg-balloon-mint/30 blur-xl"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="animate-float absolute left-[48%] top-[40%] size-14 rounded-full bg-balloon-lilac/25 blur-xl"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="relative z-10 max-w-xl">
          <p
            className="animate-fade-up text-xs font-bold uppercase tracking-[0.28em] text-balloon-pink"
            style={{ animationDelay: "0.05s" }}
          >
            Decoração de festas
          </p>
          <h1
            className="animate-fade-up mt-3 text-balance font-display text-4xl leading-tight text-foreground sm:mt-5 sm:text-6xl sm:leading-[0.95] lg:text-8xl"
            style={{ animationDelay: "0.15s" }}
          >
            DJ <span className="text-balloon-pink">festas</span>
          </h1>
          <p
            className="animate-fade-up mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            style={{ animationDelay: "0.3s" }}
          >
            Orçamentos, montagens e estoque coloridos como a festa — tudo no
            seu painel, do celular ao escritório.
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap gap-2"
            style={{ animationDelay: "0.45s" }}
          >
            <span className="rounded-full neo-pink px-3 py-1 text-xs font-semibold">
              Rosa balão
            </span>
            <span className="rounded-full neo-sky px-3 py-1 text-xs font-semibold">
              Azul céu
            </span>
            <span className="rounded-full neo-sun px-3 py-1 text-xs font-semibold">
              Amarelo sol
            </span>
            <span className="rounded-full neo-mint px-3 py-1 text-xs font-semibold">
              Verde menta
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
