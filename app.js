'use strict';
/* Dutch in 90 Days — interactive course for Persian speakers (Day 1 sample) */
const FA = n => Number(n).toLocaleString('fa-IR');
const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wlen = t => t.length + 0.45 * (t.match(/[mwMW]/g) || []).length + 0.2 * (t.match(/[A-Z]/g) || []).length;
const fitW = (t, k) => { const L = wlen(t); return L > (k || 8) ? ` style="font-size:min(var(--fs),${((k || 8) * 16 / L).toFixed(1)}vw)"` : ''; };
const fitQ = t => { const L = wlen(t), M = Math.max(...t.split(/\s+/).map(wlen)), f = []; if (L > 22) f.push((22 * 16 / L).toFixed(1) + 'vw'); if (M > 12) f.push((130 / M).toFixed(1) + 'vw'); return f.length ? ` style="font-size:min(var(--fs),${f.join(',')})"` : ''; };
const timers = new Set();
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
const LETTERS = ['A', 'B', 'C', 'D'];
const NL = s => { const m = /^(de|het) (.+)$/.exec(s); return m ? `<span class="art ${m[1]}">${m[1]}</span> ${esc(m[2])}` : esc(s); };
const ready = n => !!(IDX[n - 1] && IDX[n - 1].ready);
const AUTO_MS = 650;

/* ---------- storage ---------- */
const KEY = 'nl90i-v1';
let S; try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
S.days = S.days || {}; S.run = S.run || null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

let D = null; // current day data
let IDX = []; // 90-day index
const pad = n => String(n).padStart(2, '0');
/* ---------- audio: one element for short clips, one for the story ---------- */
const au = new Audio(); au.preload = 'auto';
let aTok = 0;
function playSeq(srcs, cb) {
  const tok = ++aTok, q = srcs.slice();
  const step = () => {
    if (tok !== aTok) return;
    if (!q.length) { setPlaying(false); cb && cb(); return; }
    au.src = q.shift(); setPlaying(true);
    const p = au.play(); if (p && p.catch) p.catch(() => { if (tok === aTok) { q.length = 0; step(); } });
  };
  au.onended = step; au.onerror = step; step();
}
function stopAudio() { aTok++; try { au.pause(); } catch (e) {} setPlaying(false); }
function setPlaying(on) { document.querySelectorAll('.spk').forEach(b => b.classList.toggle('playing', on)); }
const story = new Audio(); story.preload = 'metadata';
function stopStory() { try { story.pause(); } catch (e) {} }
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
const AD = () => 'audio/d' + pad(D.day) + '/';
const AW = id => AD() + 'w-' + id + '.mp3', AX = id => AD() + 'x-' + id + '.mp3', AS = id => AD() + id + '.mp3';

/* ---------- helpers ---------- */
function screen(html) { clearTimers(); $app.innerHTML = '<div class="screen">' + html + '</div>'; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const topBar = (pct, pill) => `<div class="top"><button class="x" id="x" aria-label="خانه">✕</button><div class="bar"><i style="width:${pct}%"></i></div><span class="pill">${pill}</span></div>`;
const words = s => s.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);
const endP = s => (s.match(/[.!?]$/) || [''])[0];
const same = (a, b) => a.join(' ').toLowerCase() === b.join(' ').toLowerCase();
const okBuild = (a, b) => !!a && [b.en].concat(b.alt || []).some(t => same(words(a), words(t)));

