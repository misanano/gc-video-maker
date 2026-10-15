// 場面ごとの「こんな雰囲気」の見本イラスト（LPの投票・寄付イラストと同じ描き方：パステル背景・紺の太い線・肌色）
const INK = "#1d2147", SKIN = "#F8CDAE", BLUE = "#3641AC", YEL = "#FFB31A", PINK = "#F0607A", WHITE = "#fff";

const heart = (x, y, s = 1, fill = PINK) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4C0-2 8-4 10 2C12-4 20-2 20 4C20 10 10 16 10 16C10 16 0 10 0 4Z" fill="${fill}" stroke="${INK}" stroke-width="${2.2 / s}" stroke-linejoin="round"/>`;
const star = (x, y, r = 7, fill = YEL) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; p.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(" ")}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
};
const limb = (x1, y1, x2, y2, w = 9, c = SKIN) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${w + 4}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;

// 人：x=中心, y=頭の中心, s=大きさ, pose: stand | cheer | wave | fist | talk
function person(x, y, s, shirt, pose = "stand", hair = INK) {
  const r = 13 * s, bw = 34 * s, bh = 40 * s, by = y + r * 0.9;
  let arms = "";
  const sh = by + 8 * s, aw = 9 * s;
  if (pose === "cheer") arms = limb(x - bw * 0.42, sh, x - bw * 0.85, y - r * 1.1, aw) + limb(x + bw * 0.42, sh, x + bw * 0.85, y - r * 1.1, aw);
  else if (pose === "wave") arms = limb(x + bw * 0.42, sh, x + bw * 0.9, y - r * 0.9, aw) + limb(x - bw * 0.42, sh, x - bw * 0.55, by + bh * 0.75, aw);
  else if (pose === "fist") arms = limb(x + bw * 0.42, sh, x + bw * 0.62, y - r * 0.2, aw) + `<circle cx="${x + bw * 0.62}" cy="${y - r * 0.35}" r="${6 * s}" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>`;
  else if (pose === "talk") arms = limb(x + bw * 0.42, sh, x + bw * 0.55, by + bh * 0.35, aw);
  const face = `<circle cx="${x - r * 0.38}" cy="${y + r * 0.05}" r="${1.6 * s}" fill="${INK}"/><circle cx="${x + r * 0.38}" cy="${y + r * 0.05}" r="${1.6 * s}" fill="${INK}"/>` +
    `<path d="M${x - r * 0.35} ${y + r * 0.38} Q${x} ${y + r * (pose === "talk" ? 0.85 : 0.75)} ${x + r * 0.35} ${y + r * 0.38}" fill="${pose === "talk" || pose === "cheer" ? INK : "none"}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  return `<g>${arms}<rect x="${x - bw / 2}" y="${by}" width="${bw}" height="${bh}" rx="${14 * s}" fill="${shirt}" stroke="${INK}" stroke-width="2.5"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${SKIN}" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M${x - r} ${y - r * 0.05} A${r} ${r} 0 0 1 ${x + r} ${y - r * 0.05} Q${x + r * 0.2} ${y - r * 0.55} ${x - r} ${y - r * 0.05}Z" fill="${hair}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>${face}</g>`;
}

// 画面の枠：パステル背景＋左上ロゴ＋上のテロップ＋下の団体名帯
function frame(bg, soft, body, telop, { band = true } = {}) {
  return `<svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" role="img">` +
    `<rect width="180" height="320" fill="${bg}"/><circle cx="20" cy="270" r="44" fill="${soft}"/><circle cx="165" cy="120" r="34" fill="${soft}"/>` +
    body +
    `<rect x="8" y="10" width="34" height="16" rx="4" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/><circle cx="16" cy="18" r="4" fill="${BLUE}"/><rect x="22" y="15" width="16" height="2.5" rx="1" fill="${INK}" opacity=".5"/><rect x="22" y="19.5" width="11" height="2.5" rx="1" fill="${INK}" opacity=".35"/>` +
    telop +
    (band ? `<rect x="0" y="282" width="180" height="14" fill="${BLUE}"/><rect x="58" y="287" width="64" height="4" rx="2" fill="${WHITE}" opacity=".85"/>` : "") +
    `</svg>`;
}

