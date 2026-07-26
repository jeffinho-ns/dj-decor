import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Festa } from "@/types/festa";

export function toDayKey(date: Date | string): string {
  const value = typeof date === "string" ? parseISO(date) : date;
  return format(value, "yyyy-MM-dd");
}

export function groupFestasByDay(festas: Festa[]): Map<string, Festa[]> {
  const map = new Map<string, Festa[]>();

  for (const festa of festas) {
    const key = toDayKey(festa.dataEvento);
    const list = map.get(key) ?? [];
    list.push(festa);
    map.set(key, list);
  }

  for (const [key, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.horarioMontagem).getTime() -
          new Date(b.horarioMontagem).getTime() ||
        new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime()
    );
    map.set(key, list);
  }

  return map;
}

export function getMonthGridDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function formatMonthTitle(month: Date): string {
  return format(month, "MMMM yyyy", { locale: ptBR });
}

export function dayMeta(
  day: Date,
  currentMonth: Date,
  selectedDay: Date | null
) {
  return {
    key: toDayKey(day),
    inMonth: isSameMonth(day, currentMonth),
    isToday: isToday(day),
    isSelected: selectedDay ? isSameDay(day, selectedDay) : false,
  };
}

export function monthSummary(festas: Festa[], month: Date) {
  const inMonth = festas.filter((festa) =>
    isSameMonth(parseISO(festa.dataEvento), month)
  );
  return {
    total: inMonth.length,
    fechadas: inMonth.filter((festa) => festa.status === "FECHADO").length,
    orcamentos: inMonth.filter((festa) => festa.status === "ORCAMENTO").length,
  };
}
