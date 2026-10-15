import { Muxer, ArrayBufferTarget } from "https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.mjs";
import { W, H, FPS, loadAssets, FONT } from "./draw.js";
import { LAYOUTS, VERSIONS, timeline, sourcesAt, drawFrame } from "./scenes.js";
import { GUIDES } from "./guides.js";

const SR = 48000;
const $ = (q) => document.querySelector(q);
const canvas = $("#preview");
const ctx = canvas.getContext("2d");

// ---------- 状態 ----------
const P = { version: 15, univ: "", team: "", nick: "", band: "", scenes: [],
  bgm: { kind: "none", title: "", url: "", audio: null, start: 0, vol: 0.35, licensed: false } };
const kept = { 15: null, 30: null }; // 15秒版と30秒版を行き来しても入力を残す

function newScenes(ver) {
  return VERSIONS[ver].scenes.map((t) => ({ ...t, texts: { ...t.texts }, voice: null, in: 0, out: 0, pos: { x: 0.5, y: 0.5, zoom: 1 }, broll: [], photos: [], photoDur: t.target }));
}

function syncGlobals() {
  P.univ = $("#univ").value.trim();
  P.team = $("#team").value.trim();
  P.nick = $("#nick").value.trim() || P.team || "私たち";
  P.band = `${P.univ} ${P.team}`.trim() || "〔大学名〕〔団体名〕";
}

// ---------- 動画の読み込み ----------
async function loadClip(file) {
  const url = URL.createObjectURL(file);
  const el = document.createElement("video");
  el.src = url; el.muted = true; el.playsInline = true; el.preload = "auto";
  await new Promise((ok, ng) => {
    el.onloadeddata = ok;
    el.onerror = () => ng(new Error("この動画は開けませんでした。iPhoneの場合は「設定 → カメラ → フォーマット → 互換性優先」で撮るか、MP4で書き出してから入れてください。"));
  });
  const clip = { file, url, el, duration: el.duration, audio: null, peaks: null, w: el.videoWidth, h: el.videoHeight };
  try {
    const buf = await file.arrayBuffer();
    clip.audio = await new OfflineAudioContext(2, 1, SR).decodeAudioData(buf);
    clip.peaks = peaks(clip.audio, 600);
    clip.act = activity(clip.audio);
  } catch (e) {
    clip.audioError = true;
  }
  return clip;
}

const isImage = (f) => f.type.startsWith("image") || /\.(jpe?g|png|heic|webp)$/i.test(f.name);

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const el = new Image();
  el.src = url;
  try { await el.decode(); } catch (e) { throw new Error("この写真は開けませんでした。JPEG か PNG で入れてください（iPhoneのHEICは、写真アプリから共有するとJPEGになります）。"); }
  return { file, url, el, image: true, duration: 0, w: el.naturalWidth, h: el.naturalHeight };
}

function peaks(ab, n) {
  const ch = ab.getChannelData(0), step = Math.floor(ch.length / n), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * step; j < (i + 1) * step; j += 8) m = Math.max(m, Math.abs(ch[j]));
    out[i] = m;
  }
  return out;
}

// 声が鳴っているところ（20分の1秒ごと、0〜1）。BGMを声の下で下げるのに使う
function activity(ab) {
  const ch = ab.getChannelData(0), win = SR / 20, n = Math.floor(ch.length / win), rms = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * win; j < (i + 1) * win; j += 4) s += ch[j] * ch[j];
    rms[i] = Math.sqrt(s / (win / 4));
  }
  const th = Math.max(0.015, Math.max(...rms) * 0.12), act = new Float32Array(n);
  for (let i = 0; i < n; i++) act[i] = rms[i] > th ? 1 : Math.max(0, (i ? act[i - 1] : 0) - 0.2); // 鳴り終わってから0.25秒かけて戻す
  for (let i = 1; i < n; i++) act[i] = Math.max(act[i], act[i - 1] - 0.2);
  return act;
}

function voiceAct(t) {
  const src = sourcesAt(P, t);
  const c = src.voice && src.voice.clip;
  if (!c || !c.act) return 0;
  return c.act[Math.min(c.act.length - 1, Math.max(0, Math.floor(src.voice.time * 20)))] || 0;
}

// BGMの音量：声があるときは下げ、最後の1.2秒でフェードアウト
function bgmGain(t, total) {
  const b = P.bgm;
  const duck = 1 - 0.65 * voiceAct(t);
  const fade = Math.min(1, t / 0.05, (total - t) / 1.2);
  return Math.max(0, b.vol * duck * fade);
}

