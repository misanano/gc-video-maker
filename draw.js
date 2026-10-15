// GC Launchpad と同じ見た目を Canvas で描く部品（tools/design.py・render.py・motion.py を移したもの）。
// 文字は傾けない・中心軸をそろえる・顔の位置（画面の高さ0.4〜0.75）に文字を置かない。

export const W = 1080, H = 1920, FPS = 30;
export const BLUE = "#3641AC", YELLOW = "#FFB31A", WHITE = "#FFFFFF", NAVY = "#161A50";
const PANEL = "#F6F7FC", PH_BG = "#DCE0F0";
export const FONT = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const easeOutCubic = (p) => 1 - Math.pow(1 - clamp(p), 3);
export const easeOutBack = (p, s = 1.9) => { p = clamp(p) - 1; return p * p * ((s + 1) * p + s) + 1; };
export const easeInOut = (p) => { p = clamp(p); return 3 * p * p - 2 * p * p * p; };

const img = (src) => new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = src; });
export const assets = {};
export async function loadAssets() {
  assets.logo = await img("assets/gc_logo.png");
  assets.logoV = await img("assets/gc_logo_vertical.png");
  assets.logoW = await img("assets/gc_logo_white.png");
  assets.mosaic = mosaicTile();
}

function font(weight, size) { return `${weight} ${size}px ${FONT}`; }

// 長い文字は maxW に収まるまで小さくする
function fitSize(ctx, text, weight, size, maxW, min = 28) {
  ctx.font = font(weight, size);
  while (size > min && ctx.measureText(text).width > maxW) { size -= 2; ctx.font = font(weight, size); }
  return size;
}

