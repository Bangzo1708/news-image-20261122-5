// news-image-20261122 round 5 — "THE WORLD IN ONE DAY"
// Sum up Sunday 22 November 2026 in one image.
// Node 22, standard library only. No network. Deterministic output.
// Draws everything by hand: a 5x7 bitmap font, a pixel canvas, and a
// hand-rolled PNG encoder (node:zlib + CRC32).
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- font --
// 5x7 pixel font, uppercase only. Each glyph is 7 rows; bit 4 is the
// leftmost pixel of the row, bit 0 the rightmost.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
};

// ------------------------------------------------------------- canvas ---
type RGB = [number, number, number];

const INK: RGB = [232, 238, 245]; // near-white
const PAPER: RGB = [10, 17, 32]; // deep navy
const GOLD: RGB = [255, 196, 66];
const RED: RGB = [214, 48, 49];
const ORANGE: RGB = [255, 122, 26];
const TEAL: RGB = [45, 190, 178];
const SKY: RGB = [96, 165, 250];
const MUTED: RGB = [148, 163, 184];
const PANEL: RGB = [16, 28, 50];
const PANEL2: RGB = [22, 38, 66];
const LINE: RGB = [52, 72, 104];

const px = new Uint8Array(W * H * 3);

function fill(c: RGB) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function set(x: number, y: number, c: RGB) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) set(i, j, c);
}

function hline(x0: number, x1: number, y: number, c: RGB) {
  for (let x = x0; x <= x1; x++) set(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB) {
  for (let y = y0; y <= y1; y++) set(x, y, c);
}

// Bresenham line, any slope.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    set(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB) {
  line(x0, y0, x1, y1, c);
  for (let k = 1; k < t; k++) {
    line(x0, y0 + k, x1, y1 + k, c);
    line(x0, y0 - k, x1, y1 - k, c);
  }
}

function circle(cx: number, cy: number, r: number, c: RGB, filled = true) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (filled ? d <= r * r : d <= r * r && d >= (r - 1) * (r - 1)) set(cx + x, cy + y, c);
    }
}

function blend(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Vertical gradient band.
function vgrad(x: number, y: number, w: number, h: number, top: RGB, bot: RGB) {
  for (let j = 0; j < h; j++) {
    const c = blend(top, bot, j / Math.max(1, h - 1));
    rect(x, y + j, w, 1, c);
  }
}

// -------------------------------------------------------------- text ----
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawChar(x: number, y: number, ch: string, scale: number, c: RGB) {
  const g = FONT[ch] || FONT["?"];
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++) {
      if ((g[r] >> (4 - col)) & 1) {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB) {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    drawChar(x + i * 6 * scale, y, up[i], scale, c);
  }
}

function drawTextCenter(x: number, y: number, w: number, s: string, scale: number, c: RGB) {
  const tw = textWidth(s, scale);
  drawText(x + Math.max(0, Math.floor((w - tw) / 2)), y, s, scale, c);
}

// Greedy word wrap into at most maxLines lines of maxChars each.
function wrap(s: string, maxChars: number, maxLines: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) return lines;
    }
  }
  if (cur !== "" && lines.length < maxLines) lines.push(cur);
  return lines;
}

function drawPara(
  x: number,
  y: number,
  s: string,
  maxChars: number,
  maxLines: number,
  scale: number,
  c: RGB,
  lh?: number
): number {
  const lines = wrap(s, maxChars, maxLines);
  const step = lh ?? 8 * scale;
  lines.forEach((ln, i) => drawText(x, y + i * step, ln, scale, c));
  return lines.length;
}

// ----------------------------------------------------------- PNG out ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function writePNG(outPath: string) {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  mkdirSync(outPath.replace(/\/[^/]+$/, ""), { recursive: true });
  writeFileSync(outPath, png);
  return png.length;
}

// ------------------------------------------- verified 22 Nov stories ---
// Every story below was first reported on Sunday 22 November 2026, or
// happened that day. Items dated 20-21 Nov (Peru quake, Russia's 20 Nov
// barrage, Japan GDP, Bolsonaro ICU, EU Big Tech tax, India-Canada talks,
// the 20 Nov chip-licence disclosure, Cyclone Akvan) were checked and cut.
type Story = { h: string; d: string; icon: string };
type Region = { name: string; color: RGB; stories: Story[] };