/* ---------- run (one lesson attempt) ---------- */
function newRun(mode, only) {
  const steps = [];
  if (mode === 'full') steps.push({ t: 'story' });
  D.comp.forEach((q, i) => { if (!only || only.includes('c' + i)) steps.push({ t: 'c', i }); });
  if (mode === 'full') D.words.forEach((w, i) => steps.push({ t: 'wi', i }));
  D.words.forEach((w, i) => { if (!only || only.includes('w' + i)) steps.push({ t: 'w', i }); });
  D.build.forEach((b, i) => { if (!only || only.includes('b' + i)) steps.push({ t: 'b', i }); });
  steps.push({ t: 'review' });
  const run = { day: D.day, mode, steps, pos: 0, ans: (mode === 'fix' && S.run) ? S.run.ans : {}, opts: (mode === 'fix' && S.run) ? S.run.opts : {}, tiles: {} };
  // fixed option sets for the word quiz (stored so the review can show them)
  D.words.forEach((w, i) => {
    if (run.opts['w' + i] && mode !== 'full') return;
    const STOPFA = ['کردن','شدن','دادن','زدن','گرفتن','بودن','داشتن','آمدن','رفتن','کشیدن','آوردن','گذاشتن','به','از','در','با','را','که','یک','برای','این','آن','هر'];
    const tk = s => s.replace(/[()،,؛.!؟?«»]/g, ' ').split(/\s+/).filter(x => x.length > 1 && !STOPFA.includes(x));
    const clash = (a, b) => a.includes(b) || b.includes(a) || tk(a).some(x => tk(b).includes(x));
    const pool = shuffle(D.words.filter((x, j) => j !== i));
    let others = [];
    for (const x of pool) { if (others.length < 3 && !clash(x.fa, w.fa) && !others.some(o => clash(o, x.fa))) others.push(x.fa); }
    for (const x of pool) { if (others.length < 3 && x.fa !== w.fa && !others.includes(x.fa)) others.push(x.fa); }
    run.opts['w' + i] = shuffle([w.fa].concat(others));
  });
  D.build.forEach((b, i) => {
    const ws = words(b.en); let sh; let n = 0;
    do { sh = shuffle(ws.map((w, k) => k)); n++; } while (n < 20 && sh.every((k, j) => k === j));
    run.tiles['b' + i] = sh;
  });
  return run;
}
function go() { save(); const R = S.run, st = R.steps[R.pos]; stopAudio(); if (st.t !== 'story') stopStory();
  ({ story: storyScreen, c: compScreen, wi: introScreen, w: wordQuiz, b: buildScreen, review: reviewScreen })[st.t](st, R); }
function next() { S.run.pos = Math.min(S.run.pos + 1, S.run.steps.length - 1); go(); }
const sectionPos = (R, t) => { const all = R.steps.filter(s => s.t === t); const cur = R.steps[R.pos]; return [all.indexOf(cur) + 1, all.length]; };
const pctOf = R => Math.round(100 * R.pos / (R.steps.length - 1));

