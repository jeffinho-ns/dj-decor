"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser, listUsers, updateUser } from "@/lib/api";
import { roleLabel } from "@/lib/auth";
import type { Role } from "@/types/auth";
import type { UserAdmin } from "@/types/admin";

const ROLES: Role[] = ["ADMIN", "GERENTE", "VENDEDOR", "MONTADOR"];

interface UsuariosPainelProps {
  token: string;
  canEdit: boolean;
}

export function UsuariosPainel({ token, canEdit }: UsuariosPainelProps) {
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<Role>("VENDEDOR");
  const [senha, setSenha] = useState("@123Mudar");

  function reload() {
    return listUsers(token).then(setUsers);
  }

  useEffect(() => {
    reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Falha ao carregar")
    );
  }, [token]);

  function onCreate() {
    if (!nome.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createUser({ nome: nome.trim(), role, senha }, token);
        setNome("");
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao criar");
      }
    });
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <section className="rounded-2xl neo-sm p-4 space-y-3">
          <h2 className="font-display text-lg">Novo usuário</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <select
                className="flex h-10 w-full rounded-xl neo-inset px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Senha temporária</Label>
              <Input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending || !nome.trim()}
            onClick={onCreate}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Criar usuário
          </Button>
        </section>
      ) : null}

      <section className="space-y-2">
        {users.map((u) => (
          <article
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl neo-sm p-3"
          >
            <div>
              <p className="font-medium">
                {u.nome}{" "}
                {!u.ativo ? (
                  <span className="text-xs text-destructive">(inativo)</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {roleLabel(u.role)}
                {u.email ? ` · ${u.email}` : ""}
              </p>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 rounded-xl neo-inset px-2 text-xs"
                  value={u.role}
                  disabled={pending}
                  onChange={(e) => {
                    startTransition(async () => {
                      await updateUser(
                        u.id,
                        { role: e.target.value },
                        token
                      );
                      await reload();
                    });
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await updateUser(u.id, { ativo: !u.ativo }, token);
                      await reload();
                    });
                  }}
                >
                  {u.ativo ? "Desativar" : "Reativar"}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await updateUser(u.id, { senha: "@123Mudar" }, token);
                    });
                  }}
                >
                  Reset senha
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