const REGIONS: Region[] = [
  {
    name: "THE GULF",
    color: RED,
    stories: [
      { h: "BAHRAIN PLANT ABLAZE", d: "Iran attack sets an industrial site on fire; no injuries, defences intercept the rest", icon: "flame" },
      { h: "TANKERS HIT OFF OMAN", d: "UKMTO: two tankers struck by projectiles near Khasab; a third hits a mine and burns", icon: "ship" },
      { h: "SAUDIS STOP HOUTHI MISSILES", d: "Three ballistic missiles aimed at Riyadh intercepted; coalition hits Hodeidah port", icon: "shield" },
      { h: "IRAN'S TANKER GAMBIT", d: "Fourteen tankers mass off Kharg Island to break the US blockade; Tehran calls it an act of war", icon: "ship" },
      { h: "HARTHA PLANT FIRE", d: "Blaze at an Iraq power station near Basra kills four and injures thirty-five", icon: "flame" },
      { h: "HORMUZ SHIPPING CHOKED", d: "Traffic through the strait runs 65 percent below pre-war levels as attacks mount", icon: "ship" },
    ],
  },
  {
    name: "CLIMATE",
    color: TEAL,
    stories: [
      { h: "COP31 DRAFT DROPS FOSSIL FUELS", d: "Antalya text still omits oil, gas and coal; 130 nations demand a phaseout", icon: "leaf" },
      { h: "VOTE AT DAWN", d: "Plenary set for 06:00 GMT Sunday to approve the package - or fail", icon: "vote" },
      { h: "EU: GOOD DEAL OR NO DEAL", d: "Brussels refuses a weak text as talks run into a second day of overtime", icon: "flag" },
      { h: "ADAPTATION CASH CUT", d: "The 120 billion dollar by 2035 finance target is stripped from the draft", icon: "money" },
      { h: "ELECTRIFY THE WORLD", d: "Draft aims for 35 percent of global energy from electricity by 2035", icon: "bolt" },
    ],
  },
  {
    name: "EUROPE",
    color: SKY,
    stories: [
      { h: "RUTTE: EVERY INCH OF POLAND", d: "NATO chief vows to defend Polish territory after missiles fell in the east", icon: "shield" },
      { h: "ESTONIA TO SHUT RUSSIAN BORDER", d: "Tallinn moves to close the frontier as tensions rise with Moscow", icon: "flag" },
      { h: "NORWAY OIL LICENCES VOID", d: "Supreme court rules climate-disputed oil licences invalid", icon: "gavel" },
      { h: "ECB HUNT BEGINS", d: "EU searches for a new central bank chief as Lagarde resigns", icon: "money" },
      { h: "ZELENSKY: NATO IS THE GUARANTEE", d: "Ukraine's president says membership is the clearest security pledge", icon: "shield" },
      { h: "RUSSIAN SHIP CREW EVACUATED", d: "Sailors abandon a Russian vessel hit by drones as fire spreads", icon: "ship" },
    ],
  },
  {
    name: "ASIA",
    color: GOLD,
    stories: [
      { h: "MYANMAR SHAKEN M4.1", d: "Quake strikes at 02:35 IST, 95 km deep; no casualties reported", icon: "wave" },
      { h: "MODI OPENS NITISH SETU", d: "New bridge links Patna and Vaishali in Bihar", icon: "bridge" },
      { h: "INDIA PASSES 1 CRORE HPV JABS", d: "Milestone in the national vaccination drive", icon: "med" },
      { h: "INDIA ON TOP IN WELLINGTON", d: "486 for 4 on day three, lead 118 over New Zealand in the first Test", icon: "ball" },
      { h: "JEDDAH FLIGHTS GROUNDED", d: "Air India extends suspension of Jeddah services to 24 November", icon: "plane" },
      { h: "TOXIC LIQUOR KILLS 11", d: "Bad alcohol claims eleven lives in Manipur; more than 180 in hospital", icon: "med" },
    ],
  },
  {
    name: "AFRICA",
    color: ORANGE,
    stories: [
      { h: "AL-SHABAAB AMBUSH", d: "Militants claim hundreds dead in an attack on Somali troops", icon: "flame" },
      { h: "GHANA'S NEW BANKNOTES", d: "Heritage Series honours Nkrumah, Kofi Annan and Makola traders", icon: "money" },
      { h: "EBOLA: LAST PATIENT OUT", d: "Kenya discharges its final case as the DRC toll passes 5,300", icon: "med" },
      { h: "SAHEL TALKS RESTART", d: "Sahel states reopen dialogue with the West Africa bloc", icon: "flag" },
      { h: "NIGERIA BUILDS WARSHIPS", d: "Navy starts building ships at home to cut foreign dependence", icon: "ship" },
    ],
  },
  {
    name: "AMERICAS",
    color: [167, 139, 250],
    stories: [
      { h: "FLORIDA UNDER WATER", d: "St Johns River breaks a 73-year record near Cocoa; floods may last to January", icon: "drop" },
      { h: "DEMOCRATS RETAKE CONGRESS", d: "Resurgent midterm win hands the opposition the US Congress", icon: "vote" },
      { h: "HEGSETH MEMO STRAINS OTTAWA", d: "Secret memo restricts US-Canada defence ties, the Washington Post reports", icon: "flag" },
      { h: "TONY BLAIR: REJOIN ONLY IF IT INNOVATES", d: "Ex-PM says Britain should rejoin the EU only on technology terms", icon: "flag" },
    ],
  },
  {
    name: "SPORT",
    color: [74, 222, 128],
    stories: [
      { h: "ATP FINAL: ALCARAZ v ZVEREV", d: "Title decider in Turin after Alcaraz fights back past Shelton", icon: "ball" },
      { h: "AUSTRALIA EDGE WALES", d: "Wallabies hold on for a narrow win in the Nations Championship", icon: "ball" },
      { h: "FRANCE REACH THE FINAL", d: "Les Bleus beat Argentina to face South Africa next Sunday", icon: "ball" },
      { h: "EVANILSON'S SIX IN A ROW", d: "Striker scores again as Bournemouth beat Nottingham Forest", icon: "ball" },
      { h: "CUMMINS KEEPS THE CAPTAINCY", d: "Cricket Australia gives its Test skipper unanimous backing", icon: "ball" },
      { h: "PAOLO BULGARI DIES", d: "Jewellery dynasty figure remembered after his death is announced", icon: "star" },
    ],
  },
];