// 声の始まりと終わりを探して、前0.15秒・後0.4秒の余裕をつける（語尾を切らないため）
function autoTrim(clip) {
  if (!clip.audio) return [0, clip.duration];
  const ch = clip.audio.getChannelData(0), win = Math.floor(SR * 0.05);
  const rms = [];
  for (let i = 0; i + win < ch.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j += 4) s += ch[j] * ch[j];
    rms.push(Math.sqrt(s / (win / 4)));
  }
  const peak = Math.max(...rms);
  if (peak < 0.01) return [0, clip.duration];
  const th = peak * 0.12;
  const first = rms.findIndex((v) => v > th), last = rms.length - 1 - [...rms].reverse().findIndex((v) => v > th);
  const a = Math.max(0, first * 0.05 - 0.15), b = Math.min(clip.duration, (last + 1) * 0.05 + 0.4);
  return b - a > 0.5 ? [a, b] : [0, clip.duration];
}

// ---------- お知らせ（alert は使わない） ----------
function say(text, kind = "error") {
  const m = $("#msg");
  m.textContent = text; m.className = kind === "info" ? "msg info" : "msg"; m.hidden = !text;
}

// ---------- 文字のフォント ----------
// Noto Sans JP は文字ごとに分けて読み込まれるので、使う文字を先に読み込んでから描く
const FIXED = "Giving Campaign 2026に参加！応援ページはこちらを応援しよう10/16（金）〜10/25（日）あなたの応援投票パートナー企業の協賛金活動資金に無料+1¥投票が多いほど、支援金が増える！ここに動画";
function allText() {
  return FIXED + P.univ + P.team + P.nick + P.scenes.map((s) => Object.values(s.texts).join("") + s.shoot).join("");
}
let fontKey = "";
async function ensureFonts() {
  const txt = allText();
  if (txt === fontKey) return false;
  fontKey = txt;
  await Promise.all([document.fonts.load(`900 60px ${FONT}`, txt), document.fonts.load(`700 40px ${FONT}`, txt)]);
  return true;
}

// ---------- 画面（場面のカード） ----------
function render() {
  const ol = $("#scenes");
  ol.innerHTML = "";
  P.scenes.forEach((s, i) => ol.appendChild(sceneCard(s, i)));
  update();
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  kids.flat().forEach((k) => k != null && e.append(k));
  return e;
}

function dropZone(text, multiple, onFiles, accept = "video/*") {
  const input = el("input", { type: "file", accept, hidden: "" });
  if (multiple) input.multiple = true;
  const z = el("div", { class: "drop", html: text }, input);
  z.addEventListener("click", () => input.click());
  input.addEventListener("change", () => input.files.length && onFiles([...input.files]));
  z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("over"); });
  z.addEventListener("dragleave", () => z.classList.remove("over"));
  z.addEventListener("drop", (e) => { e.preventDefault(); z.classList.remove("over"); const f = [...e.dataTransfer.files].filter((x) => (accept.startsWith("audio") ? x.type.startsWith("audio") || /\.(mp3|m4a|wav|aac)$/i.test(x.name) : x.type.startsWith("video") || /\.(mov|mp4|m4v)$/i.test(x.name) || (accept.includes("image") && isImage(x)))); f.length && onFiles(f); });
  return z;
}

function sceneCard(s, i) {
  const li = el("li", { class: "scene", id: `scene-${i}` });
  const len = el("span", { class: "len" });
  li.append(el("h3", {}, el("span", { class: "num" }, `${i + 1}`), s.title, len));
  li.append(el("p", { class: "guide", html: `<b>撮るもの：</b>${s.shoot}<br><b>言うこと：</b>${s.say}<br><b>目安：</b>${s.target}秒` }));
  const g = GUIDES[s.layout];
  if (g) {
    const d = el("details", { class: "sample" });
    d.append(el("summary", {}, "撮り方の見本を見る（◯こう撮る／✕これはNG）"));
    d.append(el("div", { class: "sample-pair" },
      el("figure", { class: "sample-img", html: `${g.ok}<figcaption class="ok">${g.okTag}</figcaption>` }),
      el("figure", { class: "sample-img", html: `${g.ng}<figcaption class="ng">${g.ngTag}</figcaption>` })));
    li.append(d);
  }

  const body = el("div");
  li.append(body);
  const draw = () => {
    body.innerHTML = "";
    if (!s.voice && !s.photos.length) {
      body.append(dropZone("話している動画を<b>ここにドラッグ</b>（またはクリックして選ぶ）<br><small>動画がなければ、写真（最大3枚）だけでもOK</small>", true, async (files) => {
        body.innerHTML = '<p class="guide">読み込み中…</p>';
        try {
          if (isImage(files[0])) {
            for (const f of files.filter(isImage).slice(0, 3)) s.photos.push(await loadImage(f));
            autoBgm();
          } else {
            s.voice = await loadClip(files[0]);
            [s.in, s.out] = autoTrim(s.voice);
            if (s.voice.w > s.voice.h) s.pos = { x: 0.5, y: 0.5, zoom: 1 };
          }
        } catch (e) { say(e.message); }
        draw(); update(); showScene(i);
      }, "video/*,image/*"));
    } else if (s.photos.length) {
      body.append(photoUI(s, i, len, draw));
    } else {
      body.append(trimUI(s, i, len));
      body.append(posUI(s.pos, i, s.voice));
    }
    body.append(fieldsUI(s, i));
    if (s.voice && s.layout !== "gc" && s.layout !== "hero" && s.layout !== "hero2") body.append(brollUI(s, i));
  };
  draw();
  li.addEventListener("focusin", () => showScene(i));
  li._len = len;
  return li;
}

