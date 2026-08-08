"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  Upload,
  UserCheck,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FestaContratoPanel } from "@/components/vendas/festa-contrato-panel";
import { PagamentoForm } from "@/components/vendas/pagamento-form";
import {
  buscarClientePorTelefone,
  confirmarPagamento,
  createFesta,
  createPagamento,
  getClienteById,
  getConfiguracoes,
  sugestoesProdutos,
  uploadMidia,
} from "@/lib/api";
import {
  CATALOGO_ADDONS,
  CATALOGO_EXTRAS_METROS,
  CATALOGO_KITS,
  ITEM_TAXA_PEGUE_ENTREGA,
  TAG_PEGUE_ENTREGA,
  TAXA_PEGUE_ENTREGA,
  calcularOrcamento,
  filtrarAddonsParaKit,
  getCatalogoKit,
  kitAceitaExtrasMetros,
  montarTextoOrcamento,
  type CatalogoKitId,
} from "@/lib/catalogo-kits";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";
import type {
  Festa,
  Pagamento,
  TamanhoDecoracao,
  TipoPagamento,
} from "@/types/festa";
import type { ProdutoSugestao } from "@/types/estoque";

const selectClassName =
  "flex h-11 w-full rounded-xl neo-inset px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30 md:h-9 md:text-sm";

const TAMANHOS: TamanhoDecoracao[] = ["P", "M", "G", "GG"];

const TIPOS_PAGAMENTO: TipoPagamento[] = ["PIX", "DINHEIRO", "CARTAO", "OUTRO"];

const tipoPagamentoLabel: Record<TipoPagamento, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

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

function kitIdFromSugestao(reason: string): CatalogoKitId | null {
  const match = reason.match(/kit "([^"]+)"/i);
  if (!match?.[1]) return null;
  const id = match[1] as CatalogoKitId;
  return CATALOGO_KITS.some((kit) => kit.id === id) ? id : null;
}

interface NovaVendaFormProps {
  token: string;
  initialClienteId?: string | null;
  viewerRole?: Role;
  /** Endereço do depósito (config). Se omitido, o form busca via API. */
  enderecoEmpresaInicial?: string | null;
}