// --------------------------------------------------------------- icons --
// Tiny pictograms drawn in a square of side s at (x, y).
function icon(kind: string, x: number, y: number, s: number, c: RGB) {
  const u = s / 14; // unit
  const X = (v: number) => Math.round(x + v * u);
  const Y = (v: number) => Math.round(y + v * u);
  switch (kind) {
    case "flame":
      // flame: triangle body + inner tongue
      for (let r = 0; r < 12; r++) {
        const w = r < 4 ? r : 12 - r;
        hline(X(7 - w / 2), X(7 + w / 2), Y(12 - r), c);
      }
      rect(X(6), Y(8), Math.max(2, Math.round(u)), Math.round(4 * u), GOLD);
      break;
    case "ship":
      rect(X(1), Y(8), Math.round(12 * u), Math.round(3 * u), c);
      rect(X(5), Y(4), Math.round(4 * u), Math.round(4 * u), c);
      line(X(7), Y(4), X(7), Y(1), c);
      rect(X(7), Y(1), Math.round(3 * u), Math.round(2 * u), RED);
      for (let i = 0; i < 4; i++) hline(X(1) + i * 3, X(4) + i * 3, Y(12), SKY);
      break;
    case "shield":
      rect(X(4), Y(1), Math.round(6 * u), Math.round(3 * u), c);
      for (let r = 0; r < 8; r++) {
        const w = 5 - Math.floor(r / 2);
        hline(X(7 - w), X(7 + w), Y(4 + r), c);
      }
      line(X(7), Y(5), X(7), Y(10), INK);
      break;
    case "leaf":
      for (let r = 0; r < 10; r++) {
        const w = 5 - Math.abs(r - 4);
        hline(X(7 - w), X(7 + w), Y(2 + r), c);
      }
      line(X(7), Y(2), X(7), Y(13), c);
      break;
    case "gavel":
      line(X(2), Y(2), X(11), Y(7), c);
      line(X(4), Y(1), X(12), Y(6), c);
      line(X(2), Y(7), X(9), Y(12), c);
      rect(X(1), Y(11), Math.round(11 * u), Math.round(2 * u), c);
      break;
    case "bolt":
      for (let r = 0; r < 12; r++) {
        const cx = r < 6 ? 8 - Math.floor(r / 2) : 6 + Math.floor((r - 6) / 2);
        hline(X(cx - 1), X(cx + 1), Y(1 + r), c);
      }
      break;
    case "wave":
      for (let i = 0; i < 3; i++) {
        const yy = Y(3 + i * 4);
        for (let xx = 0; xx < 12; xx++) {
          const yo = Math.round(Math.sin((xx / 12) * Math.PI * 2) * 1.5);
          set(X(1 + xx), yy + yo, c);
        }
      }
      break;
    case "bridge":
      line(X(1), Y(10), X(13), Y(10), c);
      line(X(1), Y(10), X(4), Y(4), c);
      line(X(13), Y(10), X(10), Y(4), c);
      vline(X(7), Y(4), Y(10), c);
      break;
    case "med":
      rect(X(2), Y(2), Math.round(10 * u), Math.round(10 * u), c);
      rect(X(6), Y(4), Math.round(2 * u), Math.round(6 * u), PAPER);
      rect(X(4), Y(6), Math.round(6 * u), Math.round(2 * u), PAPER);
      break;
    case "ball":
      circle(X(7), Y(7), Math.round(6 * u), c);
      circle(X(7), Y(7), Math.round(2 * u), PAPER);
      break;
    case "flag":
      vline(X(3), Y(1), Y(13), c);
      rect(X(3), Y(1), Math.round(9 * u), Math.round(5 * u), c);
      break;
    case "money":
      rect(X(1), Y(4), Math.round(12 * u), Math.round(6 * u), c);
      circle(X(7), Y(7), Math.round(2 * u), PAPER);
      break;
    case "plane":
      line(X(1), Y(8), X(13), Y(8), c);
      line(X(4), Y(8), X(7), Y(3), c);
      line(X(4), Y(8), X(7), Y(12), c);
      line(X(10), Y(8), X(12), Y(5), c);
      break;
    case "drop":
      for (let r = 0; r < 10; r++) {
        const w = r < 5 ? r + 1 : 10 - r;
        hline(X(7 - w / 2), X(7 + w / 2), Y(2 + r), c);
      }
      break;
    case "star":
      line(X(7), Y(1), X(7), Y(13), c);
      line(X(1), Y(5), X(13), Y(5), c);
      line(X(3), Y(2), X(11), Y(12), c);
      line(X(11), Y(2), X(3), Y(12), c);
      break;
    case "vote":
      rect(X(2), Y(3), Math.round(10 * u), Math.round(8 * u), c);
      line(X(4), Y(8), X(6), Y(10), PAPER);
      line(X(6), Y(10), X(11), Y(4), PAPER);
      break;
    default:
      circle(X(7), Y(7), Math.round(5 * u), c);
  }
}