// 写真だけの場面：写真の一覧と、場面の長さ
function photoUI(s, i, len, redraw) {
  const wrap = el("div", { class: "clip" });
  wrap.append(el("p", { class: "guide" }, "写真だけの場面です。写真は等間隔で切り替わり、1枚ごとに少しずつ寄って動きます（声なし・BGMあり）。"));
  s.photos.forEach((c, k) => {
    const warn = c.w > c.h ? "（横向き：左右が切れます）" : "";
    wrap.append(el("div", { class: "name" }, el("span", {}, `${k + 1}. ${c.file.name}${warn}`),
      el("button", { onclick: () => { s.photos.splice(k, 1); redraw(); update(); showScene(i); } }, "外す")));
  });
  if (s.photos.length < 3) wrap.append(dropZone("写真を<b>ここにドラッグ</b>（あと" + (3 - s.photos.length) + "枚まで）", true, async (files) => {
    try { for (const f of files.filter(isImage).slice(0, 3 - s.photos.length)) s.photos.push(await loadImage(f)); } catch (e) { say(e.message); }
    redraw(); update(); showScene(i);
  }, "image/*"));
  const r = el("input", { type: "range", min: 1.5, max: 5, step: 0.1 });
  r.value = s.photoDur;
  const lab = el("span", {}, `${s.photoDur.toFixed(1)}秒`);
  const paint = () => { lab.textContent = `${s.photoDur.toFixed(1)}秒`; len.textContent = `${s.photoDur.toFixed(1)}秒 / 目安${s.target}秒`; };
  r.addEventListener("input", () => { s.photoDur = +r.value; paint(); update(); showLocal(i, 0.8); });
  paint();
  wrap.append(el("div", { class: "trimrow" }, el("label", { class: "inline" }, "この場面の長さ ", r, lab), el("button", { onclick: () => playScene(i) }, "▶ 場面を再生")));
  return wrap;
}

function autoBgm() {
  if (P.bgm.kind !== "none" || !tracks.length) return;
  setBgm("track", tracks[0]);
  say("写真だけの場面があるので、BGM（曲A）を自動でオンにしました。曲は下のBGMの欄で変えられます。", "info");
}

function trimUI(s, i, len) {
  const c = s.voice;
  const wrap = el("div", { class: "clip" });
  const warn = c.audioError ? "（音が読めませんでした）" : (c.w > c.h ? "（横向きの動画です。縦で撮ると大きく映せます）" : "");
  wrap.append(el("div", { class: "name" }, el("span", {}, `${c.file.name} ${warn}`), el("button", { onclick: () => { s.voice = null; s.broll = []; render(); } }, "動画を入れ替える")));
  const wv = el("div", { class: "wave" });
  const cv = el("canvas", { width: 600, height: 64 });
  const a = el("input", { type: "range", min: 0, max: c.duration, step: 0.01, class: "in" });
  const b = el("input", { type: "range", min: 0, max: c.duration, step: 0.01, class: "out" });
  a.value = s.in; b.value = s.out;
  wv.append(cv, a, b);
  const info = el("span");
  const paint = () => {
    const g = cv.getContext("2d");
    g.clearRect(0, 0, 600, 64);
    const x0 = (s.in / c.duration) * 600, x1 = (s.out / c.duration) * 600;
    g.fillStyle = "rgba(54,65,172,0.12)"; g.fillRect(x0, 0, x1 - x0, 64);
    if (c.peaks) c.peaks.forEach((v, k) => {
      const h = Math.max(1, v * 60), inside = k >= x0 && k <= x1;
      g.fillStyle = inside ? "#3641AC" : "#B8BCD6"; g.fillRect(k, 32 - h / 2, 1, h);
    });
    info.textContent = `${s.in.toFixed(2)}秒 〜 ${s.out.toFixed(2)}秒（${(s.out - s.in).toFixed(2)}秒）`;
    const over = s.out - s.in > s.target + 1.5;
    len.textContent = `${(s.out - s.in).toFixed(1)}秒 / 目安${s.target}秒${over ? "（長め）" : ""}`;
    len.classList.toggle("over", over);
  };
  const onIn = () => { s.in = Math.min(+a.value, s.out - 0.5); a.value = s.in; paint(); update(); showLocal(i, 0.6); };
  const onOut = () => { s.out = Math.max(+b.value, s.in + 0.5); b.value = s.out; paint(); update(); showLocal(i, -0.05); };
  a.addEventListener("input", onIn); b.addEventListener("input", onOut);
  paint();
  wrap.append(wv);
  wrap.append(el("div", { class: "trimrow" },
    el("button", { onclick: () => playRange(s) }, "▶ この範囲を聴く"),
    el("button", { onclick: () => playScene(i) }, "▶ 場面を再生"),
    info));
  wrap.append(el("p", { class: "guide" }, "青い区間が使われます。左の青いつまみ＝始まり、右の黄色いつまみ＝終わり。語尾が切れていないか、必ず音を出して確かめてください。"));
  return wrap;
}

