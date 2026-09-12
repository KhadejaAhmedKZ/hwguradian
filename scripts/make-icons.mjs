// Generates the four PNG icons with zero dependencies (stdlib zlib + a hand-rolled
// PNG writer). Run with `npm run icons`; output lands in public/icons/.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(outDir, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size) {
  const px = (x, y) => {
    const cx = size / 2;
    const r = size / 2 - size * 0.04;
    // Rounded-square badge with a soft vertical gradient.
    const dx = Math.abs(x - cx + 0.5), dy = Math.abs(y - cx + 0.5);
    const corner = size * 0.26;
    const inside =
      dx <= r && dy <= r &&
      (dx <= r - corner || dy <= r - corner ||
        (dx - (r - corner)) ** 2 + (dy - (r - corner)) ** 2 <= corner ** 2);
    if (!inside) return [0, 0, 0, 0];
    const t = y / size;
    const bg = [Math.round(99 + 40 * t), Math.round(102 - 30 * t), Math.round(241 - 20 * t)];
    // A chunky white checkmark.
    const s = size / 128;
    const p = [(x + 0.5) / s, (y + 0.5) / s];
    const seg = (ax, ay, bx, by, w) => {
      const vx = bx - ax, vy = by - ay;
      const t2 = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - ay) * vy) / (vx * vx + vy * vy)));
      const qx = ax + vx * t2 - p[0], qy = ay + vy * t2 - p[1];
      return qx * qx + qy * qy <= w * w;
    };
    if (seg(38, 66, 58, 88, 9) || seg(58, 88, 92, 42, 9)) return [255, 255, 255, 255];
    return [...bg, 255];
  };

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(outDir, `icon-${size}.png`), png(size));
}
console.log('wrote public/icons/icon-{16,32,48,128}.png');
