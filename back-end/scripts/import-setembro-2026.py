#!/usr/bin/env python3
"""Importa festas de setembro/2026 da planilha operacional via API."""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

API = "https://dj-decor.onrender.com"
YEAR = 2026
TAG = "import-setembro-2026"


@dataclass
class Row:
    cliente: str
    contato: str
    modelo: str
    tema: str
    bolas: str
    data: str
    valor: float | None
    sinal: str
    resta: str
    vendedor: str
    local: str
    hr: str
    obs: str
    valor_nota: str = ""


ROWS: list[Row] = [
    Row(
        "Melissa",
        "21973128472",
        "pocket// pegue e monte",
        "bolofofo menina",
        "x",
        "12/09",
        150,
        "100",
        "",
        "Rodrigo",
        "x",
        "x",
        "x",
    ),
    Row(
        "Rafaella Vaz",
        "",
        "pacote green hall",
        "tema bluey",
        "230 pg pro marcelo",
        "12/09",
        600,
        "",
        "tudo pago",
        "Lorena",
        "gren hall",
        "16hs",
        "",
    ),
    Row(
        "Vitoria Kelly",
        "21966598653",
        "pegue e monte",
        "pocket flamengo",
        "x",
        "19/09",
        100,
        "",
        "tudo pago",
        "Lorena",
        "x",
        "x",
        "x",
    ),
    Row(
        "Pamela",
        "99419-1536",
        "Mesa retangular tend, tapete crochê e fundo livre 1 arranjo branco",
        "",
        "",
        "19/09",
        250,
        "100",
        "",
        "Debora",
        "Igreja católica Lages",
        "10hs",
        "10 toalhas brancas",
    ),
    Row(
        "Iara Baia",
        "",
        "pacote arena",
        "patrulha",
        "",
        "19/09",
        600,
        "150",
        "",
        "Lorena",
        "arena castro",
        "12hs",
        "",
    ),
    Row(
        "Samara",
        "",
        "jardim",
        "borboletas led",
        "",
        "19/09",
        None,
        "",
        "",
        "Debora",
        "gren hall",
        "18hs",
        "",
        valor_nota="pacote kelly — valor numérico não informado na planilha",
    ),
    Row(
        "Cecilia Braga",
        "",
        "media/ kit mesas x douradas",
        "pink coral",
        "inclusas",
        "25/09",
        680,
        "150",
        "",
        "Debora",
        "Aconchego",
        "",
        "",
    ),
    Row(
        "Fabiana Maia",
        "",
        "Formatura / psicologia",
        "Olhar anotação",
        "",
        "26/09",
        680,
        "200",
        "",
        "Debora",
        "Bonfim",
        "20hs",
        "Bolas 430",
    ),
]


def api(method: str, path: str, token: str, body: dict | None = None) -> Any:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"{method} {path} → {e.code}: {err}") from e


