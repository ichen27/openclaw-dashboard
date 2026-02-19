export const COOKIE_NAME = "dashboard_session";
const SECRET = process.env.DASHBOARD_SECRET || "openclaw-hmac-secret-key";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "midas2026";

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${hex}`;
}

export async function verify(token: string): Promise<string | null> {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;

  const payload = token.slice(0, idx);
  const sigHex = token.slice(idx + 1);

  const sigBytes = new Uint8Array(
    sigHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const key = await getKey();
  const enc = new TextEncoder();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(payload)
  );

  return valid ? payload : null;
}

export function checkPassword(password: string): boolean {
  return password === DASHBOARD_PASSWORD;
}