// Small red date chip, so every story carries its date on the image.
function dateChip(x: number, y: number) {
  rect(x, y, 42, 10, RED);
  drawText(x + 3, y + 2, "22 NOV", 1, [255, 255, 255]);
}

// ------------------------------------------------------------ hero -----
// Gulf at night: burning skyline, tankers on a dark sea, missile streaks.
function drawGulfScene(x0: number, y0: number, w: number, h: number) {
  const horizon = y0 + Math.floor(h * 0.62);
  vgrad(x0, y0, w, horizon - y0, [26, 12, 48], [196, 74, 22]);
  vgrad(x0, horizon, w, y0 + h - horizon, [12, 42, 74], [6, 20, 45]);
  // glow over the burning city
  circle(x0 + Math.floor(w * 0.16), horizon - 6, 34, [255, 140, 40]);
  circle(x0 + Math.floor(w * 0.16), horizon - 6, 18, [255, 190, 80]);
  // skyline silhouette: separate towers with gaps and lit windows
  const base = horizon;
  const towers: [number, number, number][] = [
    [0.015, 0.035, 0.05], [0.06, 0.045, 0.09], [0.115, 0.03, 0.06],
    [0.155, 0.05, 0.11], [0.215, 0.035, 0.07], [0.26, 0.04, 0.09],
  ];
  for (const [fx, fw, fh] of towers) {
    const tx = x0 + Math.floor(w * fx);
    const tw = Math.max(10, Math.floor(w * fw));
    const th = Math.floor(h * fh);
    rect(tx, base - th, tw, th, [4, 6, 12]);
    for (let wy = base - th + 6; wy < base - 4; wy += 9) {
      for (let wx = tx + 4; wx < tx + tw - 3; wx += 8) {
        if (((wx * 7 + wy * 13) % 5) < 2) set(wx, wy, GOLD);
      }
    }
  }
  // fire on the tallest tower
  const fx = x0 + Math.floor(w * 0.17);
  const fy = base - Math.floor(h * 0.11);
  for (let r = 0; r < 14; r++) {
    const ww = r < 5 ? r + 2 : 16 - r;
    hline(fx + 8 - ww, fx + 8 + ww, fy - r, r % 2 ? ORANGE : GOLD);
  }
  // radar dish on the right
  const rx = x0 + Math.floor(w * 0.86);
  const ry = base - 10;
  line(rx, ry, rx - 26, ry - 30, INK);
  line(rx, ry, rx + 6, ry - 34, INK);
  line(rx - 26, ry - 30, rx + 6, ry - 34, INK);
  line(rx - 10, ry - 32, rx + 22, ry - 18, INK);
  circle(rx, ry, 4, INK);
  // missile streaks across the sky
  thickLine(x0 + Math.floor(w * 0.98), y0 + 8, x0 + Math.floor(w * 0.55), y0 + Math.floor(h * 0.42), 2, [255, 220, 160]);
  thickLine(x0 + Math.floor(w * 0.92), y0 + 40, x0 + Math.floor(w * 0.62), y0 + Math.floor(h * 0.5), 2, ORANGE);
  thickLine(x0 + Math.floor(w * 0.85), y0 + 4, x0 + Math.floor(w * 0.42), y0 + Math.floor(h * 0.34), 1, [255, 220, 160]);
  circle(x0 + Math.floor(w * 0.55), y0 + Math.floor(h * 0.42), 4, GOLD);
  circle(x0 + Math.floor(w * 0.62), y0 + Math.floor(h * 0.5), 4, ORANGE);
  // tankers on the sea
  const seaY = horizon + Math.floor((y0 + h - horizon) * 0.35);
  rect(x0 + Math.floor(w * 0.38), seaY, Math.floor(w * 0.30), 22, [3, 6, 12]);
  rect(x0 + Math.floor(w * 0.44), seaY - 14, Math.floor(w * 0.05), 14, [3, 6, 12]);
  rect(x0 + Math.floor(w * 0.56), seaY - 10, Math.floor(w * 0.04), 10, [3, 6, 12]);
  for (let i = 0; i < 8; i++) set(x0 + Math.floor(w * 0.40) + i * 12, seaY + 6, GOLD);
  rect(x0 + Math.floor(w * 0.74), seaY + 12, Math.floor(w * 0.20), 18, [3, 6, 12]);
  rect(x0 + Math.floor(w * 0.79), seaY + 2, Math.floor(w * 0.04), 10, [3, 6, 12]);
  // smoke from the second tanker
  for (let r = 0; r < 10; r++) {
    const sx = x0 + Math.floor(w * 0.82) + (r % 3) - 1;
    rect(sx, seaY - 8 - r * 3, 8, 4, [90, 96, 110]);
  }
  // wave lines
  for (let i = 0; i < 26; i++) {
    const wx = x0 + ((i * 97) % w);
    const wy = horizon + 8 + ((i * 53) % (y0 + h - horizon - 12));
    hline(wx, wx + 18 + (i % 3) * 8, wy, [40, 90, 140]);
  }
}

