// 撮り方の見本（◯こう撮る／✕これはNG）。proposals/25_diy_shooting_conte_v2.png と同じ絵。tools/diy_conte/conte.html もここを読む
import { INK, SKIN, BLUE, YEL, PINK, WHITE, heart, star, limb, person } from "./samples.js";

const F = 'font-family="Hiragino Sans,Noto Sans JP,sans-serif" font-weight="900"';
const svg = (inner, bg = "#FFE68A") => `<svg viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg"><rect width="180" height="320" fill="${bg}"/>${inner}</svg>`;

// 吹き出しテロップ：(x,y)=箱の左上、lines=1〜2行、(px,py)=指す場所
function note(x, y, lines, px, py, color = BLUE) {
  const w = Math.max(...lines.map((l) => l.length)) * 10.4 + 14, h = lines.length * 13 + 9;
  const lx = Math.max(x, Math.min(px, x + w)), ly = py < y ? y : y + h;
  const line = px != null ? `<line x1="${lx}" y1="${ly}" x2="${px}" y2="${py}" stroke="${YEL}" stroke-width="3" stroke-linecap="round"/><circle cx="${px}" cy="${py}" r="3.5" fill="${YEL}" stroke="${INK}" stroke-width="1.5"/>` : "";
  return line + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${WHITE}" stroke="${color}" stroke-width="2"/>` +
    lines.map((l, i) => `<text x="${x + 7}" y="${y + 15 + i * 13}" font-size="10" ${F} fill="${INK}">${l}</text>`).join("");
}
// ◯と✕（イラストと同じ紺フチ）
const ok = (x = 160, y = 20) => `<circle cx="${x}" cy="${y}" r="15" fill="${WHITE}" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${BLUE}" stroke-width="5"/>`;
const ng = (x = 160, y = 20) => `<circle cx="${x}" cy="${y}" r="15" fill="${WHITE}" stroke="${INK}" stroke-width="2"/><path d="M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}" stroke="${PINK}" stroke-width="5" stroke-linecap="round"/>`;
// テロップが入る場所（点線）
const telopZone = (y0 = 34, y1 = 78) => `<rect x="12" y="${y0}" width="156" height="${y1 - y0}" rx="6" fill="${WHITE}" opacity=".45" stroke="${BLUE}" stroke-width="1.5" stroke-dasharray="4 3"/><text x="90" y="${(y0 + y1) / 2 + 4}" text-anchor="middle" font-size="10" ${F} fill="${BLUE}">ここに文字が入る</text>`;
const sun = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="${YEL}" stroke="${INK}" stroke-width="2"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = Math.PI * a / 180; return `<line x1="${x + 13 * Math.cos(r)}" y1="${y + 13 * Math.sin(r)}" x2="${x + 18 * Math.cos(r)}" y2="${y + 18 * Math.sin(r)}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`; }).join("");
const speed = (x, y) => `<path d="M${x} ${y} h18 M${x - 4} ${y + 12} h14 M${x + 2} ${y + 24} h12" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;

export const SCENES = [
  { layouts: ["hero", "hero2"], n: 1, t: "つかみ・誰か", say: "全員で「〇〇です！〇〇しています！」",
    ok: svg(telopZone() +
      person(40, 122, 1.3, WHITE, "cheer") + person(90, 116, 1.3, BLUE, "cheer") + person(140, 122, 1.3, PINK, "cheer") +
      person(54, 206, 1.95, YEL, "talk") + person(128, 206, 1.95, BLUE, "talk") +
      star(14, 96, 6) + heart(156, 160, 0.6) +
      note(6, 266, ["笑顔で、ハキハキと！"], 54, 214) + note(6, 292, ["前の2人はしゃがむ"], 128, 252) + ok()),
    okTag: "◯ 前2人・後ろ3人で寄る。笑顔でハキハキ",
    ng: svg(`<rect x="0" y="230" width="180" height="90" fill="#E8D9A8"/>` +
      person(60, 196, 0.45, BLUE, "cheer") + person(80, 194, 0.45, PINK, "cheer") + person(100, 196, 0.45, YEL, "cheer") + person(120, 194, 0.45, WHITE, "cheer") +
      note(28, 120, ["遠くて顔が小さい", "→誰かわからない"], 90, 190, PINK) + ng()),
    ngTag: "✕ 遠くから全身を撮る" },
  { layouts: ["goal"], n: 2, t: "本気", say: "「〇〇で優勝を目指しています」",
    ok: svg(telopZone() +
      // 制作物（ロボット）を2人で仕上げている場面
      `<rect x="62" y="168" width="64" height="44" rx="6" fill="${BLUE}" stroke="${INK}" stroke-width="2.5"/>` +
      `<circle cx="74" cy="218" r="9" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/><circle cx="114" cy="218" r="9" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M94 168 v-26 l18 -12" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M94 168 v-26 l18 -12" fill="none" stroke="${YEL}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="114" cy="128" r="6" fill="${YEL}" stroke="${INK}" stroke-width="2.2"/><rect x="72" y="178" width="22" height="10" rx="2" fill="${YEL}" stroke="${INK}" stroke-width="1.5"/>` +
      person(34, 150, 1.25, YEL, "talk") + person(150, 140, 1.25, PINK, "fist") +
      limb(48, 182, 66, 190, 7) + star(160, 100, 6) + `<path d="M120 110 l8 -6 M126 120 l10 -2 M64 128 l-8 -6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` +
      note(6, 238, ["試合・本番・制作物など", "活動が一番伝わる場面"], 94, 196) + note(6, 278, ["縦のまま2秒以上"]) + ok(), "#FFD9C2"),
    okTag: "◯ 活動が一番伝わる場面（試合・本番・制作物）",
    ng: svg(`<rect x="0" y="0" width="180" height="320" fill="#2B2F55"/>` +
      `<rect x="-40" y="110" width="260" height="146" fill="#FFD9C2"/>` + person(60, 160, 1.3, BLUE, "fist") + person(150, 160, 1.3, YEL, "fist") +
      `<rect x="-40" y="110" width="40" height="146" fill="${PINK}" opacity=".35"/><rect x="180" y="110" width="40" height="146" fill="${PINK}" opacity=".35"/>` +
      `<path d="M2 110 v146 M178 110 v146" stroke="${PINK}" stroke-width="3" stroke-dasharray="5 4"/>` +
      note(16, 40, ["横で撮ると、左右が", "切れて小さくなる"], 6, 180, PINK) + ng()),
    ngTag: "✕ 横で撮る（先に縦にトリミング）" },
  { layouts: ["money"], n: 3, t: "足りない", say: "「〇〇のために〇〇が必要です」",
    ok: svg(telopZone() +
      person(48, 112, 1.25, BLUE, "stand") + person(132, 112, 1.25, YEL, "stand") +
      // 模造紙に書いた「買いたい物リスト」を2人で持つ
      `<rect x="16" y="142" width="148" height="112" rx="3" fill="${WHITE}" stroke="${INK}" stroke-width="2.5"/>` +
      `<text x="90" y="160" text-anchor="middle" font-size="11" ${F} fill="${BLUE}">買いたい物リスト</text>` +
      [["遠征費", 178], ["材料・部品", 196], ["道具", 214]].map(([w, y]) => `<rect x="28" y="${y - 9}" width="10" height="10" fill="none" stroke="${INK}" stroke-width="1.8"/><text x="44" y="${y}" font-size="10" ${F} fill="${INK}">${w}</text>`).join("") +
      `<text x="28" y="240" font-size="9.5" ${F} fill="${PINK}">なぜ必要？→〇〇で勝つため</text>` +
      `<circle cx="22" cy="146" r="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/><circle cx="158" cy="146" r="7" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>` +
      note(6, 254, ["買いたい物を模造紙に", "大きく書いて持つ"], 90, 200) + note(6, 292, ["なぜ必要か・目指すかも話す"]) + ok(), "#E6E8F7"),
    okTag: "◯ 何に・なぜ必要かが一目でわかる",
    ng: svg(`<rect x="0" y="200" width="180" height="120" fill="#D8D2C2"/><rect x="24" y="60" width="132" height="90" fill="#EDE7D8" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M50 200 v-30 h24 v30 M106 200 v-30 h24 v30" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      note(20, 230, ["何に使うお金か", "伝わらない"], 90, 180, PINK) + ng(), "#EDE7D8"),
    ngTag: "✕ 何も映っていない部室・空の机" },
  { layouts: ["gc"], n: 4, t: "GC・無料投票", say: "「無料の応援投票が活動資金になります」",
    ok: svg(`<rect x="0" y="160" width="180" height="160" fill="#F6F7FC"/><rect x="0" y="156" width="180" height="5" fill="${YEL}"/>` +
      `<rect x="12" y="178" width="156" height="118" rx="8" fill="${WHITE}" stroke="${BLUE}" stroke-width="1.5" stroke-dasharray="4 3"/><text x="90" y="240" text-anchor="middle" font-size="11" ${F} fill="${BLUE}">ここは図が入る（映らない）</text>` +
      person(90, 92, 1.65, BLUE, "talk") + `<path d="M150 50 v24" stroke="${INK}" stroke-width="2"/><path d="M146 54 l4 -6 4 6 M146 70 l4 6 4 -6" fill="none" stroke="${INK}" stroke-width="2"/>` +
      note(6, 18, ["顔は画面の", "上半分に入れる"], 70, 92) + note(112, 60, ["頭の上を", "少しあける"], 150, 62) + ok(), "#CFE6FF"),
    okTag: "◯ 話す人は画面の上半分に",
    ng: svg(`<rect x="0" y="160" width="180" height="160" fill="#F6F7FC" opacity=".92"/><rect x="0" y="156" width="180" height="5" fill="${YEL}"/>` +
      person(90, 196, 1.65, BLUE, "talk").replace("<g>", `<g opacity=".35">`) +
      `<rect x="12" y="178" width="156" height="118" rx="8" fill="${WHITE}" opacity=".7" stroke="${BLUE}" stroke-width="1.5" stroke-dasharray="4 3"/>` +
      note(16, 40, ["顔が下にあると", "図で隠れてしまう"], 90, 196, PINK) + ng(), "#CFE6FF"),
    ngTag: "✕ 画面の真ん中〜下に顔がある" },
  { layouts: ["ask"], n: 5, t: "お願い", say: "全員で「応援よろしくお願いします！」",
    ok: svg(telopZone() +
      person(40, 124, 1.15, BLUE, "cheer") + person(90, 118, 1.15, PINK, "wave") + person(140, 124, 1.15, YEL, "cheer") +
      person(65, 186, 1.3, WHITE, "talk") + person(115, 186, 1.3, BLUE, "talk") +
      heart(8, 96, 0.7) + heart(156, 168, 0.6) +
      note(6, 256, ["顔がかぶらないように並ぶ"], 115, 186) + note(6, 284, ["言い終わって1秒待って", "から止める"]) + ok(), "#FFD6E0"),
    okTag: "◯ 5人の顔が全部見える・語尾まで言い切る",
    ng: svg(person(60, 168, 1.1, YEL, "talk") + person(120, 168, 1.1, PINK, "stand") +
      `<path d="M50 104 h76 a8 8 0 0 1 8 8 v16 a8 8 0 0 1 -8 8 h-50 l-10 10 v-10 h-16 a8 8 0 0 1 -8 -8 v-16 a8 8 0 0 1 8 -8Z" fill="${WHITE}" stroke="${INK}" stroke-width="2"/><text x="88" y="125" text-anchor="middle" font-size="11" ${F} fill="${INK}">お願いしま…</text>` +
            note(14, 236, ["言い終わる前に止めると", "語尾が切れる"], 88, 136, PINK) + ng(), "#FFD6E0"),
    ngTag: "✕ 言い終わった瞬間に止める" },
  { layouts: ["intro"], n: "30秒", t: "誰か（30秒版だけ）", say: "代表1人が「私たちは〇〇です」",
    ok: svg(telopZone() + sun(160, 106) + `<path d="M150 116 L124 140" stroke="${YEL}" stroke-width="3" stroke-dasharray="3 3"/>` +
      person(90, 170, 2.2, BLUE, "talk") +
      note(6, 96, ["胸から上で撮る"], 60, 214) + note(6, 238, ["カメラを見て話す"], 90, 170) + note(88, 266, ["顔に光が当たる", "向きで"], 140, 112) + ok()),
    okTag: "◯ 胸から上・カメラ目線・顔が明るい",
    ng: svg(`<rect x="34" y="70" width="112" height="120" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><path d="M90 70 v120 M34 130 h112" stroke="${INK}" stroke-width="2"/>` +
      `<g opacity=".95">${person(90, 170, 2.2, INK, "stand", INK).replaceAll(SKIN, "#3A3F6B").replaceAll(BLUE, "#2A2E52")}</g>` +
      note(10, 34, ["窓を背にすると", "顔が真っ暗"], 90, 168, PINK) + ng(), "#DDE6F5"),
    ngTag: "✕ 窓（明るい方）を背にする" },
];

// 場面の型 → 見本
export const GUIDES = Object.fromEntries(SCENES.flatMap((s) => s.layouts.map((l) => [l, s])));
