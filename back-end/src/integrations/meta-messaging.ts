import { createHmac, timingSafeEqual } from "node:crypto";
import { CanalAtendimento } from "@prisma/client";
import { env } from "../config/env";

export interface MetaInboundMessage {
  canal: CanalAtendimento;
  externalThreadId: string;
  contatoExterno?: string | null;
  contatoNome?: string | null;
  providerMessageId: string;
  texto?: string | null;
  midiaUrl?: string | null;
  midiaMimeType?: string | null;
  timestamp?: Date;
}

export interface MetaSendResult {
  providerMessageId: string | null;
  forwarded: boolean;
  stub: boolean;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Adapter Meta Cloud API (WhatsApp + Instagram Messaging).
 * Sem credenciais, opera em modo stub (log) para desenvolvimento / Fase A.
 */
export class MetaMessagingAdapter {
  isConfigured(): boolean {
    return Boolean(env.META_ACCESS_TOKEN && env.META_PHONE_NUMBER_ID);
  }

  verifyWebhookChallenge(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined
  ): string | null {
    if (mode !== "subscribe") return null;
    const expected = env.META_VERIFY_TOKEN;
    if (!expected || token !== expected) return null;
    return challenge ?? null;
  }

  validateSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
    const secret = env.META_APP_SECRET;
    if (!secret) {
      // Em dev sem secret, aceita; em produção exige.
      return env.NODE_ENV !== "production";
    }
    if (!signatureHeader?.startsWith("sha256=")) return false;
    const expected = createHmac("sha256", secret)
      .update(typeof rawBody === "string" ? rawBody : rawBody)
      .digest("hex");
    const received = signatureHeader.slice("sha256=".length);
    try {
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(received, "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  parseWebhookPayload(body: unknown): MetaInboundMessage[] {
    const messages: MetaInboundMessage[] = [];
    if (!body || typeof body !== "object") return messages;
    const root = body as {
      object?: string;
      entry?: Array<{
        id?: string;
        changes?: Array<{
          field?: string;
          value?: {
            contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
            messages?: Array<{
              id?: string;
              from?: string;
              timestamp?: string;
              type?: string;
              text?: { body?: string };
              image?: { id?: string; mime_type?: string };
              document?: { id?: string; mime_type?: string };
            }>;
            messaging?: Array<{
              sender?: { id?: string };
              recipient?: { id?: string };
              timestamp?: number;
              message?: {
                mid?: string;
                text?: string;
                attachments?: Array<{ type?: string; payload?: { url?: string } }>;
              };
            }>;
          };
        }>;
      }>;
    };

    const objectType = root.object ?? "";

    for (const entry of root.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        // WhatsApp Cloud API
        if (objectType === "whatsapp_business_account" || change.field === "messages") {
          const contact = value.contacts?.[0];
          for (const msg of value.messages ?? []) {
            if (!msg.id || !msg.from) continue;
            messages.push({
              canal: CanalAtendimento.WHATSAPP,
              externalThreadId: digitsOnly(msg.from),
              contatoExterno: msg.from,
              contatoNome: contact?.profile?.name ?? null,
              providerMessageId: msg.id,
              texto: msg.text?.body ?? null,
              midiaMimeType:
                msg.image?.mime_type ?? msg.document?.mime_type ?? null,
              timestamp: msg.timestamp
                ? new Date(Number(msg.timestamp) * 1000)
                : new Date(),
            });
          }
        }

        // Instagram Messaging (via page webhook)
        if (
          objectType === "instagram" ||
          objectType === "page" ||
          change.field === "messages"
        ) {
          for (const evt of value.messaging ?? []) {
            const mid = evt.message?.mid;
            const senderId = evt.sender?.id;
            if (!mid || !senderId) continue;
            const attachment = evt.message?.attachments?.[0];
            messages.push({
              canal: CanalAtendimento.INSTAGRAM,
              externalThreadId: senderId,
              contatoExterno: senderId,
              contatoNome: null,
              providerMessageId: mid,
              texto: evt.message?.text ?? null,
              midiaUrl: attachment?.payload?.url ?? null,
              midiaMimeType: attachment?.type ?? null,
              timestamp: evt.timestamp
                ? new Date(evt.timestamp)
                : new Date(),
            });
          }
        }
      }
    }

    return messages;
  }

  async sendText(params: {
    canal: CanalAtendimento;
    to: string;
    text: string;
  }): Promise<MetaSendResult> {
    if (params.canal === CanalAtendimento.MANUAL) {
      console.info("[meta-messaging] stub MANUAL send", params.to, params.text.slice(0, 80));
      return { providerMessageId: `manual-${Date.now()}`, forwarded: false, stub: true };
    }

    if (!this.isConfigured()) {
      console.info(
        "[meta-messaging] stub send (sem META_*):",
        params.canal,
        params.to,
        params.text.slice(0, 120)
      );
      return {
        providerMessageId: `stub-${Date.now()}`,
        forwarded: false,
        stub: true,
      };
    }

    if (params.canal === CanalAtendimento.WHATSAPP) {
      return this.sendWhatsAppText(params.to, params.text);
    }

    if (params.canal === CanalAtendimento.INSTAGRAM) {
      return this.sendInstagramText(params.to, params.text);
    }

    return { providerMessageId: null, forwarded: false, stub: true };
  }

  private async sendWhatsAppText(
    to: string,
    text: string
  ): Promise<MetaSendResult> {
    const phoneNumberId = env.META_PHONE_NUMBER_ID!;
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digitsOnly(to),
        type: "text",
        text: { body: text },
      }),
    });

    const json = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(
        json.error?.message ?? `Meta WhatsApp HTTP ${response.status}`
      );
    }

    return {
      providerMessageId: json.messages?.[0]?.id ?? null,
      forwarded: true,
      stub: false,
    };
  }

  private async sendInstagramText(
    to: string,
    text: string
  ): Promise<MetaSendResult> {
    const pageId = env.META_IG_PAGE_ID;
    if (!pageId) {
      console.info("[meta-messaging] Instagram sem META_IG_PAGE_ID — stub");
      return {
        providerMessageId: `ig-stub-${Date.now()}`,
        forwarded: false,
        stub: true,
      };
    }

    const url = `https://graph.facebook.com/v21.0/${pageId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: to },
        message: { text },
      }),
    });

    const json = (await response.json().catch(() => ({}))) as {
      message_id?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(
        json.error?.message ?? `Meta Instagram HTTP ${response.status}`
      );
    }

    return {
      providerMessageId: json.message_id ?? null,
      forwarded: true,
      stub: false,
    };
  }
}

export const metaMessaging = new MetaMessagingAdapter();
