// Reads one file out of a .zip (a WhatsApp chat export) with the platform's DecompressionStream.

const u16 = (b            , o        ) => b[o] | (b[o + 1] << 8);
const u32 = (b            , o        ) => (u16(b, o) | (u16(b, o + 2) << 16)) >>> 0;

async function inflate(raw            )                      {
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZipEntry(data            , nameEndsWith        )                         {
  let eocd = -1;
  for (let i = data.length - 22; i >= 0; i--) {
    if (u32(data, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const total = u16(data, eocd + 10);
  let p = u32(data, eocd + 16);
  for (let n = 0; n < total && u32(data, p) === 0x02014b50; n++) {
    const method = u16(data, p + 10);
    const size = u32(data, p + 20);
    const nameLen = u16(data, p + 28);
    const name = new TextDecoder().decode(data.subarray(p + 46, p + 46 + nameLen));
    const local = u32(data, p + 42);
    p += 46 + nameLen + u16(data, p + 30) + u16(data, p + 32);
    if (!name.endsWith(nameEndsWith)) continue;
    const start = local + 30 + u16(data, local + 26) + u16(data, local + 28);
    const raw = data.subarray(start, start + size);
    const bytes = method === 0 ? raw : await inflate(raw);
    return new TextDecoder().decode(bytes);
  }
  return null;
}
