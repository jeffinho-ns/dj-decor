import { ModoAtendimento, Role } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { atendimentoService } from "./atendimento.service";
import {
  AGENT_TOOL_DEFINITIONS,
  atendimentoToolsService,
} from "./atendimento-tools.service";

const SYSTEM_PROMPT = `Você é a vendedora virtual da Débora Pimentel Decoradora (Paracambi - RJ | Instagram @deborapimenteldecoradora).
Atende clientes no WhatsApp/Instagram com tom caloroso, claro e profissional em português do Brasil.

Regras:
- Ajude a montar a festa com o catálogo (kits, pegue e monte, add-ons). Taxa de leva/busca no pegue e monte: R$30.
- Sempre use as tools para preços, agenda e criação — não invente valores.
- Antes de criar orçamento/festa, confirme com o cliente: data, horário, local, valor total e sinal.
- Sinal: o valor pago não é devolvido em desistência; fica crédito por até 12 meses.
- Saldo restante deve ser quitado até a véspera do evento (PIX, espécie ou cartão).
- Se o cliente já fez festa conosco, transfira para o vendedor anterior com transferir_para_vendedor.
- Em dúvida de preço especial, reclamação ou pedido fora do catálogo: use escalar_humano.
- Respostas curtas (WhatsApp), com emojis com moderação.
- Não invente disponibilidade de estoque físico detalhada; use checar_agenda para o dia.
`;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export class AtendimentoAgentService {
  isEnabled(): boolean {
    return Boolean(env.OPENAI_API_KEY);
  }

  /**
   * Processa a última mensagem do cliente e envia resposta (se modo AI).
   */
  async handleInbound(conversaId: string): Promise<{
    ran: boolean;
    reply?: string;
    reason?: string;
  }> {
    if (!this.isEnabled()) {
      return { ran: false, reason: "OPENAI_API_KEY não configurada" };
    }

    const conversa = await atendimentoService.getById(conversaId);
    if (conversa.modo !== ModoAtendimento.AI) {
      return { ran: false, reason: "conversa em modo humano" };
    }
    if (conversa.status === "FECHADA") {
      return { ran: false, reason: "conversa fechada" };
    }

    // Handoff automático se recorrente e ainda AI sem vendedor
    if (conversa.clienteId && !conversa.vendedorId) {
      const sug = await atendimentoService.sugerirVendedorRecorrente(
        conversa.clienteId
      );
      if (sug) {
        await atendimentoService.assign(
          conversaId,
          { vendedorId: sug.vendedorId },
          sug.vendedorId
        );
        const texto =
          `Oi! Vi que você já fez festa com a gente 🎈 ` +
          `Vou te passar para ${sug.vendedorNome}, que já te atendeu antes. ` +
          `Em instantes ela(e) continua por aqui!`;
        await atendimentoService.appendOutbound({
          conversaId,
          texto,
          autorTipo: "AI",
          sendToProvider: true,
        });
        return { ran: true, reply: texto, reason: "handoff_recorrente" };
      }
    }

    const fallbackVendedorId = await this.resolveFallbackVendedorId(
      conversa.vendedorId
    );

    const history = conversa.mensagens.slice(-20).map((m) => {
      if (m.direcao === "IN") {
        return {
          role: "user" as const,
          content: m.texto || "[mídia]",
        };
      }
      return {
        role: "assistant" as const,
        content: m.texto || "",
      };
    });

    const contextBlock = [
      `ConversaId: ${conversa.id}`,
      `Canal: ${conversa.canal}`,
      `Contato: ${conversa.contatoNome ?? "—"} / ${conversa.contatoExterno ?? conversa.externalThreadId}`,
      `ClienteId: ${conversa.clienteId ?? "não vinculado"}`,
      `FestaId vinculada: ${conversa.festaId ?? "nenhuma"}`,
    ].join("\n");

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Contexto:\n${contextBlock}` },
      ...history,
    ];

    let replyText = "";
    for (let step = 0; step < 6; step++) {
      const completion = await this.chat(messages);
      const choice = completion.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls?.length) {
        messages.push({
          role: "assistant",
          content: choice.content ?? null,
          tool_calls: choice.tool_calls,
        });
        for (const call of choice.tool_calls) {
          const toolResult = await atendimentoToolsService.execute(
            conversaId,
            call.function.name,
            call.function.arguments,
            fallbackVendedorId
          );
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      replyText = (choice.content ?? "").trim();
      break;
    }

    if (!replyText) {
      replyText =
        "Recebi sua mensagem! Em instantes te ajudo a montar a decoração ✨";
    }

    // Se a tool transferiu/escalou, não forçar resposta se modo mudou
    const atual = await atendimentoService.getById(conversaId);
    if (atual.modo !== ModoAtendimento.AI) {
      if (replyText) {
        await atendimentoService.appendOutbound({
          conversaId,
          texto: replyText,
          autorTipo: "AI",
          sendToProvider: true,
        });
      }
      return { ran: true, reply: replyText, reason: "handoff_apos_tools" };
    }

    await atendimentoService.appendOutbound({
      conversaId,
      texto: replyText,
      autorTipo: "AI",
      sendToProvider: true,
    });

    return { ran: true, reply: replyText };
  }

  private async resolveFallbackVendedorId(
    preferred: string | null
  ): Promise<string> {
    if (preferred) return preferred;
    const admin = await prisma.user.findFirst({
      where: { ativo: true, role: { in: [Role.ADMIN, Role.GERENTE, Role.VENDEDOR] } },
      orderBy: [{ role: "asc" }, { nome: "asc" }],
      select: { id: true },
    });
    if (!admin) throw new Error("Nenhum usuário ativo para atribuir festa");
    return admin.id;
  }

  private async chat(messages: ChatMessage[]): Promise<{
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>;
      };
    }>;
  }> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5.2",
        messages,
        tools: AGENT_TOOL_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    return (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };
  }
}

export const atendimentoAgentService = new AtendimentoAgentService();
