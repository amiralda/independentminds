// AES-256-GCM encryption utilities for edge functions
// Uses ENCRYPTION_KEY from environment secrets

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};

export async function encrypt(plaintext: string): Promise<string> {
  const key = Deno.env.get("ENCRYPTION_KEY");
  if (!key) throw new Error("ENCRYPTION_KEY not configured");

  const keyBytes = hexToBytes(key);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded);

  return bytesToHex(iv) + ":" + bytesToHex(new Uint8Array(ciphertext));
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = Deno.env.get("ENCRYPTION_KEY");
  if (!key) throw new Error("ENCRYPTION_KEY not configured");

  const [ivHex, ciphertextHex] = encrypted.split(":");
  if (!ivHex || !ciphertextHex) throw new Error("Invalid encrypted format");

  const keyBytes = hexToBytes(key);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(decrypted);
}
