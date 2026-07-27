"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createFesta } from "@/lib/api";
import {
  CATALOGO_ADDONS,
  CATALOGO_KITS,
  calcularOrcamento,
  getCatalogoKit,
  montarTextoOrcamento,
  type CatalogoKitId,
} from "@/lib/catalogo-kits";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TamanhoDecoracao } from "@/types/festa";

const selectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const TAMANHOS: TamanhoDecoracao[] = ["P", "M", "G", "GG"];

const novaVendaSchema = z.object({
  nomeCliente: z.string().min(2, "Informe o nome do cliente"),
  telefone: z.string().min(8, "Informe um telefone válido"),
  tema: z.string().min(2, "Informe o nome do tema"),
  dataEvento: z.string().min(1, "Informe a data do evento"),
  horaEvento: z.string().min(1, "Informe o horário da festa"),
  horaMontagem: z.string().min(1, "Informe o horário de montagem"),
  tamanhoDecoracao: z.enum(["P", "M", "G", "GG"], {
    message: "Selecione o tamanho",
  }),
  endereco: z.string().min(5, "Informe o endereço"),
  observacoes: z.string().max(2000).optional(),
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

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

interface NovaVendaFormProps {
  token: string;
}

export function NovaVendaForm({ token }: NovaVendaFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [extraInput, setExtraInput] = useState("");
  const [extrasManuais, setExtrasManuais] = useState<string[]>([]);
  const [kitId, setKitId] = useState<CatalogoKitId | "">("");
  const [pegueEMonte, setPegueEMonte] = useState(false);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [valorManual, setValorManual] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
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
      observacoes: "",
      valor: "",
    },
  });

  const dataEvento = useWatch({ control, name: "dataEvento" });
  const horaEvento = useWatch({ control, name: "horaEvento" });
  const nomeCliente = useWatch({ control, name: "nomeCliente" });
  const tema = useWatch({ control, name: "tema" });
  const valorWatch = useWatch({ control, name: "valor" });
  const telefone = useWatch({ control, name: "telefone" });

  const kitSelecionado = getCatalogoKit(kitId);

  const orcamento = useMemo(
    () =>
      calcularOrcamento({
        kit: kitSelecionado,
        pegueEMonte,
        addonIds,
        extrasManuais,
      }),
    [kitSelecionado, pegueEMonte, addonIds, extrasManuais]
  );

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

  useEffect(() => {
    if (valorManual) return;
    if (!kitSelecionado && addonIds.length === 0) return;
    if (orcamento.total <= 0) return;
    setValue("valor", String(orcamento.total), { shouldValidate: true });
  }, [orcamento.total, kitSelecionado, addonIds.length, valorManual, setValue]);

  function selecionarKit(id: CatalogoKitId | "") {
    setKitId(id);
    setValorManual(false);
    if (!id) {
      setPegueEMonte(false);
      return;
    }
    const kit = getCatalogoKit(id);
    if (!kit) return;
    setPegueEMonte(false);
    setValue("tamanhoDecoracao", kit.tamanhoSugerido, { shouldValidate: true });
  }

  function toggleAddon(id: string) {
    setValorManual(false);
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function addExtra() {
    const value = extraInput.trim();
    if (!value) return;
    const jaExiste =
      extrasManuais.some((item) => item.toLowerCase() === value.toLowerCase()) ||
      orcamento.itensKit.some((item) => item.toLowerCase() === value.toLowerCase()) ||
      orcamento.itensAddons.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      );
    if (jaExiste) {
      setExtraInput("");
      return;
    }
    setExtrasManuais((prev) => [...prev, value]);
    setExtraInput("");
  }

  function removeExtra(item: string) {
    setExtrasManuais((prev) => prev.filter((extra) => extra !== item));
  }

  function textoOrcamento(): string {
    const values = getValues();
    const valorNum = Number(values.valor.replace(",", ".")) || orcamento.total;
    return montarTextoOrcamento({
      nomeCliente: values.nomeCliente,
      telefone: values.telefone,
      tema: values.tema,
      kitNome: kitSelecionado?.nome ?? null,
      pegueEMonte,
      dataEvento: values.dataEvento,
      horaEvento: values.horaEvento,
      endereco: values.endereco,
      itens: orcamento.itens,
      valor: valorNum,
      observacoes: values.observacoes,
    });
  }

  async function copiarOrcamento() {
    try {
      await navigator.clipboard.writeText(textoOrcamento());
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      setSubmitError("Não foi possível copiar o orçamento");
    }
  }

  function abrirWhatsApp() {
    const phone = digitsOnly(telefone || "");
    const text = encodeURIComponent(textoOrcamento());
    const url = phone
      ? `https://wa.me/55${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
          horarioMontagem: combineDateAndTime(
            data.dataEvento,
            data.horaMontagem
          ),
          tamanhoDecoracao: data.tamanhoDecoracao,
          itensExtras: orcamento.itens,
          kitCatalogo: kitId || null,
          pegueEMonte: Boolean(kitSelecionado && pegueEMonte),
          observacoes: data.observacoes?.trim() || null,
          endereco: data.endereco,
          valor: Number(data.valor.replace(",", ".")),
        },
        token
      );
      router.push("/dashboard");
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
    <div className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card/40 p-6 sm:p-8">
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
            Kit do catálogo
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selecionarKit("")}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-colors",
                !kitId
                  ? "border-champagne/60 bg-champagne/10"
                  : "border-border/60 bg-background/20 hover:border-border"
              )}
            >
              <p className="text-sm font-medium text-foreground">
                Personalizado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sem kit — monte valor e itens à mão.
              </p>
            </button>

            {CATALOGO_KITS.map((kit) => {
              const selected = kitId === kit.id;
              return (
                <button
                  key={kit.id}
                  type="button"
                  onClick={() => selecionarKit(kit.id)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors",
                    selected
                      ? "border-champagne/60 bg-champagne/10"
                      : "border-border/60 bg-background/20 hover:border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {kit.nome}
                    </p>
                    {selected ? (
                      <Check className="size-4 shrink-0 text-champagne" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kit.descricaoCurta}
                  </p>
                  <p className="mt-2 text-sm tabular-nums text-champagne">
                    {formatCurrency(kit.valorEquipe)}
                    {kit.valorPegueEMonte != null ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · pegue R$ {kit.valorPegueEMonte}
                      </span>
                    ) : null}
                  </p>
                </button>
              );
            })}
          </div>

          {kitSelecionado?.valorPegueEMonte != null ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPegueEMonte(false);
                  setValorManual(false);
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  !pegueEMonte
                    ? "border-champagne/60 bg-champagne/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                Montagem pela equipe —{" "}
                {formatCurrency(kitSelecionado.valorEquipe)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPegueEMonte(true);
                  setValorManual(false);
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  pegueEMonte
                    ? "border-champagne/60 bg-champagne/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                Pegue e monte —{" "}
                {formatCurrency(kitSelecionado.valorPegueEMonte)}
              </button>
            </div>
          ) : null}
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Add-ons
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATALOGO_ADDONS.map((addon) => {
              const checked = addonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    checked
                      ? "border-champagne/50 bg-champagne/8"
                      : "border-border/60 bg-background/20"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-champagne"
                      checked={checked}
                      onChange={() => toggleAddon(addon.id)}
                    />
                    {addon.nome}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(addon.valor)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Decoração e agenda
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tema">Nome do tema</Label>
              <Input
                id="tema"
                placeholder="Ex.: Ursinho Pooh, Frozen, Safari..."
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
                className={selectClassName}
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
            <Label htmlFor="extraInput">Itens extras manuais</Label>
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
                placeholder="Ex.: toalha especial, placa personalizada"
              />
              <Button type="button" variant="outline" onClick={addExtra}>
                Adicionar
              </Button>
            </div>
            {extrasManuais.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-1">
                {extrasManuais.map((item) => (
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

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              rows={3}
              placeholder="Preferências do cliente, cores, acesso, restrições..."
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register("observacoes")}
            />
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="rounded-xl border border-border/60 bg-background/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Resumo do orçamento
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>
              Kit:{" "}
              <span className="text-foreground">
                {kitSelecionado?.nome ?? "Personalizado"}
                {kitSelecionado && pegueEMonte ? " · Pegue e monte" : ""}
              </span>
            </li>
            {tema ? (
              <li>
                Tema: <span className="text-foreground">{tema}</span>
              </li>
            ) : null}
            {nomeCliente ? (
              <li>
                Cliente: <span className="text-foreground">{nomeCliente}</span>
              </li>
            ) : null}
            {orcamento.itens.length > 0 ? (
              <li>
                Itens:{" "}
                <span className="text-foreground">
                  {orcamento.itens.join(", ")}
                </span>
              </li>
            ) : null}
            <li>
              Base:{" "}
              <span className="tabular-nums text-foreground">
                {formatCurrency(orcamento.valorBase)}
              </span>
              {orcamento.valorAddons > 0 ? (
                <>
                  {" "}
                  + add-ons{" "}
                  <span className="tabular-nums text-foreground">
                    {formatCurrency(orcamento.valorAddons)}
                  </span>
                </>
              ) : null}
            </li>
            <li className="pt-1 text-base font-medium text-foreground">
              Total sugerido:{" "}
              <span className="tabular-nums text-champagne">
                {formatCurrency(orcamento.total || Number(valorWatch) || 0)}
              </span>
            </li>
          </ul>

          <div className="mt-4 space-y-2 sm:max-w-xs">
            <Label htmlFor="valor">Valor final (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="1500.00"
              aria-invalid={Boolean(errors.valor)}
              {...register("valor", {
                onChange: () => setValorManual(true),
              })}
            />
            {valorManual && orcamento.total > 0 ? (
              <button
                type="button"
                className="text-xs text-champagne hover:underline"
                onClick={() => {
                  setValorManual(false);
                  setValue("valor", String(orcamento.total), {
                    shouldValidate: true,
                  });
                }}
              >
                Voltar ao total sugerido ({formatCurrency(orcamento.total)})
              </button>
            ) : null}
            {errors.valor ? (
              <p className="text-xs text-destructive">{errors.valor.message}</p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copiarOrcamento}>
              {copyFeedback ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copyFeedback ? "Copiado" : "Copiar orçamento"}
            </Button>
            <Button type="button" variant="outline" onClick={abrirWhatsApp}>
              <MessageCircle className="size-4" />
              WhatsApp
            </Button>
          </div>
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
