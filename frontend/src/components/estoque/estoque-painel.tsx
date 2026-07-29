"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createProduto,
  createUnidade,
  deleteProduto,
  deleteUnidade,
  disponibilidadeEstoque,
  sincronizarCatalogoEstoque,
} from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type {
  AlertaQr,
  DisponibilidadeResult,
  InventarioItem,
  Produto,
} from "@/types/estoque";

const STATUS_LABEL: Record<string, string> = {
  DISPONIVEL: "Disponível",
  RESERVADA: "Reservada",
  EM_USO: "Em uso",
  MANUTENCAO: "Manutenção",
};

const STATUS_CLASS: Record<string, string> = {
  DISPONIVEL: "bg-balloon-mint/12 text-balloon-mint",
  MANUTENCAO: "bg-balloon-sun/12 text-balloon-sun",
  RESERVADA: "bg-balloon-sky/12 text-balloon-sky",
  EM_USO: "bg-balloon-lilac/12 text-balloon-lilac",
};

interface EstoquePainelProps {
  produtos: Produto[];
  inventario: InventarioItem[];
  alertasQr?: AlertaQr[];
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SectionTitle({
  dot,
  children,
}: {
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
      <span className={cn("balloon-dot", dot)} />
      {children}
    </h2>
  );
}

function toInventarioFromProdutos(produtos: Produto[]): InventarioItem[] {
  return produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria,
    valorAluguel: produto.valorAluguel,
    requerQr: produto.requerQr,
    total: produto.unidades.length,
    disponivel: produto.unidades.filter((u) => u.status === "DISPONIVEL").length,
    reservada: produto.unidades.filter((u) => u.status === "RESERVADA").length,
    emUso: produto.unidades.filter((u) => u.status === "EM_USO").length,
    manutencao: produto.unidades.filter((u) => u.status === "MANUTENCAO")
      .length,
    unidades: produto.unidades,
  }));
}

