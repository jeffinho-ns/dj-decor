#!/usr/bin/env python3
"""
Sincroniza planilha Agenda Debora (ago–dez/2026) com o sistema.
- NÃO apaga nem altera festas existentes
- Cria apenas festas que estão na planilha e faltam no sistema
- Cria pedidos de bolas (Marcelo) quando a planilha indica bolas e a festa ainda não tem pedido
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from datetime import date, datetime, time
from typing import Any

import openpyxl

API = "https://dj-decor.onrender.com"
YEAR = 2026
TAG = "import-sync-ago-dez-2026"
XLSX = "/Users/preto/Downloads/Agenda Debora Pimentel Decoradora.xlsx"
MONTH_SHEETS = {
    8: "Agosto 2026",
    9: "Setembro 2026",
    10: "Outubro 2026",
    11: "Novembro 2026",
    12: "Dezembro 2026",
}
BOLISTA_NOME = "Marcelo"
DRY_RUN = "--dry-run" in sys.argv


def api(method: str, path: str, token: str | None = None, body: Any = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"{method} {path} → {e.code}: {err}") from e


def login() -> str:
    return api("POST", "/api/auth/login", body={"nome": "Debora", "senha": "@123Mudar"})["token"]


def norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def digits(s: Any) -> str:
    return re.sub(r"\D+", "", str(s or ""))


def cell_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, time):
        return v.strftime("%H:%M")
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()


def parse_money(v: Any) -> float | None:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().lower()
    if not s or s in {"x", "xx", "-", "karen", "tudo pago"}:
        return None
    # BR milhar: 1.080 / 2.150
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", s.replace("r$", "").strip()):
        s2 = s.replace("r$", "").replace(".", "").replace(",", ".")
        try:
            return float(s2)
        except ValueError:
            pass
    m = re.search(r"(\d+(?:[.,]\d+)?)", s)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def fix_ymd(v: Any, expected_month: int) -> str | None:
    if v is None or v == "":
        return None
    if isinstance(v, (datetime, date)):
        y, m, d = v.year, v.month, v.day
        if m == expected_month:
            return f"{YEAR}-{m:02d}-{d:02d}"
        if d == expected_month and 1 <= m <= 31:
            return f"{YEAR}-{d:02d}-{m:02d}"
        return f"{YEAR}-{m:02d}-{d:02d}"
    s = str(v).strip()
    mobj = re.match(r"^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?$", s)
    if not mobj:
        return None
    d, m = int(mobj.group(1)), int(mobj.group(2))
    return f"{YEAR}-{m:02d}-{d:02d}"


def parse_hour(hr: str) -> tuple[int, int]:
    h = (hr or "").lower().strip()
    if not h or h in {"x", "xx", "a definir"}:
        return 15, 0
    m = re.search(r"(\d{1,2})(?:[:h](\d{2}))?", h)
    if not m:
        return 15, 0
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    if hour > 23:
        hour = 15
    return hour, minute


def extract_bolas(bolas_raw: Any, obs: str, tema: str, modelo: str) -> tuple[bool, float | None, str]:
    raw = cell_str(bolas_raw).strip()
    blob = " ".join([raw, obs, tema, modelo]).lower()
    low = raw.lower()

    if low in {"nao terá", "não terá", "nao tera", "será adiado", "sera adiado"}:
        return False, None, raw
    if low in {"x", "xx"}:
        # ainda pode haver valor em obs
        pass
    elif isinstance(bolas_raw, (int, float)) and float(bolas_raw) > 0:
        return True, float(bolas_raw), raw

    m = re.search(
        r"(?:bolas?[^\d]{0,20}(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:de\s*)?bolas?)",
        blob,
        re.I,
    )
    if m:
        num = float((m.group(1) or m.group(2)).replace(",", "."))
        return True, num, raw or f"bolas {num}"

    if low and low not in {"x", "xx"}:
        if "bola" in low or "incluso" in low or "inclusa" in low or "com client" in low or "com bolas" in low:
            num = parse_money(bolas_raw)
            return True, num, raw
        num = parse_money(bolas_raw)
        if num:
            return True, num, raw

    if "bola" in blob and "nao" not in blob and "não" not in blob:
        return True, parse_money(raw) if raw else None, raw or "bolas (obs)"

    return False, None, raw


def read_planilha() -> list[dict]:
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    out: list[dict] = []
    for month, sheet_name in MONTH_SHEETS.items():
        ws = wb[sheet_name]
        headers = [cell_str(c).upper() for c in next(ws.iter_rows(min_row=1, max_row=1, values_only=True))]

        def idx(*names: str) -> int | None:
            for n in names:
                if n in headers:
                    return headers.index(n)
            return None

        i_cli, i_con, i_mod, i_tema = idx("CLIENTE"), idx("CONTATO"), idx("MODELO"), idx("TEMA")
        i_bolas, i_data, i_val = idx("BOLAS"), idx("DATA"), idx("VALOR")
        i_sinal, i_resta, i_vend = idx("SINAL"), idx("RESTA"), idx("VENDEDOR")
        i_loc, i_hr, i_obs = idx("LOCAL"), idx("HR INICIO", "HORARIO", "HORÁRIO"), idx("OBS")

        for r in ws.iter_rows(min_row=2, values_only=True):
            vals = list(r)
            if not any(v is not None and str(v).strip() for v in vals[:12]):
                continue
            cliente = cell_str(vals[i_cli]) if i_cli is not None else ""
            tema = cell_str(vals[i_tema]) if i_tema is not None else ""
            modelo = cell_str(vals[i_mod]) if i_mod is not None else ""
            if not cliente and not tema and not modelo:
                continue
            if norm(cliente) in {"resumo", "total", "total de eventos"}:
                continue
            data = fix_ymd(vals[i_data] if i_data is not None else None, month)
            if not data:
                out.append(
                    {
                        "skip": True,
                        "reason": "sem data",
                        "cliente": cliente or "(sem nome)",
                        "tema": tema,
                        "modelo": modelo,
                        "sheet": sheet_name,
                    }
                )
                continue
            obs = cell_str(vals[i_obs]) if i_obs is not None else ""
            bolas_raw = vals[i_bolas] if i_bolas is not None else None
            tem_bolas, valor_bolas, bolas_txt = extract_bolas(bolas_raw, obs, tema, modelo)
            if month == 8 and not tem_bolas:
                tem_bolas, valor_bolas, bolas_txt = extract_bolas("", obs, tema, modelo)

            out.append(
                {
                    "skip": False,
                    "sheet": sheet_name,
                    "month": month,
                    "cliente": cliente or "(sem nome)",
                    "contato": cell_str(vals[i_con]) if i_con is not None else "",
                    "modelo": modelo,
                    "tema": tema,
                    "bolas_raw": bolas_txt,
                    "tem_bolas": tem_bolas,
                    "valor_bolas": valor_bolas,
                    "data": data,
                    "valor": parse_money(vals[i_val]) if i_val is not None else None,
                    "sinal": cell_str(vals[i_sinal]) if i_sinal is not None else "",
                    "resta": cell_str(vals[i_resta]) if i_resta is not None else "",
                    "vendedor": cell_str(vals[i_vend]) if i_vend is not None else "",
                    "local": cell_str(vals[i_loc]) if i_loc is not None else "",
                    "hr": cell_str(vals[i_hr]) if i_hr is not None else "",
                    "obs": obs,
                }
            )
    return out


def match_score(p: dict, s: dict) -> tuple[int, dict]:
    """Retorna (score, breakdown). Data sozinha NÃO conta como match."""
    b = {"data": 0, "phone": 0, "name": 0, "tema": 0}
    if p["data"] == s["data"]:
        b["data"] = 3
    pd, sd = digits(p.get("contato")), s.get("telefone") or ""
    if pd and len(pd) >= 8 and sd and pd[-8:] == sd[-8:]:
        b["phone"] = 8
    pn, sn = norm(p["cliente"]), norm(s["cliente"])
    weak_names = {"cliente", "sem nome", "(sem nome)", "x", "sitio ilha", "sítio ilha"}
    if pn and sn and pn not in weak_names and sn not in weak_names:
        if pn == sn:
            b["name"] = 8
        elif pn in sn or sn in pn:
            b["name"] = 6
        else:
            inter = set(pn.split()) & set(sn.split())
            inter -= {"da", "de", "do", "das", "dos", "e", "a", "o"}
            if len(inter) >= 2:
                b["name"] = 5
            elif len(inter) == 1 and len(next(iter(inter))) >= 4:
                b["name"] = 3
    pt, st = norm(f"{p.get('tema')} {p.get('modelo')}"), norm(s.get("tema") or "")
    if pt and st:
        if pt in st or st in pt:
            b["tema"] = 3
        elif len(set(pt.split()) & set(st.split())) >= 2:
            b["tema"] = 2
    return sum(b.values()), b


def is_confident_match(score: int, breakdown: dict) -> bool:
    # Telefone é o sinal mais forte (mesmo com data diferente = possível remarcação)
    if breakdown["phone"] >= 8:
        return True
    # Nome forte só vale na mesma data (evita Yasmin ago ≠ Yasmin nov)
    if breakdown["data"] and breakdown["name"] >= 6:
        return True
    if breakdown["data"] and breakdown["name"] >= 3 and breakdown["tema"] >= 2:
        return True
    if breakdown["data"] and breakdown["name"] >= 5:
        return True
    # Nome + tema muito fortes (ex.: remarcação com mesmo tema)
    if breakdown["name"] >= 8 and breakdown["tema"] >= 3:
        return True
    return score >= 14


def is_garbage_row(p: dict) -> bool:
    n = norm(p["cliente"])
    if n in {"sitio ilha", "sítio ilha", "x"}:
        return True
    if n in {"cliente", "(sem nome)", "sem nome"} and not p.get("valor") and not p.get("tema"):
        return True
    if "adiado" in norm(p.get("bolas_raw") or ""):
        return False  # still import with note
    return False


def build_tema(p: dict) -> str:
    tema = (p.get("tema") or "").strip()
    modelo = (p.get("modelo") or "").strip()
    if tema and modelo:
        return f"{tema} — {modelo}"[:180]
    return (tema or modelo or "Decoração")[:180]


def build_obs(p: dict) -> str:
    parts = [f"[{TAG}] Importado da planilha ({p['sheet']})."]
    if p.get("modelo"):
        parts.append(f"Modelo: {p['modelo']}")
    if p.get("bolas_raw"):
        parts.append(f"Bolas: {p['bolas_raw']}")
    if p.get("obs") and norm(p["obs"]) not in {"x", "xx"}:
        parts.append(f"Obs: {p['obs']}")
    if p.get("sinal"):
        parts.append(f"Sinal (planilha): {p['sinal']}")
    if p.get("resta"):
        parts.append(f"Resta (planilha): {p['resta']}")
    if p.get("hr") and norm(p["hr"]) not in {"x", "xx"}:
        parts.append(f"Horário planilha: {p['hr']}")
    return "\n".join(parts)[:2000]


def endereco(p: dict) -> str:
    loc = (p.get("local") or "").strip()
    if not loc or norm(loc) in {"x", "xx", "a definir"}:
        return "Local a confirmar"
    if len(loc) < 5:
        return f"{loc} (local planilha)"
    return loc


def tamanho(p: dict) -> str:
    blob = f"{p.get('modelo')} {p.get('tema')}".lower()
    if "6m" in blob or "gg" in blob:
        return "GG"
    if "4m" in blob:
        return "G"
    if "pegue" in blob or "pocket" in blob or "mesa" in blob:
        return "P"
    return "M"


def pegue_e_monte(p: dict) -> bool:
    blob = f"{p.get('modelo')} {p.get('tema')}".lower()
    return "pegue" in blob


def map_vendedor(nome: str, users: dict[str, str]) -> str:
    key = norm(nome).replace("/", " ")
    aliases = {
        "vitoria": "Vitória",
        "debora": "Debora",
        "lorena": "Lorena",
        "rodrigo": "Rodrigo",
        "lais": "Lais",
        "suellen": "Suellem",
        "suellem": "Suellem",
        "juliette": "Debora",
        "debora juliette": "Debora",
    }
    # take first token for Debora/Juliette
    first = key.split()[0] if key else "debora"
    target = aliases.get(key) or aliases.get(first) or "Debora"
    if target in users:
        return users[target]
    for n, uid in users.items():
        if norm(n) == norm(target):
            return uid
    return users["Debora"]


def normalize_phone(raw: str, idx: int) -> str:
    d = digits(raw)
    if len(d) >= 8:
        if len(d) in {8, 9}:
            return "21" + d
        return d[-11:] if len(d) > 11 else d
    return f"2199000{idx:04d}"


def parse_sinal_amounts(sinal: str, valor: float) -> list[float]:
    s = (sinal or "").strip()
    if not s:
        return []
    if re.search(r"tudo\s*pago|pago com", s, re.I):
        return [valor] if valor > 0 else []
    parts = re.split(r"[+/]", s)
    out: list[float] = []
    for part in parts:
        n = parse_money(part)
        if n and n > 0:
            out.append(n)
    if out:
        return out
    nums = re.findall(r"(\d+(?:[.,]\d+)?)", s)
    return [float(n.replace(",", ".")) for n in nums]


def iso_event(data: str, hr: str) -> tuple[str, str]:
    hour, minute = parse_hour(hr)
    evento = f"{data}T{hour:02d}:{minute:02d}:00.000-03:00"
    mh = max(8, hour - 2)
    montagem = f"{data}T{mh:02d}:00:00.000-03:00"
    return evento, montagem


def main() -> int:
    token = login()
    users_list = api("GET", "/api/users", token)
    users = {u["nome"]: u["id"] for u in users_list if u.get("ativo")}
    bolista_id = users.get(BOLISTA_NOME)
    if not bolista_id:
        raise RuntimeError("Bolista Marcelo não encontrado")

    festas = api("GET", "/api/festas", token)
    sys_rows = []
    for f in festas:
        de = f.get("dataEvento") or ""
        if not de.startswith("2026-"):
            continue
        m = int(de[5:7])
        if not (8 <= m <= 12):
            continue
        sys_rows.append(
            {
                "id": f["id"],
                "data": de[:10],
                "cliente": f["cliente"]["nome"],
                "telefone": digits(f["cliente"].get("telefone")),
                "tema": f.get("tema") or "",
                "valor": float(f.get("valor") or 0),
                "pedidoBolas": f.get("pedidoBolas"),
                "raw": f,
            }
        )

    planilha = [p for p in read_planilha() if not p.get("skip")]
    sem_data = [p for p in read_planilha() if p.get("skip")]

    matched: list[tuple[dict, dict, int]] = []
    missing: list[dict] = []
    used_sys: set[str] = set()

    for p in planilha:
        best, best_sc, best_b = None, -1, {}
        for s in sys_rows:
            sc, br = match_score(p, s)
            if s["id"] in used_sys:
                sc -= 2
            if sc > best_sc:
                best_sc, best, best_b = sc, s, br
        if best and is_confident_match(best_sc, best_b):
            matched.append((p, best, best_sc))
            used_sys.add(best["id"])
        else:
            missing.append(p)

    print(f"Planilha válidas: {len(planilha)} | Sistema ago-dez: {len(sys_rows)}")
    print(f"Matched: {len(matched)} | Missing: {len(missing)} | Sem data: {len(sem_data)}")
    if DRY_RUN:
        print("\n=== DRY RUN — nada será gravado ===\n")

    created_festas = []
    errors = []
    skipped = []

    # --- criar festas faltantes ---
    for idx, p in enumerate(missing, 1):
        if is_garbage_row(p):
            skipped.append(f"lixo/incompleto: {p['data']} {p['cliente']}")
            continue
        nome = p["cliente"]
        if norm(nome) in {"cliente", "(sem nome)", "sem nome", ""}:
            nome = f"Cliente planilha {p['data']}"
        valor = p.get("valor")
        if valor is None or valor <= 0:
            # tenta inferir do sinal (ex.: Yasmin 1.800)
            sinal_vals = parse_sinal_amounts(p.get("sinal") or "", 0)
            if sinal_vals and max(sinal_vals) >= 50:
                valor = max(sinal_vals)
            elif not (p.get("tema") or p.get("modelo")):
                skipped.append(f"sem valor/tema: {p['data']} {p['cliente']}")
                continue
            else:
                valor = 1.0

        data_evento, horario = iso_event(p["data"], p.get("hr") or "")
        payload = {
            "nomeCliente": nome[:120],
            "telefone": normalize_phone(p.get("contato") or "", 8000 + idx),
            "tema": build_tema(p),
            "dataEvento": data_evento,
            "horarioMontagem": horario,
            "tamanhoDecoracao": tamanho(p),
            "pegueEMonte": pegue_e_monte(p),
            "endereco": endereco(p),
            "valor": valor,
            "status": "ORCAMENTO",
            "vendedorId": map_vendedor(p.get("vendedor") or "", users),
            "observacoes": build_obs(p),
            "origem": f"Planilha {p['sheet']}",
        }
        print(f"[NOVA] {p['data']} | {nome} | {payload['tema'][:50]} | R${valor} | bolas={p['tem_bolas']}/{p.get('valor_bolas')}")
        if DRY_RUN:
            created_festas.append({"dry": True, **p, "payload": payload})
            continue
        try:
            festa = api("POST", "/api/festas", token, payload)
            # sinal se houver
            amounts = parse_sinal_amounts(p.get("sinal") or "", float(valor))
            if re.search(r"tudo\s*pago", p.get("resta") or "", re.I) and float(valor) > 1:
                amounts = [float(valor)]
            for amount in amounts:
                if amount <= 0 or amount > float(valor) * 1.5:
                    continue
                try:
                    pag = api(
                        "POST",
                        f"/api/festas/{festa['id']}/pagamentos",
                        token,
                        {"valor": min(amount, float(valor)), "tipo": "PIX"},
                    )
                    api("PATCH", f"/api/pagamentos/{pag['id']}/confirmar", token, {})
                except Exception as pe:
                    print(f"  aviso pagamento: {pe}")
            created_festas.append(festa)
            # atualiza sys_rows para bolas depois
            sys_rows.append(
                {
                    "id": festa["id"],
                    "data": p["data"],
                    "cliente": nome,
                    "telefone": digits(payload["telefone"]),
                    "tema": payload["tema"],
                    "valor": float(valor),
                    "pedidoBolas": None,
                    "raw": festa,
                    "_planilha": p,
                }
            )
            matched.append(
                (
                    p,
                    sys_rows[-1],
                    99,
                )
            )
        except Exception as e:
            errors.append(f"{p['data']} {nome}: {e}")
            print(f"  ERRO: {e}")

    # --- pedidos de bolas ---
    bolas_created = []
    bolas_skipped = []

    # refresh festas for pedidoBolas accuracy
    if not DRY_RUN:
        festas = api("GET", "/api/festas", token)
        by_id = {f["id"]: f for f in festas}
    else:
        by_id = {s["id"]: s.get("raw") or s for s in sys_rows}

    for p, s, sc in matched:
        if not p.get("tem_bolas"):
            continue
        festa = by_id.get(s["id"]) or s.get("raw") or s
        if festa.get("pedidoBolas"):
            bolas_skipped.append(f"já tem pedido: {p['data']} {p['cliente']}")
            continue
        valor_b = p.get("valor_bolas")
        if not valor_b or valor_b <= 0:
            bolas_skipped.append(
                f"bolas sem valor numérico (não cria provisório): {p['data']} {p['cliente']} ({p.get('bolas_raw')})"
            )
            continue
        nota_valor = f"Valor tabela planilha: R$ {valor_b:.2f}"

        data_evento, horario = iso_event(p["data"], p.get("hr") or "")
        # prefer festa times if available
        if festa.get("dataEvento"):
            data_evento = festa["dataEvento"]
        if festa.get("horarioMontagem"):
            horario = festa["horarioMontagem"]

        cliente_nome = festa.get("cliente", {}).get("nome") if isinstance(festa.get("cliente"), dict) else p["cliente"]
        telefone = (
            festa.get("cliente", {}).get("telefone")
            if isinstance(festa.get("cliente"), dict)
            else normalize_phone(p.get("contato") or "", 9000)
        )
        payload = {
            "festaId": s["id"],
            "dataEvento": data_evento,
            "horarioMontagem": horario,
            "tema": (festa.get("tema") or build_tema(p))[:180],
            "endereco": (festa.get("endereco") or endereco(p))[:300],
            "clienteNome": (cliente_nome or p["cliente"])[:120],
            "clienteTelefone": digits(telefone) or normalize_phone("", 9001),
            "observacoes": (
                f"[{TAG}] Bolas da planilha ({p['sheet']}).\n"
                f"{nota_valor}\n"
                f"Bolas raw: {p.get('bolas_raw') or '-'}\n"
                f"{p.get('obs') or ''}"
            )[:2000],
            "itens": [
                {
                    "nome": "Bolas (planilha)",
                    "quantidade": 1,
                    "valorTabelaUnit": float(valor_b),
                }
            ],
            "bolistaId": bolista_id,
            "status": "CONFIRMADO",
        }
        print(
            f"[BOLAS] {p['data']} | {payload['clienteNome']} | tabela R${valor_b} | festa={s['id'][:8]}"
        )
        if DRY_RUN:
            bolas_created.append(payload)
            continue
        try:
            pedido = api("POST", "/api/bolas/pedidos", token, payload)
            bolas_created.append(pedido)
        except Exception as e:
            # se festaId já tem, ou erro, tenta sem festaId? melhor reportar
            errors.append(f"bolas {p['data']} {p['cliente']}: {e}")
            print(f"  ERRO bolas: {e}")

    print("\n=== RESUMO ===")
    print(f"Festas novas: {len(created_festas)}")
    print(f"Pedidos bolas novos: {len(bolas_created)}")
    print(f"Bolas pulados (já existiam): {len(bolas_skipped)}")
    print(f"Linhas puladas: {len(skipped)}")
    for s in skipped:
        print("  -", s)
    if sem_data:
        print("Sem data na planilha:")
        for p in sem_data:
            print(f"  - {p.get('cliente')} | {p.get('tema') or p.get('modelo')}")
    print(f"Erros: {len(errors)}")
    for e in errors:
        print("  -", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