export function NovaVendaForm({
  token,
  initialClienteId,
  viewerRole,
  enderecoEmpresaInicial,
}: NovaVendaFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [extraInput, setExtraInput] = useState("");
  const [extrasManuais, setExtrasManuais] = useState<string[]>([]);
  const [kitId, setKitId] = useState<CatalogoKitId | "">("");
  const [pegueEMonte, setPegueEMonte] = useState(false);
  /** Quando pegue e monte: montador leva e busca (+ R$30). */
  const [montadorLevaBusca, setMontadorLevaBusca] = useState(false);
  const [enderecoEmpresa, setEnderecoEmpresa] = useState(
    enderecoEmpresaInicial?.trim() ?? ""
  );
  const [festaCriada, setFestaCriada] = useState<Festa | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [valorManual, setValorManual] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [sugestoes, setSugestoes] = useState<ProdutoSugestao[]>([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [sugestoesError, setSugestoesError] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(
    initialClienteId ?? null
  );
  const [clienteEncontrado, setClienteEncontrado] = useState<string | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [pagamentoValor, setPagamentoValor] = useState("");
  const [pagamentoTipo, setPagamentoTipo] = useState<TipoPagamento>("PIX");
  const [pagamentoFile, setPagamentoFile] = useState<File | null>(null);
  const [pagamentoAviso, setPagamentoAviso] = useState<string | null>(null);
  const pagamentoFileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
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
  const tamanhoDecoracao = useWatch({ control, name: "tamanhoDecoracao" });
  const valorWatch = useWatch({ control, name: "valor" });
  const telefone = useWatch({ control, name: "telefone" });

  const kitSelecionado = getCatalogoKit(kitId);
  const taxaEntrega =
    pegueEMonte && montadorLevaBusca ? TAXA_PEGUE_ENTREGA : 0;

  const orcamento = useMemo(
    () =>
      calcularOrcamento({
        kit: kitSelecionado,
        pegueEMonte,
        addonIds,
        extrasManuais,
        taxaEntrega,
      }),
    [kitSelecionado, pegueEMonte, addonIds, extrasManuais, taxaEntrega]
  );

  useEffect(() => {
    if (enderecoEmpresaInicial?.trim()) {
      setEnderecoEmpresa(enderecoEmpresaInicial.trim());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await getConfiguracoes(token);
        if (cancelled) return;
        const deposito = cfg.enderecoEmpresa?.trim() ?? "";
        setEnderecoEmpresa(deposito);
      } catch {
        // ignora falha de config
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, enderecoEmpresaInicial]);

  useEffect(() => {
    if (!initialClienteId) return;
    let cancelled = false;
    void (async () => {
      try {
        const cliente = await getClienteById(initialClienteId, token);
        if (cancelled) return;
        setClienteId(cliente.id);
        setClienteEncontrado(cliente.nome);
        setValue("nomeCliente", cliente.nome);
        setValue("telefone", cliente.telefone);
      } catch {
        // ignora falha de pré-preenchimento
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialClienteId, token, setValue]);

  useEffect(() => {
    const digits = digitsOnly(telefone ?? "");
    if (digits.length < 8) {
      if (!initialClienteId) {
        setClienteId(null);
        setClienteEncontrado(null);
      }
      return;
    }

    const timer = window.setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const cliente = await buscarClientePorTelefone(telefone ?? "", token);
        if (cliente) {
          setClienteId(cliente.id);
          setClienteEncontrado(cliente.nome);
          setValue("nomeCliente", cliente.nome, { shouldValidate: true });
        } else if (!initialClienteId) {
          setClienteId(null);
          setClienteEncontrado(null);
        }
      } catch {
        if (!initialClienteId) {
          setClienteId(null);
          setClienteEncontrado(null);
        }
      } finally {
        setBuscandoCliente(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [telefone, token, setValue, initialClienteId]);

  useEffect(() => {
    if (!dataEvento || !horaEvento) return;
    if (pegueEMonte) {
      setValue("horaMontagem", horaEvento);
      return;
    }
    const [h, m] = horaEvento.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const montagem = new Date(`${dataEvento}T${horaEvento}:00`);
    montagem.setHours(montagem.getHours() - 4);
    const hh = String(montagem.getHours()).padStart(2, "0");
    const mm = String(montagem.getMinutes()).padStart(2, "0");
    setValue("horaMontagem", `${hh}:${mm}`);
  }, [dataEvento, horaEvento, pegueEMonte, setValue]);

  /** Pegue e monte sem entrega: força endereço do depósito. */
  useEffect(() => {
    if (!pegueEMonte || montadorLevaBusca) return;
    if (!enderecoEmpresa) return;
    setValue("endereco", enderecoEmpresa, { shouldValidate: true });
  }, [pegueEMonte, montadorLevaBusca, enderecoEmpresa, setValue]);

  useEffect(() => {
    if (valorManual) return;
    if (!kitSelecionado && addonIds.length === 0 && extrasManuais.length === 0 && taxaEntrega <= 0)
      return;
    if (orcamento.total <= 0) return;
    setValue("valor", String(orcamento.total), { shouldValidate: true });
  }, [
    orcamento.total,
    kitSelecionado,
    addonIds.length,
    extrasManuais.length,
    taxaEntrega,
    valorManual,
    setValue,
  ]);

  async function buscarSugestoes(temaValue: string) {
    const trimmed = temaValue.trim();
    if (trimmed.length < 2) {
      setSugestoes([]);
      setSugestoesError(null);
      return;
    }

    setLoadingSugestoes(true);
    setSugestoesError(null);
    try {
      const list = await sugestoesProdutos(
        { tema: trimmed, tamanho: tamanhoDecoracao },
        token
      );
      setSugestoes(list);
    } catch {
      setSugestoes([]);
      setSugestoesError(null);
    } finally {
      setLoadingSugestoes(false);
    }
  }

  useEffect(() => {
    const trimmed = (tema ?? "").trim();
    if (trimmed.length < 2) {
      setSugestoes([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void buscarSugestoes(trimmed);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [tema, tamanhoDecoracao, token]);

  function aplicarSugestao(sugestao: ProdutoSugestao) {
    const kitFromReason = kitIdFromSugestao(sugestao.reason);
    if (kitFromReason) {
      selecionarKit(kitFromReason);
      return;
    }

    const jaExiste =
      extrasManuais.some(
        (item) => item.toLowerCase() === sugestao.nome.toLowerCase()
      ) ||
      orcamento.itensKit.some(
        (item) => item.toLowerCase() === sugestao.nome.toLowerCase()
      ) ||
      orcamento.itensAddons.some(
        (item) => item.toLowerCase() === sugestao.nome.toLowerCase()
      );

    if (!jaExiste) {
      setExtrasManuais((prev) => [...prev, sugestao.nome]);
    }

    const obsAtual = getValues("observacoes")?.trim() ?? "";
    if (!obsAtual.toLowerCase().includes(sugestao.nome.toLowerCase())) {
      const prefix = obsAtual ? `${obsAtual}\n` : "";
      setValue(
        "observacoes",
        `${prefix}Sugestão: ${sugestao.nome} (${sugestao.reason})`,
        { shouldDirty: true }
      );
    }
  }

  function selecionarKit(id: CatalogoKitId | "") {
    setKitId(id);
    setValorManual(false);
    setAddonIds((prev) => filtrarAddonsParaKit(prev, id || null));
    if (!id) {
      setPegueEMonte(false);
      setMontadorLevaBusca(false);
      return;
    }
    const kit = getCatalogoKit(id);
    if (!kit) return;
    setPegueEMonte(false);
    setMontadorLevaBusca(false);
    setValue("tamanhoDecoracao", kit.tamanhoSugerido, { shouldValidate: true });
  }

  function ativarPegueEMonte(ativo: boolean) {
    setPegueEMonte(ativo);
    setValorManual(false);
    if (!ativo) {
      setMontadorLevaBusca(false);
      return;
    }
    setMontadorLevaBusca(false);
    if (enderecoEmpresa) {
      setValue("endereco", enderecoEmpresa, { shouldValidate: true });
    }
    const hora = getValues("horaEvento");
    if (hora) setValue("horaMontagem", hora);
  }

  function toggleMontadorLevaBusca(ativo: boolean) {
    setMontadorLevaBusca(ativo);
    setValorManual(false);
    if (!ativo && enderecoEmpresa) {
      setValue("endereco", enderecoEmpresa, { shouldValidate: true });
    }
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
    setValorManual(false);
    setExtrasManuais((prev) => [...prev, value]);
    setExtraInput("");
  }

  function removeExtra(item: string) {
    setValorManual(false);
    setExtrasManuais((prev) => prev.filter((extra) => extra !== item));
  }

  function textoOrcamento(): string {
    const values = getValues();
    const valorNum = Number(values.valor.replace(",", ".")) || orcamento.total;
    const sinalNum = Number(pagamentoValor.replace(",", "."));
    const valorSinal =
      pagamentoValor.trim() !== "" &&
      Number.isFinite(sinalNum) &&
      sinalNum > 0
        ? sinalNum
        : undefined;

    return montarTextoOrcamento({
      nomeCliente: values.nomeCliente,
      telefone: values.telefone,
      tema: values.tema,
      kitNome: kitSelecionado?.nome ?? null,
      pegueEMonte,
      tamanho: values.tamanhoDecoracao,
      dataEvento: values.dataEvento,
      horaEvento: values.horaEvento,
      horaMontagem: values.horaMontagem,
      endereco: values.endereco,
      entregaPegue: pegueEMonte && montadorLevaBusca,
      // Linhas livres do WhatsApp (extras manuais), não a composição completa do kit
      itens: extrasManuais,
      valor: valorNum,
      valorSinal,
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
    setPagamentoAviso(null);

    const entradaAmount = Number(pagamentoValor.replace(",", "."));
    const temEntrada =
      pagamentoValor.trim() !== "" &&
      Number.isFinite(entradaAmount) &&
      entradaAmount > 0;

    if (pagamentoValor.trim() !== "" && !temEntrada) {
      setSubmitError("Informe um valor válido no lançamento de pagamento");
      return;
    }

    try {
      const pegueAtivo = Boolean(kitSelecionado && pegueEMonte);
      const horaMontagem = pegueAtivo ? data.horaEvento : data.horaMontagem;
      const enderecoFinal =
        pegueAtivo && !montadorLevaBusca && enderecoEmpresa
          ? enderecoEmpresa
          : data.endereco;

      let observacoes = data.observacoes?.trim() || "";
      if (pegueAtivo && montadorLevaBusca) {
        if (!observacoes.includes(TAG_PEGUE_ENTREGA)) {
          observacoes = observacoes
            ? `${observacoes}\n${TAG_PEGUE_ENTREGA}`
            : TAG_PEGUE_ENTREGA;
        }
      } else if (observacoes.includes(TAG_PEGUE_ENTREGA)) {
        observacoes = observacoes
          .split(TAG_PEGUE_ENTREGA)
          .join("")
          .replace(/\n{2,}/g, "\n")
          .trim();
      }

      const festa = await createFesta(
        {
          ...(clienteId ? { clienteId } : {}),
          nomeCliente: data.nomeCliente,
          telefone: data.telefone,
          tema: data.tema,
          dataEvento: combineDateAndTime(data.dataEvento, data.horaEvento),
          horarioMontagem: combineDateAndTime(data.dataEvento, horaMontagem),
          tamanhoDecoracao: data.tamanhoDecoracao,
          itensExtras: orcamento.itens,
          kitCatalogo: kitId || null,
          pegueEMonte: pegueAtivo,
          observacoes: observacoes || null,
          endereco: enderecoFinal,
          valor: Number(data.valor.replace(",", ".")),
        },
        token
      );

      const novosPagamentos: Pagamento[] = [];
      let avisoPagamento: string | null = null;

      if (temEntrada) {
        try {
          const pagamento = await createPagamento(
            festa.id,
            { valor: entradaAmount, tipo: pagamentoTipo },
            token
          );
          let atualizado = pagamento;

          if (pagamentoFile) {
            try {
              const midia = await uploadMidia(
                {
                  file: pagamentoFile,
                  tipo: "COMPROVANTE_PIX",
                  festaId: festa.id,
                },
                token
              );
              atualizado = await confirmarPagamento(
                pagamento.id,
                { comprovanteMidiaId: midia.id },
                token
              );
            } catch (uploadErr) {
              novosPagamentos.push(pagamento);
              avisoPagamento =
                uploadErr instanceof Error
                  ? `Venda salva e pagamento criado, mas o comprovante falhou: ${uploadErr.message}. Anexe de novo abaixo.`
                  : "Venda salva e pagamento criado, mas o comprovante falhou. Anexe de novo abaixo.";
              setPagamentos(novosPagamentos);
              setPagamentoAviso(avisoPagamento);
              setFestaCriada(festa);
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
          }

          novosPagamentos.push(atualizado);
        } catch (pagErr) {
          avisoPagamento =
            pagErr instanceof Error
              ? `Venda salva, mas o pagamento não foi registrado: ${pagErr.message}. Lance abaixo.`
              : "Venda salva, mas o pagamento não foi registrado. Lance abaixo.";
        }
      }

      setPagamentos(novosPagamentos);
      setPagamentoAviso(avisoPagamento);
      setFestaCriada(festa);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a venda"
      );
    }
  }

  function reiniciarFormulario() {
    setFestaCriada(null);
    setPagamentos([]);
    setSubmitError(null);
    setPagamentoAviso(null);
    setPagamentoValor("");
    setPagamentoTipo("PIX");
    setPagamentoFile(null);
    if (pagamentoFileRef.current) pagamentoFileRef.current.value = "";
    setExtraInput("");
    setExtrasManuais([]);
    setKitId("");
    setPegueEMonte(false);
    setMontadorLevaBusca(false);
    setAddonIds([]);
    setValorManual(false);
    setSugestoes([]);
    setSugestoesError(null);
    setClienteId(initialClienteId ?? null);
    setClienteEncontrado(null);
    reset({
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (festaCriada) {
    return (
      <div
        id="nova-venda-sucesso"
        className="mx-auto max-w-3xl space-y-4 pb-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom,0px)+1.5rem)] sm:space-y-6"
      >
        <div className="rounded-2xl neo-sm p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl neo-mint">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-balloon-mint">
                Venda criada
              </p>
              <h2 className="mt-1 font-display text-2xl text-foreground">
                {festaCriada.tema}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {festaCriada.cliente?.nome ?? "Cliente"} ·{" "}
                <span className="tabular-nums text-foreground">
                  {formatCurrency(Number(festaCriada.valor))}
                </span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {pagamentos.length > 0 ? (
                  <>
                    Entrada registrada. Abaixo você pode lançar o restante e{" "}
                    <strong className="font-medium text-foreground">
                      gerar o contrato
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    Role um pouco abaixo para{" "}
                    <strong className="font-medium text-foreground">
                      registrar pagamento/entrada
                    </strong>{" "}
                    e{" "}
                    <strong className="font-medium text-foreground">
                      gerar o contrato
                    </strong>{" "}
                    — tudo nesta mesma tela.
                  </>
                )}
              </p>
              {pagamentoAviso ? (
                <p className="mt-2 text-sm text-balloon-sun">{pagamentoAviso}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={reiniciarFormulario}
            >
              Nova venda
            </Button>
            <Link
              href="/vendas?minhas=1"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "inline-flex min-h-11 w-full items-center justify-center sm:w-auto"
              )}
            >
              Ir para minhas vendas
            </Link>
          </div>
        </div>

        <div className="rounded-2xl neo-sm p-4 sm:p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-mint">
            {pagamentos.length > 0
              ? "Pagamentos"
              : "Registrar pagamento / entrada"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pagamentos.length > 0
              ? "A festa só fica quitada quando o total confirmado cobrir o valor."
              : "Lance a entrada ou o valor pago agora. A festa só fica quitada quando o total confirmado cobrir o valor."}
          </p>
          <div className="mt-3">
            <PagamentoForm
              festaId={festaCriada.id}
              token={token}
              pagamentos={pagamentos}
              valorFesta={Number(festaCriada.valor)}
              viewerRole={viewerRole}
              onPagamentosChange={setPagamentos}
            />
          </div>
        </div>

        <div className="rounded-2xl neo-sm p-4 sm:p-6 md:p-8">
          <FestaContratoPanel
            festaId={festaCriada.id}
            token={token}
            clienteNome={
              festaCriada.cliente?.nome ||
              getValues("nomeCliente") ||
              undefined
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl neo-sm p-4 sm:p-6 md:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Novo orçamento
      </p>
      <h2 className="mt-1 font-display text-2xl text-foreground">
        Dados da festa
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 pb-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom,0px)+6.5rem)] md:pb-0">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-pink">
            Cliente
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomeCliente">Nome do Cliente</Label>
              <Input
                id="nomeCliente"
                className="h-11 text-base md:h-9 md:text-sm"
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
              <div className="relative">
                <Input
                  id="telefone"
                  className="h-11 text-base md:h-9 md:text-sm"
                  placeholder="(11) 99999-9999"
                  aria-invalid={Boolean(errors.telefone)}
                  {...register("telefone")}
                />
                {buscandoCliente ? (
                  <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              {errors.telefone ? (
                <p className="text-xs text-destructive">
                  {errors.telefone.message}
                </p>
              ) : null}
              {clienteEncontrado ? (
                <div className="flex items-center gap-2 rounded-xl bg-balloon-mint/10 px-3 py-2 text-xs text-balloon-mint">
                  <UserCheck className="size-4 shrink-0" />
                  <span>
                    Cliente encontrado: <strong>{clienteEncontrado}</strong>
                    {clienteId ? " — festa será vinculada ao cadastro." : ""}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-sky">
            Kit do catálogo
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => selecionarKit("")}
              className={cn(
                "min-h-[4.5rem] rounded-2xl p-4 text-left transition-all md:min-h-0 md:p-3.5",
                !kitId
                  ? "neo-sky"
                  : "neo-sm hover:brightness-[1.02]"
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
                    "min-h-[4.5rem] rounded-2xl p-4 text-left transition-all md:min-h-0 md:p-3.5",
                    selected
                      ? "neo-pink"
                      : "neo-sm hover:brightness-[1.02]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {kit.nome}
                    </p>
                    {selected ? (
                      <Check className="size-4 shrink-0 opacity-90" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kit.descricaoCurta}
                  </p>
                  <p className="mt-2 text-sm tabular-nums opacity-90">
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
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => ativarPegueEMonte(false)}
                className={cn(
                  "min-h-11 w-full rounded-2xl px-4 py-2.5 text-left text-sm whitespace-normal transition-all md:min-h-0 md:w-auto md:px-3 md:py-1.5",
                  !pegueEMonte
                    ? "neo-sky"
                    : "neo-sm text-muted-foreground hover:brightness-[1.02]"
                )}
              >
                Montagem pela equipe —{" "}
                {formatCurrency(kitSelecionado.valorEquipe)}
              </button>
              <button
                type="button"
                onClick={() => ativarPegueEMonte(true)}
                className={cn(
                  "min-h-11 w-full rounded-2xl px-4 py-2.5 text-left text-sm whitespace-normal transition-all md:min-h-0 md:w-auto md:px-3 md:py-1.5",
                  pegueEMonte
                    ? "neo-pink"
                    : "neo-sm text-muted-foreground hover:brightness-[1.02]"
                )}
              >
                Pegue e monte —{" "}
                {formatCurrency(kitSelecionado.valorPegueEMonte)}
              </button>
            </div>
          ) : null}

          {pegueEMonte && kitSelecionado?.valorPegueEMonte != null ? (
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition-all",
                montadorLevaBusca ? "neo-sun" : "neo-sm"
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-balloon-sun"
                  checked={montadorLevaBusca}
                  onChange={(event) =>
                    toggleMontadorLevaBusca(event.target.checked)
                  }
                />
                Montador leva e busca ({formatCurrency(TAXA_PEGUE_ENTREGA)})
              </span>
              <span className="tabular-nums text-muted-foreground">
                +{formatCurrency(TAXA_PEGUE_ENTREGA)}
              </span>
            </label>
          ) : null}
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-mint">
            Add-ons
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {CATALOGO_ADDONS.map((addon) => {
              const checked = addonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition-all md:min-h-0 md:px-3 md:py-2.5",
                    checked
                      ? "neo-mint"
                      : "neo-sm"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-balloon-mint"
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

        {kitAceitaExtrasMetros(kitId) ? (
          <>
            <Separator className="bg-border/60" />
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-balloon-lilac">
                  Decoração extra (4m e 6m)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cantinhos de lembrancinha temáticos para decorações de metros.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {CATALOGO_EXTRAS_METROS.map((addon) => {
                  const checked = addonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition-all md:min-h-0 md:px-3 md:py-2.5",
                        checked ? "neo-lilac" : "neo-sm"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4 accent-balloon-lilac"
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
          </>
        ) : null}

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-sun">
            Decoração e agenda
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tema">Nome do tema</Label>
              <Input
                id="tema"
                className="h-11 text-base md:h-9 md:text-sm"
                placeholder="Ex.: Ursinho Pooh, Frozen, Safari..."
                aria-invalid={Boolean(errors.tema)}
                {...register("tema", {
                  onBlur: (event) => {
                    void buscarSugestoes(event.target.value);
                  },
                })}
              />
              {errors.tema ? (
                <p className="text-xs text-destructive">{errors.tema.message}</p>
              ) : null}
              {loadingSugestoes ? (
                <p className="text-xs text-muted-foreground">
                  Buscando sugestões…
                </p>
              ) : sugestoes.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Sugestões para este tema
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.map((sugestao) => (
                      <button
                        key={sugestao.id}
                        type="button"
                        title={sugestao.reason}
                        onClick={() => aplicarSugestao(sugestao)}
                        className="inline-flex min-h-9 max-w-full items-center rounded-full bg-balloon-sky/12 px-3 py-1.5 text-left text-xs font-medium text-balloon-sky shadow-[var(--shadow-neo-sm)] transition-all hover:bg-balloon-sky/18"
                      >
                        <span className="truncate">{sugestao.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : sugestoesError ? (
                <p className="text-xs text-muted-foreground">{sugestoesError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataEvento">
                {pegueEMonte ? "Data da retirada" : "Data"}
              </Label>
              <Input
                id="dataEvento"
                type="date"
                className="h-11 text-base md:h-9 md:text-sm"
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
              <Label htmlFor="horaEvento">
                {pegueEMonte ? "Horário da retirada" : "Horário da festa"}
              </Label>
              <Input
                id="horaEvento"
                type="time"
                className="h-11 text-base md:h-9 md:text-sm"
                aria-invalid={Boolean(errors.horaEvento)}
                {...register("horaEvento")}
              />
              {errors.horaEvento ? (
                <p className="text-xs text-destructive">
                  {errors.horaEvento.message}
                </p>
              ) : null}
            </div>

            {!pegueEMonte ? (
              <div className="space-y-2">
                <Label htmlFor="horaMontagem">Horário de montagem</Label>
                <Input
                  id="horaMontagem"
                  type="time"
                  className="h-11 text-base md:h-9 md:text-sm"
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
            ) : (
              <input type="hidden" {...register("horaMontagem")} />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraInput">Itens extras manuais</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="extraInput"
                className="h-11 text-base md:h-9 md:text-sm"
                value={extraInput}
                onChange={(event) => setExtraInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addExtra();
                  }
                }}
                placeholder="Ex.: toalha especial R$50, placa personalizada"
              />
              <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto sm:shrink-0" onClick={addExtra}>
                Adicionar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inclua R$ no texto para somar ao total (ex.: &quot;acréscimo R$100&quot;).
            </p>
            {extrasManuais.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-1">
                {extrasManuais.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-balloon-lilac/12 px-2.5 py-1 text-xs font-medium text-balloon-lilac shadow-[var(--shadow-neo-sm)]"
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
            <Label htmlFor="endereco">
              {pegueEMonte
                ? montadorLevaBusca
                  ? "Endereço de entrega"
                  : "Local da retirada"
                : "Endereço"}
            </Label>
            <Input
              id="endereco"
              className="h-11 text-base md:h-9 md:text-sm"
              placeholder={
                pegueEMonte && !montadorLevaBusca
                  ? enderecoEmpresa || "Depósito da empresa"
                  : "Rua das Flores, 123 — São Paulo/SP"
              }
              readOnly={pegueEMonte && !montadorLevaBusca}
              aria-invalid={Boolean(errors.endereco)}
              {...register("endereco")}
            />
            {pegueEMonte && !montadorLevaBusca ? (
              <p className="text-[11px] text-muted-foreground">
                Endereço do depósito (configurações). Ative &quot;Montador leva e
                busca&quot; para informar o endereço do cliente.
              </p>
            ) : null}
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
              className="flex min-h-[5.5rem] w-full rounded-xl neo-inset px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-balloon-sun/30 md:py-2 md:text-sm"
              {...register("observacoes")}
            />
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="rounded-2xl neo-inset p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-lilac">
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
            {pegueEMonte ? (
              <li>
                Retirada:{" "}
                <span className="text-foreground">
                  {montadorLevaBusca
                    ? `Entrega e busca (+ ${formatCurrency(TAXA_PEGUE_ENTREGA)})`
                    : "Cliente retira no depósito"}
                </span>
              </li>
            ) : null}
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
              {orcamento.valorExtras > 0 ? (
                <>
                  {" "}
                  + extras{" "}
                  <span className="tabular-nums text-foreground">
                    {formatCurrency(orcamento.valorExtras)}
                  </span>
                </>
              ) : null}
              {orcamento.valorTaxa > 0 ? (
                <>
                  {" "}
                  + taxa{" "}
                  <span className="tabular-nums text-foreground">
                    {formatCurrency(orcamento.valorTaxa)}
                  </span>
                </>
              ) : null}
            </li>
            {orcamento.valorTaxa > 0 ? (
              <li className="text-xs text-muted-foreground">
                {ITEM_TAXA_PEGUE_ENTREGA}
              </li>
            ) : null}
            <li className="pt-1 text-base font-medium text-foreground">
              Total sugerido:{" "}
              <span className="tabular-nums text-balloon-sun">
                {formatCurrency(orcamento.total || Number(valorWatch) || 0)}
              </span>
            </li>
          </ul>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor final (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              className="h-11 text-base md:h-9 md:text-sm"
              placeholder="1500.00"
              aria-invalid={Boolean(errors.valor)}
              {...register("valor", {
                onChange: () => setValorManual(true),
              })}
            />
            {valorManual && orcamento.total > 0 ? (
              <button
                type="button"
                className="text-xs text-balloon-sky hover:underline"
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
        </div>

        <div className="space-y-3 rounded-2xl neo-inset p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-mint">
            Registrar pagamento / entrada
          </p>
          <p className="text-xs text-muted-foreground">
            Pode lançar só a entrada agora e o restante depois — o saldo
            atualiza sozinho.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pagamento-valor-nova" className="text-xs">
                Valor deste lançamento (R$)
              </Label>
              <Input
                id="pagamento-valor-nova"
                type="number"
                step="0.01"
                min="0"
                className="h-11 text-base md:h-9 md:text-sm"
                placeholder="400.00"
                value={pagamentoValor}
                onChange={(event) => setPagamentoValor(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pagamento-tipo-nova" className="text-xs">
                Tipo
              </Label>
              <select
                id="pagamento-tipo-nova"
                className={selectClassName}
                value={pagamentoTipo}
                onChange={(event) =>
                  setPagamentoTipo(event.target.value as TipoPagamento)
                }
              >
                {TIPOS_PAGAMENTO.map((item) => (
                  <option key={item} value={item} className="bg-background">
                    {tipoPagamentoLabel[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pagamento-comprovante-nova" className="text-xs">
              Comprovante (foto ou PDF)
            </Label>
            <label
              htmlFor="pagamento-comprovante-nova"
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl neo-inset px-3 text-sm text-muted-foreground transition-all hover:brightness-[1.02] md:h-9 md:px-2.5 md:text-xs",
                pagamentoFile && "text-balloon-sun ring-1 ring-balloon-sun/30"
              )}
            >
              <Upload className="size-4 shrink-0" />
              <span className="truncate">
                {pagamentoFile
                  ? pagamentoFile.name
                  : "Anexar comprovante de PIX"}
              </span>
            </label>
            <input
              ref={pagamentoFileRef}
              id="pagamento-comprovante-nova"
              type="file"
              accept="image/*,application/pdf,.heic,.heif"
              className="hidden"
              onChange={(event) =>
                setPagamentoFile(event.target.files?.[0] ?? null)
              }
            />
            {pagamentoFile ? (
              <p className="text-xs text-muted-foreground">
                Ao salvar com comprovante, o lançamento já fica confirmado.
              </p>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Opcional: deixe o valor em branco para salvar só a venda e lançar
            o pagamento depois.
          </p>

          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Registrar pagamento"
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={copiarOrcamento}>
            {copyFeedback ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copyFeedback ? "Copiado" : "Copiar orçamento"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={abrirWhatsApp}>
            <MessageCircle className="size-4" />
            WhatsApp
          </Button>
        </div>

        {submitError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        <div className="fixed inset-x-0 z-40 border-t border-border/60 bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 bottom-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom,0px)+1.25rem)] md:static md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full md:w-auto"
              onClick={() => router.push("/vendas")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="min-h-11 w-full md:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : pagamentoValor.trim() ? (
                "Salvar e registrar pagamento"
              ) : (
                "Salvar venda"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
