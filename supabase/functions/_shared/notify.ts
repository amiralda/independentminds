// Unified notification dispatch: Telegram, WhatsApp, or both
// Reads notification_channel from parent_settings

import { sendWhatsApp } from "./whatsapp.ts";
import { decrypt } from "./crypto.ts";

interface ParentNotifySettings {
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  notification_channel: string;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
}

interface NotifyResult {
  telegram?: { ok: boolean; data?: any };
  whatsapp?: { ok: boolean; data?: any };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sendTelegram(botToken: string, chatId: string, message: string) {
  // Decrypt token if encrypted (contains ":")
  let decryptedToken = botToken;
  if (botToken.includes(":") && botToken.length > 50) {
    try {
      decryptedToken = await decrypt(botToken);
    } catch {
      // Might be a plain token that happens to contain ":"
      decryptedToken = botToken;
    }
  }

  const url = `https://api.telegram.org/bot${decryptedToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function notifyParent(
  settings: ParentNotifySettings,
  htmlMessage: string,
  plainMessage?: string
): Promise<NotifyResult> {
  const result: NotifyResult = {};
  const channel = settings.notification_channel || "telegram";
  const plain = plainMessage || htmlMessage.replace(/<[^>]*>/g, "");

  // Send via Telegram
  if ((channel === "telegram" || channel === "both") && settings.telegram_bot_token && settings.telegram_chat_id) {
    try {
      result.telegram = await sendTelegram(settings.telegram_bot_token, settings.telegram_chat_id, htmlMessage);
    } catch (e) {
      console.error("Telegram send failed:", e);
      result.telegram = { ok: false, data: { error: String(e) } };
    }
  }

  // Send via WhatsApp
  if ((channel === "whatsapp" || channel === "both") && settings.whatsapp_enabled && settings.whatsapp_number) {
    try {
      result.whatsapp = await sendWhatsApp(settings.whatsapp_number, plain);
    } catch (e) {
      console.error("WhatsApp send failed:", e);
      result.whatsapp = { ok: false, data: { error: String(e) } };
    }
  }

  return result;
}

export { escapeHtml };
