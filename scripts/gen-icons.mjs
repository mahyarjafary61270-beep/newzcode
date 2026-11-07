// ── تولید آیکون‌های PWA — بدون هیچ وابستگی، پیکسل به پیکسل ──
// اجرا: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public');
mkdirSync(outDir, { recursive: true });

// ── PNG writer مینیمال ──
const crcTable = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (width, height, rgba) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

// ── رسم لوگو: حباب گپ با گرادیان (مثل favicon) ──
const lerp = (a, b, t) => a + (b - a) * t;
const STOPS = [
  [0x2d, 0xd4, 0xbf],
  [0x8b, 0x5c, 0xf6],
  [0xf4, 0x72, 0xb6]
];
const grad = (t) => {
  t = Math.max(0, Math.min(1, t));
  const seg = t < 0.5 ? 0 : 1;
  const u = (t - seg * 0.5) * 2;
  const [a, b] = [STOPS[seg], STOPS[seg + 1]];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
};

const sdCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;

// فاصلهٔ علامت‌دار مثلث
function sdTriangle(px, py, a, b, c) {
  const e0 = [b[0] - a[0], b[1] - a[1]];
  const e1 = [c[0] - b[0], c[1] - b[1]];
  const e2 = [a[0] - c[0], a[1] - c[1]];
  const v0 = [px - a[0], py - a[1]];
  const v1 = [px - b[0], py - b[1]];
  const v2 = [px - c[0], py - c[1]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
  const c01 = Math.max(0, Math.min(1, dot(v0, e0) / dot(e0, e0)));
  const c12 = Math.max(0, Math.min(1, dot(v1, e1) / dot(e1, e1)));
  const c20 = Math.max(0, Math.min(1, dot(v2, e2) / dot(e2, e2)));
  const p0 = [v0[0] - e0[0] * c01, v0[1] - e0[1] * c01];
  const p1 = [v1[0] - e1[0] * c12, v1[1] - e1[1] * c12];
  const p2 = [v2[0] - e2[0] * c20, v2[1] - e2[1] * c20];
  const dist = Math.min(Math.hypot(p0[0], p0[1]), Math.hypot(p1[0], p1[1]), Math.hypot(p2[0], p2[1]));
  const cr = (e, v) => e[0] * v[1] - e[1] * v[0];
  const s1 = cr(e0, v0);
  const s2 = cr(e1, v1);
  const s3 = cr(e2, v2);
  const inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  return inside ? -dist : dist;
}

const DOTS = [
  [0.3, 0.46],
  [0.5, 0.46],
  [0.7, 0.46]
];
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function drawBubble(N) {
  const buf = Buffer.alloc(N * N * 4);
  const aa = 1.6 / N; // ضد پله‌ای لبه‌ها
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N;
      const y = (j + 0.5) / N;
      const d = Math.min(
        sdCircle(x, y, 0.5, 0.46, 0.385),
        sdTriangle(x, y, [0.13, 0.58], [0.15, 0.93], [0.42, 0.81])
      );
      const alpha = clamp01(0.5 - d / aa);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (alpha > 0) {
        [r, g, b] = grad((x + y) / 2);
        a = alpha;
        // سه نقطهٔ تیرهٔ داخل حباب
        for (const [dx, dy] of DOTS) {
          const dd = sdCircle(x, y, dx, dy, 0.052);
          const da = clamp01(0.5 - dd / aa) * 0.6;
          if (da > 0) {
            r = lerp(r, 0x0a, da);
            g = lerp(g, 0x0c, da);
            b = lerp(b, 0x12, da);
          }
        }
      }
      const idx = (j * N + i) * 4;
      buf[idx] = Math.round(r);
      buf[idx + 1] = Math.round(g);
      buf[idx + 2] = Math.round(b);
      buf[idx + 3] = Math.round(a * 255);
    }
  }
  return buf;
}

function downsample(src, sw, dw) {
  const dst = Buffer.alloc(dw * dw * 4);
  const scale = sw / dw;
  for (let j = 0; j < dw; j++) {
    for (let i = 0; i < dw; i++) {
      const x0 = Math.floor(i * scale);
      const x1 = Math.min(sw, Math.ceil((i + 1) * scale));
      const y0 = Math.floor(j * scale);
      const y1 = Math.min(sw, Math.ceil((j + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * sw + x) * 4;
          // بلند کردن آلفا برای میانگین‌گیری درست روی پس‌زمینهٔ شفاف
          const alpha = src[idx + 3] / 255;
          r += src[idx] * alpha;
          g += src[idx + 1] * alpha;
          b += src[idx + 2] * alpha;
          a += alpha;
          n++;
        }
      }
      const idx = (j * dw + i) * 4;
      const avgA = a / n;
      const k = avgA > 0 ? 1 / avgA : 0;
      dst[idx] = Math.round((r / n) * k);
      dst[idx + 1] = Math.round((g / n) * k);
      dst[idx + 2] = Math.round((b / n) * k);
      dst[idx + 3] = Math.round(avgA * 255);
    }
  }
  return dst;
}

const big = 512;
const rgba = drawBubble(big);
writeFileSync(path.join(outDir, 'icon-512.png'), png(big, big, rgba));
writeFileSync(path.join(outDir, 'icon-192.png'), png(192, 192, downsample(rgba, big, 192)));
console.log('✅ آیکون‌ها ساخته شدند: public/icon-512.png, public/icon-192.png');
