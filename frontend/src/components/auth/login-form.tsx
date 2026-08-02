"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";
import { setClientToken } from "@/lib/auth";
import { HOME_COOKIE, resolveHomePath } from "@/lib/prefs";

const loginSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome"),
  senha: z.string().min(1, "Informe a senha"),
});

type LoginValues = z.infer<typeof loginSchema>;

function readHomeCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${HOME_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nome: "", senha: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const { token, user } = await login(values.nome, values.senha);
      setClientToken(token);
      const defaultRoute = resolveHomePath(user.role, readHomeCookie());
      const from = searchParams.get("from");
      const blockedForMontador =
        user.role === "MONTADOR" &&
        from !== null &&
        (from.startsWith("/vendas") || from.startsWith("/dashboard"));
      const redirectTo =
        from && !blockedForMontador ? from : defaultRoute;
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível entrar"
      );
    }
  }

  return (
    <div
      className="animate-fade-up w-full max-w-sm"
      style={{ animationDelay: "0.2s" }}
    >
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
        Acesso ao painel
      </p>
      <h2 className="mt-2 font-display text-3xl text-foreground">
        Bem-vindo de volta
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Entre com seu nome e senha para continuar.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            type="text"
            placeholder="Seu nome"
            autoComplete="username"
            aria-invalid={Boolean(errors.nome)}
            className="min-h-[var(--touch-min,44px)] text-base"
            {...register("nome")}
          />
          {errors.nome ? (
            <p className="text-xs text-destructive">{errors.nome.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <div className="relative">
            <Input
              id="senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.senha)}
              className="min-h-[var(--touch-min,44px)] pr-12 text-base"
              {...register("senha")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.senha ? (
            <p className="text-xs text-destructive">{errors.senha.message}</p>
          ) : null}
        </div>

        {formError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="group/cta w-full gap-2 text-base"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
          )}
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
