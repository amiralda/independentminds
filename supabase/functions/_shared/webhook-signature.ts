interface VerifyOptions {
  req: Request;
  secret: string;
  toleranceSeconds?: number;
}

interface VerifiedPayload<T> {
  payload: T;
  timestamp: number;
  bodyText: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySignedJsonRequest<T>({
  req,
  secret,
  toleranceSeconds = 300,
}: VerifyOptions): Promise<VerifiedPayload<T>> {
  const signatureHeader = req.headers.get("x-webhook-signature")?.trim();
  const timestampHeader = req.headers.get("x-webhook-timestamp")?.trim();

  if (!signatureHeader) throw new Error("missing_signature");
  if (!timestampHeader) throw new Error("missing_timestamp");

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) throw new Error("invalid_timestamp");

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    throw new Error("stale_timestamp");
  }

  const bodyText = await req.text();
  let payload: T;
  try {
    payload = JSON.parse(bodyText) as T;
  } catch {
    throw new Error("invalid_json");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${bodyText}`),
  );
  const expected = `sha256=${toHex(new Uint8Array(signed))}`;

  if (!timingSafeEqual(signatureHeader, expected)) {
    throw new Error("invalid_signature");
  }

  return { payload, timestamp, bodyText };
}
