// AES-GCM encryption for stored Stripe restricted keys. Same format as the original
// connect-stripe / create-proof functions: base64(iv[12] + ciphertext).
// Needs the PROOF_ENCRYPTION_KEY secret (base64, 32 bytes).

async function aesKey(usage: "encrypt" | "decrypt") {
  const raw = Deno.env.get("PROOF_ENCRYPTION_KEY");
  if (!raw) throw new Error("PROOF_ENCRYPTION_KEY not set");
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [usage]);
}

export async function encrypt(plain: string): Promise<string> {
  const key = await aesKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const out = new Uint8Array(iv.length + cipher.byteLength);
  out.set(iv);
  out.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(b64: string): Promise<string> {
  const key = await aesKey("decrypt");
  const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12));
  return new TextDecoder().decode(plain);
}
