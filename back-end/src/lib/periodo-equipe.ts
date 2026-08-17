export type FrequenciaPagamentoEquipe = "SEMANAL" | "QUINZENAL" | "MENSAL";

/** YYYY-MM-DD no fuso America/Sao_Paulo. */
export function ymdBrasil(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Meio-dia UTC do dia civil — estável para gravar só a data. */
export function inicioDiaBrasil(date: Date): Date {
  const [year, month, day] = ymdBrasil(date).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function ymdToUtcNoon(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function addDaysYmd(ymd: string, days: number): string {
  const dt = ymdToUtcNoon(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatYmdBr(ymd: string): string {
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function labelPeriodo(inicioYmd: string, fimYmd: string): string {
  const [yi, mi] = inicioYmd.split("-").map(Number);
  const [yf, mf] = fimYmd.split("-").map(Number);
  if (yi === yf && mi === mf && inicioYmd.slice(8) === "01") {
    const last = toYmd(yi, mi, lastDayOfMonth(yi, mi));
    if (fimYmd === last) {
      return `${MESES[mi - 1]} de ${yi}`;
    }
  }
  if (inicioYmd === fimYmd) return formatYmdBr(inicioYmd);
  if (yi === yf && mi === mf) {
    return `${formatYmdBr(inicioYmd).slice(0, 5)} a ${formatYmdBr(fimYmd)}`;
  }
  return `${formatYmdBr(inicioYmd)} a ${formatYmdBr(fimYmd)}`;
}

function periodoSemanal(refYmd: string): { inicioYmd: string; fimYmd: string } {
  const dow = ymdToUtcNoon(refYmd).getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  const inicioYmd = addDaysYmd(refYmd, -daysFromMonday);
  return { inicioYmd, fimYmd: addDaysYmd(inicioYmd, 6) };
}

function periodoQuinzenal(refYmd: string): {
  inicioYmd: string;
  fimYmd: string;
} {
  const [year, month, day] = refYmd.split("-").map(Number);
  if (day <= 15) {
    return {
      inicioYmd: toYmd(year, month, 1),
      fimYmd: toYmd(year, month, 15),
    };
  }
  return {
    inicioYmd: toYmd(year, month, 16),
    fimYmd: toYmd(year, month, lastDayOfMonth(year, month)),
  };
}

function periodoMensal(refYmd: string): { inicioYmd: string; fimYmd: string } {
  const [year, month] = refYmd.split("-").map(Number);
  return {
    inicioYmd: toYmd(year, month, 1),
    fimYmd: toYmd(year, month, lastDayOfMonth(year, month)),
  };
}

function shiftRef(
  frequencia: FrequenciaPagamentoEquipe,
  refYmd: string,
  offset: number
): string {
  if (offset === 0) return refYmd;
  if (frequencia === "SEMANAL") {
    return addDaysYmd(refYmd, offset * 7);
  }
  if (frequencia === "MENSAL") {
    const [year, month, day] = refYmd.split("-").map(Number);
    const dt = new Date(Date.UTC(year, month - 1 + offset, Math.min(day, 28), 12, 0, 0));
    return dt.toISOString().slice(0, 10);
  }
  const halves = offset;
  const [year, month, day] = refYmd.split("-").map(Number);
  let idx = year * 24 + (month - 1) * 2 + (day <= 15 ? 0 : 1) + halves;
  if (idx < 0) idx = 0;
  const y = Math.floor(idx / 24);
  const rest = idx % 24;
  const m = Math.floor(rest / 2) + 1;
  const half = rest % 2;
  return toYmd(y, m, half === 0 ? 1 : 16);
}

export function periodoEquipe(
  frequencia: FrequenciaPagamentoEquipe,
  offset = 0,
  agora = new Date()
): { inicioYmd: string; fimYmd: string; label: string } {
  const refYmd = shiftRef(frequencia, ymdBrasil(agora), offset);
  const bounds =
    frequencia === "SEMANAL"
      ? periodoSemanal(refYmd)
      : frequencia === "QUINZENAL"
        ? periodoQuinzenal(refYmd)
        : periodoMensal(refYmd);
  return {
    ...bounds,
    label: labelPeriodo(bounds.inicioYmd, bounds.fimYmd),
  };
}

export function ymdNoPeriodo(
  ymd: string,
  inicioYmd: string,
  fimYmd: string
): boolean {
  return ymd >= inicioYmd && ymd <= fimYmd;
}
