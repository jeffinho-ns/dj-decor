"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Camera,
  Check,
  Images,
  Loader2,
  Share,
  Smartphone,
  Vibrate,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { enviarPushTeste, listPushInscricoes } from "@/lib/api";
import { vibrar, suportaVibracao } from "@/lib/haptics";
import {
  ativarPush,
  desativarPush,
  diagnosticar,
  inscricaoAtual,
  PushPermissaoNegadaError,
  type DiagnosticoPwa,
} from "@/lib/pwa";
import { cn } from "@/lib/utils";
import type { PushInscricao } from "@/types/push";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface FotoLocal {
  id: string;
  url: string;
  nome: string;
  tamanhoKb: number;
  origem: "camera" | "galeria";
}

type Estado = "ok" | "pendente" | "erro";

function Selo({ estado, children }: { estado: Estado; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        estado === "ok" && "bg-balloon-mint/15 text-balloon-mint",
        estado === "pendente" && "bg-balloon-sun/20 text-[#a97a00]",
        estado === "erro" && "bg-destructive/12 text-destructive"
      )}
    >
      {estado === "ok" ? (
        <Check className="size-3" />
      ) : estado === "erro" ? (
        <X className="size-3" />
      ) : null}
      {children}
    </span>
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl neo px-4 py-4">
      <h2 className="font-display text-base text-foreground">{titulo}</h2>
      {descricao ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

interface TesteAppPainelProps {
  token: string;
  nomeUsuario: string;
}

export function TesteAppPainel({ token, nomeUsuario }: TesteAppPainelProps) {
  const [diag, setDiag] = useState<DiagnosticoPwa | null>(null);
  const [inscrito, setInscrito] = useState(false);
  const [aparelhos, setAparelhos] = useState<PushInscricao[]>([]);
  const [carregandoPush, setCarregandoPush] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "ok" | "erro";
    texto: string;
  } | null>(null);
  const [promptInstalar, setPromptInstalar] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);

  const inputCamera = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);

  const recarregarStatus = useCallback(async () => {
    setDiag(diagnosticar());
    try {
      const atual = await inscricaoAtual();
      setInscrito(Boolean(atual));
      if (atual) {
        setAparelhos(await listPushInscricoes(token));
      }
    } catch {
      setInscrito(false);
    }
  }, [token]);

  useEffect(() => {
    void recarregarStatus();
  }, [recarregarStatus]);

  useEffect(() => {
    const aoReceberPrompt = (evento: Event) => {
      evento.preventDefault();
      setPromptInstalar(evento as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", aoReceberPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", aoReceberPrompt);
  }, []);

  // Libera as URLs de preview ao sair da tela.
  useEffect(() => {
    return () => {
      fotos.forEach((foto) => URL.revokeObjectURL(foto.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAtivarPush() {
    setCarregandoPush(true);
    setMensagem(null);
    try {
      await ativarPush(token);
      vibrar("sucesso");
      setInscrito(true);
      setAparelhos(await listPushInscricoes(token));
      setMensagem({
        tipo: "ok",
        texto: "Aparelho registrado. Agora dispare a notificação de teste.",
      });
    } catch (error) {
      vibrar("erro");
      setMensagem({
        tipo: "erro",
        texto:
          error instanceof PushPermissaoNegadaError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Não foi possível ativar as notificações.",
      });
    } finally {
      setCarregandoPush(false);
      setDiag(diagnosticar());
    }
  }

  async function handleDesativarPush() {
    setCarregandoPush(true);
    try {
      await desativarPush(token);
      setInscrito(false);
      setAparelhos([]);
      setMensagem({ tipo: "ok", texto: "Notificações desligadas neste aparelho." });
    } catch {
      setMensagem({ tipo: "erro", texto: "Falha ao desligar." });
    } finally {
      setCarregandoPush(false);
    }
  }

  async function handleTestarPush() {
    setCarregandoPush(true);
    setMensagem(null);
    try {
      const resultado = await enviarPushTeste(token);
      vibrar("leve");
      setMensagem(
        resultado.enviados > 0
          ? {
              tipo: "ok",
              texto: `Enviado para ${resultado.enviados} aparelho(s). Feche o app e veja chegar na tela bloqueada.`,
            }
          : {
              tipo: "erro",
              texto: "Nenhum aparelho registrado ainda.",
            }
      );
    } catch (error) {
      setMensagem({
        tipo: "erro",
        texto: error instanceof Error ? error.message : "Falha no envio.",
      });
    } finally {
      setCarregandoPush(false);
    }
  }

  function handleArquivos(
    evento: React.ChangeEvent<HTMLInputElement>,
    origem: FotoLocal["origem"]
  ) {
    const lista = Array.from(evento.target.files ?? []);
    if (lista.length === 0) return;

    vibrar("leve");
    const novas = lista.map((arquivo) => ({
      id: `${Date.now()}-${arquivo.name}`,
      url: URL.createObjectURL(arquivo),
      nome: arquivo.name || "foto.jpg",
      tamanhoKb: Math.round(arquivo.size / 1024),
      origem,
    }));

    setFotos((atual) => [...novas, ...atual].slice(0, 8));
    evento.target.value = "";
  }

  async function handleInstalarAndroid() {
    if (!promptInstalar) return;
    await promptInstalar.prompt();
    const escolha = await promptInstalar.userChoice;
    if (escolha.outcome === "accepted") {
      setPromptInstalar(null);
      setDiag(diagnosticar());
    }
  }

  if (!diag) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const iosAntigo = diag.ehIos && diag.versaoIos !== null && diag.versaoIos < 16.4;

  return (
    <div className="space-y-4">
      <Bloco
        titulo="1. Diagnóstico deste aparelho"
        descricao="Tudo que o app precisa, verificado agora neste celular."
      >
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl neo-inset px-3 py-2">
            <dt className="text-muted-foreground">Plataforma</dt>
            <dd className="mt-0.5 font-semibold capitalize text-foreground">
              {diag.plataforma}
              {diag.versaoIos ? ` ${diag.versaoIos}` : ""}
            </dd>
          </div>
          <div className="rounded-2xl neo-inset px-3 py-2">
            <dt className="text-muted-foreground">Instalado</dt>
            <dd className="mt-0.5">
              <Selo estado={diag.instalado ? "ok" : "pendente"}>
                {diag.instalado ? "Como app" : "No navegador"}
              </Selo>
            </dd>
          </div>
          <div className="rounded-2xl neo-inset px-3 py-2">
            <dt className="text-muted-foreground">Push disponível</dt>
            <dd className="mt-0.5">
              <Selo estado={diag.suportaPush ? "ok" : "erro"}>
                {diag.suportaPush ? "Sim" : "Não"}
              </Selo>
            </dd>
          </div>
          <div className="rounded-2xl neo-inset px-3 py-2">
            <dt className="text-muted-foreground">Permissão</dt>
            <dd className="mt-0.5">
              <Selo
                estado={
                  diag.permissao === "granted"
                    ? "ok"
                    : diag.permissao === "denied"
                      ? "erro"
                      : "pendente"
                }
              >
                {diag.permissao === "granted"
                  ? "Liberada"
                  : diag.permissao === "denied"
                    ? "Bloqueada"
                    : "Não pedida"}
              </Selo>
            </dd>
          </div>
        </dl>
      </Bloco>

      <Bloco
        titulo="2. Instalar na tela de início"
        descricao={
          diag.instalado
            ? "Já está rodando como app — sem barra de navegador."
            : diag.ehIos
              ? "No iPhone a instalação é manual, pelo Safari. É o único passo que o app de loja faria sozinho."
              : "No Android o próprio navegador oferece a instalação."
        }
      >
        {diag.instalado ? (
          <div className="flex items-center gap-2 rounded-2xl neo-inset px-3 py-3 text-sm text-foreground">
            <Smartphone className="size-4 text-balloon-mint" />
            Rodando em modo app.
          </div>
        ) : diag.ehIos ? (
          <ol className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2 rounded-2xl neo-inset px-3 py-2">
              <span className="font-display text-balloon-pink">1</span>
              <span>
                Abra esta página no <strong>Safari</strong> (não funciona pelo
                Chrome no iPhone).
              </span>
            </li>
            <li className="flex gap-2 rounded-2xl neo-inset px-3 py-2">
              <span className="font-display text-balloon-pink">2</span>
              <span className="inline-flex flex-wrap items-center gap-1">
                Toque em <Share className="inline size-4" />{" "}
                <strong>Compartilhar</strong>.
              </span>
            </li>
            <li className="flex gap-2 rounded-2xl neo-inset px-3 py-2">
              <span className="font-display text-balloon-pink">3</span>
              <span>
                Escolha <strong>Adicionar à Tela de Início</strong> e confirme.
              </span>
            </li>
            <li className="flex gap-2 rounded-2xl neo-inset px-3 py-2">
              <span className="font-display text-balloon-pink">4</span>
              <span>
                Abra pelo <strong>ícone novo</strong> e volte nesta tela. Só
                assim o iPhone libera as notificações.
              </span>
            </li>
          </ol>
        ) : (
          <Button
            onClick={handleInstalarAndroid}
            disabled={!promptInstalar}
            className="w-full"
          >
            <Smartphone />
            {promptInstalar ? "Instalar app" : "Use o menu do navegador"}
          </Button>
        )}
      </Bloco>

      <Bloco
        titulo="3. Notificação no celular"
        descricao="Push de verdade: chega com o app fechado, na tela bloqueada."
      >
        {iosAntigo ? (
          <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Este iPhone está no iOS {diag.versaoIos}. Notificações de app web
            exigem iOS 16.4 ou superior.
          </p>
        ) : diag.precisaInstalarParaPush ? (
          <p className="rounded-2xl bg-balloon-sun/15 px-3 py-2 text-xs text-[#a97a00]">
            Instale na tela de início (passo 2) e reabra pelo ícone. No iPhone o
            botão abaixo só aparece dentro do app instalado.
          </p>
        ) : (
          <div className="space-y-2">
            {!inscrito ? (
              <Button
                onClick={handleAtivarPush}
                disabled={carregandoPush || !diag.suportaPush}
                className="w-full"
              >
                {carregandoPush ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Bell />
                )}
                Ativar notificações neste aparelho
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleTestarPush}
                  disabled={carregandoPush}
                  variant="secondary"
                  className="w-full"
                >
                  {carregandoPush ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Bell />
                  )}
                  Enviar notificação de teste
                </Button>
                <Button
                  onClick={handleDesativarPush}
                  disabled={carregandoPush}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <BellOff />
                  Desligar neste aparelho
                </Button>
              </>
            )}
          </div>
        )}

        {mensagem ? (
          <p
            className={cn(
              "mt-2 rounded-2xl px-3 py-2 text-xs",
              mensagem.tipo === "ok"
                ? "bg-balloon-mint/15 text-balloon-mint"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {mensagem.texto}
          </p>
        ) : null}

        {aparelhos.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {aparelhos.map((aparelho) => (
              <li
                key={aparelho.id}
                className="flex items-center justify-between rounded-2xl neo-inset px-3 py-2 text-xs"
              >
                <span className="font-medium text-foreground">
                  {aparelho.aparelho ?? "Aparelho"}
                </span>
                <span className="text-muted-foreground">
                  {aparelho.plataforma ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Bloco>

      <Bloco
        titulo="4. Câmera e galeria"
        descricao="A mesma coisa que os montadores já usam hoje — funciona igual dentro do app."
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => inputCamera.current?.click()}
            className="w-full"
          >
            <Camera />
            Tirar foto
          </Button>
          <Button
            variant="outline"
            onClick={() => inputGaleria.current?.click()}
            className="w-full"
          >
            <Images />
            Da galeria
          </Button>
        </div>

        <input
          ref={inputCamera}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(evento) => handleArquivos(evento, "camera")}
        />
        <input
          ref={inputGaleria}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={(evento) => handleArquivos(evento, "galeria")}
        />

        {fotos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {fotos.map((foto) => (
              <li key={foto.id} className="overflow-hidden rounded-2xl neo-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.nome}
                  className="aspect-square w-full object-cover"
                />
                <p className="px-1.5 py-1 text-center text-[10px] text-muted-foreground">
                  {foto.origem === "camera" ? "Câmera" : "Galeria"} ·{" "}
                  {foto.tamanhoKb} KB
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Nenhuma foto ainda. As fotos ficam só neste aparelho, nada é enviado.
          </p>
        )}
      </Bloco>

      <Bloco
        titulo="5. Resposta ao toque"
        descricao="Vibração curta a cada ação. Android responde; o Safari do iPhone não implementa vibração — é a diferença sensorial que sobra para o app nativo."
      >
        <Button
          variant="sun"
          onClick={() => vibrar("alerta")}
          className="w-full"
        >
          <Vibrate />
          Testar vibração
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {suportaVibracao()
            ? "Este aparelho suporta vibração."
            : "Este aparelho não expõe vibração ao navegador."}
        </p>
      </Bloco>

      <p className="px-2 pb-2 text-center text-[11px] text-muted-foreground">
        Teste feito na conta de {nomeUsuario}. Nada aqui altera dados de festas.
      </p>
    </div>
  );
}