/* ---------- home ---------- */
const dayDone = n => !!(S.days[n] && S.days[n].done);
const recDay = () => { let last = 1; for (let n = 1; n <= 90; n++) { if (!ready(n)) continue; last = n; if (!dayDone(n)) return n; } return last; };
const inRunOf = () => (S.run && S.run.steps[S.run.pos].t !== 'review' && S.run.pos > 0) ? (S.run.day || 1) : 0;
function loadDay(n) {
  if (D && D.day === n) return Promise.resolve(D);
  return fetch('data/day' + pad(n) + '.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
    D = d;
    const urls = [D.audio, D.img].concat(D.words.flatMap(w => [AW(w.id), AX(w.id)]), D.build.map(b => AS(b.id)));
    setTimeout(() => urls.forEach(u => fetch(u).catch(() => {})), 1200);
    return D;
  });
}
function openDay(n, fresh) {
  loadDay(n).then(() => {
    if (fresh || inRunOf() !== n) S.run = newRun('full');
    go();
  }).catch(() => toast('بارگذاری درس نشد. اینترنت را بررسی کن.'));
}
function home() {
  clearTimers(); stopAudio(); stopStory();
  const rec = recDay(), cur = inRunOf();
  const done = Object.keys(S.days).filter(k => S.days[k].done).length;
  let list = '';
  [['A1', 'سطح ۱ · مبتدی', 0], ['A2', 'سطح ۲ · پایه', 30], ['B1', 'سطح ۳ · متوسط', 60]].forEach(([lv, nm, off]) => {
    list += `<div class="lvh"><span class="lvtag ${lv}">${lv}</span>${nm}</div>`;
    for (let i = off; i < off + 30; i++) {
      const n = i + 1, it = IDX[i] || {}, rd = S.days[n] || {};
      const isRec = n === rec, isCur = n === cur;
      if (!it.ready) { list += `<div class="dy off" id="d${n}"><span class="n">${FA(n)}</span><span class="t"><span class="en">${esc(it.t || '')}</span><span>روز ${FA(n)}</span></span><span class="s">به‌زودی</span></div>`; continue; }
      const st = isCur ? 'ادامه ←' : rd.done ? '✓ ' + FA(rd.best) + '٪' : isRec ? 'شروع ←' : '';
      list += `<button class="dy${isRec || isCur ? ' on' : ''}${rd.done ? ' doneD' : ''}" data-d="${n}" id="d${n}"><span class="n">${rd.done ? '✓' : FA(n)}</span><span class="t"><span class="en">${esc(it.t || '')}</span><span>روز ${FA(n)}${it.fa ? ' · ' + esc(it.fa) : ''}</span></span>${st ? `<span class="s">${st}</span>` : ''}</button>`;
    }
  });
  screen(`
    <div class="home-head"><div class="logo">هلندی در ۹۰ روز<small>دوره‌ی تعاملی · داستان، لغت، جمله‌سازی</small></div>
      <button class="inst" data-install>📲 نصب اپ</button></div>
    <div class="hero"><div class="num">🎯</div><div><b>${FA(done)} از ${FA(90)} روز کامل شده</b><span>درس پیشنهادی: روز ${FA(cur || rec)}</span></div></div>
    <div class="days" id="days">${list}</div>`);
  $app.querySelectorAll('.dy').forEach(b => b.onclick = () => openDay(+b.dataset.d));
  const target = document.getElementById('d' + (cur || rec));
  const box = document.getElementById('days');
  if (target && (cur || rec) > 3) box.scrollTop = target.offsetTop - box.offsetTop - box.clientHeight / 3;
}

