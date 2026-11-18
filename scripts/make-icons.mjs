import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(root, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function blend(px, size, x, y, r, g, b, a) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= size || yi >= size || a <= 0) return;
  const i = (yi * size + xi) * 4;
  const sa = a / 255;
  const da = px[i + 3] / 255;
  const out = sa + da * (1 - sa);
  px[i] = (r * sa + px[i] * da * (1 - sa)) / out;
  px[i + 1] = (g * sa + px[i + 1] * da * (1 - sa)) / out;
  px[i + 2] = (b * sa + px[i + 2] * da * (1 - sa)) / out;
  px[i + 3] = out * 255;
}

function fill(px, size, r, g, b) {
  for (let i = 0; i < size * size; i += 1) {
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = 255;
  }
}

function disc(px, size, cx, cy, radius, r, g, b, a) {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(size - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(size - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius) {
        const edge = Math.min(1, radius - d);
        blend(px, size, x, y, r, g, b, a * edge);
      }
    }
  }
}

function line(px, size, x0, y0, x1, y1, width, r, g, b, a) {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(length * 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    disc(px, size, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width, r, g, b, a);
  }
}

function paint(size, padded) {
  const px = Buffer.alloc(size * size * 4);
  fill(px, size, 7, 6, 11);
  const m = padded ? size * 0.16 : size * 0.08;
  const left = m;
  const right = size - m;
  const top = size * 0.22;
  const bottom = size * 0.84;
  const mid = size / 2;
  line(px, size, mid, top, mid - size * 0.06, bottom, size * 0.012, 61, 255, 242, 180);
  line(px, size, left + size * 0.08, top + 8, left, bottom, size * 0.012, 255, 43, 214, 200);
  line(px, size, right - size * 0.08, top + 8, right, bottom, size * 0.012, 255, 43, 214, 200);
  disc(px, size, mid, bottom - size * 0.02, size * 0.11, 61, 255, 242, 90);
  disc(px, size, mid, bottom - size * 0.02, size * 0.055, 61, 255, 242, 255);
  disc(px, size, mid, bottom - size * 0.02, size * 0.024, 244, 255, 253, 255);
  return png(size, px);
}

writeFileSync(join(root, "icon-192.png"), paint(192, false));
writeFileSync(join(root, "icon-512.png"), paint(512, false));
writeFileSync(join(root, "icon-maskable-512.png"), paint(512, true));
console.log("icons written");