// テロップの形（白箱＋青文字／黄箱）。文字は短い棒で表す見本
const box = (y, w, fill = WHITE, text = BLUE, h = 18) =>
  `<rect x="${90 - w / 2}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${INK}" stroke-width="1.5"/><rect x="${90 - w / 2 + 8}" y="${y + h / 2 - 2.5}" width="${w - 16}" height="5" rx="2.5" fill="${text}" opacity=".85"/>`;
const bigText = (y, label) =>
  `<text x="90" y="${y}" text-anchor="middle" font-size="19" font-weight="900" font-family="Noto Sans JP,Hiragino Sans,sans-serif" fill="${YEL}" stroke="${BLUE}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${label}</text>`;

export const SAMPLES = {
  // 阪大アイスホッケー部の冒頭のような「全員がカメラに寄って、段になって画面を埋める」フォーメーション
  hero: () => frame("#FFE68A", "#FFF3C4",
    // 後ろの列（立って手を上げる）
    person(30, 112, 1.05, WHITE, "cheer") + person(70, 104, 1.1, BLUE, "cheer") + person(110, 104, 1.1, YEL, "wave") + person(150, 112, 1.05, PINK, "cheer") +
      // 真ん中の列
      person(48, 160, 1.4, YEL, "stand") + person(132, 160, 1.4, BLUE, "fist") +
      // 前の列（しゃがんでカメラに一番近い・顔が大きい）
      person(26, 222, 1.75, PINK, "stand") + person(154, 222, 1.75, WHITE, "stand") + person(90, 214, 1.85, BLUE, "stand") +
      // 真ん中の子が手書きボードを持つ
      `<g transform="rotate(-4 90 262)"><rect x="66" y="246" width="48" height="34" rx="2" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M73 256 h18 M73 264 h30 M73 272 h22" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/></g>` +
      limb(62, 268, 70, 262, 8) + limb(118, 268, 110, 262, 8) +
      heart(8, 78, 0.6) + star(170, 74, 6),
    bigText(52, "〇〇です！")),
  hero2: () => SAMPLES.hero().replace("</svg>", box(62, 120) + "</svg>"),
  intro: () => frame("#CFE6FF", "#E6F2FF",
    person(90, 158, 1.9, BLUE, "talk") + heart(140, 110, 0.7) + star(34, 112, 6) +
      `<path d="M128 132 q8 -4 14 0 M130 142 q10 -5 18 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    box(44, 70) + box(66, 130, BLUE, WHITE)),
  goal: () => frame("#FFD9C2", "#FFEBDD",
    `<rect x="104" y="150" width="46" height="14" rx="3" fill="${YEL}" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M112 108 h30 v18 a15 15 0 0 1 -30 0Z" fill="${YEL}" stroke="${INK}" stroke-width="2.5"/><rect x="122" y="140" width="10" height="12" fill="${YEL}" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M112 114 h-8 a8 8 0 0 0 8 10 M142 114 h8 a8 8 0 0 1 -8 10" fill="none" stroke="${INK}" stroke-width="2.5"/>` + star(127, 120, 5, WHITE) +
      person(62, 150, 1.4, BLUE, "fist") +
      `<path d="M18 120 h22 M14 134 h18 M20 148 h16" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` + star(160, 194, 6),
    box(44, 96) + `<rect x="24" y="66" width="132" height="24" fill="${INK}" transform="translate(4 4)"/><rect x="24" y="66" width="132" height="24" fill="${YEL}" stroke="${INK}" stroke-width="1.5"/><rect x="36" y="75" width="108" height="6" rx="3" fill="${BLUE}"/>`),
  money: () => frame("#5B64B8", "#6E77C6",
    person(70, 160, 1.5, YEL, "talk") +
      `<rect x="112" y="150" width="46" height="32" rx="6" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/><path d="M112 160 h46" stroke="${INK}" stroke-width="2.5"/><circle cx="148" cy="168" r="4" fill="${PINK}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="128" cy="126" r="9" fill="${YEL}" stroke="${INK}" stroke-width="2.2"/><text x="128" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}">¥</text>` +
      `<circle cx="150" cy="112" r="7" fill="${YEL}" stroke="${INK}" stroke-width="2.2" opacity=".55"/><path d="M128 140 v6 M150 124 v8" stroke="${WHITE}" stroke-width="2" stroke-dasharray="2 3"/>`,
    `<rect x="40" y="38" width="100" height="6" rx="3" fill="${WHITE}"/>` + bigText(70, "お金が") + box(80, 92, WHITE, BLUE, 20)),
  gc: () => `<svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" role="img">` +
    `<rect width="180" height="160" fill="#CFE6FF"/><circle cx="160" cy="40" r="30" fill="#E6F2FF"/>` + person(90, 92, 1.6, BLUE, "talk") +
    `<rect x="0" y="156" width="180" height="5" fill="${YEL}"/><rect y="161" width="180" height="159" fill="#F6F7FC"/>` +
    `<circle cx="34" cy="214" r="20" fill="${BLUE}" stroke="${INK}" stroke-width="2"/><rect x="27" y="202" width="14" height="24" rx="3" fill="none" stroke="${WHITE}" stroke-width="2"/>` + heart(29, 209, 0.5) +
    `<circle cx="90" cy="214" r="20" fill="${BLUE}" stroke="${INK}" stroke-width="2"/><rect x="80" y="204" width="10" height="20" fill="none" stroke="${WHITE}" stroke-width="2"/><rect x="90" y="211" width="9" height="13" fill="none" stroke="${WHITE}" stroke-width="2"/>` +
    `<circle cx="146" cy="214" r="21" fill="#CFE6FF" stroke="${BLUE}" stroke-width="3"/>` + person(146, 210, 0.55, YEL, "stand") +
    `<path d="M58 214 h10 M114 214 h10" stroke="${YEL}" stroke-width="3.5" stroke-linecap="round"/><path d="M68 209 l6 5 -6 5Z M124 209 l6 5 -6 5Z" fill="${YEL}"/>` +
    `<rect x="18" y="246" width="32" height="4" rx="2" fill="${BLUE}" opacity=".7"/><rect x="72" y="246" width="36" height="4" rx="2" fill="${BLUE}" opacity=".7"/><rect x="128" y="246" width="36" height="4" rx="2" fill="${BLUE}" opacity=".7"/>` +
    `<rect x="38" y="268" width="104" height="13" fill="${BLUE}"/><rect x="38" y="285" width="104" height="13" fill="${BLUE}"/>` +
    `<rect x="44" y="18" width="92" height="16" fill="${INK}" transform="translate(3 3)"/><rect x="44" y="18" width="92" height="16" fill="${YEL}" stroke="${INK}" stroke-width="1.5"/><rect x="54" y="24" width="72" height="4.5" rx="2" fill="${BLUE}"/>` +
    `</svg>`,
  ask: () => frame("#FFD6E0", "#FFE8EE",
    person(30, 168, 0.9, BLUE, "wave") + person(62, 158, 0.95, YEL, "cheer") + person(94, 164, 0.95, WHITE, "wave") + person(126, 156, 0.95, PINK, "cheer") + person(156, 168, 0.9, BLUE, "wave") +
      heart(10, 110, 0.8) + heart(150, 100, 0.7) + heart(84, 104, 0.55, WHITE) + star(40, 120, 5),
    box(38, 80) + box(60, 108, WHITE, BLUE, 20) + box(84, 120, WHITE, BLUE, 20)),
};

// 撮り方の見本（コンテ）でも同じ描き方を使う
export { INK, SKIN, BLUE, YEL, PINK, WHITE, heart, star, limb, person };