function posUI(pos, i, clip) {
  const row = el("div", { class: "pos" });
  const mk = (key, label, min, max, step) => {
    const r = el("input", { type: "range", min, max, step });
    r.value = pos[key];
    r.addEventListener("input", () => { pos[key] = +r.value; showLocal(i, null); });
    return el("label", {}, label, r);
  };
  row.append(mk("x", "左右の位置", 0, 1, 0.01), mk("y", "上下の位置", 0, 1, 0.01), mk("zoom", "拡大", 1, 2, 0.01));
  return row;
}

function fieldsUI(s, i) {
  const box = el("div", { class: "fields" });
  for (const [key, label] of LAYOUTS[s.layout].fields) {
    const inp = el("input", { value: s.texts[key] });
    const mark = () => inp.classList.toggle("todo", /[〔〕]/.test(inp.value) || !inp.value.trim());
    inp.addEventListener("input", () => { s.texts[key] = inp.value; mark(); update(); showLocal(i, 0.8); });
    mark();
    box.append(el("label", {}, label, inp));
  }
  if (s.layout === "gc") box.append(el("p", { class: "guide" }, "この場面の文字と図は決まっています（団体の情報の「呼び名」が図に入ります）。"));
  return box;
}

function brollUI(s, i) {
  const d = el("details", { class: "broll" });
  if (s.broll.length) d.open = true;
  d.append(el("summary", {}, `活動の動画・写真を足す（任意・最大3つ）${s.broll.length ? `：${s.broll.length}つ` : ""}`));
  d.append(el("p", { class: "guide", html: "入れると、話している人の映像と足した素材が、等間隔で順番に切り替わります（声はそのまま）。<br><b>縦の動画・写真がおすすめです。</b>横の素材は画面に合わせて左右が自動で切れるので、先にスマホで縦にトリミングしてから入れてください。" }));
  s.broll.forEach((b, k) => {
    const warn = b.clip.w > b.clip.h ? "（横向き：左右が切れます）" : "";
    d.append(el("div", { class: "item" },
      el("div", { class: "name" }, el("span", {}, `${k + 1}. ${b.clip.file.name}${warn}`), el("button", { onclick: () => { s.broll.splice(k, 1); refreshCard(i); update(); } }, "外す"))));
  });
  if (s.broll.length < 3) d.append(dropZone("動画・写真を<b>ここにドラッグ</b>（あと" + (3 - s.broll.length) + "つまで）", true, async (files) => {
    for (const f of files.slice(0, 3 - s.broll.length)) {
      try { s.broll.push({ clip: await (isImage(f) ? loadImage(f) : loadClip(f)), start: 0, pos: { x: 0.5, y: 0.5, zoom: 1 } }); } catch (e) { say(e.message); }
    }
    refreshCard(i); update(); showLocal(i, 0.8);
  }, "video/*,image/*"));
  return d;
}

function refreshCard(i) {
  const old = $(`#scene-${i}`);
  old.replaceWith(sceneCard(P.scenes[i], i));
}

function clockText(t, tl) {
  return `${t.toFixed(1)} / ${tl.total.toFixed(1)}秒`;
}

// ---------- BGM ----------
const bgmEl = new Audio();
let tracks = [];

async function setBgm(kind, value) {
  const b = P.bgm;
  stop();
  b.kind = kind; b.audio = null; b.title = ""; b.licensed = kind === "track";
  if (b.url && b.url.startsWith("blob:")) URL.revokeObjectURL(b.url);
  b.url = "";
  renderBgm(); update();
  if (kind === "none") return;
  try {
    let buf;
    if (kind === "track") { b.url = `bgm/${value.file}`; b.title = value.title; b.start = value.start || 0; buf = await (await fetch(b.url)).arrayBuffer(); }
    else { b.url = URL.createObjectURL(value); b.title = value.name; buf = await value.arrayBuffer(); }
    b.audio = await new OfflineAudioContext(2, 1, SR).decodeAudioData(buf);
    bgmEl.src = b.url;
    b.start = Math.min(b.start, Math.max(0, b.audio.duration - 5));
  } catch (e) {
    say("この音源は読み込めませんでした。mp3 や m4a を試してください。");
    b.kind = "none";
  }
  renderBgm(); update();
}