def login() -> str:
    req = urllib.request.Request(
        f"{API}/api/auth/login",
        data=json.dumps({"nome": "Jefferson", "senha": "@123Mudar"}).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        return json.loads(res.read().decode())["token"]


def digits(phone: str) -> str:
    return re.sub(r"\D+", "", phone or "")


def normalize_phone(raw: str, idx: int) -> str:
    d = digits(raw)
    if len(d) >= 8:
        if len(d) in {8, 9}:
            return "21" + d
        return d
    return f"2199100{idx:04d}"


def parse_hour(hr: str) -> tuple[int, int]:
    h = (hr or "").lower().strip()
    if not h or h in {"x", "xx"}:
        return 10, 0
    m = re.search(r"(\d{1,2})", h)
    if not m:
        return 10, 0
    hour = int(m.group(1))
    if hour > 23:
        hour = 10
    return hour, 0


def parse_date(data: str, hr: str) -> tuple[str, str]:
    parts = data.strip().split("/")
    day = int(parts[0])
    month = int(parts[1])
    year = YEAR
    if len(parts) >= 3:
        y = int(parts[2])
        year = 2000 + y if y < 100 else y
    hour, minute = parse_hour(hr)
    evento = f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:00.000-03:00"
    mh = max(8, hour - 2)
    montagem = f"{year:04d}-{month:02d}-{day:02d}T{mh:02d}:00:00.000-03:00"
    return evento, montagem


def map_vendedor(nome: str, users: dict[str, str]) -> str:
    key = (nome or "").strip().lower()
    aliases = {
        "vitoria": "Vitória",
        "vitória": "Vitória",
        "debora": "Debora",
        "débora": "Debora",
        "lorena": "Lorena",
        "rodrigo": "Rodrigo",
        "lais": "Lais",
        "laís": "Lais",
    }
    target = aliases.get(key, nome.strip() if nome.strip() else "Debora")
    if target in users:
        return users[target]
    for n, uid in users.items():
        if n.casefold() == target.casefold():
            return uid
    return users["Debora"]


def parse_sinal_amounts(sinal: str, valor: float) -> list[float]:
    s = (sinal or "").strip()
    if not s:
        return []
    if re.search(r"tudo\s*pago|pago com", s, re.I):
        return [valor]
    nums = re.findall(r"(\d+(?:[.,]\d+)?)", s)
    return [float(n.replace(",", ".")) for n in nums]


def is_tudo_pago(resta: str, sinal: str, valor: float, amounts: list[float]) -> bool:
    if re.search(r"tudo\s*pago", resta or "", re.I):
        return True
    if re.search(r"pago com", sinal or "", re.I):
        return True
    if amounts and abs(sum(amounts) - valor) < 0.02:
        return True
    if amounts and len(amounts) == 1 and abs(amounts[0] - valor) < 0.02:
        return True
    return False


def build_tema(row: Row) -> str:
    tema = (row.tema or "").strip()
    modelo = (row.modelo or "").strip()
    if tema and modelo:
        return f"{tema} — {modelo}"[:180]
    return (tema or modelo or "Decoração")[:180]


def build_obs(row: Row) -> str:
    parts = [f"[{TAG}] Importado da planilha de setembro/{YEAR}."]
    if row.modelo:
        parts.append(f"Modelo: {row.modelo}")
    if row.bolas and row.bolas.lower() not in {"x", "xx"}:
        parts.append(f"Bolas: {row.bolas}")
    if row.obs and row.obs.lower() not in {"x", "xx"}:
        parts.append(f"Obs: {row.obs}")
    if row.valor_nota:
        parts.append(f"Valor: {row.valor_nota}")
    if row.sinal:
        parts.append(f"Sinal (planilha): {row.sinal}")
    if row.resta:
        parts.append(f"Resta (planilha): {row.resta}")
    if row.hr and row.hr.lower() not in {"x", "xx"}:
        parts.append(f"Horário planilha: {row.hr}")
    return "\n".join(parts)[:2000]


def endereco(row: Row) -> str:
    loc = (row.local or "").strip()
    if not loc or loc.lower() in {"x", "xx"}:
        return "Local a confirmar"
    # normaliza typos comuns da planilha
    fixes = {
        "gren hall": "Green Hall",
        "green hall": "Green Hall",
    }
    loc = fixes.get(loc.lower(), loc)
    if len(loc) < 5:
        return f"{loc} (local planilha)"
    return loc


def tamanho(row: Row) -> str:
    blob = f"{row.modelo} {row.tema}".lower()
    if "4m" in blob or "gg" in blob or "media/" in blob or "média" in blob:
        return "M"
    if "pegue" in blob or "pocket" in blob or "mesa" in blob:
        return "P"
    if "formatura" in blob:
        return "G"
    return "M"


def pegue_e_monte(row: Row) -> bool:
    blob = f"{row.modelo} {row.tema}".lower()
    return "pegue" in blob or "pegue e monte" in blob or "pegue/monte" in blob


def already_imported(festas: list[dict], row: Row, telefone: str) -> bool:
    evento, _ = parse_date(row.data, row.hr)
    day = evento[:10]
    for f in festas:
        obs = f.get("observacoes") or ""
        if TAG not in obs:
            continue
        cliente = (f.get("cliente") or {}).get("nome", "")
        tel = digits((f.get("cliente") or {}).get("telefone") or "")
        data = (f.get("dataEvento") or "")[:10]
        if data != day:
            continue
        if digits(telefone) and tel == digits(telefone):
            return True
        if cliente.casefold() == row.cliente.strip().casefold():
            return True
    return False


def main() -> int:
    print("Login…")
    token = login()
    users_raw = api("GET", "/api/users", token)
    users = {u["nome"]: u["id"] for u in users_raw}
    print("Usuários:", ", ".join(users.keys()))

    festas = api("GET", "/api/festas", token)
    if not isinstance(festas, list):
        festas = festas.get("data", []) if isinstance(festas, dict) else []
    print(f"Festas existentes: {len(festas)}")

    created = skipped = 0
    errors: list[str] = []

    for idx, row in enumerate(ROWS, start=1):
        nome = row.cliente.strip() or f"Cliente {idx}"
        telefone = normalize_phone(row.contato, idx)
        valor = float(row.valor) if row.valor and row.valor > 0 else 1.0
        amounts = parse_sinal_amounts(row.sinal, valor)
        tudo = is_tudo_pago(row.resta, row.sinal, valor, amounts)

        if tudo:
            status = "PAGO"
            pay_amounts = (
                [valor]
                if not amounts or abs(sum(amounts) - valor) > 0.02
                else amounts
            )
        elif amounts:
            status = "AGUARDANDO_PAGAMENTO"
            pay_amounts = amounts
        else:
            status = "ORCAMENTO"
            pay_amounts = []

        if already_imported(festas, row, telefone):
            print(f"[{idx}] SKIP já importado: {nome}")
            skipped += 1
            continue

        data_evento, horario = parse_date(row.data, row.hr)
        payload = {
            "nomeCliente": nome,
            "telefone": telefone,
            "tema": build_tema(row),
            "dataEvento": data_evento,
            "horarioMontagem": horario,
            "tamanhoDecoracao": tamanho(row),
            "pegueEMonte": pegue_e_monte(row),
            "endereco": endereco(row),
            "valor": valor,
            "status": "ORCAMENTO",
            "vendedorId": map_vendedor(row.vendedor, users),
            "observacoes": build_obs(row),
            "origem": "Planilha setembro 2026",
        }

        try:
            festa = api("POST", "/api/festas", token, payload)
            festa_id = festa["id"]
            for amount in pay_amounts:
                if amount <= 0:
                    continue
                pag = api(
                    "POST",
                    f"/api/festas/{festa_id}/pagamentos",
                    token,
                    {"valor": amount, "tipo": "PIX"},
                )
                api("PATCH", f"/api/pagamentos/{pag['id']}/confirmar", token, {})

            print(
                f"[{idx}] OK {nome} | {payload['tema'][:42]} | R${valor:.2f} | {status} | pays={pay_amounts}"
            )
            created += 1
            festas.append(festa)
        except Exception as e:
            msg = f"[{idx}] ERRO {nome}: {e}"
            print(msg)
            errors.append(msg)

    print("\n=== Resumo ===")
    print(f"Criadas: {created}")
    print(f"Puladas: {skipped}")
    print(f"Erros: {len(errors)}")
    for e in errors:
        print(" ", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
