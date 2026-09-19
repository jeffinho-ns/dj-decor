import { Role } from "@prisma/client";

import { prisma } from "../prisma/client";
import { enviarPushSafe, enviarPushParaRolesSafe } from "./push.service";

/** Quem cobre o atendimento quando a conversa não tem dono. */
const PAPEIS_ATENDIMENTO = [Role.VENDEDOR, Role.GERENTE, Role.ADMIN];

function nomeDoContato(conversa: {
  contatoNome: string | null;
  contatoExterno: string | null;
  cliente: { nome: string } | null;
}): string {
  return (
    conversa.cliente?.nome ??
    conversa.contatoNome ??
    conversa.contatoExterno ??
    "Cliente"
  );
}

/**
 * A IA passou a conversa para um humano — é o alerta mais sensível a tempo
 * do sistema: tem cliente esperando resposta agora.
 */
export async function notificarHandoffAtendimento(
  conversaId: string,
  motivo?: string
): Promise<void> {
  const conversa = await prisma.conversa.findUnique({
    where: { id: conversaId },
    select: {
      vendedorId: true,
      contatoNome: true,
      contatoExterno: true,
      cliente: { select: { nome: true } },
    },
  });

  if (!conversa) return;

  const notificacao = {
    titulo: "Cliente pedindo atendente",
    corpo: motivo
      ? `${nomeDoContato(conversa)}: ${motivo}`
      : `${nomeDoContato(conversa)} está aguardando alguém assumir.`,
    url: `/atendimento?conversa=${conversaId}`,
    tag: `handoff-${conversaId}`,
    urgente: true,
    dados: { conversaId },
  };

  // Com dono definido, só ele é acordado; sem dono, o plantão inteiro.
  if (conversa.vendedorId) {
    enviarPushSafe([conversa.vendedorId], notificacao);
    return;
  }

  enviarPushParaRolesSafe(PAPEIS_ATENDIMENTO, notificacao);
}

/** A IA direcionou a conversa para um vendedor específico. */
export async function notificarConversaAtribuida(
  conversaId: string,
  vendedorId: string
): Promise<void> {
  const conversa = await prisma.conversa.findUnique({
    where: { id: conversaId },
    select: {
      contatoNome: true,
      contatoExterno: true,
      cliente: { select: { nome: true } },
    },
  });

  if (!conversa) return;

  enviarPushSafe([vendedorId], {
    titulo: "Conversa atribuída a você",
    corpo: `${nomeDoContato(conversa)} entrou em contato e é seu cliente.`,
    url: `/atendimento?conversa=${conversaId}`,
    tag: `atribuicao-${conversaId}`,
    dados: { conversaId },
  });
}

/**
 * Festa passou de 4h montada e continua na rua — mesmo gatilho do
 * WhatsApp da equipe, agora também no aparelho de quem vai desmontar.
 */
export function notificarDesmontagemPendente(params: {
  osId: string;
  festaId: string;
  tema: string;
  clienteNome: string;
  desmontadorId: string | null;
  montadorId: string | null;
}): void {
  const destinatarios = [params.desmontadorId, params.montadorId].filter(
    (id): id is string => Boolean(id)
  );

  const notificacao = {
    titulo: "Hora de conferir a desmontagem",
    corpo: `${params.tema} — ${params.clienteNome}. A festa já passou de 4h montada.`,
    url: `/montagem/${params.osId}`,
    tag: `desmontagem-${params.osId}`,
    urgente: true,
    dados: { osId: params.osId, festaId: params.festaId },
  };

  if (destinatarios.length > 0) {
    enviarPushSafe(destinatarios, notificacao);
    return;
  }

  enviarPushParaRolesSafe([Role.GERENTE, Role.ADMIN], notificacao);
}