function renderBgm() {
  const box = $("#bgm");
  const b = P.bgm;
  box.innerHTML = "";
  box.append(el("h2", {}, "BGM（任意）"));
  const sel = el("select", {});
  sel.append(el("option", { value: "none" }, "なし"));
  tracks.forEach((t, k) => sel.append(el("option", { value: `t${k}` }, `${t.title}（${t.mood}）`)));
  sel.append(el("option", { value: "file" }, "自分で用意した音源を使う"));
  sel.value = b.kind === "track" ? `t${tracks.findIndex((t) => t.title === b.title)}` : b.kind;
  sel.addEventListener("change", () => {
    const v = sel.value;
    if (v === "none") setBgm("none");
    else if (v === "file") { P.bgm.kind = "file"; P.bgm.audio = null; P.bgm.licensed = false; renderBgm(); update(); }
    else setBgm("track", tracks[+v.slice(1)]);
  });
  box.append(el("p", { class: "guide" }, "GC Launchpad の広告で実際に使っている曲（すべて歌なし）から、雰囲気の違う4曲を選んであります。広告で使った区間から始まります。"));
  box.append(el("label", {}, "曲", sel));
  const cur = b.kind === "track" && tracks.find((t) => t.title === b.title);
  if (cur && cur.used) box.append(el("p", { class: "guide" }, `この曲を使っている広告：${cur.used}`));
  if (b.kind === "file") {
    if (!b.audio) box.append(dropZone("音源（mp3・m4a など）を<b>ここにドラッグ</b>", false, ([f]) => setBgm("file", f), "audio/*"));
    else box.append(el("div", { class: "name" }, el("span", {}, b.title), el("button", { onclick: () => { P.bgm.audio = null; renderBgm(); update(); } }, "入れ替える")));
    const cb = el("input", { type: "checkbox" });
    cb.checked = b.licensed;
    cb.addEventListener("change", () => { P.bgm.licensed = cb.checked; update(); });
    box.append(el("label", { class: "check" }, cb, "著作権フリーで、SNSや広告に使ってよい音源です（市販の曲・アーティストの曲は使えません）"));
  }
  if (b.audio) {
    const st = el("input", { type: "range", min: 0, max: Math.max(0, b.audio.duration - 5), step: 0.1 });
    st.value = b.start;
    const stl = el("span", {}, `${b.start.toFixed(1)}秒目から`);
    st.addEventListener("input", () => { b.start = +st.value; stl.textContent = `${b.start.toFixed(1)}秒目から`; });
    const vo = el("input", { type: "range", min: 0, max: 0.8, step: 0.01 });
    vo.value = b.vol;
    vo.addEventListener("input", () => { b.vol = +vo.value; });
    box.append(el("div", { class: "pos two" }, el("label", {}, "曲のどこから使うか ", stl, st), el("label", {}, "BGMの音量", vo)));
    box.append(el("div", { class: "trimrow" },
      el("button", { onclick: () => { stop(); bgmEl.currentTime = b.start; bgmEl.volume = Math.min(1, b.vol); bgmEl.play(); setTimeout(() => bgmEl.pause(), 6000); } }, "▶ 曲だけ試聴（6秒）"),
      el("button", { onclick: () => play(0) }, "▶ 動画と合わせて再生")));
    box.append(el("p", { class: "guide" }, "声があるところでは自動でBGMを下げ、最後はフェードアウトします。"));
  }
}

// ---------- 尺・チェック ----------
function issues() {
  const out = [];
  if (!P.univ || !P.team) out.push("大学名と団体名を入れてください");
  P.scenes.forEach((s, i) => {
    if (!s.voice && !s.photos.length) out.push(`${i + 1}「${s.title}」の動画か写真が入っていません`);
    for (const [k] of LAYOUTS[s.layout].fields) if (/[〔〕]/.test(s.texts[k]) || !s.texts[k].trim()) { out.push(`${i + 1}「${s.title}」の〔 〕を書き換えてください`); break; }
  });
  const tl = timeline(P);
  if (!tl.ok) out.push(`全体を${tl.max}秒以下にしてください`);
  if (P.bgm.kind === "file" && !P.bgm.licensed) out.push("BGMの「使ってよい音源です」にチェックを入れてください");
  if (P.bgm.kind !== "none" && !P.bgm.audio) out.push("BGMを読み込み中です");
  return out;
}

