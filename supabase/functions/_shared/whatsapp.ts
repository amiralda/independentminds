// Shared WhatsApp notification utility using Twilio
// Uses TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM secrets

export async function sendWhatsApp(toNumber: string, message: string): Promise<{ ok: boolean; data: unknown }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || Deno.env.get("twilioSID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || Deno.env.get("twilioSecret");
  const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("WhatsApp credentials not configured");
    return { ok: false, data: { error: "WhatsApp not configured" } };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${toNumber}`,
      From: fromNumber,
      Body: message,
    }),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}
