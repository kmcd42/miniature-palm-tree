#!/usr/bin/env node
/* eslint-disable */
// Pure-Node PNG icon generator for COMPOUND.
// No native deps — uses zlib + raw RGBA buffer.

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// ---------- PNG encoder (RGBA) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const rowSize = width * 4;
  const filtered = Buffer.alloc((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (rowSize + 1)] = 0;
    rgba.copy(filtered, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Icon renderer ----------

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Background fill with subtle top-down gradient
  for (let y = 0; y < size; y++) {
    const ny = y / size;
    const r = Math.round(14 - ny * 10);   // 14 → 4
    const g = Math.round(20 - ny * 13);   // 20 → 7
    const b = Math.round(24 - ny * 14);   // 24 → 10
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[i + 0] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }

  const setPx = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const sa = a / 255;
    const ia = 1 - sa;
    buf[i + 0] = Math.round(r * sa + buf[i + 0] * ia);
    buf[i + 1] = Math.round(g * sa + buf[i + 1] * ia);
    buf[i + 2] = Math.round(b * sa + buf[i + 2] * ia);
    buf[i + 3] = 255;
  };

  // Subtle grid (cyan)
  const grid = Math.max(8, Math.floor(size / 8));
  for (let k = grid; k < size; k += grid) {
    for (let p = 0; p < size; p++) {
      setPx(k, p, 91, 200, 255, 14);
      setPx(p, k, 91, 200, 255, 14);
    }
  }

  // Scanlines (every 2px, faint)
  const scanStep = Math.max(2, Math.floor(size / 200));
  for (let y = 0; y < size; y += scanStep) {
    for (let x = 0; x < size; x++) setPx(x, y, 0, 0, 0, 24);
  }

  // Corner brackets (amber)
  const bThick = Math.max(1, Math.floor(size / 100));
  const bLen = Math.floor(size * 0.10);
  const pad = Math.floor(size * 0.115);
  const drawBracket = (cx, cy, sx, sy) => {
    for (let i = 0; i < bLen; i++) {
      for (let t = 0; t < bThick; t++) {
        setPx(cx + sx * i, cy + sy * t, 255, 180, 83, 220);
        setPx(cx + sx * t, cy + sy * i, 255, 180, 83, 220);
      }
    }
  };
  drawBracket(pad, pad, 1, 1);
  drawBracket(size - 1 - pad, pad, -1, 1);
  drawBracket(pad, size - 1 - pad, 1, -1);
  drawBracket(size - 1 - pad, size - 1 - pad, -1, -1);

  // Three rising amber bars
  const m = size;
  const barW = Math.floor(m * 0.10);
  const gap = Math.floor(m * 0.035);
  const baseY = Math.floor(m * 0.76);
  const heights = [0.18, 0.30, 0.45];
  const totalW = 3 * barW + 2 * gap;
  const startX = Math.floor((m - totalW) / 2);
  const barTops = [];
  for (let b = 0; b < 3; b++) {
    const bx = startX + b * (barW + gap);
    const bh = Math.floor(m * heights[b]);
    const top = baseY - bh;
    barTops.push({ x: bx + Math.floor(barW / 2), y: top });
    for (let dy = 0; dy < bh; dy++) {
      const intensity = 1 - (dy / bh) * 0.35;
      const r2 = 255;
      const g2 = Math.round(180 - (1 - intensity) * 40);
      const b2 = 83;
      for (let dx = 0; dx < barW; dx++) {
        setPx(bx + dx, baseY - dy, r2, g2, b2, Math.round(255 * intensity));
      }
    }
  }

  // Trend line through bar tops + extending to upper right
  const points = [
    { x: barTops[0].x, y: barTops[0].y - 4 },
    { x: barTops[1].x, y: barTops[1].y - 4 },
    { x: barTops[2].x, y: barTops[2].y - 4 },
    { x: Math.floor(m * 0.86), y: Math.floor(m * 0.20) },
  ];
  const lineThick = Math.max(1, Math.floor(size / 100));
  const drawLine = (x1, y1, x2, y2, thickness) => {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      for (let dx = -thickness; dx <= thickness; dx++) {
        for (let dy = -thickness; dy <= thickness; dy++) {
          const d = Math.hypot(dx, dy);
          if (d <= thickness) {
            const a = Math.max(0, 240 - Math.floor((d / thickness) * 160));
            setPx(Math.round(x + dx), Math.round(y + dy), 255, 180, 83, a);
          }
        }
      }
    }
  };
  for (let i = 0; i < points.length - 1; i++) {
    drawLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, lineThick + 1);
  }

  // Arrow head (filled triangle pointing up-right)
  const ah = Math.max(6, Math.floor(size / 22));
  const tip = points[points.length - 1];
  for (let dy = -ah; dy <= ah; dy++) {
    for (let dx = -ah; dx <= ah; dx++) {
      if (dx <= 0 && dy >= 0 && Math.abs(dx) + Math.abs(dy) < ah) {
        setPx(tip.x + dx, tip.y + dy, 255, 180, 83, 230);
      }
    }
  }

  // Rounded corner mask — paint outer corners with the background color so the
  // visible silhouette has the iOS-style rounded square.
  const r = Math.floor(size * 0.18);
  const cornerFill = (cx, cy, dxSign, dySign) => {
    for (let dy = 0; dy <= r; dy++) {
      for (let dx = 0; dx <= r; dx++) {
        const distSq = (r - dx) * (r - dx) + (r - dy) * (r - dy);
        if (distSq > r * r) {
          const x = cx + dxSign * dx;
          const y = cy + dySign * dy;
          if (x >= 0 && y >= 0 && x < size && y < size) {
            const i = (y * size + x) * 4;
            buf[i + 0] = 4;
            buf[i + 1] = 7;
            buf[i + 2] = 10;
            buf[i + 3] = 255;
          }
        }
      }
    }
  };
  cornerFill(r, r, -1, -1);
  cornerFill(size - 1 - r, r, 1, -1);
  cornerFill(r, size - 1 - r, -1, 1);
  cornerFill(size - 1 - r, size - 1 - r, 1, 1);

  return buf;
}

// ---------- Render & write ----------

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const size of SIZES) {
    const rgba = renderIcon(size);
    const png = encodePNG(size, size, rgba);
    const out = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(out, png);
    console.log(`wrote ${out} (${(png.length / 1024).toFixed(1)} KB)`);
  }
  // Favicon at 32 too (overwrites the legacy placeholder)
  const favicon = encodePNG(32, 32, renderIcon(32));
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), favicon);
  console.log('wrote favicon.ico (PNG-encoded)');
}

main();
