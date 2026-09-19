import webpush from "web-push";
import { Role } from "@prisma/client";
import { z } from "zod";

import { env } from "../config/env";
import { prisma } from "../prisma/client";

/** Payload entregue ao service worker do PWA. */
export interface PushNotificacao {
  titulo: string;
  corpo: string;
  /** Rota aberta ao tocar na notificação (relativa ao frontend). */
  url?: string;
  /**
   * Agrupa notificações do mesmo assunto — uma nova com a mesma tag
   * substitui a anterior em vez de empilhar na tela do celular.
   */
  tag?: string;
  /** Marca a notificação como urgente (vibra e insiste mais). */
  urgente?: boolean;
  dados?: Record<string, unknown>;
}

export const inscricaoSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  aparelho: z.string().max(120).optional(),
  plataforma: z.enum(["ios", "android", "desktop"]).optional(),
});

export type InscricaoInput = z.infer<typeof inscricaoSchema>;

/** Códigos que significam “essa inscrição morreu, pode apagar”. */
const STATUS_INSCRICAO_MORTA = new Set([404, 410]);

/** Após esse número de falhas seguidas, a inscrição é descartada. */
const MAX_FALHAS = 5;

let vapidConfigurado = false;

function configurarVapid(): boolean {
  if (vapidConfigurado) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  vapidConfigurado = true;
  return true;
}

export class PushService {
  /** Push só funciona se as chaves VAPID estiverem configuradas. */
  isEnabled(): boolean {
    return configurarVapid();
  }

  getPublicKey(): string | null {
    return env.VAPID_PUBLIC_KEY ?? null;
  }

  parseInscricao(body: unknown): InscricaoInput {
    return inscricaoSchema.parse(body);
  }

  /**
   * Registra o aparelho do usuário. O endpoint é único: se a mesma
   * inscrição voltar (reinstalação, outro login), ela é reaproveitada
   * e passa a pertencer ao usuário atual.
   */
  async inscrever(userId: string, input: InscricaoInput) {
    const registro = await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        aparelho: input.aparelho ?? null,
        plataforma: input.plataforma ?? null,
        userId,
      },
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        aparelho: input.aparelho ?? null,
        plataforma: input.plataforma ?? null,
        userId,
        falhas: 0,
      },
      select: {
        id: true,
        aparelho: true,
        plataforma: true,
        criadoEm: true,
      },
    });

    return registro;
  }

  async cancelar(userId: string, endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
  }

  async listarDoUsuario(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        aparelho: true,
        plataforma: true,
        criadoEm: true,
        ultimoEnvioEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });
  }

  /**
   * Envia para todos os aparelhos dos usuários informados.
   * Nunca lança: push é acessório, não pode derrubar a operação.
   */
  async enviarParaUsuarios(
    userIds: string[],
    notificacao: PushNotificacao
  ): Promise<{ enviados: number; removidos: number }> {
    if (userIds.length === 0) return { enviados: 0, removidos: 0 };
    if (!configurarVapid()) {
      console.warn("[push] VAPID não configurado — notificação ignorada");
      return { enviados: 0, removidos: 0 };
    }

    const inscricoes = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    if (inscricoes.length === 0) return { enviados: 0, removidos: 0 };

    const corpo = JSON.stringify(notificacao);
    let enviados = 0;
    const paraRemover: string[] = [];

    await Promise.all(
      inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: inscricao.endpoint,
              keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
            },
            corpo,
            {
              TTL: notificacao.urgente ? 300 : 3600,
              urgency: notificacao.urgente ? "high" : "normal",
            }
          );
          enviados++;
          await prisma.pushSubscription.update({
            where: { id: inscricao.id },
            data: { ultimoEnvioEm: new Date(), falhas: 0 },
          });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;

          if (status && STATUS_INSCRICAO_MORTA.has(status)) {
            paraRemover.push(inscricao.id);
            return;
          }

          const falhas = inscricao.falhas + 1;
          if (falhas >= MAX_FALHAS) {
            paraRemover.push(inscricao.id);
            return;
          }

          await prisma.pushSubscription.update({
            where: { id: inscricao.id },
            data: { falhas },
          });
        }
      })
    );

    if (paraRemover.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: paraRemover } },
      });
    }

    return { enviados, removidos: paraRemover.length };
  }

  /** Envia para todos os usuários ativos com os papéis informados. */
  async enviarParaRoles(
    roles: Role[],
    notificacao: PushNotificacao
  ): Promise<{ enviados: number; removidos: number }> {
    const usuarios = await prisma.user.findMany({
      where: { role: { in: roles }, ativo: true },
      select: { id: true },
    });

    return this.enviarParaUsuarios(
      usuarios.map((u) => u.id),
      notificacao
    );
  }
}

export const pushService = new PushService();

/**
 * Dispara sem bloquear o fluxo que chamou (padrão do dispatchWhatsAppSafe).
 * Use em handlers de rota — o colaborador não deve esperar o push sair.
 */
export function enviarPushSafe(
  userIds: string[],
  notificacao: PushNotificacao
): void {
  void pushService.enviarParaUsuarios(userIds, notificacao).catch((err) => {
    console.error(
      "[push] falha ao enviar:",
      err instanceof Error ? err.message : err
    );
  });
}

export function enviarPushParaRolesSafe(
  roles: Role[],
  notificacao: PushNotificacao
): void {
  void pushService.enviarParaRoles(roles, notificacao).catch((err) => {
    console.error(
      "[push] falha ao enviar por papel:",
      err instanceof Error ? err.message : err
    );
  });
}
