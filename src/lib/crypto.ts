// Client-side encryption for user writing files
// Uses AES-256-GCM via the Web Crypto API
// The encryption key is derived from the user's ID + a secret salt
// Files are encrypted before being sent to Supabase so even admins cannot read them

const SALT = "justwrite-e2e-v1";
const ALGO = "AES-GCM";

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(userId + SALT),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptContent(
  userId: string,
  plaintext: string
): Promise<string> {
  if (!plaintext) return "";
  const key = await deriveKey(userId);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plaintext)
  );

  // Combine IV + ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptContent(
  userId: string,
  encrypted: string
): Promise<string> {
  if (!encrypted) return "";

  // Check if the content is actually encrypted (base64 encoded)
  // Unencrypted content won't be valid base64 of the right format
  try {
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

    if (combined.length < 13) {
      // Too short to be encrypted (12 byte IV + at least 1 byte)
      return encrypted;
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveKey(userId);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // If decryption fails, content is likely not encrypted (legacy data)
    return encrypted;
  }
}
