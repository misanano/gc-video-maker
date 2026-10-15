// 場面の型と、15秒版・30秒版の流れ。〔 〕は団体が書き換える文字（残っていると書き出せない）。
import { W, H, BLUE, YELLOW, WHITE, drawCover, placeholder, header, telop, bigtext, stamp, gcDiagram, endcard, stripes } from "./draw.js";

const HALF = H / 2;
export const DATES = "10/16（金）〜10/25（日）";

// 文字が出るタイミング（場面の頭から）
const pop = (local, delay = 0.08) => (local - delay) / 0.25;

export const LAYOUTS = {
  hero: {
    fields: [["main", "大きな掛け声"]],
    draw(ctx, s, local, P, vid) {
      vid([0, 0, W, H]);
      bigtext(ctx, s.texts.main, 110, YELLOW, 14, W / 2, H * 0.22, pop(local));
      header(ctx, P.band);
    },
  },
  hero2: {
    fields: [["main", "大きな掛け声"], ["sub", "何の団体か（ひとこと）"]],
    draw(ctx, s, local, P, vid) {
      vid([0, 0, W, H]);
      bigtext(ctx, s.texts.main, 104, YELLOW, 14, W / 2, H * 0.19, pop(local));
      telop(ctx, [s.texts.sub], [s.texts.sub], 58, W / 2, H * 0.28, pop(local, 0.25));
      header(ctx, P.band);
    },
  },
  intro: {
    fields: [["l1", "1行目"], ["l2", "2行目（青く目立たせる）"]],
    draw(ctx, s, local, P, vid) {
      vid([0, 0, W, H]);
      telop(ctx, [s.texts.l1, s.texts.l2], [s.texts.l2], 62, W / 2, H * 0.24, pop(local));
      header(ctx, P.band);
    },
  },
  goal: {
    fields: [["l1", "小さい文字（どこで）"], ["l2", "黄色の大きい文字（何を目指す）"]],
    draw(ctx, s, local, P, vid) {
      vid([0, 0, W, H]);
      telop(ctx, [s.texts.l1], [], 56, W / 2, H * 0.19, pop(local));
      stamp(ctx, [s.texts.l2], 84, YELLOW, BLUE, W / 2, H * 0.27, pop(local, 0.22));
      header(ctx, P.band);
    },
  },
  money: {
    fields: [["l1", "何にお金がかかるか"], ["l2", "大きい文字"], ["l3", "白い箱の文字"]],
    draw(ctx, s, local, P, vid) {
      vid([0, 0, W, H]);
      ctx.fillStyle = "rgba(22,26,80,0.55)"; ctx.fillRect(0, 0, W, H);
      bigtext(ctx, s.texts.l1, 62, WHITE, 10, W / 2, H * 0.17, pop(local));
      bigtext(ctx, s.texts.l2, 130, YELLOW, 14, W / 2, H * 0.25, pop(local, 0.18));
      stamp(ctx, [s.texts.l3], 80, WHITE, BLUE, W / 2, H * 0.335, pop(local, 0.3));
      header(ctx, P.band);
    },
  },
  gc: {
    fields: [],
    draw(ctx, s, local, P, vid) {
      ctx.fillStyle = "#F6F7FC"; ctx.fillRect(0, 0, W, H);
      vid([0, 0, W, HALF - 6]);
      ctx.fillStyle = YELLOW; ctx.fillRect(0, HALF - 6, W, 12);
      gcDiagram(ctx, Math.max(0, local - 0.2), HALF + 6, P.nick, (box) => vid(box));
      stamp(ctx, ["Giving Campaignに参加！"], 52, YELLOW, BLUE, W / 2, 300, pop(local));
      header(ctx, P.band, false);
    },
  },
  ask: {
    fields: [["l1", "小さい文字（何に向けて）"], ["l2", "大きい文字1行目"], ["l3", "大きい文字2行目"]],
    draw(ctx, s, local, P, vid) {
      vid([0, 0, W, H]);
      telop(ctx, [s.texts.l1], [], 54, W / 2, H * 0.17, pop(local));
      telop(ctx, [s.texts.l2, s.texts.l3], [], 76, W / 2, H * 0.27, pop(local, 0.2));
      header(ctx, P.band);
    },
  },
};

