// A passphrase-locked file: AES-256-GCM with a key from PBKDF2-SHA256. Used to keep the gabbai's original
// WhatsApp export next to the app (on a public site) so that only he can open it. Web Crypto only, so it
// runs the same in the browser and in Node.
//
// Layout: 'GABAYLK1' (8 bytes) · iterations (4 bytes, big endian) · salt (16) · iv (12) · ciphertext.

const MAGIC = 'GABAYLK1';
const ITERATIONS = 600_000;

async function keyFrom(passphrase        , salt            , iterations        )                     {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function lock(data            , passphrase        , iterations = ITERATIONS)                      {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(passphrase, salt, iterations);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const out = new Uint8Array(8 + 4 + 16 + 12 + body.length);
  out.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(out.buffer).setUint32(8, iterations);
  out.set(salt, 12);
  out.set(iv, 28);
  out.set(body, 40);
  return out;
}

export async function unlock(file            , passphrase        )                      {
  if (file.length < 41 || new TextDecoder().decode(file.subarray(0, 8)) !== MAGIC) throw new Error('זה לא קובץ נעול של גבאי');
  const iterations = new DataView(file.buffer, file.byteOffset).getUint32(8);
  const key = await keyFrom(passphrase, file.slice(12, 28), iterations);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: file.slice(28, 40) }, key, file.slice(40)));
  } catch {
    throw new Error('הסיסמה שגויה');
  }
}
