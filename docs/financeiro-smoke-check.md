# Smoke-check Financeiro (produção)

- **API:** `https://dj-decor.onrender.com`
- **Data do check:** 2026-09-05 (horário local do runner; mês de referência `2026-09` America/Sao_Paulo)
- **Auth:** login `POST /api/auth/login` (usuário Debora) → **OK** (HTTP 200, token JWT recebido). Senha/token **não** documentados aqui.
- **Mutações:** nenhuma (sem `POST` reconciliar / pagar / alterar dados).

Se o login falhar (401) no futuro: conferir credenciais no painel, papel `GERENTE`/`ADMIN`, e se o deploy do Render está no ar; depois repetir a checklist abaixo manualmente no frontend Financeiro.

---

## Checklist de endpoints

| # | Endpoint | Status | Notas |
|---|----------|--------|-------|
| 0 | `POST /api/auth/login` | **OK** | Token emitido; usuário Debora / role GERENTE |
| 1 | `GET /api/financeiro/a-pagar` | **OK** | HTTP 200; fila “Todos liberados”; total ≈ **R$ 15.519**; dezenas de itens (Debora, Lorena, Suellem, etc.) |
| 2 | `GET /api/financeiro/colaboradores` | **OK** | HTTP 200; 10 colaboradores (incl. Jefferson, Suellem, Debora, Lorena) |
| 3a | `GET /api/financeiro/colaboradores/:id` (Jefferson) | **OK** + **ATENÇÃO** | HTTP 200; mês set/2026 com **total 0**, sem lançamentos |
| 3b | `GET /api/financeiro/colaboradores/:id` (Suellem) | **OK** + **ATENÇÃO** | HTTP 200; 1 lançamento `COMISSAO_VENDEDOR` (R$ 34, PENDENTE); **sem** `COMISSAO_SOCIA` |
| 4 | `GET /api/financeiro/festas-mes?mes=2026-09` | **OK** | HTTP 200; 13 festas; `totalValor` 2630; label “Setembro de 2026” |
| 5 | `GET /api/financeiro/alertas-fora?mes=2026-09` | **OK** + **ATENÇÃO** | HTTP 200; **25** alertas; ver inconsistência com `foraParacambi` abaixo |
| 6 | `GET /api/financeiro/resumo-debora?mes=2026-09` | **OK** | HTTP 200; pendente 2339,4 / liberado 1625,4 / pago 0 / total 2339,4 |
| 7 | `GET /api/financeiro/calendario-diarias?mes=2026-09` | **OK** | HTTP 200 |

Nenhum endpoint da lista retornou 4xx/5xx neste smoke.

**Esperado até pós-deploy:** Jefferson sem diárias e Suellem sem 30% fora enquanto festas não tiverem `foraParacambi` + `POST /api/comissoes/reconciliar` (botão Recalcular no Financeiro).

---

## Campos / regras de negócio observadas

### `foraParacambi` nas festas

- **Status:** **OK** (campo presente) + **ATENÇÃO** (valores vs alertas)
- Em `festas-mes`, **todas** as 13 festas trazem `foraParacambi` (boolean).
- Neste mês, **todas** vieram `foraParacambi: false`.
- Mesmo assim, `alertas-fora` listou **25** itens (endereços fora / a confirmar / seed demo). Ou seja: o alerta parece heurística de endereço, **não** espelha 1:1 o flag `foraParacambi` das festas do mês.

### Suellem e `COMISSAO_SOCIA`

- **Status:** **ATENÇÃO**
- Suellem: `ehSocia: false`; lançamentos do mês = só `COMISSAO_VENDEDOR`.
- Itens `COMISSAO_SOCIA` (“Comissão montagem fora”) na fila a-pagar vão para **Lorena** (`ehSocia: true`).
- Em `festas-mes.split`, a fatia “fora” ainda aparece com chave `suellemFora`, mas `beneficiarioNome` é **Lorena** — possível legado de naming.

### Jefferson e `DIARIA_DESMONTAGEM`

- **Status:** **ATENÇÃO**
- Jefferson existe na lista; detalhe set/2026 vazio (`porTipo: []`, `lancamentos: []`).
- Em `festas-mes`, Jefferson aparece como **desmontador** em ao menos 2 festas (ex.: Painel academia, Decoração tons de rosa), porém `split.diarias.desmontagem` = **0** e não há item `DIARIA_DESMONTAGEM` no colaborador.
- Totais agregados de diárias no resumo de colaboradores também estão zerados para Jefferson.

---

## Próximas ações (Debora / Suellem)

### Debora

1. Abrir Financeiro no app e conferir se a fila a-pagar e o resumo Debora batem com os totais acima (≈ 15,5k liberados gerais; resumo set ≈ 2,3k pendente).
2. Validar na UI os **alertas fora Paracambi**: muitos endereços em set/2026; decidir se o flag `foraParacambi` precisa ser marcado nas festas certas (hoje tudo `false` no mês).
3. Conferir festas em que Jefferson desmontou: se diária de desmontagem deveria existir, checar cadastro de montador/desmontador e regras de elegibilidade (sem reconciliar em massa sem revisão).
4. Item demo no alerta (“Aniversário Infantil — demo seed” / Maria Silva) — limpar ou ignorar em produção se ainda for seed.

### Suellem

1. Confirmar na UI o detalhe do mês: comissão de venda e itens liberados na fila.
2. Após Debora marcar festas fora de Paracambi e clicar **Recalcular**, conferir `COMISSAO_SOCIA` (“Comissão montagem fora” / 30%) no nome dela — hoje ainda pode aparecer em Lorena por splits legados.
3. Olhar sempre `beneficiarioNome`, não só a chave `suellemFora` no split.

---

## Como repetir (manual)

```bash
# 1) Login (não versionar token/senha)
curl -sS -X POST https://dj-decor.onrender.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Debora","senha":"<SENHA>"}'

# 2) Com Authorization: Bearer <TOKEN>
MES=$(TZ=America/Sao_Paulo date +%Y-%m)
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://dj-decor.onrender.com/api/financeiro/a-pagar"
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://dj-decor.onrender.com/api/financeiro/colaboradores"
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://dj-decor.onrender.com/api/financeiro/festas-mes?mes=$MES"
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://dj-decor.onrender.com/api/financeiro/alertas-fora?mes=$MES"
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://dj-decor.onrender.com/api/financeiro/resumo-debora?mes=$MES"
```

Não rodar endpoints que alterem pagamento/reconciliação neste smoke.