const S = {
  hero: (target) => ({ title: "つかみ", layout: "hero", target,
    shoot: "全員（前2人・後ろ3人くらい）でカメラに寄って、笑顔でハキハキ掛け声",
    say: "「〔団体名〕です！」",
    texts: { main: "〔団体名〕です！" } }),
  hero2: (target) => ({ title: "つかみ・誰か", layout: "hero2", target,
    shoot: "全員（前2人・後ろ3人くらい）でカメラに寄って、笑顔でハキハキ掛け声",
    say: "「〔団体名〕です！〔何を〕しています！」",
    texts: { main: "〔団体名〕です！", sub: "〔ひとことで何の団体か〕" } }),
  intro: (target) => ({ title: "誰か", layout: "intro", target,
    shoot: "代表1人が話す（胸から上）",
    say: "「私たちは〔大学〕で〔何を〕している団体です」",
    texts: { l1: "〔大学名〕の", l2: "〔ひとことで何の団体か〕" } }),
  goal: (target) => ({ title: "本気", layout: "goal", target,
    shoot: "話す人＋試合・本番・制作物など、活動が一番伝わる場面（下で足せます）",
    say: "「〔大会〕で〔優勝〕を目指しています」",
    texts: { l1: "〔大会・舞台〕で", l2: "〔優勝〕を目指す！" } }),
  money: (target) => ({ title: "足りない", layout: "money", target,
    shoot: "買いたい物リストを模造紙に大きく書いて持つ（道具・遠征など）",
    say: "「〔何で勝つ〕ために、〔何〕が必要です」（何に・なぜ必要かを話す）",
    texts: { l1: "〔何に〕には", l2: "お金が", l3: "足りません！" } }),
  gc: (target) => ({ title: "GC・無料投票", layout: "gc", target,
    shoot: "話す人（画面の上半分に入ります。下の図は自動）",
    say: "「Giving Campaignでは、皆さんの無料の応援投票が、私たちの活動資金になります」",
    texts: {} }),
  ask: (target) => ({ title: "お願い", layout: "ask", target,
    shoot: "全員で、顔がかぶらないように並ぶ。最後まで笑顔で",
    say: "「応援よろしくお願いします！」（語尾まで切らない）",
    texts: { l1: "〔目標〕に向けて", l2: "応援よろしく", l3: "お願いします！" } }),
};

// recommend＝おすすめの長さ、max＝ここまでなら書き出せる、end＝エンドカードの秒数
export const VERSIONS = {
  15: { recommend: 15, max: 20, end: 2.0, scenes: [S.hero2(3.0), S.goal(2.5), S.money(2.5), S.gc(3.0), S.ask(2.0)] },
  30: { recommend: 30, max: 35, end: 3.0, scenes: [S.hero(2.0), S.intro(4.0), S.goal(5.0), S.money(5.0), S.gc(6.0), S.ask(5.0)] },
};

// 場面ごとの開始秒。エンドカードは決まった秒数。全体の長さはコマ単位（1/30秒）にそろえる
export function timeline(P) {
  const v = VERSIONS[P.version];
  let t = 0;
  const segs = P.scenes.map((s) => {
    const d = s.voice ? Math.max(0.5, s.out - s.in) : s.photos && s.photos.length ? s.photoDur : s.target;
    const seg = { s, t0: t, t1: t + d };
    t += d;
    return seg;
  });
  const total = Math.round((t + v.end) * 30) / 30;
  return { segs, endT0: t, endDur: total - t, total, playEnd: total, recommend: v.recommend, max: v.max, ok: total <= v.max + 1e-6 };
}

// 時刻 t に、どの動画の何秒を映すか（声の動画・活動の映像）
export function sourcesAt(P, t) {
  const tl = timeline(P);
  const seg = tl.segs.find((g) => t >= g.t0 && t < g.t1);
  if (!seg) return { seg: null, tl };
  const s = seg.s, local = t - seg.t0, d = seg.t1 - seg.t0;
  const out = { seg, tl, local, voice: s.voice ? { clip: s.voice, time: s.in + local } : null, show: null };
  // 写真だけの場面：写真を等間隔で切り替え、1枚ごとに少しずつ寄る（寄る・引くを交互に）
  if (!s.voice && s.photos && s.photos.length) {
    const n = s.photos.length, len = d / n, k = Math.min(n - 1, Math.floor(local / len));
    out.show = { clip: s.photos[k], time: 0, pos: kenBurns(k, (local - k * len) / len) };
    return out;
  }
  if (s.broll.length) {
    // 話している人＋足した素材を、場面の長さで等分して順番に映す（声はそのまま）
    const n = s.broll.length + 1, k = Math.min(n - 1, Math.floor(local / (d / n)));
    if (k > 0) {
      const b = s.broll[k - 1], bl = local - k * (d / n);
      out.show = { clip: b.clip, time: b.clip.image ? 0 : Math.min(b.start + bl, b.clip.duration - 0.05), pos: b.clip.image ? kenBurns(k, bl / (d / n)) : b.pos };
    }
  }
  if (!out.show && s.voice) out.show = { clip: s.voice, time: s.in + local, pos: s.pos };
  return out;
}

function kenBurns(k, p) {
  p = Math.max(0, Math.min(1, p));
  const z = k % 2 ? 1.14 - 0.12 * p : 1.02 + 0.12 * p;
  return { x: 0.5, y: 0.45, zoom: z };
}

// 1コマ描く。動画は呼ぶ前に正しい位置に合わせておく
export function drawFrame(ctx, P, t) {
  const tl = timeline(P);
  ctx.clearRect(0, 0, W, H);
  if (t >= tl.endT0) {
    endcard(ctx, t - tl.endT0, `${P.univ} ${P.team}`.trim(), DATES);
  } else {
    const src = sourcesAt(P, t);
    const s = src.seg.s;
    const vid = (box) => {
      if (src.show) drawCover(ctx, src.show.clip.el, box, src.show.pos);
      else placeholder(ctx, box, s.shoot);
    };
    LAYOUTS[s.layout].draw(ctx, s, src.local, P, vid);
  }
  // GCの場面とエンドカードに入るときだけ、斜め帯で転換（ほかは切り替え）
  const bounds = tl.segs.filter((g) => g.s.layout === "gc").map((g) => g.t0).concat([tl.endT0]);
  for (const b of bounds) {
    const p = (t - (b - 0.2)) / 0.4;
    if (p > 0 && p < 1) stripes(ctx, p);
  }
}
