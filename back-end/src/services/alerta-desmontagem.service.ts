import { StatusFesta } from "@prisma/client";
import { dispatchWhatsAppSafe } from "../integrations/whatsapp";
import { prisma } from "../prisma/client";

/** Horas após o horário de montagem para avisar a equipe sobre desmontagem. */
export const ALERTA_DESMONTAGEM_HORAS = 4;

/** Intervalo do worker (ms). */
export const ALERTA_DESMONTAGEM_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Números da equipe que recebem o alerta de “festa pode estar acabando”.
 * Formato E.164 sem + (Meta Cloud API).
 */
export const EQUIPE_ALERTA_DESMONTAGEM: { nome: string; telefone: string }[] = [
  { nome: "Debora", telefone: "5521991806475" },
  { nome: "Jonathan", telefone: "5521995001805" },
  { nome: "Jefferson", telefone: "5511943501097" },
];

function formatHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDataCurta(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export class AlertaDesmontagemService {
  /**
   * Busca festas montadas, ainda na rua, com ≥4h desde o horário de montagem,
   * e dispara WhatsApp para a equipe (uma vez por OS).
   */
  async processar(): Promise<{ enviados: number; candidatos: number }> {
    const agora = new Date();
    const limite = new Date(
      agora.getTime() - ALERTA_DESMONTAGEM_HORAS * 60 * 60 * 1000
    );

    const candidatas = await prisma.ordemServico.findMany({
      where: {
        montagemLocalConcluida: true,
        retornoConcluido: false,
        alertaDesmontagemEnviadoEm: null,
        festa: {
          pegueEMonte: false,
          status: {
            in: [
              StatusFesta.EM_MONTAGEM,
              StatusFesta.CONCLUIDO,
              StatusFesta.PAGO,
              StatusFesta.FECHADO,
            ],
          },
          horarioMontagem: { lte: limite },
        },
      },
      include: {
        festa: {
          include: {
            cliente: { select: { nome: true, telefone: true } },
          },
        },
        desmontador: { select: { nome: true } },
        montador: { select: { nome: true } },
      },
      take: 40,
    });

    let enviados = 0;

    for (const os of candidatas) {
      const festa = os.festa;
      const horario = festa.horarioMontagem;

      // Dupla condição: montada no sistema + ≥4h após horário de montagem
      if (!os.montagemLocalConcluida) continue;
      if (agora.getTime() < horario.getTime() + ALERTA_DESMONTAGEM_HORAS * 3600_000) {
        continue;
      }

      const payload = {
        tema: festa.tema,
        data: festa.dataEvento.toISOString(),
        endereco: festa.endereco,
        clienteNome: festa.cliente.nome,
        horarioMontagem: horario.toISOString(),
        horarioMontagemFmt: `${formatDataCurta(horario)} ${formatHora(horario)}`,
        desmontadorNome: os.desmontador?.nome ?? null,
        montadorNome: os.montador?.nome ?? null,
        horasAposMontagem: ALERTA_DESMONTAGEM_HORAS,
      };

      for (const membro of EQUIPE_ALERTA_DESMONTAGEM) {
        dispatchWhatsAppSafe({
          template: "alerta_desmontagem_equipe",
          telefone: membro.telefone,
          festaId: festa.id,
          payload: {
            ...payload,
            destinatarioNome: membro.nome,
          },
        });
      }

      await prisma.ordemServico.update({
        where: { id: os.id },
        data: { alertaDesmontagemEnviadoEm: agora },
      });
      enviados++;
    }

    if (enviados > 0) {
      console.log(
        `[alerta-desmontagem] ${enviados} festa(s) — WhatsApp para equipe`
      );
    }

    return { enviados, candidatos: candidatas.length };
  }
}

export const alertaDesmontagemService = new AlertaDesmontagemService();

let workerStarted = false;

/** Inicia o worker em background (idempotente). */
export function startAlertaDesmontagemWorker(): void {
  if (workerStarted) return;
  workerStarted = true;

  const tick = () => {
    void alertaDesmontagemService.processar().catch((err) => {
      console.error(
        "[alerta-desmontagem] falha no ciclo:",
        err instanceof Error ? err.message : err
      );
    });
  };

  // Primeiro ciclo após 30s (deixa o server aquecer)
  setTimeout(tick, 30_000);
  setInterval(tick, ALERTA_DESMONTAGEM_INTERVAL_MS);
  console.log(
    `[alerta-desmontagem] worker ativo (a cada ${ALERTA_DESMONTAGEM_INTERVAL_MS / 60000} min, limiar ${ALERTA_DESMONTAGEM_HORAS}h)`
  );
}