function drawHeader() {
  rect(0, 0, W, 58, PAPER);
  drawText(16, 18, "THE WORLD IN ONE DAY", 3, GOLD);
  drawText(W - 16 - textWidth("SUNDAY 22 NOV 2026", 2), 22, "SUNDAY 22 NOV 2026", 2, INK);
  rect(0, 55, W, 3, GOLD);
}

function drawFooter(y: number) {
  rect(0, y, W, 2, GOLD);
  drawTextCenter(0, y + 12, W, "ALL EVENTS HAPPENED OR WERE FIRST REPORTED ON SUNDAY 22 NOVEMBER 2026", 1, MUTED);
  drawTextCenter(0, y + 28, W, "SOURCES: REUTERS - AP - AFP - BBC - AL JAZEERA - UKMTO", 1, MUTED);
}

// ------------------------------------------------- V1: the news river --
// A compact dateline bar, one big illustrated hero, a live-wire ticker,
// then one band per region: colour tab on the left, story tiles flowing
// across like a river of news.
function renderV1() {
  fill(PAPER);
  drawHeader();
  // hero
  drawGulfScene(0, 58, W, 290);
  rect(16, 70, 108, 22, RED);
  drawText(22, 77, "TOP STORY", 1, [255, 255, 255]);
  rect(0, 292, W, 56, [6, 10, 20]);
  drawText(16, 306, "GULF IN FLAMES", 4, GOLD);
  drawText(386, 302, "IRAN HITS U.S. BASES IN BAHRAIN", 2, INK);
  drawText(386, 324, "IRGC CLAIMS 2 PATRIOT RADARS DOWN", 2, MUTED);
  rect(806, 300, 200, 40, RED);
  drawTextCenter(806, 312, 200, "22 NOV 2026", 2, [255, 255, 255]);
  // ticker
  rect(0, 348, W, 28, RED);
  drawTextCenter(0, 357, W, "LIVE WIRE - 39 STORIES - 7 REGIONS - EVERY STORY DATED 22 NOV 2026", 1, [255, 255, 255]);
  // region bands
  const top = 376;
  const rowH = 85;
  REGIONS.forEach((reg, ri) => {
    const y = top + ri * rowH;
    rect(0, y, W, rowH, ri % 2 ? PANEL : PANEL2);
    rect(0, y, 128, rowH, reg.color);
    drawText(10, y + 30, reg.name, 2, [255, 255, 255]);
    drawText(10, y + 58, reg.stories.length + " STORIES", 1, [255, 255, 255]);
    const n = reg.stories.length;
    const cellW = (W - 128) / n;
    reg.stories.forEach((st, ci) => {
      const cx = 128 + Math.floor(ci * cellW);
      const cw = Math.floor(cellW);
      if (ci > 0) vline(cx, y + 6, y + rowH - 6, LINE);
      icon(st.icon, cx + 6, y + 6, 24, reg.color);
      const hChars = Math.floor((cw - 44) / 6);
      drawPara(cx + 36, y + 7, st.h, hChars, 2, 1, INK, 9);
      const dChars = Math.floor((cw - 12) / 6);
      drawPara(cx + 6, y + 36, st.d, dChars, 3, 1, MUTED, 9);
      dateChip(cx + cw - 48, y + rowH - 14);
    });
  });
  drawFooter(971);
}

