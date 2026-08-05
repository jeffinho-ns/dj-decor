#!/usr/bin/env python3
"""Importa festas de agosto/2026 da planilha operacional via API."""

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
TAG = "import-agosto-2026"


@dataclass
class Row:
    cliente: str
    contato: str
    modelo: str
    tema: str
    data: str  # DD/MM or DD/MM/YY
    valor: float | None
    sinal: str
    resta: str
    vendedor: str
    local: str
    hr: str
    obs: str


# Dados da planilha (agosto — incompleta, como enviado)
ROWS: list[Row] = [
    Row("x", "21995544084", "capas, bandejas e flor tema flork", "", "01/08", 100, "", "tudo pago", "Vitoria", "x", "x", "x"),
    Row("Maurilia", "x", "pocket e pic nique", "cerejinha", "01/08", 400, "", "", "Debora", "bosque", "", ""),
    Row("Rato", "", "Baby lonney", "", "01/08", 450, "", "", "Debora", "Cristal", "15hs", ""),
    Row("Vithoria", "21971339463", "Festa de mesa com mesa e balões frente mesa branco e vermelho", "", "02/08", 200, "60", "Tudo pago", "Lorena", "X", "X", "X"),
    Row("Maria Carvalho", "97597-3828", "Festa mesa", "Cerejinha", "02/08", 100, "100", "Tudo pago", "Rodrigo", "", "", ""),
    Row("Day", "", "Pegue e monte churrasco Pedro", "", "02/08", 150, "", "", "Debora", "X", "", ""),
    Row("Thaymara", "", "fundo do mar", "", "08/08", None, "", "", "Debora", "", "", "Valor não informado na planilha"),
    Row("Tia Ju irma Lalesca", "", "festa mesa dia dos pais", "", "09/08", 80, "", "tudo pago", "Debora", "x", "x", "x"),
    Row(
        "Thaís",
        "968257358",
        "Margaridas",
        "Pacote Castro 600",
        "09/08",
        600,
        "150",
        "",
        "Lorena",
        "Castro",
        "",
        "Bolas 350,00 igual da netinha da moça do som q fizemos no aconchego, trocar one por Oh baby, nome da bebê Livia",
    ),
    Row("Letícia", "21966063798", "Festa mesa sem mesa homem aranha", "", "12/08", 80, "", "Tudo pago", "Lorena", "X", "X", "X"),
    Row(
        "Yasmin",
        "",
        "Pocket coreano",
        "",
        "12/08",
        300,
        "Pago com valor retirado do casamento de novembro",
        "",
        "",
        "",
        "",
        "Pago com valor retirado do casamento de novembro",
    ),
    Row("Márcia", "", "Kit ripado tendência", "", "14/08", 450, "", "Tudo pago", "Debora", "Sítio ilha", "10hs", "X"),
    Row(
        "Meg belo",
        "21988246540",
        "Casamento/ mesa redonda ripada, mesa retangular ripada 1 armário rústico, cavalete floreira branca p chão arranjo de Margarida branca",
        "",
        "14/08",
        400,
        "120",
        "",
        "Lorena",
        "Sítio ilha",
        "10hs",
        "",
    ),
    Row("Jeniffer", "21990609514", "pocket//pegue e monte", "real madrid", "15/08", 150, "45", "", "Vitoria", "x", "x", "x"),
    Row(
        "Laura Provezano",
        "21977245618",
        "pegue e monte",
        "mesa redonda ripada grande, mesa menor duplas escadinha rustica",
        "15/08",
        180,
        "",
        "Tudo pago",
        "Lorena",
        "x",
        "x",
        "x",
    ),
    Row(
        "Maria Cristina",
        "",
        "pacote arena",
        "pocket// painel novo/ bolo fake e balões",
        "15/08",
        80,
        "80",
        "",
        "Lorena",
        "arena",
        "",
        "brinde 15 toalhas",
    ),
    Row(
        "Larissa Silva",
        "21975417467",
        "4m",
        "tema novo/olhar foto inspiração",
        "15/08",
        780,
        "234 + 273 + 273",
        "",
        "Lais",
        "cetro",
        "18hs",
        "",
    ),
    Row(
        "Edilaine",
        "99704-4791",
        "Painel nova, armário lembrança novo, decoração olhar foto",
        "",
        "15/08",
        1080,
        "",
        "Tudo pago",
        "Lorena",
        "Rancho do Léo",
        "12hs",
        "",
    ),
    Row(
        "Neia Cardoso",
        "21994394541",
        "Mesa média kit rústico com pé alto pegue/monte",
        "",
        "21/08",
        70,
        "",
        "Tudo pago",
        "Lorena",
        "X",
        "X",
        "X",
    ),
    Row(
        "Cliente",
        "21999688271",
        "casamento",
        "trio tendencia",
        "21/08",
        380,
        "",
        "tudo pago",
        "Lorena",
        "Sitio ilha",
        "12hs",
        "x",
    ),
    Row(
        "Mary",
        "21972346044",
        "casamento",
        "kit novo",
        "22/08/26",
        1250,
        "1000",
        "",
        "Vitoria",
        "reserva",
        "16hs",
        "fundo com voal branco cantinho lemb 250",
    ),
    Row(
        "Juliana",
        "21964585685",
        "pacote minha vó",
        "adulto/70 em led",
        "23/08",
        None,
        "",
        "",
        "Lorena",
        "j&L",
        "x",
        "x — valor não informado na planilha",
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
        if len(d) == 8 or len(d) == 9:
            return "21" + d
        return d
    return f"2199000{idx:04d}"


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
    """Return (dataEvento ISO, horarioMontagem ISO) in America/Sao_Paulo as UTC-3 fixed."""
    parts = data.strip().split("/")
    day = int(parts[0])
    month = int(parts[1])
    year = YEAR
    if len(parts) >= 3:
        y = int(parts[2])
        year = 2000 + y if y < 100 else y
    hour, minute = parse_hour(hr)
    # Store as local Brazil time encoded as Z-less ISO with -03:00
    evento = f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:00.000-03:00"
    # Montagem 2h antes, mínimo 08:00
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
    # exact then casefold
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
    amounts = [float(n.replace(",", ".")) for n in nums]
    return amounts


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
    parts = [f"[{TAG}] Importado da planilha de agosto/{YEAR}."]
    if row.modelo:
        parts.append(f"Modelo: {row.modelo}")
    if row.obs and row.obs.lower() not in {"x", "xx"}:
        parts.append(f"Obs: {row.obs}")
    if row.sinal:
        parts.append(f"Sinal (planilha): {row.sinal}")
    if row.resta:
        parts.append(f"Resta (planilha): {row.resta}")
    if row.hr and row.hr.lower() not in {"x", "xx"}:
        parts.append(f"Horário planilha: {row.hr}")
    text = "\n".join(parts)
    return text[:2000]


def endereco(row: Row) -> str:
    loc = (row.local or "").strip()
    if not loc or loc.lower() in {"x", "xx"}:
        return "Local a confirmar"
    if len(loc) < 5:
        return f"{loc} (local planilha)"
    return loc


def tamanho(row: Row) -> str:
    blob = f"{row.modelo} {row.tema}".lower()
    if "4m" in blob or "gg" in blob:
        return "GG"
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

    created = 0
    skipped = 0
    errors: list[str] = []

    for idx, row in enumerate(ROWS, start=1):
        nome = row.cliente.strip() or f"Cliente {idx}"
        if nome.lower() == "x":
            nome = f"Cliente planilha {idx}"
        if nome.lower() == "cliente":
            nome = f"Cliente {digits(row.contato) or idx}"

        telefone = normalize_phone(row.contato, idx)
        valor = float(row.valor) if row.valor and row.valor > 0 else 1.0
        amounts = parse_sinal_amounts(row.sinal, valor)
        tudo = is_tudo_pago(row.resta, row.sinal, valor, amounts)
        if tudo:
            status = "PAGO"
            pay_amounts = [valor] if not amounts or abs(sum(amounts) - valor) > 0.02 else amounts
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
            "status": status if status != "PAGO" else "ORCAMENTO",
            "vendedorId": map_vendedor(row.vendedor, users),
            "observacoes": build_obs(row),
            "origem": "Planilha agosto 2026",
        }

        try:
            festa = api("POST", "/api/festas", token, payload)
            festa_id = festa["id"]

            # Pagamentos
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

            # Se era tudo pago mas create forçou ORCAMENTO e confirm already set PAGO — ok
            # Se partial, confirm sets AGUARDANDO. If ORCAMENTO with no pay, leave.
            # For tudo pago: ensure status PAGO via payments covering total.

            print(
                f"[{idx}] OK {nome} | {payload['tema'][:40]} | R${valor:.2f} | {status} | pays={pay_amounts}"
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
