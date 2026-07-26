import { isSameDay, parseISO } from "date-fns";

import type { Festa } from "@/types/festa";

/**
 * Retorna as festas cujo `dataEvento` cai no dia informado (dia local),
 * ordenadas por `horarioMontagem`. Festas sem `horarioMontagem` vão para
 * o final da lista.
 */
export function festasDoDia(festas: Festa[], day: Date = new Date()): Festa[] {
  return festas
    .filter((festa) => {
      if (!festa.dataEvento) return false;
      try {
        return isSameDay(parseISO(festa.dataEvento), day);
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const aTime = parseTime(a.horarioMontagem);
      const bTime = parseTime(b.horarioMontagem);
      return aTime - bTime;
    });
}

function parseTime(value: string | undefined | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}
