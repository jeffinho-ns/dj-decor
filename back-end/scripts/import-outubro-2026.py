#!/usr/bin/env python3
"""Importa festas de outubro/2026 da planilha operacional via API."""

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
TAG = "import-outubro-2026"


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
        "Analice",
        "21992781694",
        "casamento",
        "mesas x douradas",
        "x",
        "03/10",
        680,
        "500",
        "",
        "Lorena",
        "Aconchego",
        "11:30hs",
        "30 toalhas brancas 210, colaborador para arrumar mesas e cadeiras 70,00",
    ),
    Row(
        "Isabel",
        "21975155978",
        "3 fundos (moinho, rosa claro com idade em led, 1 branco placa fazendinha)",
        "mesa branca, 1 cilindro imitando madeira e 1 escadinha para lembrancas",
        "230",
        "03/10",
        450,
        "340",
        "",
        "Lorena",
        "Sitio Ilha",
        "10hs",
        "",
    ),
    Row(
        "Julia Milena",
        "21966075219",
        "decoração 6m",
        "minnie vermelha",
        "x",
        "09/10",
        890,
        "267",
        "",
        "Vitoria",
        "a definir",
        "18:30h",
        "",
    ),
    Row(
        "Lariza Lima",
        "21985011246",
        "Skye igual do fael",
        "",
        "90",
        "09/10",
        300,
        "150",
        "",
        "Lorena",
        "A definir",
        "A definir",
        "",
    ),
    Row(
        "Camila",
        "21920390079",
        "kit bj 2 organicas 2 redondas",
        "casamento",
        "x",
        "10/10",
        1800,
        "900",
        "",
        "Vitoria",
        "reserva",
        "15:30hs",
        "pergolado com mesa 680, caminho samambaias 250",
    ),
    Row(
        "Ketelin",
        "21976503933",
        "4m margaridas bege",
        "igual da filha da camilly",
        "x",
        "17/10",
        730,
        "200/200",
        "",
        "Lorena",
        "Espaco Castro",
        "12hs",
        "x",
    ),
    Row(
        "Thawany caio",
        "21984307529",
        "media moranguinho fazer romano",
        "3 fundos (1 mandar fazer, 1 morangos, 1 fundo vermelho com nome clara e morango ao lado) mesas igual da moranguinho baby q montamos",
        "230",
        "17/10",
        680,
        "271",
        "",
        "Lorena",
        "criativo",
        "17hs",
        "toalhas mesa 16 vermelhas",
    ),
    Row(
        "Leticia Andrade",
        "21966159167",
        "zootopia",
        "",
        "280",
        "24/10",
        1500,  # dec 920 + cantinho lembrancinha 580
        "500",
        "",
        "Lorena",
        "a definir",
        "",
        "cantinho de lembrancinha igual da isabel mas sem nada de tema, nas cores do tema apenas, igual fundo da decoração, não quer tematico apenas displays",
        valor_nota="dec 920 + cantinho lembrancinha 580 = 1500",
    ),
    Row(
        "Larissa Rosa",
        "21970652253",
        "rei leao",
        "painel dobrado frente igual da inspiracao",
        "280",
        "24/10",
        680,
        "300",
        "",
        "Lorena",
        "rancho leo saudoso",
        "14hs",
        "olhar anotacoes, com cadeira vime",
    ),
    Row(
        "Ana Julia",
        "21991027110",
        "jesus meu melhor amigo/investimento",
        "",
        "incluso",
        "24/10",
        2150,
        "700/720",
        "",
        "Lorena",
        "aconchego",
        "17hs",
        "com cantinho de lembrancinhas",
        valor_nota="total 2150 (planilha)",
    ),
    Row(
        "Ana Cristina Ferreira",
        "21967212538",
        "",
        "azul e branco",
        "com bolas",
        "31/10",
        320,
        "202",
        "",
        "Rodrigo",
        "rua leal n83, em frente ao serenissima",
        "11hs",
        "",
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
    return f"2199200{idx:04d}"


def parse_hour(hr: str) -> tuple[int, int]:
    h = (hr or "").lower().strip()
    if not h or h in {"x", "xx", "a definir"}:
        return 10, 0
    m = re.search(r"(\d{1,2})(?::(\d{2}))?", h)
    if not m:
        return 10, 0
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    if hour > 23:
        hour = 10
    return hour, minute


def parse_date(data: str, hr: str) -> tuple[str, str]:
    raw = data.strip().replace("-", "/")
    parts = raw.split("/")
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
    parts = [f"[{TAG}] Importado da planilha de outubro/{YEAR}."]
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
    if not loc or loc.lower() in {"x", "xx", "a definir"}:
        return "Local a confirmar"
    fixes = {
        "gren hall": "Green Hall",
        "green hall": "Green Hall",
        "espaco castro": "Espaço Castro",
        "espaço castro": "Espaço Castro",
        "sitio ilha": "Sítio Ilha",
        "sítio ilha": "Sítio Ilha",
        "rancho leo saudoso": "Rancho do Léo Saudoso",
        "aconchego": "Aconchego",
        "criativo": "Criativo",
        "reserva": "Reserva",
    }
    loc = fixes.get(loc.lower(), loc)
    if len(loc) < 5:
        return f"{loc} (local planilha)"
    return loc


def tamanho(row: Row) -> str:
    blob = f"{row.modelo} {row.tema}".lower()
    if "6m" in blob or "gg" in blob:
        return "GG"
    if "4m" in blob:
        return "G"
    if "media" in blob or "média" in blob:
        return "M"
    if "pegue" in blob or "pocket" in blob or "mesa" in blob:
        return "P"
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
            "origem": "Planilha outubro 2026",
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
