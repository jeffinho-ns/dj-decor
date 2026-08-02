"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, LogOut, Mail, Phone, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { logout, updatePerfil } from "@/lib/api";
import { clearClientToken, getClientToken, roleLabel } from "@/lib/auth";
import type { User } from "@/types/auth";

const perfilSchema = z
  .object({
    email: z
      .union([z.string().trim().email("Informe um e-mail válido"), z.literal("")])
      .optional(),
    telefone: z.union([z.string().trim().max(30), z.literal("")]).optional(),
    novaSenha: z
      .union([z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"), z.literal("")])
      .optional(),
    confirmarSenha: z.string().optional(),
  })
  .refine(
    (data) => !(data.novaSenha && data.novaSenha !== data.confirmarSenha),
    {
      message: "As senhas não coincidem",
      path: ["confirmarSenha"],
    }
  )
  .refine((data) => !(data.confirmarSenha && !data.novaSenha), {
    message: "Informe a nova senha",
    path: ["novaSenha"],
  });

type PerfilFormValues = z.infer<typeof perfilSchema>;

interface PerfilFormProps {
  token: string;
  user: User;
}

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function PerfilForm({ token, user }: PerfilFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      email: user.email ?? "",
      telefone: user.telefone ?? "",
      novaSenha: "",
      confirmarSenha: "",
    },
  });

  async function onSubmit(data: PerfilFormValues) {
    setSubmitError(null);
    setSuccessMessage(null);

    const emailAtual = user.email ?? "";
    const telefoneAtual = user.telefone ?? "";
    const emailAlterado = (data.email ?? "") !== emailAtual;
    const telefoneAlterado = (data.telefone ?? "") !== telefoneAtual;
    const trocandoSenha = Boolean(data.novaSenha);

    if (!emailAlterado && !telefoneAlterado && !trocandoSenha) {
      setSuccessMessage("Nenhuma alteração para salvar.");
      return;
    }

    try {
      await updatePerfil(
        {
          ...(emailAlterado
            ? { email: data.email && data.email.length > 0 ? data.email : null }
            : {}),
          ...(telefoneAlterado
            ? {
                telefone:
                  data.telefone && data.telefone.length > 0
                    ? data.telefone
                    : null,
              }
            : {}),
          ...(trocandoSenha ? { novaSenha: data.novaSenha } : {}),
        },
        token
      );

      setSuccessMessage(
        trocandoSenha
          ? "Perfil atualizado. No próximo login use a nova senha."
          : "Perfil atualizado com sucesso."
      );
      reset({
        email: data.email ?? "",
        telefone: data.telefone ?? "",
        novaSenha: "",
        confirmarSenha: "",
      });
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o perfil"
      );
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    const t = getClientToken();
    try {
      await logout(t);
    } finally {
      clearClientToken();
      router.push("/login");
      router.refresh();
    }
  }

  const cargo = roleLabel(user.role, user.nome);
  const semEmail = !user.email;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl p-5 sm:p-6 neo-sm">
        <div className="flex items-start gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl font-display text-xl text-balloon-pink neo-sun"
            aria-hidden
          >
            {iniciais(user.nome) || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Identidade
            </p>
            <h2 className="mt-1 truncate font-display text-2xl text-foreground">
              {user.nome}
            </h2>
            <p className="mt-0.5 text-sm text-balloon-sky">{cargo}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Login com o <span className="font-medium text-foreground">nome</span>{" "}
              — senha definida por você ou pela gestão.
            </p>
            {semEmail ? (
              <p className="mt-2 rounded-xl bg-balloon-sun/10 px-3 py-2 text-xs text-balloon-sun">
                Adicione um e-mail abaixo para recuperação e avisos futuros.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="rounded-2xl p-6 sm:p-8 neo-sm">
        <div className="flex items-center gap-2">
          <span className="balloon-dot bg-balloon-pink" />
          <span className="balloon-dot bg-balloon-sky" />
          <span className="balloon-dot bg-balloon-sun" />
        </div>
        <p className="mt-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Minha conta
        </p>
        <h2 className="mt-1 font-display text-2xl text-foreground">
          Dados do perfil
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div className="space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-balloon-pink uppercase">
              <UserIcon className="size-3.5" />
              Contato
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  E-mail (opcional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="telefone" className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  WhatsApp / telefone
                </Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(11) 99999-0000"
                  aria-invalid={Boolean(errors.telefone)}
                  {...register("telefone")}
                />
                <p className="text-[11px] text-muted-foreground">
                  Para a equipe te achar rápido no dia da festa.
                </p>
                {errors.telefone ? (
                  <p className="text-xs text-destructive">
                    {errors.telefone.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-balloon-lilac uppercase">
              <KeyRound className="size-3.5" />
              Trocar senha
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.novaSenha)}
                  {...register("novaSenha")}
                />
                {errors.novaSenha ? (
                  <p className="text-xs text-destructive">
                    {errors.novaSenha.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Repetir nova senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmarSenha)}
                  {...register("confirmarSenha")}
                />
                {errors.confirmarSenha ? (
                  <p className="text-xs text-destructive">
                    {errors.confirmarSenha.message}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deixe em branco para manter a senha atual. Mínimo 6 caracteres.
            </p>
          </div>

          {submitError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive neo-inset">
              {submitError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-balloon-mint/30 bg-balloon-mint/10 px-3 py-2 text-sm text-balloon-mint neo-inset">
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
              className="text-muted-foreground"
            >
              <LogOut data-icon="inline-start" />
              {loggingOut ? "Saindo…" : "Sair da conta"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
