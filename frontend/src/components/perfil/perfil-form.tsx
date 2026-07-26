"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updatePerfil } from "@/lib/api";
import { roleLabel } from "@/lib/auth";
import type { User } from "@/types/auth";

const perfilSchema = z
  .object({
    email: z
      .union([z.string().trim().email("Informe um e-mail válido"), z.literal("")])
      .optional(),
    senhaAtual: z.string().optional(),
    novaSenha: z
      .union([z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"), z.literal("")])
      .optional(),
    confirmarSenha: z.string().optional(),
  })
  .refine((data) => !(data.novaSenha && !data.senhaAtual), {
    message: "Informe a senha atual para definir uma nova senha",
    path: ["senhaAtual"],
  })
  .refine((data) => !(data.novaSenha && data.novaSenha !== data.confirmarSenha), {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

type PerfilFormValues = z.infer<typeof perfilSchema>;

interface PerfilFormProps {
  token: string;
  user: User;
}

export function PerfilForm({ token, user }: PerfilFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      email: user.email ?? "",
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: "",
    },
  });

  async function onSubmit(data: PerfilFormValues) {
    setSubmitError(null);
    setSuccessMessage(null);

    const emailAtual = user.email ?? "";
    const emailAlterado = (data.email ?? "") !== emailAtual;
    const trocandoSenha = Boolean(data.novaSenha);

    if (!emailAlterado && !trocandoSenha) {
      setSuccessMessage("Nenhuma alteração para salvar.");
      return;
    }

    try {
      await updatePerfil(
        {
          ...(emailAlterado ? { email: data.email && data.email.length > 0 ? data.email : null } : {}),
          ...(trocandoSenha
            ? { senhaAtual: data.senhaAtual, novaSenha: data.novaSenha }
            : {}),
        },
        token
      );

      setSuccessMessage("Perfil atualizado com sucesso.");
      reset({
        email: data.email ?? "",
        senhaAtual: "",
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

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border/70 bg-card/40 p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Minha conta
      </p>
      <h2 className="mt-1 font-display text-2xl text-foreground">
        Dados do perfil
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <div className="space-y-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-champagne/80">
            <UserIcon className="size-3.5" />
            Identificação
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={user.nome} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" value={roleLabel(user.role)} disabled readOnly />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">E-mail (opcional)</Label>
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
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-champagne/80">
            <KeyRound className="size-3.5" />
            Trocar senha
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <Input
                id="senhaAtual"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.senhaAtual)}
                {...register("senhaAtual")}
              />
              {errors.senhaAtual ? (
                <p className="text-xs text-destructive">
                  {errors.senhaAtual.message}
                </p>
              ) : null}
            </div>

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
              <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
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
            Deixe os campos de senha em branco para não alterá-la.
          </p>
        </div>

        {submitError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-status-done/30 bg-status-done/10 px-3 py-2 text-sm text-status-done">
            {successMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
