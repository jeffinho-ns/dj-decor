import {
  StatusFesta,
  TamanhoDecoracao,
  TipoAtendimentoEvento,
  TipoPagamento,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { catalogoService } from "./catalogo.service";
import { festasService } from "./festas.service";
import { pagamentosService } from "./pagamentos.service";
import { portalService } from "./portal.service";
import { pdfAdapter } from "../integrations/pdf";
import { prisma } from "../prisma/client";
import { atendimentoService } from "./atendimento.service";
import { env } from "../config/env";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const AGENT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "buscar_cliente_por_telefone",
      description: "Busca cliente cadastrado pelo telefone e retorna histórico resumido.",
      parameters: {
        type: "object",
        properties: {
          telefone: { type: "string" },
        },
        required: ["telefone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "historico_festas",
      description: "Lista festas anteriores de um clienteId.",
      parameters: {
        type: "object",
        properties: {
          clienteId: { type: "string" },
        },
        required: ["clienteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_catalogo",
      description: "Lista kits e add-ons disponíveis com preços (equipe e pegue e monte).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "montar_orcamento",
      description:
        "Calcula um orçamento sugerido a partir de kit, modo pegue e monte e add-ons.",
      parameters: {
        type: "object",
        properties: {
          kitId: { type: "string" },
          pegueEMonte: { type: "boolean" },
          addonIds: { type: "array", items: { type: "string" } },
          taxaEntrega: {
            type: "boolean",
            description: "Montador leva e busca (+R$30) no pegue e monte",
          },
        },
        required: ["kitId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "checar_agenda",
      description:
        "Verifica quantas festas já existem no dia e se há risco de conflito de montagem.",
      parameters: {
        type: "object",
        properties: {
          dataEvento: {
            type: "string",
            description: "ISO date ou YYYY-MM-DD",
          },
          horarioMontagem: {
            type: "string",
            description: "ISO datetime preferencial",
          },
        },
        required: ["dataEvento"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_orcamento_festa",
      description:
        "Cria uma festa/orçamento no sistema após o cliente confirmar data, valor e dados. Só use com confirmação explícita.",
      parameters: {
        type: "object",
        properties: {
          nomeCliente: { type: "string" },
          telefone: { type: "string" },
          tema: { type: "string" },
          dataEvento: { type: "string" },
          horarioMontagem: { type: "string" },
          endereco: { type: "string" },
          valor: { type: "number" },
          tamanhoDecoracao: {
            type: "string",
            enum: ["P", "M", "G", "GG"],
          },
          kitCatalogo: { type: "string" },
          pegueEMonte: { type: "boolean" },
          itensExtras: { type: "array", items: { type: "string" } },
          observacoes: { type: "string" },
          confirmadoPeloCliente: { type: "boolean" },
        },
        required: [
          "nomeCliente",
          "telefone",
          "tema",
          "dataEvento",
          "horarioMontagem",
          "endereco",
          "valor",
          "confirmadoPeloCliente",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_sinal",
      description:
        "Registra pagamento de sinal/entrada (PENDENTE) na festa. O cliente ainda precisa enviar comprovante para confirmação.",
      parameters: {
        type: "object",
        properties: {
          festaId: { type: "string" },
          valor: { type: "number" },
          tipo: {
            type: "string",
            enum: ["PIX", "DINHEIRO", "CARTAO", "OUTRO"],
          },
        },
        required: ["festaId", "valor"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "gerar_link_portal",
      description: "Gera link público do portal do cliente para a festa.",
      parameters: {
        type: "object",
        properties: { festaId: { type: "string" } },
        required: ["festaId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "gerar_contrato",
      description: "Gera o PDF de contrato da festa.",
      parameters: {
        type: "object",
        properties: { festaId: { type: "string" } },
        required: ["festaId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transferir_para_vendedor",
      description:
        "Transfere a conversa para um vendedor humano (cliente recorrente ou pedido do cliente).",
      parameters: {
        type: "object",
        properties: {
          vendedorId: { type: "string" },
          motivo: { type: "string" },
        },
        required: ["motivo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_nota_interna",
      description:
        "Registra alteração da decoração pedida pelo cliente (ex.: trocar mesa quadrada por redonda, cilindros de madeira por acrílico). A equipe de montagem vê na agenda. Use sempre que o cliente pedir troca de peça ou ajuste da montagem.",
      parameters: {
        type: "object",
        properties: {
          nota: {
            type: "string",
            description:
              "Texto curto da alteração, ex.: 'Trocar mesa quadrada pela redonda'",
          },
        },
        required: ["nota"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "escalar_humano",
      description:
        "Pausa a IA e coloca a conversa aguardando um humano (dúvida complexa, desconto, reclamação).",
      parameters: {
        type: "object",
        properties: { motivo: { type: "string" } },
        required: ["motivo"],
      },
    },
  },
];

export class AtendimentoToolsService {
  async execute(
    conversaId: string,
    name: string,
    argsJson: string,
    fallbackVendedorId: string
  ): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
    } catch {
      args = {};
    }

    await atendimentoService.registrarEvento(
      conversaId,
      TipoAtendimentoEvento.TOOL_CALL,
      { name, args } as Prisma.InputJsonValue
    );

    let result: unknown;
    try {
      result = await this.dispatch(conversaId, name, args, fallbackVendedorId);
    } catch (err) {
      result = {
        ok: false,
        error: err instanceof Error ? err.message : "Erro na tool",
      };
    }

    await atendimentoService.registrarEvento(
      conversaId,
      TipoAtendimentoEvento.TOOL_RESULT,
      { name, result } as Prisma.InputJsonValue
    );

    return result;
  }

  private async dispatch(
    conversaId: string,
    name: string,
    args: Record<string, unknown>,
    fallbackVendedorId: string
  ): Promise<unknown> {
    switch (name) {
      case "buscar_cliente_por_telefone": {
        const telefone = String(args.telefone ?? "");
        const cliente = await atendimentoService.findClienteByTelefone(telefone);
        if (!cliente) return { encontrado: false };
        const sugerido = await atendimentoService.sugerirVendedorRecorrente(
          cliente.id
        );
        return {
          encontrado: true,
          cliente: {
            id: cliente.id,
            nome: cliente.nome,
            telefone: cliente.telefone,
            origem: cliente.origem,
          },
          vendedorAnterior: sugerido,
        };
      }

      case "historico_festas": {
        const clienteId = String(args.clienteId ?? "");
        const festas = await prisma.festa.findMany({
          where: { clienteId, status: { not: StatusFesta.CANCELADO } },
          orderBy: { dataEvento: "desc" },
          take: 10,
          select: {
            id: true,
            tema: true,
            dataEvento: true,
            valor: true,
            status: true,
            vendedor: { select: { id: true, nome: true } },
          },
        });
        return { festas };
      }

      case "listar_catalogo": {
        const { kits, addons } = await catalogoService.listPublico();
        return {
          kits: kits.map((k) => ({
            id: k.id,
            nome: k.nome,
            categoria: k.categoria,
            descricao: k.descricaoCurta,
            valorEquipe: Number(k.valorEquipe),
            valorPegueEMonte: k.valorPegueEMonte
              ? Number(k.valorPegueEMonte)
              : null,
            tamanhoSugerido: k.tamanhoSugerido,
            itens: k.itens,
          })),
          addons: addons.map((a) => ({
            id: a.id,
            nome: a.nome,
            valor: Number(a.valor),
            tipo: a.tipo,
          })),
          taxaEntregaPegueMonte: 30,
        };
      }

      case "montar_orcamento": {
        const kitId = String(args.kitId ?? "");
        const pegueEMonte = Boolean(args.pegueEMonte);
        const taxaEntrega = Boolean(args.taxaEntrega);
        const addonIds = Array.isArray(args.addonIds)
          ? args.addonIds.map(String)
          : [];
        const kit = await prisma.catalogoKit.findUnique({ where: { id: kitId } });
        if (!kit) return { ok: false, error: "Kit não encontrado" };
        const base = pegueEMonte
          ? Number(kit.valorPegueEMonte ?? kit.valorEquipe)
          : Number(kit.valorEquipe);
        const addons = await prisma.catalogoAddon.findMany({
          where: { id: { in: addonIds }, ativo: true },
        });
        const valorAddons = addons.reduce((s, a) => s + Number(a.valor), 0);
        const taxa = pegueEMonte && taxaEntrega ? 30 : 0;
        return {
          ok: true,
          kit: kit.nome,
          valorBase: base,
          valorAddons,
          valorTaxa: taxa,
          total: base + valorAddons + taxa,
          itens: [...kit.itens, ...addons.map((a) => a.nome)],
        };
      }

      case "checar_agenda": {
        const dataEvento = new Date(String(args.dataEvento));
        if (Number.isNaN(dataEvento.getTime())) {
          return { ok: false, error: "dataEvento inválida" };
        }
        const festas = await prisma.festa.findMany({
          where: {
            status: { not: StatusFesta.CANCELADO },
            dataEvento: {
              gte: startOfDay(dataEvento),
              lte: endOfDay(dataEvento),
            },
          },
          select: {
            id: true,
            tema: true,
            horarioMontagem: true,
            status: true,
            cliente: { select: { nome: true } },
          },
        });
        let conflitoProximo = false;
        if (args.horarioMontagem) {
          const alvo = new Date(String(args.horarioMontagem)).getTime();
          conflitoProximo = festas.some(
            (f) => Math.abs(f.horarioMontagem.getTime() - alvo) < 3 * 60 * 60 * 1000
          );
        }
        return {
          ok: true,
          festasNoDia: festas.length,
          conflitoProximo,
          detalhe: festas.map((f) => ({
            tema: f.tema,
            cliente: f.cliente.nome,
            montagem: f.horarioMontagem.toISOString(),
            status: f.status,
          })),
        };
      }

      case "criar_orcamento_festa": {
        if (!args.confirmadoPeloCliente) {
          return {
            ok: false,
            error:
              "Peça confirmação explícita do cliente antes de criar o orçamento.",
          };
        }
        const conversa = await atendimentoService.getById(conversaId);
        const vendedorId = conversa.vendedorId ?? fallbackVendedorId;
        const tamanho = (String(args.tamanhoDecoracao ?? "M") ||
          "M") as TamanhoDecoracao;
        const festa = await festasService.create(
          {
            nomeCliente: String(args.nomeCliente),
            telefone: String(args.telefone),
            tema: String(args.tema),
            dataEvento: String(args.dataEvento),
            horarioMontagem: String(args.horarioMontagem),
            endereco: String(args.endereco),
            valor: Number(args.valor),
            tamanhoDecoracao: tamanho,
            kitCatalogo: args.kitCatalogo ? String(args.kitCatalogo) : null,
            pegueEMonte: Boolean(args.pegueEMonte),
            itensExtras: Array.isArray(args.itensExtras)
              ? args.itensExtras.map(String)
              : [],
            observacoes: args.observacoes
              ? String(args.observacoes)
              : "Criado pelo atendimento IA",
            status: StatusFesta.ORCAMENTO,
            origem: conversa.canal === "INSTAGRAM" ? "Instagram" : "WhatsApp",
            vendedorId,
          },
          vendedorId
        );
        await atendimentoService.vincularFesta(conversaId, festa.id);
        return {
          ok: true,
          festaId: festa.id,
          tema: festa.tema,
          valor: Number(festa.valor),
          status: festa.status,
          portalToken: festa.portalToken,
        };
      }

      case "registrar_sinal": {
        const festaId = String(args.festaId);
        const valor = Number(args.valor);
        const tipo = (String(args.tipo ?? "PIX") || "PIX") as TipoPagamento;
        const pagamento = await pagamentosService.create(festaId, {
          valor,
          tipo,
        });
        const config = await prisma.configuracaoNegocio.findUnique({
          where: { id: "default" },
        });
        return {
          ok: true,
          pagamentoId: pagamento.id,
          valor: Number(pagamento.valor),
          status: pagamento.status,
          tipo: pagamento.tipo,
          instrucao:
            "Peça o comprovante PIX. O pagamento fica PENDENTE até confirmação humana no sistema.",
          pixContato:
            config?.whatsappEmpresa ??
            config?.telefoneEmpresa ??
            "conforme combinado",
        };
      }

      case "gerar_link_portal": {
        const link = await portalService.buildPortalLink(String(args.festaId));
        return { ok: true, ...link };
      }

      case "gerar_contrato": {
        const contrato = await pdfAdapter.gerarContratoLocacao(
          String(args.festaId)
        );
        return {
          ok: true,
          contratoId: contrato.id,
          geradoEm: contrato.geradoEm,
          downloadHint: `${env.FRONTEND_URL}/vendas (baixar PDF no painel da festa)`,
        };
      }

      case "transferir_para_vendedor": {
        let vendedorId = args.vendedorId ? String(args.vendedorId) : null;
        if (!vendedorId) {
          const conversa = await atendimentoService.getById(conversaId);
          if (conversa.clienteId) {
            const sug = await atendimentoService.sugerirVendedorRecorrente(
              conversa.clienteId
            );
            vendedorId = sug?.vendedorId ?? null;
          }
        }
        if (!vendedorId) {
          const lista = await atendimentoService.listVendedores();
          vendedorId = lista[0]?.id ?? null;
        }
        if (!vendedorId) {
          return { ok: false, error: "Nenhum vendedor disponível" };
        }
        const atualizada = await atendimentoService.assign(
          conversaId,
          { vendedorId },
          fallbackVendedorId
        );
        return {
          ok: true,
          vendedorId,
          vendedorNome: atualizada.vendedor?.nome ?? null,
          motivo: String(args.motivo ?? ""),
        };
      }

      case "registrar_nota_interna": {
        const nota = String(args.nota ?? "").trim();
        if (!nota) return { ok: false, error: "Nota vazia" };
        const atualizada = await atendimentoService.appendNotaInterna(
          conversaId,
          nota
        );
        return {
          ok: true,
          notasInternas: atualizada.notasInternas,
          festaId: atualizada.festaId,
        };
      }

      case "escalar_humano": {
        await prisma.conversa.update({
          where: { id: conversaId },
          data: {
            modo: "HUMANO",
            status: "AGUARDANDO",
          },
        });
        await atendimentoService.registrarEvento(
          conversaId,
          TipoAtendimentoEvento.HANDOFF,
          { motivo: String(args.motivo ?? "escalar_humano") }
        );
        return { ok: true, modo: "HUMANO", status: "AGUARDANDO" };
      }

      default:
        return { ok: false, error: `Tool desconhecida: ${name}` };
    }
  }
}

export const atendimentoToolsService = new AtendimentoToolsService();