/* ---------- 1. story ---------- */
const fmt = t => { t = Math.max(0, t | 0); return (t / 60 | 0) + ':' + String(t % 60).padStart(2, '0'); };
function storyScreen(st, R) {
  const paras = []; D.sents.forEach((s, i) => { (paras[s.p] = paras[s.p] || []).push(`<span class="sn" data-i="${i}">${esc(s.t)}</span>`); });
  screen(`
    <div class="st-h"><button class="x" id="x" aria-label="خانه">✕</button><div class="tt"><span class="en">${esc(D.title)}</span><span>روز ${FA(D.day)} · ${esc(D.fa_title)}</span></div><span class="lvtag ${D.level}">${D.level}</span></div>
    <div class="player"><button class="play" id="play" aria-label="پخش">▶</button><input class="seek" id="seek" type="range" min="0" max="1000" value="0" aria-label="seek"><span class="tm" id="tm">0:00 / 0:00</span><button class="spd" id="spd">سرعت: عادی</button></div>
    <div class="read" id="read"><img src="${D.img}" alt="" width="960" height="540"><div class="tip">روی هر جمله بزن تا از همان‌جا پخش شود.</div>${paras.map(p => '<p class="en">' + p.join(' ') + '</p>').join('')}</div>
    <button class="btn" id="go">شروع آزمون ←</button>`);
  document.getElementById('x').onclick = home;
  const play = document.getElementById('play'), seek = document.getElementById('seek'), tm = document.getElementById('tm'), spd = document.getElementById('spd'), read = document.getElementById('read');
  const spans = [...read.querySelectorAll('.sn')];
  if (!story.src.endsWith(D.audio)) story.src = D.audio;
  story.playbackRate = S.slow ? 0.8 : 1;
  const setSpd = () => { spd.textContent = S.slow ? 'سرعت: آهسته' : 'سرعت: عادی'; spd.classList.toggle('slow', !!S.slow); };
  setSpd();
  let cur = -1, dragging = false;
  const upd = () => {
    const t = story.currentTime, d = story.duration || 0;
    if (!dragging && d) seek.value = Math.round(1000 * t / d);
    tm.textContent = fmt(t) + ' / ' + fmt(d);
    let i = -1; for (let k = 0; k < D.sents.length; k++) if (t >= D.sents[k].s) i = k;
    if (story.ended || (story.paused && t === 0)) i = -1;
    if (i !== cur) {
      if (cur >= 0) spans[cur].classList.remove('cur');
      cur = i;
      if (cur >= 0) {
        spans[cur].classList.add('cur');
        if (!story.paused) { const b = spans[cur].getBoundingClientRect(), r = read.getBoundingClientRect();
          if (b.top < r.top + 10 || b.bottom > r.bottom - 10) read.scrollBy({ top: b.top - r.top - r.height / 3, behavior: 'smooth' }); }
      }
    }
    play.textContent = story.paused ? '▶' : '❚❚';
  };
  story.ontimeupdate = upd; story.onloadedmetadata = upd; story.onplay = upd; story.onpause = upd; story.onended = upd;
  let raf; const loop = () => { if (!document.body.contains(read)) return; if (!story.paused) upd(); raf = requestAnimationFrame(loop); }; loop();
  play.onclick = () => { stopAudio(); if (story.paused) { story.playbackRate = S.slow ? 0.8 : 1; story.play().catch(() => {}); } else story.pause(); };
  seek.oninput = () => { dragging = true; const d = story.duration || 0; tm.textContent = fmt(d * seek.value / 1000) + ' / ' + fmt(d); };
  seek.onchange = () => { dragging = false; const d = story.duration || 0; if (d) story.currentTime = d * seek.value / 1000; upd(); };
  spd.onclick = () => { S.slow = !S.slow; save(); story.playbackRate = S.slow ? 0.8 : 1; setSpd(); };
  spans.forEach((sp, i) => sp.onclick = () => { stopAudio(); story.currentTime = D.sents[i].s; story.playbackRate = S.slow ? 0.8 : 1; story.play().catch(() => {}); upd(); });
  document.getElementById('go').onclick = () => { stopStory(); next(); };
  upd();
}

/* ---------- 2. comprehension ---------- */
function choiceScreen({ R, key, pill, sec, promptHtml, opts, isEn, grid, onShow }) {
  const chosen = R.ans[key];
  const optHtml = opts.map((o, k) => grid
    ? `<button class="opt ${isEn ? 'en' : 'fa'}${chosen === k ? ' sel' : ''}" data-k="${k}"${isEn ? '' : fitFa(o)}>${esc(o)}</button>`
    : `<button class="opt en${chosen === k ? ' sel' : ''}" data-k="${k}"><i>${LETTERS[k]}</i><span>${esc(o)}</span></button>`).join('');
  screen(`${topBar(pctOf(R), pill)}<div class="sec">${sec}</div>
    <div class="prompt">${promptHtml}</div>
    <div class="${grid ? 'opts' : 'optc'}">${optHtml}</div>`);
  document.getElementById('x').onclick = home;
  let locked = false;
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (locked) return; locked = true;
    $app.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); vibrate(15);
    R.ans[key] = +b.dataset.k; save();
    later(next, AUTO_MS);
  });
  onShow && onShow();
}
const fitFa = t => t.length > 9 ? ` style="font-size:min(clamp(18px,3dvh,27px),${(9 * 6.2 / t.length).toFixed(1)}vw)"` : '';
function compScreen(st, R) {
  const q = D.comp[st.i], [n, of] = sectionPos(R, 'c');
  choiceScreen({ R, key: 'c' + st.i, pill: FA(n) + '/' + FA(of), sec: 'بخش ۱ · درک مطلب <small>(جواب‌ها آخر درس)</small>',
    promptHtml: `<div class="qen en"${fitQ(q.q)}>${esc(q.q)}</div><div class="qfa">${esc(q.fa)}</div>`, opts: q.o, grid: false });
}