// ------------------------------------------------- V2: split screen ----
// Left: one tall illustrated Gulf panel. Right: the rest of the day as a
// numbered wire list, two columns, every item dated.
function renderV2() {
  fill(PAPER);
  drawGulfScene(0, 0, 400, 560);
  rect(0, 560, 400, 464, [6, 10, 20]);
  rect(0, 560, 400, 3, GOLD);
  drawText(16, 584, "GULF IN FLAMES", 4, GOLD);
  drawText(16, 640, "IRAN HITS U.S. BASES", 2, INK);
  drawText(16, 662, "IN BAHRAIN", 2, INK);
  drawText(16, 692, "IRGC CLAIMS 2 PATRIOT", 2, MUTED);
  drawText(16, 714, "RADARS DOWN", 2, MUTED);
  rect(16, 748, 190, 34, RED);
  drawTextCenter(16, 758, 190, "22 NOV 2026", 2, [255, 255, 255]);
  drawText(16, 812, "ALSO IN THE GULF", 2, GOLD);
  drawText(16, 844, "- 2 TANKERS HIT NEAR HORMUZ", 1, INK);
  drawText(16, 862, "- BAHRAIN PLANT ABLAZE", 1, INK);
  drawText(16, 880, "- SAUDIS STOP HOUTHI MISSILES", 1, INK);
  drawText(16, 898, "- 14 TANKERS TO BREAK BLOCKADE", 1, INK);
  rect(0, 940, 400, 2, GOLD);
  drawText(16, 962, "THE WORLD IN ONE DAY", 2, GOLD);
  // right: numbered wire
  rect(400, 0, W - 400, 58, PANEL);
  drawText(416, 20, "22 NOV 2026 - THE REST OF THE DAY", 2, INK);
  rect(400, 55, W - 400, 3, GOLD);
  const all = REGIONS.flatMap((r) => r.stories.map((s) => ({ ...s, region: r.name, color: r.color })));
  const colW = (W - 400 - 16) / 2;
  const rowH = 45;
  all.forEach((st, i) => {
    const col = Math.floor(i / 20);
    const row = i % 20;
    const cx = 408 + Math.floor(col * colW);
    const y = 64 + row * rowH;
    rect(cx, y, 14, 14, st.color);
    drawText(cx + 2, y + 3, String(i + 1), 1, [255, 255, 255]);
    drawText(cx + 20, y + 2, st.h, 1, INK);
    drawPara(cx + 20, y + 13, st.d, 46, 2, 1, MUTED, 9);
    dateChip(cx + colW - 52, y + rowH - 13);
  });
  rect(400, 976, W - 400, 2, GOLD);
  drawTextCenter(400, 990, W - 400, "39 STORIES - ALL REPORTED 22 NOV 2026", 1, MUTED);
}

