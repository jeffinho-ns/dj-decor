"use client";

import { useEffect, useState, useTransition } from "react";
import { ExternalLink, Loader2, MapPin, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getConfiguracoes, updateConfiguracoes } from "@/lib/api";
import type { ConfiguracaoNegocio } from "@/types/admin";

interface ContatosOperacaoProps {
  token: string;
  canEdit: boolean;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function whatsappHref(whatsapp: string): string | null {
  const digits = digitsOnly(whatsapp);
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export function ContatosOperacao({ token, canEdit }: ContatosOperacaoProps) {
  const [config, setConfig] = useState<ConfiguracaoNegocio | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getConfiguracoes(token)
      .then(setConfig)
      .catch((err) =>
        setErro(err instanceof Error ? err.message : "Falha ao carregar contatos")
      );
  }, [token]);

  if (erro) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {erro}
      </p>
    );
  }

  if (!config) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando contatos…
      </p>
    );
  }

  const wa = config.whatsappEmpresa
    ? whatsappHref(config.whatsappEmpresa)
    : null;
  const tel = config.telefoneEmpresa?.trim();
  const endereco = config.enderecoEmpresa?.trim();
  const vazio = !tel && !config.whatsappEmpresa && !endereco;

  return (
    <section className="rounded-2xl p-5 sm:p-6 neo-sm">
      <div className="flex items-center gap-2">
        <span className="balloon-dot bg-balloon-mint" />
        <span className="balloon-dot bg-balloon-sky" />
        <h2 className="font-display text-xl text-foreground">
          Contatos da operação
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Base / galpão — útil no campo quando precisar de apoio.
      </p>

      {!canEdit ? (
        <div className="mt-4 space-y-3">
          {vazio ? (
            <p className="text-sm text-muted-foreground">
              Ainda sem contatos cadastrados. Peça à gestão para preencher em
              Configurações.
            </p>
          ) : null}
          {tel ? (
            <a
              href={`tel:${digitsOnly(tel)}`}
              className="flex items-center gap-2 text-sm text-balloon-sky hover:underline"
            >
              <Phone className="size-4" />
              {tel}
            </a>
          ) : null}
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-balloon-mint hover:underline"
            >
              <MessageCircle className="size-4" />
              WhatsApp da base
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          ) : null}
          {endereco ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-balloon-sun" />
              {endereco}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                value={config.telefoneEmpresa ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, telefoneEmpresa: e.target.value })
                }
                placeholder="(11) 3000-0000"
              />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input
                value={config.whatsappEmpresa ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, whatsappEmpresa: e.target.value })
                }
                placeholder="11999990000"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Endereço da base / galpão</Label>
            <Input
              value={config.enderecoEmpresa ?? ""}
              onChange={(e) =>
                setConfig({ ...config, enderecoEmpresa: e.target.value })
              }
              placeholder="Rua, número, bairro"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              setMsg(null);
              startTransition(async () => {
                try {
                  const updated = await updateConfiguracoes(
                    {
                      telefoneEmpresa: config.telefoneEmpresa || null,
                      whatsappEmpresa: config.whatsappEmpresa || null,
                      enderecoEmpresa: config.enderecoEmpresa || null,
                    },
                    token
                  );
                  setConfig(updated);
                  setMsg("Contatos salvos.");
                } catch (err) {
                  setMsg(
                    err instanceof Error ? err.message : "Falha ao salvar"
                  );
                }
              });
            }}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar contatos"}
          </Button>
          {msg ? <p className="text-xs text-balloon-mint">{msg}</p> : null}
        </div>
      )}
    </section>
  );
}