// 中心 (cx, cy) に、拡大・透明度つきで描く
function at(ctx, cx, cy, scale, alpha, fn) {
  if (scale <= 0.01 || alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  fn();
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ---------- 映像 ----------
export function drawCover(ctx, src, box, pos = { x: 0.5, y: 0.5, zoom: 1 }) {
  const [bx, by, bw, bh] = box;
  const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
  if (!sw || !sh) return;
  const s = Math.max(bw / sw, bh / sh) * (pos.zoom || 1);
  const dw = sw * s, dh = sh * s;
  const dx = bx + (bw - dw) * pos.x, dy = by + (bh - dh) * pos.y;
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();
}

export function placeholder(ctx, box, label) {
  const [x, y, w, h] = box;
  ctx.fillStyle = PH_BG; ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.strokeStyle = "#A0A6C8"; ctx.lineWidth = 6; ctx.setLineDash([34, 22]);
  ctx.strokeRect(x + 40, y + 40, w - 80, h - 80);
  ctx.restore();
  const cy = y + h * 0.56;
  ctx.font = font(900, 44);
  const PH_TEXT = "ここに動画が生成されるよ";
  const tw = ctx.measureText(PH_TEXT).width;
  const pw = tw + 150;
  ctx.fillStyle = NAVY; rr(ctx, x + w / 2 - pw / 2, cy - 46, pw, 92, 46); ctx.fill();
  ctx.fillStyle = YELLOW; ctx.beginPath();
  ctx.moveTo(x + w / 2 - pw / 2 + 42, cy - 20); ctx.lineTo(x + w / 2 - pw / 2 + 42, cy + 20); ctx.lineTo(x + w / 2 - pw / 2 + 76, cy); ctx.fill();
  ctx.fillStyle = WHITE; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(PH_TEXT, x + w / 2 - pw / 2 + 100, cy + 2);
  // 説明文は点線の枠の内側に収まるように改行する（長すぎるときは少し小さくする）
  if (label && w >= 500) {
    const maxW = w - 160, bottom = y + h - 60;
    let size = 34, lines;
    for (;;) {
      ctx.font = font(700, size);
      lines = wrapLines(ctx, label, maxW);
      if (size <= 24 || cy + 90 + (lines.length - 1) * size * 1.45 + size / 2 <= bottom) break;
      size -= 2;
    }
    ctx.fillStyle = "#6E728C"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((ln, i) => ctx.fillText(ln, x + w / 2, cy + 90 + i * size * 1.45));
  }
}

// 日本語の折り返し：幅を超えたら改行。句読点・閉じかっこは行頭に来ないよう前の行に残す。
// 「、」「）」の後ろや「（」の前で切れるときはそこで切る
const NO_HEAD = "、。，．）」』】〕！？・ー";
export function wrapLines(ctx, text, maxW) {
  const out = []; let line = "";
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxW && !NO_HEAD.includes(ch)) {
      // 行の後ろ半分に区切り（、）や「（」の前）があれば、そこで切る
      let cut = -1;
      for (let i = line.length - 1; i >= Math.floor(line.length * 0.5); i--) {
        if ("、。）」".includes(line[i])) { cut = i + 1; break; }
        if ("（「".includes(line[i])) { cut = i; break; }
      }
      if (cut > 0 && cut < line.length) { out.push(line.slice(0, cut)); line = line.slice(cut) + ch; }
      else { out.push(line); line = ch; }
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

// ---------- 共通の枠：左上ロゴ＋下の団体名帯 ----------
export function header(ctx, bandText, showBand = true) {
  const l = assets.logo, lw = 300;
  ctx.drawImage(l, 44, 70, lw, l.height * lw / l.width);
  if (!showBand) return;
  const y = H - 230;
  ctx.fillStyle = "rgba(54,65,172,0.92)"; ctx.fillRect(0, y, W, 76);
  const s = fitSize(ctx, bandText, 700, 40, W - 120);
  ctx.font = font(700, s); ctx.fillStyle = WHITE; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(bandText, W / 2, y + 40);
}

// ---------- 文字の部品 ----------
// 白い角丸ボックスに青文字。hl の語だけ青ベタ白抜き（motion.telop_img）
export function telop(ctx, lines, hl, size, cx, cy, p = 1) {
  lines = lines.filter((l) => l);
  if (!lines.length) return;
  let sz = size;
  ctx.font = font(900, sz);
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (sz > 30 && widest() + sz > W - 100) { sz -= 2; ctx.font = font(900, sz); }
  const padX = sz * 0.5, padY = sz * 0.32, gap = sz * 0.2, lineH = sz + padY * 2, mg = sz * 0.16;
  const total = lines.length * lineH + (lines.length - 1) * gap;
  const s = easeOutBack(p / 1), a = clamp(p * 3);
  at(ctx, cx, cy, s, a, () => {
    ctx.font = font(900, sz); ctx.textBaseline = "middle"; ctx.textAlign = "left";
    let y = -total / 2;
    for (const line of lines) {
      const parts = splitHl(line, hl);
      const tw = parts.reduce((acc, [t, h]) => acc + ctx.measureText(t).width + (h ? mg * 2 : 0), 0);
      let x = -tw / 2;
      ctx.fillStyle = WHITE; rr(ctx, x - padX, y, tw + padX * 2, lineH, sz * 0.26); ctx.fill();
      for (const [t, h] of parts) {
        const pw = ctx.measureText(t).width;
        if (h) {
          x += mg;
          ctx.fillStyle = BLUE; rr(ctx, x - mg * 0.6, y + padY * 0.45, pw + mg * 1.2, lineH - padY * 0.9, sz * 0.14); ctx.fill();
        }
        ctx.fillStyle = h ? WHITE : BLUE;
        ctx.fillText(t, x, y + lineH / 2 + sz * 0.02);
        x += pw + (h ? mg : 0);
      }
      y += lineH + gap;
    }
  });
}

function splitHl(line, hl) {
  const out = []; let rest = line;
  while (rest) {
    const hits = (hl || []).filter((h) => h && rest.indexOf(h) >= 0).map((h) => [rest.indexOf(h), h]).sort((a, b) => a[0] - b[0]);
    if (!hits.length) { out.push([rest, false]); break; }
    const [i, h] = hits[0];
    if (i) out.push([rest.slice(0, i), false]);
    out.push([h, true]);
    rest = rest.slice(i + h.length);
  }
  return out;
}

// 極太文字（青フチ＋紺の影）（motion.bigtext_img）
export function bigtext(ctx, text, size, color, stroke, cx, cy, p = 1) {
  if (!text) return;
  const sz = fitSize(ctx, text, 900, size, W - 110 - stroke * 2);
  const k = sz / size;
  at(ctx, cx, cy, easeOutBack(p), clamp(p * 3), () => {
    ctx.font = font(900, sz); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = stroke * 2 * k;
    ctx.strokeStyle = "rgba(22,26,80,0.78)"; ctx.fillStyle = "rgba(22,26,80,0.78)";
    ctx.strokeText(text, 8, 10); ctx.fillText(text, 8, 10);
    ctx.strokeStyle = BLUE; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  });
}

// 色ベタの箱＋紺の影（motion.stamp_img）
export function stamp(ctx, lines, size, bg, fg, cx, cy, p = 1) {
  lines = lines.filter((l) => l);
  if (!lines.length) return;
  let sz = size;
  ctx.font = font(900, sz);
  while (sz > 30 && Math.max(...lines.map((l) => ctx.measureText(l).width)) + sz * 0.7 > W - 120) { sz -= 2; ctx.font = font(900, sz); }
  const pad = sz * 0.35, lh = sz * 1.12;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const h = lh * lines.length + pad * 2 - sz * 0.12;
  at(ctx, cx, cy, easeOutBack(p), clamp(p * 3), () => {
    ctx.fillStyle = NAVY; ctx.fillRect(-w / 2 + 16, -h / 2 + 16, w, h);
    ctx.fillStyle = bg; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.font = font(900, sz); ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, 0, -h / 2 + pad + lh * i + lh / 2 - sz * 0.06));
  });
}

// 左から伸びる帯テロップ（design.caption_bar）
function captionBar(ctx, lines, y, p, size, bg, fg) {
  ctx.font = font(900, size);
  lines.forEach((line, i) => {
    const pp = easeOutCubic(p - i * 0.12);
    if (pp <= 0) return;
    const tw = ctx.measureText(line).width, pad = size * 0.45;
    const x0 = W / 2 - (tw + pad * 2) / 2, yy = y + i * size * 1.55;
    ctx.fillStyle = bg; ctx.fillRect(x0, yy, (tw + pad * 2) * pp, size * 1.4);
    if (pp > 0.6) { ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(line, x0 + pad, yy + size * 0.72); }
  });
}

// ---------- GCの仕組み図（tools/anim_gcsplit.py の diagram）----------
function heart(ctx, cx, cy, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.ellipse(cx - r / 2, cy - r * 0.4, r / 2, r / 2, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + r / 2, cy - r * 0.4, r / 2, r / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.97, cy - r * 0.25); ctx.lineTo(cx + r * 0.97, cy - r * 0.25); ctx.lineTo(cx, cy + r * 0.95); ctx.fill();
}

function iconCircle(ctx, kind, cx, cy, r, photoFn) {
  if (kind === "team") {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = PH_BG; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (photoFn) photoFn([cx - r, cy - r, r * 2, r * 2]);
    ctx.restore();
    ctx.strokeStyle = BLUE; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = WHITE; ctx.fillStyle = WHITE; ctx.lineWidth = Math.max(4, r / 14);
  if (kind === "phone") {
    rr(ctx, cx - r * 0.32, cy - r * 0.55, r * 0.64, r * 1.1, r * 0.08); ctx.stroke();
    heart(ctx, cx, cy + 2, r * 0.17, YELLOW);
  } else {
    ctx.strokeRect(cx - r * 0.42, cy - r * 0.45, r * 0.47, r * 0.93);
    ctx.strokeRect(cx + r * 0.05, cy - r * 0.12, r * 0.37, r * 0.6);
    for (const yy of [-0.3, -0.1, 0.1, 0.3]) for (const xx of [-0.3, -0.12])
      ctx.fillRect(cx + r * xx - r * 0.05, cy + r * yy - r * 0.04, r * 0.1, r * 0.08);
  }
}

function yenBadge(ctx, cx, cy, r) {
  ctx.fillStyle = YELLOW; ctx.strokeStyle = WHITE; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = BLUE; ctx.font = font(900, r * 1.1); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("¥", cx, cy + r * 0.05);
}

export function gcDiagram(ctx, t, y0, label, photoFn) {
  ctx.save(); ctx.translate(0, y0);
  ctx.fillStyle = PANEL; ctx.fillRect(0, 0, W, H - y0);
  const xs = [W * 0.19, W * 0.5, W * 0.81], cy = 330;
  const rows = [["phone", "あなたの\n応援投票"], ["company", "パートナー企業の\n協賛金"], ["team", `${label}の\n活動資金に`]];
  rows.forEach(([k, lab], i) => {
    const p = (t - i * 0.4) / 0.3;
    if (p <= 0) return;
    const r = k === "team" ? 135 : 125;
    at(ctx, xs[i], cy, easeOutBack(p, 2.0), 1, () => iconCircle(ctx, k, 0, 0, r, photoFn));
    if (p > 0.6) {
      const ls = lab.split("\n");
      let fs = 40; ctx.font = font(900, fs);
      while (fs > 26 && Math.max(...ls.map((x) => ctx.measureText(x).width)) > 310) { fs -= 2; ctx.font = font(900, fs); }
      ctx.save(); ctx.globalAlpha = clamp((p - 0.6) * 2.5);
      ctx.fillStyle = BLUE; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ls.forEach((x, j) => ctx.fillText(x, xs[i], cy + 165 + j * (fs + 8)));
      ctx.restore();
    }
    if (k === "phone" && p > 0.8) stamp(ctx, ["無料"], 46, YELLOW, BLUE, xs[i] + 105, cy - 120, (p - 0.8) * 4);
  });
  ["+1", "¥"].forEach((tok, i) => {
    const p = (t - 0.25 - i * 0.4) / 0.25;
    if (p <= 0) return;
    const x0 = xs[i] + 140, x1 = xs[i + 1] - 140, xe = x0 + (x1 - x0) * clamp(p);
    ctx.strokeStyle = YELLOW; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(xe, cy); ctx.stroke();
    if (p >= 1) {
      ctx.fillStyle = YELLOW; ctx.beginPath(); ctx.moveTo(x1 + 4, cy); ctx.lineTo(x1 - 26, cy - 22); ctx.lineTo(x1 - 26, cy + 22); ctx.fill();
      const k = ((t - 0.5 - i * 0.4) * 1.3) % 1, tx = x0 + (x1 - x0 - 30) * k;
      if (tok === "+1") bigtext(ctx, "+1", 54, YELLOW, 6, tx, cy - 50);
      else yenBadge(ctx, tx, cy - 50, 26);
    }
  });
  const p = (t - 1.25) / 0.3;
  if (p > 0) captionBar(ctx, ["投票が多いほど、", "支援金が増える！"], 700, clamp(p), 62, BLUE, WHITE);
  ctx.restore();
}

// ---------- エンドカード（render.endcard_frame）----------
function mosaicTile() {
  const logo = assets.logoW, lw = 560, lh = logo.height * lw / logo.width;
  const stepX = 620, stepY = 360, tw = stepX * 2, th = stepY * 2;
  const c = document.createElement("canvas"); c.width = tw; c.height = th;
  const g = c.getContext("2d");
  g.globalAlpha = 0.22;
  for (let r = -2; r < 4; r++) for (let col = -2; col < 4; col++) {
    const x = col * stepX + (((r % 2) + 2) % 2) * stepX / 2, y = r * stepY;
    for (const ox of [-tw, 0, tw]) for (const oy of [-th, 0, th]) {
      g.save(); g.translate(x + ox + tw / 2, y + oy + th / 2); g.rotate(-Math.PI / 6);
      g.drawImage(logo, -lw / 2, -lh / 2, lw, lh); g.restore();
    }
  }
  return c;
}

function mosaicBg(ctx, t) {
  ctx.fillStyle = BLUE; ctx.fillRect(0, 0, W, H);
  const tile = assets.mosaic, tw = tile.width, th = tile.height;
  const ox = ((t * 90) % tw + tw) % tw, oy = ((t * -52) % th + th) % th;
  for (let x = -tw; x < W + tw; x += tw) for (let y = -th; y < H + th; y += th) ctx.drawImage(tile, x + ox, y + oy);
}

function ctaButton(ctx, text, cx, cy, s) {
  at(ctx, cx, cy, s, 1, () => {
    ctx.font = font(900, 60);
    const tw = ctx.measureText(text).width, tri = 38, w = tw + tri + 140, h = 120;
    ctx.fillStyle = BLUE; rr(ctx, -w / 2, -h / 2, w, h, 60); ctx.fill();
    ctx.fillStyle = WHITE; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, -w / 2 + 50, 2);
    const tx = -w / 2 + 50 + tw + 30;
    ctx.beginPath(); ctx.moveTo(tx, -20); ctx.lineTo(tx, 20); ctx.lineTo(tx + tri, 0); ctx.fill();
  });
}

export function endcard(ctx, t, name, dates) {
  mosaicBg(ctx, t + 2.0);
  const p = easeOutCubic(t / 0.3), lift = (1 - p) * 120;
  ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = WHITE; rr(ctx, 90, 430 + lift, W - 180, 1130, 44); ctx.fill(); ctx.restore();
  const bx = (1 - easeOutCubic(t / 0.25)) * -W;
  ctx.fillStyle = YELLOW; ctx.fillRect(bx, 200, W, 150);
  ctx.font = font(900, 60); ctx.fillStyle = WHITE; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("Giving Campaign 2026", bx + W / 2, 277);
  if (t > 0.1) at(ctx, W / 2, 760 + lift, easeOutBack((t - 0.1) / 0.3), 1, () => ctx.drawImage(assets.logoV, -180, -180, 360, 360));
  if (t > 0.25) {
    ctx.save(); ctx.globalAlpha = clamp((t - 0.25) / 0.15);
    [name, "を応援しよう"].forEach((line, i) => {
      const s = fitSize(ctx, line, 900, 62, 800, 36);
      ctx.font = font(900, s); ctx.fillStyle = BLUE; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(line, W / 2, 1075 + i * 88);
    });
    ctx.restore();
  }
  if (t > 0.38) stamp(ctx, [dates], 46, YELLOW, BLUE, W / 2, 1290, (t - 0.38) / 0.2);
  if (t > 0.5) ctaButton(ctx, "応援ページはこちら", W / 2, 1440, easeOutBack((t - 0.5) / 0.2) * (1 + 0.04 * Math.sin((t - 0.5) * 9)));
}

// ---------- 場面転換：KVと同じ角度の帯が横切る（design.tr_stripes）----------
export function stripes(ctx, p) {
  const slope = Math.tan(20 * Math.PI / 180) * H, q = easeInOut(p), cx = -1700 + q * (W + 3400);
  for (const [off, width, color] of [[-1050, 150, YELLOW], [0, 1900, BLUE], [1050, 150, YELLOW], [1180, 50, WHITE]]) {
    const x = cx + off;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x - width / 2 + slope / 2, -10); ctx.lineTo(x + width / 2 + slope / 2, -10);
    ctx.lineTo(x + width / 2 - slope / 2, H + 10); ctx.lineTo(x - width / 2 - slope / 2, H + 10); ctx.fill();
  }
}
