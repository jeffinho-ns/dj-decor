"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createFesta } from "@/lib/api";

const novaVendaSchema = z.object({
  nomeCliente: z.string().min(2, "Informe o nome do cliente"),
  telefone: z.string().min(8, "Informe um telefone válido"),
  tema: z.string().min(2, "Informe o tema da festa"),
  dataEvento: z.string().min(1, "Informe a data do evento"),
  endereco: z.string().min(5, "Informe o endereço"),
  valor: z
    .string()
    .min(1, "Informe o valor")
    .refine((value) => {
      const amount = Number(value.replace(",", "."));
      return Number.isFinite(amount) && amount > 0;
    }, "Valor deve ser maior que zero"),
});

type NovaVendaFormValues = z.infer<typeof novaVendaSchema>;

interface NovaVendaFormProps {
  token: string;
}

export function NovaVendaForm({ token }: NovaVendaFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NovaVendaFormValues>({
    resolver: zodResolver(novaVendaSchema),
    defaultValues: {
      nomeCliente: "",
      telefone: "",
      tema: "",
      dataEvento: "",
      endereco: "",
      valor: "",
    },
  });

  async function onSubmit(data: NovaVendaFormValues) {
    setSubmitError(null);
    try {
      await createFesta(
        {
          nomeCliente: data.nomeCliente,
          telefone: data.telefone,
          tema: data.tema,
          dataEvento: new Date(data.dataEvento).toISOString(),
          endereco: data.endereco,
          valor: Number(data.valor.replace(",", ".")),
        },
        token
      );
      router.push("/vendas");
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a venda"
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border/70 bg-card/40 p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Novo orçamento
      </p>
      <h2 className="mt-1 font-display text-2xl text-foreground">
        Dados da festa
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Cliente
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nomeCliente">Nome do Cliente</Label>
              <Input
                id="nomeCliente"
                placeholder="Maria Silva"
                aria-invalid={Boolean(errors.nomeCliente)}
                {...register("nomeCliente")}
              />
              {errors.nomeCliente ? (
                <p className="text-xs text-destructive">
                  {errors.nomeCliente.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                aria-invalid={Boolean(errors.telefone)}
                {...register("telefone")}
              />
              {errors.telefone ? (
                <p className="text-xs text-destructive">
                  {errors.telefone.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Evento
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema</Label>
              <Input
                id="tema"
                placeholder="Ursinho Pooh"
                aria-invalid={Boolean(errors.tema)}
                {...register("tema")}
              />
              {errors.tema ? (
                <p className="text-xs text-destructive">
                  {errors.tema.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataEvento">Data</Label>
              <Input
                id="dataEvento"
                type="date"
                aria-invalid={Boolean(errors.dataEvento)}
                {...register("dataEvento")}
              />
              {errors.dataEvento ? (
                <p className="text-xs text-destructive">
                  {errors.dataEvento.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              placeholder="Rua das Flores, 123 — São Paulo/SP"
              aria-invalid={Boolean(errors.endereco)}
              {...register("endereco")}
            />
            {errors.endereco ? (
              <p className="text-xs text-destructive">
                {errors.endereco.message}
              </p>
            ) : null}
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-2 sm:max-w-xs">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="1500.00"
            aria-invalid={Boolean(errors.valor)}
            {...register("valor")}
          />
          {errors.valor ? (
            <p className="text-xs text-destructive">{errors.valor.message}</p>
          ) : null}
        </div>

        {submitError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/vendas")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar venda"}
          </Button>
        </div>
      </form>
    </div>
  );
}
