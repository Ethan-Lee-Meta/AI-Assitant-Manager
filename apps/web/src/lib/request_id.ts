function hex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

function bytesToUuidV4(bytes: Uint8Array): string {
  // Set version (4) and variant (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const b = bytes;
  return (
    hex(b[0]) + hex(b[1]) + hex(b[2]) + hex(b[3]) + "-" +
    hex(b[4]) + hex(b[5]) + "-" +
    hex(b[6]) + hex(b[7]) + "-" +
    hex(b[8]) + hex(b[9]) + "-" +
    hex(b[10]) + hex(b[11]) + hex(b[12]) + hex(b[13]) + hex(b[14]) + hex(b[15])
  );
}

function fallbackUuid(): string {
  // Prefer crypto.getRandomValues (browser / modern runtimes)
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return bytesToUuidV4(bytes);
  }

  // Last resort (still UUID-like; less strong)
  const rnd = () => Math.floor(Math.random() * 256);
  const bytes = new Uint8Array(Array.from({ length: 16 }, rnd));
  return bytesToUuidV4(bytes);
}

export function newRequestId(): string {
  const c: Crypto | undefined = (globalThis as any).crypto;
  // Prefer randomUUID if present
  if (c && typeof (c as any).randomUUID === "function") {
    return (c as any).randomUUID();
  }
  return fallbackUuid();
}
