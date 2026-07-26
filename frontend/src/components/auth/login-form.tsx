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

const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@djdecor.com", senha: "admin123" },
  { label: "Gerente", email: "gerente@djdecor.com", senha: "gerente123" },
  { label: "Vendedor", email: "vendedor@djdecor.com", senha: "vendedor123" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const { token } = await login(values.email, values.senha);
      setClientToken(token);
      const redirectTo = searchParams.get("from") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível entrar"
      );
    }
  }

  function fillDemo(email: string, senha: string) {
    setValue("email", email);
    setValue("senha", senha);
    setFormError(null);
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
        Entre com suas credenciais para continuar.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@djdecor.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
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
              className="pr-9"
              {...register("senha")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground transition-colors hover:text-foreground"
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
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="group/cta h-11 w-full gap-2 text-sm font-medium shadow-[0_0_0_0_rgba(228,197,138,0)] transition-shadow duration-300 hover:shadow-[0_0_28px_-6px_rgba(228,197,138,0.55)]"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
          )}
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="mt-8 rounded-lg border border-border/70 bg-white/[0.02] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Contas de demonstração
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => fillDemo(account.email, account.senha)}
                className="text-left transition-colors hover:text-champagne"
              >
                <span className="font-medium text-foreground/80">
                  {account.label}:
                </span>{" "}
                {account.email} · {account.senha}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