function update() {
  syncGlobals();
  const tl = timeline(P);
  const bar = $("#bar");
  bar.innerHTML = "";
  tl.segs.forEach((g, i) => {
    const d = el("div", { title: g.s.title }, `${i + 1}`);
    d.style.flex = `${g.t1 - g.t0}`;
    d.addEventListener("click", () => { $(`#scene-${i}`).scrollIntoView({ behavior: "smooth", block: "start" }); showScene(i); });
    bar.append(d);
  });
  const e = el("div", { class: "end", title: "エンドカード" }, "END");
  e.style.flex = `${Math.max(0.3, tl.endDur)}`;
  e.addEventListener("click", () => showAt(tl.endT0 + 1.2));
  bar.append(e);
  const st = $("#endStatus");
  const tt = tl.total.toFixed(1);
  if (tl.total <= tl.recommend + 0.05) { st.className = "status ok"; st.textContent = `全体 ${tt}秒（おすすめの${tl.recommend}秒以内）`; }
  else if (tl.ok) { st.className = "status warn"; st.textContent = `全体 ${tt}秒。書き出せます（おすすめは${tl.recommend}秒。短いほど最後まで見てもらいやすい）`; }
  else { st.className = "status ng"; st.textContent = `全体 ${tt}秒。あと ${(tl.total - tl.max).toFixed(1)}秒 短くしてください（${tl.max}秒まで）`; }
  const list = issues();
  $("#issues").innerHTML = "";
  list.forEach((m) => $("#issues").append(el("li", {}, m)));
  $("#export").disabled = list.length > 0 || exporting;
  $("#clock").textContent = clockText(curT, tl);
}

// ---------- プレビュー ----------
let curT = 0, playing = false, raf = 0, seekToken = 0, rangeStop = null;

function allClips() {
  const out = [];
  P.scenes.forEach((s) => { if (s.voice) out.push(s.voice); s.broll.forEach((b) => { if (!b.clip.image) out.push(b.clip); }); });
  return out;
}

function seek(v, t) {
  return new Promise((ok) => {
    t = Math.max(0, Math.min(t, v.duration - 0.03));
    if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return ok();
    const done = () => { v.removeEventListener("seeked", done); ok(); };
    v.addEventListener("seeked", done);
    v.currentTime = t;
  });
}

function markActive(t) {
  const tl = timeline(P);
  const idx = tl.segs.findIndex((g) => t >= g.t0 && t < g.t1);
  [...$("#bar").children].forEach((d, k) => d.classList.toggle("cur", k === (idx < 0 ? tl.segs.length : idx)));
  document.querySelectorAll(".scene").forEach((li, k) => li.classList.toggle("active", k === idx));
}

async function showAt(t) {
  stop();
  const my = ++seekToken;
  await ensureFonts();
  curT = t;
  const src = sourcesAt(P, t);
  if (src.show && !src.show.clip.image) await seek(src.show.clip.el, src.show.time);
  if (my !== seekToken) return;
  drawFrame(ctx, P, t);
  markActive(t);
  update();
}

let lastShown = { i: 0, local: 0.6 };
function showLocal(i, local) {
  if (local === null) local = lastShown.i === i ? lastShown.local : 0.6;
  lastShown = { i, local };
  const g = timeline(P).segs[i];
  const t = local < 0 ? g.t1 + local : Math.min(g.t0 + local, g.t1 - 0.04);
  showAt(t);
}
function showScene(i) { if (!playing) showLocal(i, lastShown.i === i ? null : 0.8); }

function stop() {
  playing = false;
  cancelAnimationFrame(raf);
  if (rangeStop) { clearTimeout(rangeStop); rangeStop = null; }
  allClips().forEach((c) => { c.el.pause(); c.el.muted = true; });
  bgmEl.pause();
  $("#play").textContent = "▶ 通して再生";
}

