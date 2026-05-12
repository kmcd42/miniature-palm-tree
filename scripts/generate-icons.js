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

  // Background: near-black with a subtle radial vignette toward the edges
  const cx = size / 2;
  const cy = size * 0.42;
  const maxDist = Math.hypot(size, size) * 0.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dist = Math.hypot(x - cx, y - cy) / maxDist;
      const v = Math.max(0, 14 * (1 - dist * 1.15));
      buf[i + 0] = Math.round(v * 0.7);
      buf[i + 1] = Math.round(v);
      buf[i + 2] = Math.round(v * 0.8);
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

  // Pixel-art dollar sign — same 14×20 grid as icon.svg.
  // 'X' = filled phosphor cell, '.' = empty
  const pattern = [
    '......XX......', // 0   top of vertical bar
    '......XX......', // 1
    '..XXXXXXXXXX..', // 2   top of S
    '.XXXX.XX.XXXX.', // 3
    '.XX...XX...XX.', // 4
    '.XX...XX......', // 5
    '.XX...XX......', // 6
    '..XXX.XX......', // 7
    '...XXXXX......', // 8   diagonal swoosh
    '....XXXXX.....', // 9
    '.....XXXXX....', // 10
    '......XXXXX...', // 11
    '......XX..XXX.', // 12
    '......XX...XX.', // 13
    '......XX...XX.', // 14
    '.XX...XX...XX.', // 15
    '.XXXX.XX.XXXX.', // 16
    '..XXXXXXXXXX..', // 17  bottom of S
    '......XX......', // 18  bottom of vertical bar
    '......XX......', // 19
  ];
  const COLS = 14;
  const ROWS = pattern.length;
  // Match the SVG: 24px cells in a 512 canvas with 88px x-margin + 16px y-margin.
  // Scale linearly to the requested output size.
  const cell = (24 / 512) * size;
  const xPad = (88 / 512) * size;
  const yPad = (16 / 512) * size;

  // Phosphor green
  const GR = [93, 232, 142];

  // First pass: fill each pixel cell as a tightly-packed block
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (pattern[row][col] !== 'X') continue;
      const x0 = Math.round(xPad + col * cell);
      const y0 = Math.round(yPad + row * cell);
      const x1 = Math.round(xPad + (col + 1) * cell);
      const y1 = Math.round(yPad + (row + 1) * cell);
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          setPx(xx, yy, GR[0], GR[1], GR[2], 255);
        }
      }
    }
  }

  // Soft phosphor glow — splat a low-alpha green halo around each filled cell.
  // Cheaper than a real Gaussian blur, looks similar at icon sizes.
  const glowRadius = Math.max(2, Math.round(cell * 0.45));
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (pattern[row][col] !== 'X') continue;
      const ccx = Math.round(xPad + (col + 0.5) * cell);
      const ccy = Math.round(yPad + (row + 0.5) * cell);
      for (let dy = -glowRadius; dy <= glowRadius; dy++) {
        for (let dx = -glowRadius; dx <= glowRadius; dx++) {
          const d = Math.hypot(dx, dy) / glowRadius;
          if (d > 1) continue;
          // Skip the cell itself (already filled)
          if (Math.abs(dx) < cell * 0.5 && Math.abs(dy) < cell * 0.5) continue;
          const a = Math.round(60 * (1 - d));
          if (a > 0) setPx(ccx + dx, ccy + dy, GR[0], GR[1], GR[2], a);
        }
      }
    }
  }

  // CRT scanlines — every 4 vertical pixels, a 2px dark band
  const scanPeriod = Math.max(3, Math.round(size / 128));
  for (let y = 0; y < size; y++) {
    if (y % scanPeriod < Math.max(1, scanPeriod / 2)) {
      for (let x = 0; x < size; x++) setPx(x, y, 0, 0, 0, 90);
    }
  }

  // Rounded corner mask — iOS-style rounded square. ~22% radius.
  const r = Math.floor(size * 0.22);
  const cornerFill = (cx, cy, dxSign, dySign) => {
    for (let dy = 0; dy <= r; dy++) {
      for (let dx = 0; dx <= r; dx++) {
        const distSq = (r - dx) * (r - dx) + (r - dy) * (r - dy);
        if (distSq > r * r) {
          const x = cx + dxSign * dx;
          const y = cy + dySign * dy;
          if (x >= 0 && y >= 0 && x < size && y < size) {
            const i = (y * size + x) * 4;
            buf[i + 0] = 0;
            buf[i + 1] = 0;
            buf[i + 2] = 0;
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
