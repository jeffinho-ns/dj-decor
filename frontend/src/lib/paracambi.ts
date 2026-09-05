/**
 * Endereço parece fora de Paracambi (Suellem 30%) quando o texto
 * não contém "paracambi" (case insensitive). Endereços curtos/vazios
 * não disparam o alerta para evitar falso positivo no formulário.
 */
export function enderecoPareceForaParacambi(
  endereco: string | null | undefined,
  opts?: { minLength?: number }
): boolean {
  const t = (endereco ?? "").trim();
  const min = opts?.minLength ?? 5;
  if (t.length < min) return false;
  return !t.toLowerCase().includes("paracambi");
}