/* ---------- 3a. word intro ---------- */
function exHtml(w) {
  if (!w.m) return esc(w.ex);
  return esc(w.ex.slice(0, w.m[0])) + '<mark>' + esc(w.ex.slice(w.m[0], w.m[1])) + '</mark>' + esc(w.ex.slice(w.m[1]));
}
function introScreen(st, R) {
  const w = D.words[st.i], [n, of] = sectionPos(R, 'wi');
  screen(`${topBar(pctOf(R), FA(n) + '/' + FA(of))}<div class="sec">بخش ۲ · لغات مهم <small>(آشنایی)</small></div>
    <div class="card wi">
      <div class="word en" lang="nl"${fitW(w.w)}>${NL(w.w)}</div>
      <div class="ipa">${esc(w.ipa)}</div>
      <div class="fa">${esc(w.fa)}</div>
      <div class="ex en">${exHtml(w)}</div>
      <button class="spk" id="spk" aria-label="پخش دوباره">🔊</button>
    </div>
    <button class="btn" id="nx">${n === of ? 'شروع آزمون لغات ←' : 'بعدی ←'}</button>`);
  document.getElementById('x').onclick = home;
  const say = () => playSeq([AW(w.id), AX(w.id)]);
  document.getElementById('spk').onclick = say;
  document.getElementById('nx').onclick = next;
  say();
}

/* ---------- 3b. word quiz ---------- */
function wordQuiz(st, R) {
  const w = D.words[st.i], [n, of] = sectionPos(R, 'w'), opts = R.opts['w' + st.i];
  const key = 'w' + st.i;
  // store as index into opts
  choiceScreen({ R, key, pill: FA(n) + '/' + FA(of), sec: 'بخش ۲ · آزمون لغات <small>(معنی درست را بزن)</small>',
    promptHtml: `<div class="qlabel">معنی این کلمه چیست؟</div><div class="qword en" lang="nl"${fitW(w.w)}>${NL(w.w)}</div><button class="spk" id="spk" aria-label="پخش">🔊</button>`,
    opts, grid: true, isEn: false,
    onShow: () => { const say = () => playSeq([AW(w.id)]); document.getElementById('spk').onclick = say; say(); } });
}

/* ---------- 4. sentence building ---------- */
function buildScreen(st, R) {
  const b = D.build[st.i], [n, of] = sectionPos(R, 'b'), ws = words(b.en), order = R.tiles['b' + st.i];
  let picked = []; // indices into ws
  let submitted = false;
  screen(`${topBar(pctOf(R), FA(n) + '/' + FA(of))}<div class="sec">بخش ۳ · جمله‌سازی</div>
    <div class="bld">
      <div class="bfa"><small>این جمله را به هلندی بساز:</small><b>${esc(b.fa)}</b></div>
      <div class="slot" id="slot"></div>
      <div class="pool" id="pool">${order.map(k => `<button class="tl" data-k="${k}">${esc(ws[k])}</button>`).join('')}</div>
    </div>
    <button class="btn" id="sub" disabled>ثبت جمله</button>`);
  document.getElementById('x').onclick = home;
  const slot = document.getElementById('slot'), pool = document.getElementById('pool'), sub = document.getElementById('sub');
  const draw = () => {
    slot.innerHTML = picked.length ? picked.map((k, j) => `<button class="tl" data-j="${j}">${esc(ws[k])}${j === ws.length - 1 ? endP(b.en) : ''}</button>`).join('') : '<span class="ph">کلمه‌ها را به ترتیب بزن · برای برداشتن، رویشان بزن</span>';
    pool.querySelectorAll('.tl').forEach(t => t.classList.toggle('used', picked.includes(+t.dataset.k)));
    sub.disabled = picked.length !== ws.length;
    slot.querySelectorAll('.tl').forEach(t => t.onclick = () => { if (submitted) return; picked.splice(+t.dataset.j, 1); draw(); });
  };
  pool.querySelectorAll('.tl').forEach(t => t.onclick = () => { if (submitted) return; const k = +t.dataset.k; if (!picked.includes(k)) { picked.push(k); vibrate(10); draw(); } });
  draw();
  sub.onclick = () => {
    if (!submitted) {
      submitted = true;
      R.ans['b' + st.i] = picked.map(k => ws[k]).join(' ') + endP(b.en); save();
      slot.classList.add('ans');
      pool.outerHTML = `<div class="heard"><span class="en">${esc(b.en)}</span><button class="spk" id="spk" aria-label="پخش">🔊</button></div>`;
      const say = () => playSeq([AS(b.id)]);
      document.getElementById('spk').onclick = say; say();
      sub.textContent = n === of ? 'دیدن نتیجه ←' : 'بعدی ←';
    } else next();
  };
}