// ------------------------------------------------- V3: hour by hour ---
// A 24-hour axis across the top, a big hero card, twelve story cards,
// then an "also today" strip of one-liners.
const V3_CARDS: { h: string; d: string; icon: string; tag: string; color: RGB }[] = [
  { h: "COP31 DRAFT DROPS FOSSIL FUELS", d: "Antalya text still omits oil, gas and coal; 130 nations demand a phaseout; vote at 06:00 GMT", icon: "leaf", tag: "06:00 GMT", color: TEAL },
  { h: "MYANMAR SHAKEN M4.1", d: "Quake strikes at 02:35 IST, 95 km deep; no casualties reported", icon: "wave", tag: "02:35 IST", color: GOLD },
  { h: "TANKERS HIT OFF OMAN", d: "UKMTO: two tankers struck by projectiles near Khasab; a third hits a mine and burns", icon: "ship", tag: "OVERNIGHT", color: RED },
  { h: "RUTTE: EVERY INCH OF POLAND", d: "NATO chief vows to defend Polish territory after missiles fell in the east", icon: "shield", tag: "MORNING", color: SKY },
  { h: "ESTONIA TO SHUT RUSSIAN BORDER", d: "Tallinn moves to close the frontier as tensions rise with Moscow", icon: "flag", tag: "MORNING", color: SKY },
  { h: "MODI OPENS NITISH SETU", d: "New bridge links Patna and Vaishali in Bihar", icon: "bridge", tag: "MORNING", color: GOLD },
  { h: "FLORIDA UNDER WATER", d: "St Johns River breaks a 73-year record near Cocoa; floods may last to January", icon: "drop", tag: "AFTERNOON", color: [167, 139, 250] },
  { h: "DEMOCRATS RETAKE CONGRESS", d: "Resurgent midterm win hands the opposition the US Congress", icon: "vote", tag: "AFTERNOON", color: [167, 139, 250] },
  { h: "AL-SHABAAB AMBUSH", d: "Militants claim hundreds dead in an attack on Somali troops", icon: "flame", tag: "AFTERNOON", color: ORANGE },
  { h: "ATP FINAL: ALCARAZ v ZVEREV", d: "Title decider in Turin after Alcaraz fights back past Shelton", icon: "ball", tag: "EVENING", color: [74, 222, 128] },
];