function InventoryTableRows({
  item,
  open,
  addingUnitId,
  onToggle,
  onAddUnit,
  onDeleteGroup,
  onDeleteUnit,
}: {
  item: InventarioItem;
  open: boolean;
  addingUnitId: string | null;
  onToggle: () => void;
  onAddUnit: () => void;
  onDeleteGroup: () => void;
  onDeleteUnit: (unidadeId: string, label: string) => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-left hover:text-balloon-pink"
            onClick={onToggle}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180"
              )}
            />
            {item.nome}
          </button>
        </TableCell>
        <TableCell>{item.categoria}</TableCell>
        <TableCell className="text-balloon-mint">{item.disponivel}</TableCell>
        <TableCell>{item.total}</TableCell>
        <TableCell className="text-right">
          <div className="inline-flex gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="gap-1"
              disabled={addingUnitId === item.id}
              onClick={onAddUnit}
            >
              <PackagePlus className="size-3" />
              +1
            </Button>
            <Button
              type="button"
              size="xs"
              variant="destructive"
              className="gap-1"
              onClick={onDeleteGroup}
            >
              <Trash2 className="size-3" />
              Grupo
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <ul className="grid gap-2 sm:grid-cols-2">
              {item.unidades.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {u.etiqueta || u.codigoQr}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {u.codigoQr}
                    </span>
                    <span
                      className={cn(
                        "ml-2 rounded-lg px-1.5 py-0.5 text-[10px]",
                        STATUS_CLASS[u.status]
                      )}
                    >
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      onDeleteUnit(u.id, u.etiqueta || u.codigoQr)
                    }
                    aria-label="Excluir unidade"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function EstoquePainel({
  produtos,
  inventario: inventarioInicial,
  alertasQr = [],
}: EstoquePainelProps) {
  const router = useRouter();
  const defaultInicio = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  }, []);
  const defaultFim = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const [inventario, setInventario] = useState<InventarioItem[]>(
    inventarioInicial.length > 0
      ? inventarioInicial
      : toInventarioFromProdutos(produtos)
  );
  const [produtoId, setProdutoId] = useState(
    inventarioInicial[0]?.id ?? produtos[0]?.id ?? ""
  );
  const [inicio, setInicio] = useState(defaultInicio);
  const [fim, setFim] = useState(defaultFim);
  const [resultado, setResultado] = useState<DisponibilidadeResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [syncing, startSync] = useTransition();
  const [addingUnitId, setAddingUnitId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("Acessórios");
  const [novoValor, setNovoValor] = useState("50");
  const [novaQtd, setNovaQtd] = useState("1");
  const [novoRequerQr, setNovoRequerQr] = useState(false);
  const [savingProduto, startSaveProduto] = useTransition();

  function itemFromProduto(produto: Produto): InventarioItem {
    return toInventarioFromProdutos([produto])[0];
  }

  const totais = useMemo(() => {
    return inventario.reduce(
      (acc, item) => {
        acc.total += item.total;
        acc.disponivel += item.disponivel;
        acc.reservada += item.reservada;
        return acc;
      },
      { total: 0, disponivel: 0, reservada: 0 }
    );
  }, [inventario]);

  function consultar() {
    setError(null);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        if (!produtoId) throw new Error("Selecione um produto");
        const data = await disponibilidadeEstoque(
          {
            produtoId,
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
          },
          token
        );
        setResultado(data);
      } catch (err) {
        setResultado(null);
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao consultar disponibilidade"
        );
      }
    });
  }

  function sincronizar() {
    setSyncMsg(null);
    setError(null);
    startSync(async () => {
      try {
        const token = getClientToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        const result = await sincronizarCatalogoEstoque(token);
        setInventario(result.inventario);
        if (!produtoId && result.inventario[0]) {
          setProdutoId(result.inventario[0].id);
        }
        setSyncMsg(
          `Inventário sincronizado: ${result.totalProdutos} produtos` +
            (result.criados.length
              ? ` · ${result.criados.length} novos`
              : "")
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao sincronizar catálogo de inventário"
        );
      }
    });
  }

  function adicionarUnidade(item: InventarioItem) {
    setAddingUnitId(item.id);
    setError(null);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        const seq = item.total + 1;
        const codigoQr = `DJ-MANUAL-${item.id.slice(-6).toUpperCase()}-${String(seq).padStart(3, "0")}-${Date.now().toString(36)}`;
        const unidade = await createUnidade(
          item.id,
          {
            codigoQr,
            etiqueta: `${item.nome} #${seq}`,
            status: "DISPONIVEL",
          },
          token
        );
        setInventario((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  total: row.total + 1,
                  disponivel: row.disponivel + 1,
                  unidades: [...row.unidades, unidade],
                }
              : row
          )
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao adicionar unidade"
        );
      } finally {
        setAddingUnitId(null);
      }
    });
  }

  function criarProduto() {
    setError(null);
    setSyncMsg(null);
    startSaveProduto(async () => {
      try {
        const token = getClientToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        const nome = novoNome.trim();
        const categoria = novaCategoria.trim();
        const valorAluguel = Number(novoValor.replace(",", "."));
        const quantidadeUnidades = Math.max(0, Math.floor(Number(novaQtd) || 0));
        if (nome.length < 2) throw new Error("Informe o nome do item");
        if (categoria.length < 2) throw new Error("Informe a categoria");
        if (!Number.isFinite(valorAluguel) || valorAluguel <= 0) {
          throw new Error("Valor de aluguel inválido");
        }
        const produto = await createProduto(
          {
            nome,
            categoria,
            valorAluguel,
            requerQr: novoRequerQr,
            quantidadeUnidades,
          },
          token
        );
        const novo = itemFromProduto(produto);
        setInventario((prev) =>
          [...prev, novo].sort((a, b) =>
            a.categoria === b.categoria
              ? a.nome.localeCompare(b.nome)
              : a.categoria.localeCompare(b.categoria)
          )
        );
        setProdutoId(novo.id);
        setNovoNome("");
        setNovaQtd("1");
        setSyncMsg(`Item "${produto.nome}" adicionado com ${produto.unidades.length} unidade(s).`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao cadastrar item"
        );
      }
    });
  }

  function excluirGrupo(item: InventarioItem) {
    const ok = window.confirm(
      `Excluir o grupo "${item.nome}" e todas as ${item.total} unidade(s)?`
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        await deleteProduto(item.id, token);
        setInventario((prev) => prev.filter((row) => row.id !== item.id));
        if (produtoId === item.id) {
          setProdutoId("");
        }
        if (expandedId === item.id) setExpandedId(null);
        setSyncMsg(`Grupo "${item.nome}" removido.`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao excluir grupo"
        );
      }
    });
  }

  function excluirUnidade(item: InventarioItem, unidadeId: string, label: string) {
    const ok = window.confirm(`Excluir a unidade "${label}"?`);
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        await deleteUnidade(item.id, unidadeId, token);
        setInventario((prev) =>
          prev.map((row) => {
            if (row.id !== item.id) return row;
            const unidades = row.unidades.filter((u) => u.id !== unidadeId);
            const removida = row.unidades.find((u) => u.id === unidadeId);
            return {
              ...row,
              unidades,
              total: unidades.length,
              disponivel:
                row.disponivel -
                (removida?.status === "DISPONIVEL" ? 1 : 0),
              reservada:
                row.reservada - (removida?.status === "RESERVADA" ? 1 : 0),
              emUso: row.emUso - (removida?.status === "EM_USO" ? 1 : 0),
              manutencao:
                row.manutencao -
                (removida?.status === "MANUTENCAO" ? 1 : 0),
            };
          })
        );
        setSyncMsg(`Unidade "${label}" removida.`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao excluir unidade"
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      {alertasQr.length > 0 ? (
        <section className="rounded-2xl border border-balloon-sun/35 bg-balloon-sun/10 px-4 py-3 neo-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="size-4 text-balloon-sun" />
            <p className="text-sm font-medium text-foreground">
              {alertasQr.length} alerta{alertasQr.length === 1 ? "" : "s"} QR
            </p>
          </div>
          <ul className="mt-3 space-y-2">
            {alertasQr.slice(0, 5).map((a) => (
              <li
                key={a.unidade.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span>
                  <span className="font-medium">{a.produto.nome}</span>
                  {" · "}
                  <span className="font-mono text-xs">{a.codigoQr}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.festaTema ?? "sem festa"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionTitle dot="bg-balloon-pink">Inventário</SectionTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Contagem de peças para fechar festa e comprar com antecedência o
              que faltar.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={sincronizar}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("size-4", syncing && "animate-spin")}
            />
            {syncing ? "Sincronizando…" : "Sincronizar catálogo"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl neo-sm p-4">
            <p className="section-label text-muted-foreground">Produtos</p>
            <p className="mt-1 font-display text-2xl text-balloon-pink">
              {inventario.length}
            </p>
          </div>
          <div className="rounded-2xl neo-sm p-4">
            <p className="section-label text-muted-foreground">Unidades</p>
            <p className="mt-1 font-display text-2xl text-balloon-sky">
              {totais.total}
            </p>
          </div>
          <div className="rounded-2xl neo-sm p-4">
            <p className="section-label text-muted-foreground">Disponíveis</p>
            <p className="mt-1 font-display text-2xl text-balloon-mint">
              {totais.disponivel}
              <span className="ml-2 text-sm text-muted-foreground">
                · {totais.reservada} reservadas
              </span>
            </p>
          </div>
        </div>

        {syncMsg ? (
          <p className="rounded-2xl neo-mint px-4 py-3 text-sm">{syncMsg}</p>
        ) : null}

        <div className="rounded-2xl neo-sm p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="balloon-dot bg-balloon-mint" />
            <h3 className="font-display text-lg text-foreground">
              Adicionar item
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="novo-nome">Nome</Label>
              <Input
                id="novo-nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex.: Escadinha dourada"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-categoria">Categoria</Label>
              <Input
                id="nova-categoria"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Acessórios"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-valor">Aluguel (R$)</Label>
              <Input
                id="novo-valor"
                inputMode="decimal"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-qtd">Qtd. unidades</Label>
              <Input
                id="nova-qtd"
                inputMode="numeric"
                value={novaQtd}
                onChange={(e) => setNovaQtd(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 accent-balloon-pink"
                checked={novoRequerQr}
                onChange={(e) => setNovoRequerQr(e.target.checked)}
              />
              Requer QR code
            </label>
            <Button
              type="button"
              onClick={criarProduto}
              disabled={savingProduto}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              {savingProduto ? "Salvando…" : "Adicionar ao inventário"}
            </Button>
          </div>
        </div>

        {inventario.length === 0 ? (
          <p className="rounded-2xl px-4 py-6 text-sm text-muted-foreground neo-sm">
            Inventário vazio. Adicione um item acima ou clique em{" "}
            <strong>Sincronizar catálogo</strong>.
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {inventario.map((item) => {
                const open = expandedId === item.id;
                return (
                  <article key={item.id} className="rounded-2xl p-4 neo-sm">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() =>
                        setExpandedId(open ? null : item.id)
                      }
                    >
                      <div>
                        <p className="font-medium">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.categoria}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg chip-mint px-2 py-1">
                        {item.disponivel} disp.
                      </span>
                      <span className="rounded-lg neo-inset px-2 py-1">
                        total {item.total}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={addingUnitId === item.id}
                        onClick={() => adicionarUnidade(item)}
                      >
                        <PackagePlus className="size-3.5" />
                        +1 unidade
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => excluirGrupo(item)}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir grupo
                      </Button>
                    </div>
                    {open ? (
                      <ul className="mt-3 space-y-2">
                        {item.unidades.map((u) => (
                          <li
                            key={u.id}
                            className="flex items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2 text-sm"
                          >
                            <span>
                              <span className="font-medium">
                                {u.etiqueta || u.codigoQr}
                              </span>
                              <span
                                className={cn(
                                  "ml-2 rounded-lg px-1.5 py-0.5 text-[10px]",
                                  STATUS_CLASS[u.status]
                                )}
                              >
                                {STATUS_LABEL[u.status] ?? u.status}
                              </span>
                            </span>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                excluirUnidade(
                                  item,
                                  u.id,
                                  u.etiqueta || u.codigoQr
                                )
                              }
                              aria-label="Excluir unidade"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="hidden space-y-2 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Disponível</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventario.map((item) => {
                    const open = expandedId === item.id;
                    return (
                      <InventoryTableRows
                        key={item.id}
                        item={item}
                        open={open}
                        addingUnitId={addingUnitId}
                        onToggle={() =>
                          setExpandedId(open ? null : item.id)
                        }
                        onAddUnit={() => adicionarUnidade(item)}
                        onDeleteGroup={() => excluirGrupo(item)}
                        onDeleteUnit={(unidadeId, label) =>
                          excluirUnidade(item, unidadeId, label)
                        }
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 border-t border-[var(--neo-dark)]/25 pt-8">
        <div>
          <SectionTitle dot="bg-balloon-sky">Disponibilidade</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta anti-overbooking por período (montagem → retorno + cura).
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl p-4 md:grid md:grid-cols-2 lg:grid-cols-4 neo-sm">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="produto">Produto</Label>
            <select
              id="produto"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="flex h-11 w-full rounded-2xl border-0 bg-[var(--neo-bg)] px-3 text-base shadow-[var(--shadow-neo-inset)] outline-none focus-visible:ring-3 focus-visible:ring-balloon-sky/30 md:h-9 md:text-sm"
            >
              {inventario.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicio">Início</Label>
            <Input
              id="inicio"
              type="datetime-local"
              className="h-11 text-base md:h-9 md:text-sm"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Fim</Label>
            <Input
              id="fim"
              type="datetime-local"
              className="h-11 text-base md:h-9 md:text-sm"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
          <div className="md:flex md:items-end">
            <Button
              type="button"
              onClick={consultar}
              disabled={pending || !produtoId}
              className="min-h-11 w-full gap-1.5 md:min-h-9"
            >
              <Search className="size-4" />
              {pending ? "Consultando…" : "Consultar"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
            {error}
          </p>
        ) : null}

        {resultado ? (
          <div className="rounded-2xl p-4 neo-sm">
            <p className="text-sm text-foreground">
              <span className="font-medium">{resultado.produto.nome}</span>
              {" — "}
              <span className="font-medium text-balloon-mint">
                {resultado.disponiveis}/{resultado.totalUnidades}
              </span>{" "}
              unidades livres no período
            </p>
            {resultado.unidades.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Sem estoque livre — a festa ainda pode ser fechada, com bandeira
                de compra antecipada.
              </p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {resultado.unidades.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-xl px-3 py-2.5 text-sm neo-inset"
                  >
                    <span className="font-medium">
                      {u.etiqueta || u.codigoQr}
                    </span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {u.codigoQr}
                    </span>
                    <span
                      className={cn(
                        "ml-2 rounded-lg px-1.5 py-0.5 text-[10px]",
                        STATUS_CLASS[u.status]
                      )}
                    >
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