function play(from = 0, until = null) {
  stop();
  playing = true;
  $("#play").textContent = "■ 止める";
  const tl = timeline(P);
  const end = until ?? tl.playEnd;
  const t0 = performance.now() - from * 1000;
  const tick = () => {
    if (!playing) return;
    const t = (performance.now() - t0) / 1000;
    if (t >= end) { stop(); curT = Math.min(end, tl.playEnd - 0.001); update(); return; }
    curT = t;
    const src = sourcesAt(P, t);
    const want = new Map();
    if (src.voice) want.set(src.voice.clip, { time: src.voice.time, sound: true });
    if (src.show && !src.show.clip.image && !want.has(src.show.clip)) want.set(src.show.clip, { time: src.show.time, sound: false });
    for (const c of allClips()) {
      const w = want.get(c);
      if (!w) { if (!c.el.paused) c.el.pause(); continue; }
      c.el.muted = !w.sound;
      if (c.el.paused) { c.el.currentTime = w.time; c.el.play().catch(() => {}); }
      else if (Math.abs(c.el.currentTime - w.time) > 0.25) c.el.currentTime = w.time;
    }
    if (P.bgm.audio) {
      const want = P.bgm.start + t;
      if (bgmEl.paused) { bgmEl.currentTime = want; bgmEl.play().catch(() => {}); }
      else if (Math.abs(bgmEl.currentTime - want) > 0.3) bgmEl.currentTime = want;
      bgmEl.volume = Math.min(1, bgmGain(t, tl.total));
    }
    drawFrame(ctx, P, t);
    markActive(t);
    $("#clock").textContent = clockText(t, tl);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

function playScene(i) { const g = timeline(P).segs[i]; play(g.t0, g.t1); }

function playRange(s) {
  stop();
  const v = s.voice.el;
  v.muted = false; v.currentTime = s.in; v.play();
  rangeStop = setTimeout(() => { v.pause(); v.muted = true; }, (s.out - s.in) * 1000);
}

$("#play").addEventListener("click", () => (playing ? stop() : play(curT >= timeline(P).playEnd - 0.05 ? 0 : curT)));

// ---------- 書き出し ----------
let exporting = false;

async function pickVideoConfig() {
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028"]) {
    const cfg = { codec, width: W, height: H, bitrate: 10_000_000, framerate: FPS, avc: { format: "avc" } };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch (e) { /* 次を試す */ }
  }
  return null;
}

function mixAudio(tl) {
  // AACは1024サンプルずつなので、全体の長さを1024の倍数にそろえる（尺が15秒を超えないように）
  const n = Math.floor((tl.total * SR) / 1024) * 1024;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const g of tl.segs) {
    const a = g.s.voice && g.s.voice.audio;
    if (!a) continue;
    const src0 = Math.round(g.s.in * SR), dst0 = Math.round(g.t0 * SR), len = Math.min(Math.round((g.t1 - g.t0) * SR), n - dst0);
    const cl = a.getChannelData(0), cr = a.numberOfChannels > 1 ? a.getChannelData(1) : cl;
    const fade = Math.round(SR * 0.008);
    for (let k = 0; k < len; k++) {
      const j = src0 + k;
      if (j >= cl.length) break;
      const f = Math.min(1, k / fade, (len - 1 - k) / fade);
      L[dst0 + k] = cl[j] * f; R[dst0 + k] = cr[j] * f;
    }
  }
  const b = P.bgm;
  if (b.kind !== "none" && b.audio) {
    const bl = b.audio.getChannelData(0), br = b.audio.numberOfChannels > 1 ? b.audio.getChannelData(1) : bl;
    const s0 = Math.round(b.start * SR);
    let g = 0;
    for (let k = 0; k < n; k++) {
      if (k % 480 === 0) g = bgmGain(k / SR, tl.total); // 100分の1秒ごとに音量を決める
      const j = s0 + k;
      if (j >= bl.length) break;
      L[k] += bl[j] * g; R[k] += br[j] * g;
    }
  }
  // 割れないように、いちばん大きいところを 0.95 に収める
  let peak = 0;
  for (let k = 0; k < n; k++) peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k]));
  if (peak > 0.95) { const f = 0.95 / peak; for (let k = 0; k < n; k++) { L[k] *= f; R[k] *= f; } }
  return [L, R, n];
}