/* ---------- 5. review ---------- */
function grade(R) {
  const items = [];
  D.comp.forEach((q, i) => { const a = R.ans['c' + i]; items.push({ key: 'c' + i, sec: 'c', en: true, q: q.q, your: a == null ? '—' : q.o[a], right: q.o[q.a], ok: a === q.a }); });
  D.words.forEach((w, i) => { const o = R.opts['w' + i], a = R.ans['w' + i]; const your = a == null ? '—' : o[a]; items.push({ key: 'w' + i, sec: 'w', en: true, q: w.w, your, right: w.fa, ok: your === w.fa, faAns: true }); });
  D.build.forEach((b, i) => { const a = R.ans['b' + i]; items.push({ key: 'b' + i, sec: 'b', en: false, q: b.fa, your: a || '—', right: b.en, ok: okBuild(a, b) }); });
  return items;
}
function reviewScreen(st, R) {
  const items = grade(R);
  const sc = s => { const it = items.filter(x => x.sec === s); return [it.filter(x => x.ok).length, it.length]; };
  const [c1, n1] = sc('c'), [c2, n2] = sc('w'), [c3, n3] = sc('b');
  const tot = c1 + c2 + c3, all = n1 + n2 + n3, pct = Math.round(100 * tot / all);
  const wrong = items.filter(x => !x.ok);
  const d1 = S.days[D.day] = S.days[D.day] || {};
  if (!R.graded) { R.graded = true; if (R.mode === 'full') { d1.first = pct; } d1.done = true; d1.best = Math.max(d1.best || 0, pct); d1.last = pct; save(); }
  let tab = R.tab || (wrong.length ? 'bad' : 'all'), page = 0, pages = [];
  screen(`<div class="top"><button class="x" id="x" aria-label="خانه">✕</button><div class="h2">نتیجه و تصحیح · روز ${FA(D.day)}</div></div>
    <div class="score"><div class="ring" style="--p:${pct}"><b>${FA(pct)}٪</b></div><div class="sx">
      <div><b>${FA(c1)}/${FA(n1)}</b><span>درک مطلب</span></div><div><b>${FA(c2)}/${FA(n2)}</b><span>لغات</span></div><div><b>${FA(c3)}/${FA(n3)}</b><span>جمله‌سازی</span></div></div></div>
    <div class="tabs"><button data-t="bad">❌ غلط‌ها (${FA(wrong.length)})</button><button data-t="all">همه (${FA(all)})</button><button data-t="c">درک</button><button data-t="w">لغات</button><button data-t="b">جمله</button></div>
    <div class="rlist" id="rl"></div>
    <div class="pager" id="pg"><button id="pp" aria-label="قبلی">→</button><span id="pn"></span><button id="pn2" aria-label="بعدی">←</button></div>
    <div class="btns rv">${wrong.length ? `<button class="btn" id="fix">🔁 تمرین غلط‌هایم (${FA(wrong.length)})</button>` : `<button class="btn" disabled>🎉 همه درست بود!</button>`}
      <div class="row2"><button class="btn ghost" id="again">↺ شروع دوباره</button><button class="btn ghost${D.day < 90 && !ready(D.day + 1) ? ' soon' : ''}" id="nextL">${D.day >= 90 ? 'پایان دوره 🎓' : ready(D.day + 1) ? 'درس بعد ←' : 'درس بعد · به‌زودی'}</button></div></div>`);
  document.getElementById('x').onclick = home;
  const rl = document.getElementById('rl');
  const row = x => `<div class="ri${x.ok ? '' : ' bad'}"><div class="q${x.en ? ' en' : ''}">${x.ok ? '✅' : '❌'} ${x.sec === 'w' ? NL(x.q) : esc(x.q)}</div><div class="a">
      <span>پاسخ تو: <span class="y${x.sec === 'w' ? '' : ' en'}">${esc(x.your)}</span></span>${x.ok ? '' : `<span>درست: <span class="c${x.sec === 'w' ? '' : ' en'}">${esc(x.right)}</span></span>`}</div></div>`;
  const paginate = () => {
    const list = tab === 'all' ? items : tab === 'bad' ? wrong : items.filter(x => x.sec === tab);
    pages = []; let cur = [];
    rl.innerHTML = '';
    const H = rl.clientHeight;
    list.forEach(x => {
      rl.insertAdjacentHTML('beforeend', row(x));
      if (rl.scrollHeight > H + 1 && cur.length) { pages.push(cur); cur = []; rl.innerHTML = row(x); }
      cur.push(x);
    });
    if (cur.length) pages.push(cur);
    if (!pages.length) pages = [[]];
    page = Math.min(page, pages.length - 1); show();
  };
  const show = () => {
    const p = pages[page];
    rl.innerHTML = p.length ? p.map(row).join('') : '<div class="empty"><div class="big">🎉</div>اینجا موردی نیست</div>';
    document.getElementById('pn').textContent = 'صفحه ' + FA(page + 1) + ' از ' + FA(pages.length);
    document.getElementById('pp').disabled = page === 0; document.getElementById('pn2').disabled = page >= pages.length - 1;
    $app.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  };
  $app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tab = R.tab = b.dataset.t; page = 0; paginate(); });
  document.getElementById('pp').onclick = () => { if (page > 0) { page--; show(); } };
  document.getElementById('pn2').onclick = () => { if (page < pages.length - 1) { page++; show(); } };
  paginate();
  const fx = document.getElementById('fix');
  if (fx) fx.onclick = () => { const only = wrong.map(x => x.key); wrong.forEach(x => delete R.ans[x.key]); S.run = newRun('fix', only); S.run.ans = R.ans; S.run.opts = R.opts; go(); };
  document.getElementById('again').onclick = () => { S.run = newRun('full'); go(); };
  document.getElementById('nextL').onclick = () => { if (D.day < 90 && !ready(D.day + 1)) { toast('درس‌های بعدی به‌زودی اضافه می‌شوند 🌷'); return; } if (D.day < 90) openDay(D.day + 1, true); else { toast('تبریک! هر ۹۰ روز را تمام کردی 🎉'); home(); } };
  window.onresize = () => { if (document.body.contains(rl)) paginate(); };
}

/* ---------- boot ---------- */
if (S.run && !S.run.day) S.run.day = 1;
fetch('data/index.json').then(r => r.json()).then(ix => {
  IDX = ix;
  const cur = inRunOf();
  if (cur) loadDay(cur).catch(() => {});
  home();
}).catch(() => { $app.innerHTML = '<div class="empty">خطا در بارگذاری. اینترنت را بررسی کن و دوباره باز کن.</div>'; });
