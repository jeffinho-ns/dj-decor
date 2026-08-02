"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getConfiguracoes,
  listCatalogoAddonsAdmin,
  listCatalogoKitsAdmin,
  setCatalogoAddonAtivo,
  setCatalogoKitAtivo,
  updateConfiguracoes,
  uploadMidia,
  upsertCatalogoAddon,
  upsertCatalogoKit,
} from "@/lib/api";
import type {
  CatalogoAddonApi,
  CatalogoKitApi,
  ConfiguracaoNegocio,
} from "@/types/admin";

interface NegocioSettingsProps {
  token: string;
}

export function NegocioSettings({ token }: NegocioSettingsProps) {
  const [config, setConfig] = useState<ConfiguracaoNegocio | null>(null);
  const [kits, setKits] = useState<CatalogoKitApi[]>([]);
  const [addons, setAddons] = useState<CatalogoAddonApi[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      getConfiguracoes(token),
      listCatalogoKitsAdmin(token),
      listCatalogoAddonsAdmin(token),
    ])
      .then(([c, k, a]) => {
        setConfig(c);
        setKits(k);
        setAddons(a);
      })
      .catch((err) =>
        setMsg(err instanceof Error ? err.message : "Falha ao carregar")
      );
  }, [token]);

  if (!config) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando negócio…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl neo-sm p-5 sm:p-6">
        <h2 className="font-display text-lg">Marca</h2>
        <p className="text-sm text-muted-foreground">
          Nome, slogan e logo usados no portal e materiais.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome da empresa</Label>
            <Input
              value={config.nomeEmpresa}
              onChange={(e) =>
                setConfig({ ...config, nomeEmpresa: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Slogan</Label>
            <Input
              value={config.sloganEmpresa}
              onChange={(e) =>
                setConfig({ ...config, sloganEmpresa: e.target.value })
              }
            />
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-xl neo-inset px-3 py-2 text-xs font-medium">
          Upload logo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              startTransition(async () => {
                const midia = await uploadMidia(
                  { file, tipo: "LOGO_EMPRESA" },
                  token
                );
                const updated = await updateConfiguracoes(
                  { logoMidiaId: midia.id },
                  token
                );
                setConfig(updated);
                setMsg("Logo atualizada.");
              });
            }}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl neo-sm p-5 sm:p-6">
        <h2 className="font-display text-lg">Comissões</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Comissão %</Label>
            <Input
              type="number"
              value={String(config.comissaoPercentual)}
              onChange={(e) =>
                setConfig({ ...config, comissaoPercentual: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Meta semanal (R$)</Label>
            <Input
              type="number"
              value={String(config.comissaoMetaSemanal)}
              onChange={(e) =>
                setConfig({ ...config, comissaoMetaSemanal: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl neo-sm p-5 sm:p-6">
        <h2 className="font-display text-lg">Contrato</h2>
        <div className="space-y-1">
          <Label>Cláusulas do contrato</Label>
          <textarea
            className="min-h-32 w-full rounded-xl neo-inset px-3 py-2 text-sm"
            value={config.clausulasContrato ?? ""}
            onChange={(e) =>
              setConfig({ ...config, clausulasContrato: e.target.value })
            }
            placeholder="Deixe em branco para usar o texto padrão do sistema"
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const updated = await updateConfiguracoes(
                {
                  nomeEmpresa: config.nomeEmpresa,
                  sloganEmpresa: config.sloganEmpresa,
                  comissaoPercentual: Number(config.comissaoPercentual),
                  comissaoMetaSemanal: Number(config.comissaoMetaSemanal),
                  clausulasContrato: config.clausulasContrato,
                },
                token
              );
              setConfig(updated);
              setMsg("Configurações de negócio salvas.");
            });
          }}
        >
          Salvar marca, comissões e contrato
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl neo-sm p-5 sm:p-6">
        <h2 className="font-display text-lg">Catálogo — kits</h2>
        <div className="space-y-2">
          {kits.map((kit) => (
            <div
              key={kit.id}
              className="grid grid-cols-1 gap-2 rounded-xl neo-inset p-3 sm:grid-cols-[minmax(0,1fr)_minmax(5.5rem,7rem)_auto]"
            >
              <div>
                <p className="text-sm font-medium">{kit.nome}</p>
                <p className="text-[11px] text-muted-foreground">{kit.id}</p>
              </div>
              <Input
                type="number"
                defaultValue={String(kit.valorEquipe)}
                onBlur={(e) => {
                  const valor = Number(e.target.value);
                  if (!Number.isFinite(valor)) return;
                  startTransition(async () => {
                    await upsertCatalogoKit(
                      {
                        ...kit,
                        valorEquipe: valor,
                        valorPegueEMonte: kit.valorPegueEMonte
                          ? Number(kit.valorPegueEMonte)
                          : null,
                      },
                      token
                    );
                  });
                }}
              />
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  startTransition(async () => {
                    await setCatalogoKitAtivo(kit.id, !kit.ativo, token);
                    setKits(await listCatalogoKitsAdmin(token));
                  });
                }}
              >
                {kit.ativo ? "Desativar" : "Ativar"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl neo-sm p-5 sm:p-6">
        <h2 className="font-display text-lg">Catálogo — add-ons</h2>
        <div className="space-y-2">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="grid grid-cols-1 gap-2 rounded-xl neo-inset p-3 sm:grid-cols-[minmax(0,1fr)_minmax(5.5rem,7rem)_auto]"
            >
              <div>
                <p className="text-sm font-medium">{addon.nome}</p>
                <p className="text-[11px] text-muted-foreground">
                  {addon.tipo}
                </p>
              </div>
              <Input
                type="number"
                defaultValue={String(addon.valor)}
                onBlur={(e) => {
                  const valor = Number(e.target.value);
                  if (!Number.isFinite(valor)) return;
                  startTransition(async () => {
                    await upsertCatalogoAddon({ ...addon, valor }, token);
                  });
                }}
              />
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  startTransition(async () => {
                    await setCatalogoAddonAtivo(addon.id, !addon.ativo, token);
                    setAddons(await listCatalogoAddonsAdmin(token));
                  });
                }}
              >
                {addon.ativo ? "Desativar" : "Ativar"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {msg ? <p className="text-sm text-balloon-mint">{msg}</p> : null}
    </div>
  );
}