async function exportMp4() {
  const list = issues();
  if (list.length) return;
  stop();
  if (!("VideoEncoder" in window) || !("AudioEncoder" in window)) { say("このブラウザでは書き出せません。パソコンの Google Chrome（最新版）で開いてください。"); return; }
  const vcfg = await pickVideoConfig();
  const acfg = { codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, bitrate: 160_000 };
  let aok = false;
  try { aok = (await AudioEncoder.isConfigSupported(acfg)).supported; } catch (e) { aok = false; }
  if (!vcfg || !aok) { say("このパソコンでは MP4 を書き出せませんでした。Google Chrome を最新版にしてからもう一度試してください。"); return; }

  exporting = true; update();
  const prog = $("#progress"), bar = prog.querySelector("div"), lab = prog.querySelector("span");
  prog.hidden = false; $("#download").hidden = true;
  const setP = (r, text) => { bar.style.width = `${Math.round(r * 100)}%`; lab.textContent = text; };

  try {
    await ensureFonts();
    await document.fonts.ready;
    const tl = timeline(P);
    const N = Math.round(tl.total * FPS);
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width: W, height: H, frameRate: FPS },
      audio: { codec: "aac", numberOfChannels: 2, sampleRate: SR },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
    let err = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = e; } });
    venc.configure(vcfg);
    // AACの頭と終わりに足される分で尺が延びないよう、全体の長さを超える音のかたまりは捨てる（最後はエンドカードで無音）
    const limit = tl.total * 1e6 + 1;
    const aenc = new AudioEncoder({ output: (c, m) => { if (c.timestamp + (c.duration || 0) <= limit) muxer.addAudioChunk(c, m); }, error: (e) => { err = e; } });
    aenc.configure(acfg);

    // 音
    const [L, R, n] = mixAudio(tl);
    for (let s = 0; s < n; s += 1024) {
      const k = Math.min(1024, n - s), data = new Float32Array(k * 2);
      data.set(L.subarray(s, s + k), 0); data.set(R.subarray(s, s + k), k);
      const ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round((s / SR) * 1e6), data });
      aenc.encode(ad); ad.close();
    }

    // 映像（1コマずつ動画の位置を合わせて描く）
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const octx = off.getContext("2d");
    for (let i = 0; i < N; i++) {
      if (err) throw err;
      const t = i / FPS;
      const src = sourcesAt(P, t);
      if (src.show && !src.show.clip.image) await seek(src.show.clip.el, src.show.time);
      drawFrame(octx, P, t);
      const vf = new VideoFrame(off, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: i % FPS === 0 });
      vf.close();
      while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      if (i % 5 === 0) { setP(i / N, `書き出し中… ${Math.round((i / N) * 100)}%`); if (i % 15 === 0) ctx.drawImage(off, 0, 0); }
    }
    await venc.flush(); await aenc.flush();
    if (err) throw err;
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });

    // 書き出した動画の長さを確かめる
    const url = URL.createObjectURL(blob);
    const check = document.createElement("video");
    check.src = url;
    await new Promise((ok) => { check.onloadedmetadata = ok; check.onerror = ok; });
    const d = new Date(), mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const name = `${P.univ}_${P.team}_${P.version}_${mmdd}.mp4`.replace(/[\\/:*?"<>|\s]/g, "");
    lastExport = { blob, name, url };
    $("#resultVideo").src = url;
    $("#result").hidden = false;
    const a = $("#download");
    a.hidden = false;
    a.textContent = `保存する（${name}・${check.duration ? check.duration.toFixed(2) : "?"}秒・${(blob.size / 1e6).toFixed(1)}MB）`;
    setP(1, "書き出し完了");
    say("");
    saveExport();
  } catch (e) {
    console.error(e);
    say(`書き出しに失敗しました（${e.message || e}）。Chrome を最新版にして、もう一度書き出してください。`);
    prog.hidden = true;
  } finally {
    exporting = false; update();
  }
}
let lastExport = null;
const downloadsReady = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(undefined);

async function saveExport() {
  if (!lastExport) return;
  const { blob, name, url } = lastExport;
  const dl = await downloadsReady;
  if (dl === undefined) { // 手元のブラウザ（アーティファクトの外）
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    return;
  }
  const fallback = () => say("この画面では保存ボタンが使えません。下の動画の上で右クリック →「名前を付けて動画を保存」で保存してください。", "info");
  if (!dl) { fallback(); return; }
  try {
    await dl.save({ filename: name, data: blob });
    say(`${name} を保存しました。`, "info");
  } catch (e) {
    if (e && e.code === "declined") say("保存を取りやめました。もう一度「保存する」を押すと保存できます。", "info");
    else if (e && e.code === "rate_limited") say("保存の確認がまだ開いています。少し待ってから「保存する」を押してください。", "info");
    else fallback();
  }
}
$("#download").addEventListener("click", saveExport);
$("#export").addEventListener("click", exportMp4);

// ---------- 15秒版・30秒版の切り替え ----------
function setVersion(v) {
  stop();
  kept[P.version] = P.scenes;
  P.version = v;
  P.scenes = kept[v] || newScenes(v);
  document.querySelectorAll(".ver button").forEach((b) => b.classList.toggle("on", +b.dataset.ver === v));
  curT = 0;
  render();
  showLocal(0, 0.8);
}
document.querySelectorAll(".ver button").forEach((b) => b.addEventListener("click", () => setVersion(+b.dataset.ver)));
["#univ", "#team", "#nick"].forEach((q) => $(q).addEventListener("input", () => { update(); showAt(curT); }));

// ---------- はじめ ----------
(async () => {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || !("VideoEncoder" in window);
  $("#pcOnly").hidden = !mobile;
  await loadAssets();
  try { tracks = await (await fetch("bgm/tracks.json")).json(); } catch (e) { tracks = []; }
  renderBgm();
  P.scenes = newScenes(15);
  render();
  showLocal(0, 0.8);
})();

// テスト用：コンソールから状態を見る
window.__gc = {
  P, timeline, showAt, play, stop, exportMp4, setBgm, tracks: () => tracks,
  async loadVoice(i, file) { const s = P.scenes[i]; s.voice = await loadClip(file); [s.in, s.out] = autoTrim(s.voice); refreshCard(i); update(); },
  async addPhotos(i, files) { for (const f of files) P.scenes[i].photos.push(await loadImage(f)); autoBgm(); refreshCard(i); update(); },
  async addBroll(i, file) { P.scenes[i].broll.push({ clip: await (isImage(file) ? loadImage(file) : loadClip(file)), start: 0, pos: { x: 0.5, y: 0.5, zoom: 1 } }); refreshCard(i); update(); },
};
