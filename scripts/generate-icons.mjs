/**
 * Generates public/icon-192.png and public/icon-512.png
 * Pure Node.js, no external dependencies.
 * Design: black background + white rounded "BM" monogram via pixel math.
 */
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};

// ── PNG chunk builder ──────────────────────────────────────────────────────
const mkChunk = (type, data) => {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crcBuf]);
};

// ── PNG encoder — RGBA (truecolour + alpha) ────────────────────────────────
const makePNG = (size, getPixel) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  // Raw scanlines: [filter=0, R,G,B,A, R,G,B,A, ...]
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size);
      row[1 + x * 4]     = r;
      row[1 + x * 4 + 1] = g;
      row[1 + x * 4 + 2] = b;
      row[1 + x * 4 + 3] = a;
    }
    rows.push(row);
  }

  return Buffer.concat([
    sig,
    mkChunk('IHDR', ihdr),
    mkChunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    mkChunk('IEND', Buffer.alloc(0))
  ]);
};

// ── Pixel design: black square, white soft circle, black "B" ──────────────
const pixel = (x, y, size) => {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36; // circle radius
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded-square background (black with slightly rounded corners)
  const pad = size * 0.08;
  const cornerR = size * 0.18;
  const inRoundedSquare = (
    x >= pad && x <= size - pad && y >= pad && y <= size - pad &&
    !(x < pad + cornerR && y < pad + cornerR && Math.hypot(x - pad - cornerR, y - pad - cornerR) > cornerR) &&
    !(x > size - pad - cornerR && y < pad + cornerR && Math.hypot(x - (size - pad - cornerR), y - pad - cornerR) > cornerR) &&
    !(x < pad + cornerR && y > size - pad - cornerR && Math.hypot(x - pad - cornerR, y - (size - pad - cornerR)) > cornerR) &&
    !(x > size - pad - cornerR && y > size - pad - cornerR && Math.hypot(x - (size - pad - cornerR), y - (size - pad - cornerR)) > cornerR)
  );

  if (!inRoundedSquare) return [255, 255, 255, 0]; // transparent outside

  // White soft ring
  const ringOuter = r;
  const ringInner = r * 0.65;
  const inRing = dist <= ringOuter && dist >= ringInner;
  if (inRing) {
    const fade = Math.min(1, Math.min(dist - ringInner, ringOuter - dist) / (size * 0.03));
    const v = Math.round(255 * fade);
    return [v, v, v, 255];
  }

  // Center dot
  const dotR = r * 0.18;
  if (dist <= dotR) {
    const fade = Math.min(1, (dotR - dist) / (size * 0.03));
    const v = Math.round(255 * fade);
    return [v, v, v, 255];
  }

  return [0, 0, 0, 255]; // black background
};

// ── Generate ──────────────────────────────────────────────────────────────
for (const size of [192, 512]) {
  const png = makePNG(size, (x, y, s) => pixel(x, y, s));
  writeFileSync(`public/icon-${size}.png`, png);
  console.log(`✓ public/icon-${size}.png  (${size}×${size})`);
}