function renderV3() {
  fill(PAPER);
  drawHeader();
  // 24-hour axis
  drawText(16, 76, "THE DAY, HOUR BY HOUR - UTC", 2, GOLD);
  const bands = ["EARLY HOURS 00-06", "MORNING 06-12", "AFTERNOON 12-18", "EVENING 18-24"];
  const ax0 = 60;
  const ax1 = 964;
  const segW = (ax1 - ax0) / 4;
  hline(ax0, ax1, 150, LINE);
  bands.forEach((b, i) => {
    const cx = ax0 + i * segW;
    vline(Math.round(cx), 142, 158, GOLD);
    circle(Math.round(cx + segW / 2), 150, 6, GOLD);
    drawText(Math.round(cx + 8), 126, b, 1, MUTED);
  });
  vline(ax1, 142, 158, GOLD);
  // hero card (left, spans two card rows)
  const hy = 200;
  const hh = 236;
  rect(16, hy, 480, hh, PANEL);
  rect(16, hy, 480, 4, RED);
  drawGulfScene(16, hy + 4, 480, 120);
  drawText(28, hy + 138, "GULF IN FLAMES", 3, GOLD);
  drawText(28, hy + 172, "IRAN HITS U.S. BASES IN BAHRAIN", 2, INK);
  drawText(28, hy + 196, "IRGC CLAIMS 2 PATRIOT RADARS DOWN", 2, MUTED);
  rect(28, hy + 214, 130, 18, RED);
  drawText(34, hy + 219, "03:22 UTC", 1, [255, 255, 255]);
  dateChip(420, hy + 214);
  // ten story cards: six beside the hero (2 cols x 3 rows),
  // four more in a full-width row below
  const cardW = 232;
  const cardH = 112;
  V3_CARDS.forEach((c, i) => {
    let px0: number;
    let py0: number;
    if (i < 6) {
      px0 = 512 + (i % 2) * (cardW + 16);
      py0 = hy + Math.floor(i / 2) * (cardH + 12);
    } else {
      px0 = 16 + (i - 6) * (cardW + 16);
      py0 = hy + 3 * (cardH + 12) + 12;
    }
    rect(px0, py0, cardW, cardH, PANEL);
    rect(px0, py0, cardW, 4, c.color);
    icon(c.icon, px0 + 8, py0 + 12, 22, c.color);
    drawText(px0 + 36, py0 + 14, c.tag, 1, GOLD);
    drawPara(px0 + 8, py0 + 34, c.h, 36, 2, 1, INK, 9);
    drawPara(px0 + 8, py0 + 56, c.d, 36, 3, 1, MUTED, 9);
    dateChip(px0 + cardW - 48, py0 + cardH - 14);
  });
  // also-today strip: the remaining stories as one-liners
  const used = new Set(V3_CARDS.map((c) => c.h));
  const rest = REGIONS.flatMap((r) => r.stories).filter((s) => !used.has(s.h));
  const stripY = 700;
  rect(0, stripY, W, 3, GOLD);
  drawText(16, stripY + 14, "ALSO TODAY - 22 NOV 2026", 2, GOLD);
  const cols = 3;
  const colW2 = (W - 32) / cols;
  rest.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 16 + col * colW2;
    const cy = stripY + 44 + row * 22;
    const reg = REGIONS.find((r) => r.stories.includes(s))!;
    rect(cx, cy + 1, 10, 10, reg.color);
    drawText(cx + 16, cy + 2, s.h, 1, INK);
  });
  drawFooter(968);
}

// ---------------------------------------------------------------- main --
const variant = process.argv[2] || process.env.MAKEFUN_VARIANT || "v1"; // v1 won: strongest at a glance
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
if (variant === "v1") renderV1();
else if (variant === "v2") renderV2();
else renderV3();
const bytes = writePNG(outDir + "/entry.png");
console.log("variant " + variant + " wrote " + outDir + "/entry.png (" + bytes + " bytes)");
