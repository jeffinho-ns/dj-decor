import { CloudOff } from "lucide-react";

export const metadata = {
  title: "Sem conexão | DJ festas",
};

export default function OfflinePage() {
  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl neo px-6 py-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl neo-sm text-balloon-sky">
          <CloudOff className="size-8" />
        </div>

        <h1 className="mt-5 font-display text-xl text-foreground">
          Você está sem sinal
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O app continua aberto. O que você marcar fica guardado no aparelho e
          sobe sozinho assim que a internet voltar.
        </p>

        <div className="mt-5 flex justify-center gap-1.5">
          <span className="balloon-dot bg-balloon-pink" />
          <span className="balloon-dot bg-balloon-sky" />
          <span className="balloon-dot bg-balloon-sun" />
          <span className="balloon-dot bg-balloon-mint" />
        </div>
      </div>
    </div>
  );
}
