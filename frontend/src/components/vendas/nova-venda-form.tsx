"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createFesta } from "@/lib/api";
import type { TamanhoDecoracao } from "@/types/festa";

const TAMANHOS: TamanhoDecoracao[] = ["P", "M", "G", "GG"];

const novaVendaSchema = z.object({
  nomeCliente: z.string().min(2, "Informe o nome do cliente"),
  telefone: z.string().min(8, "Informe um telefone válido"),
  tema: z.string().min(2, "Informe o tema / decoração"),
  dataEvento: z.string().min(1, "Informe a data do evento"),
  horaEvento: z.string().min(1, "Informe o horário da festa"),
  horaMontagem: z.string().min(1, "Informe o horário de montagem"),
  tamanhoDecoracao: z.enum(["P", "M", "G", "GG"], {
    required_error: "Selecione o tamanho",
  }),
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

function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

interface NovaVendaFormProps {
  token: string;
}

export function NovaVendaForm({ token }: NovaVendaFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [extraInput, setExtraInput] = useState("");
  const [itensExtras, setItensExtras] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NovaVendaFormValues>({
    resolver: zodResolver(novaVendaSchema),
    defaultValues: {
      nomeCliente: "",
      telefone: "",
      tema: "",
      dataEvento: "",
      horaEvento: "15:00",
      horaMontagem: "11:00",
      tamanhoDecoracao: "M",
      endereco: "",
      valor: "",
    },
  });

  const dataEvento = useWatch({ control, name: "dataEvento" });
  const horaEvento = useWatch({ control, name: "horaEvento" });

  useEffect(() => {
    if (!dataEvento || !horaEvento) return;
    const [h, m] = horaEvento.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const montagem = new Date(`${dataEvento}T${horaEvento}:00`);
    montagem.setHours(montagem.getHours() - 4);
    const hh = String(montagem.getHours()).padStart(2, "0");
    const mm = String(montagem.getMinutes()).padStart(2, "0");
    setValue("horaMontagem", `${hh}:${mm}`);
  }, [dataEvento, horaEvento, setValue]);

  function addExtra() {
    const value = extraInput.trim();
    if (!value) return;
    if (itensExtras.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setExtraInput("");
      return;
    }
    setItensExtras((prev) => [...prev, value]);
    setExtraInput("");
  }

  function removeExtra(item: string) {
    setItensExtras((prev) => prev.filter((extra) => extra !== item));
  }

  async function onSubmit(data: NovaVendaFormValues) {
    setSubmitError(null);
    try {
      await createFesta(
        {
          nomeCliente: data.nomeCliente,
          telefone: data.telefone,
          tema: data.tema,
          dataEvento: combineDateAndTime(data.dataEvento, data.horaEvento),
          horarioMontagem: combineDateAndTime(data.dataEvento, data.horaMontagem),
          tamanhoDecoracao: data.tamanhoDecoracao,
          itensExtras,
          endereco: data.endereco,
          valor: Number(data.valor.replace(",", ".")),
        },
        token
      );
      router.push("/calendario");
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
            Decoração e agenda
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tema">Decoração / Tema</Label>
              <Input
                id="tema"
                placeholder="Ursinho Pooh"
                aria-invalid={Boolean(errors.tema)}
                {...register("tema")}
              />
              {errors.tema ? (
                <p className="text-xs text-destructive">{errors.tema.message}</p>
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

            <div className="space-y-2">
              <Label htmlFor="tamanhoDecoracao">Tamanho</Label>
              <select
                id="tamanhoDecoracao"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-invalid={Boolean(errors.tamanhoDecoracao)}
                {...register("tamanhoDecoracao")}
              >
                {TAMANHOS.map((tamanho) => (
                  <option key={tamanho} value={tamanho} className="bg-background">
                    {tamanho}
                  </option>
                ))}
              </select>
              {errors.tamanhoDecoracao ? (
                <p className="text-xs text-destructive">
                  {errors.tamanhoDecoracao.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaEvento">Horário da festa</Label>
              <Input
                id="horaEvento"
                type="time"
                aria-invalid={Boolean(errors.horaEvento)}
                {...register("horaEvento")}
              />
              {errors.horaEvento ? (
                <p className="text-xs text-destructive">
                  {errors.horaEvento.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaMontagem">Horário de montagem</Label>
              <Input
                id="horaMontagem"
                type="time"
                aria-invalid={Boolean(errors.horaMontagem)}
                {...register("horaMontagem")}
              />
              <p className="text-[11px] text-muted-foreground">
                Sugestão: 4h antes do início da festa.
              </p>
              {errors.horaMontagem ? (
                <p className="text-xs text-destructive">
                  {errors.horaMontagem.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraInput">Itens extras</Label>
            <div className="flex gap-2">
              <Input
                id="extraInput"
                value={extraInput}
                onChange={(event) => setExtraInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addExtra();
                  }
                }}
                placeholder="Ex.: arco, mesa cake, balão número"
              />
              <Button type="button" variant="outline" onClick={addExtra}>
                Adicionar
              </Button>
            </div>
            {itensExtras.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-1">
                {itensExtras.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs text-foreground"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeExtra(item)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remover ${item}`}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
