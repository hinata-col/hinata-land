// 日向坂樂園 共用程式：資料、帳號、頁首、對話框
import { fb } from './fb.js';
import { OPEN_AREAS, SITE } from './config.js';

export { SITE };
export const AREAS = {
  R: { key: 'R', name: '平假名推', jp: 'ひらがな推し', short: '平假名推', color: '#C6EBB0', ink: '#3C8A2E', page: '/hira', logo: '/assets/logo-hiragana.webp', no: 'No.01', years: '2018–2019', desc: '在日向坂相會的前身，當時團名還是平假名櫸坂46。' },
  H: { key: 'H', name: '在日向坂相會', jp: '日向坂で会いましょう', short: '日會', color: '#A9D9F7', ink: '#2F7FC4', page: '/hinaai', logo: '/assets/logo-hinaai.webp', no: 'No.02', years: '2019–', desc: '本篇，每週日深夜播出中。' },
  M: { key: 'M', name: '還沒結束！在日向坂相會', jp: 'まだまだ！日向坂で会いましょう', short: 'まだひな', color: '#D3F1FB', ink: '#1B8FB0', page: '/madahina', logo: '/assets/logo-madahina.webp', no: 'No.03', years: '2026–', desc: 'Lemino 獨家，和本篇連動的衍生節目。' }
};
export const OPEN = ['R', 'H', 'M'].filter((a) => OPEN_AREAS.indexOf(a) >= 0);
export const AREA_PREFIX = { R: '平假名推', H: '日會', M: 'まだひな' };
export const SETTINGS = {};
// 試算表「網站設定」分頁的文字（沒填就用預設）
export const setting = (key, def) => (SETTINGS[key] && String(SETTINGS[key]).trim()) || def;
export const PAL = ['#FFB3AB', '#FFC2D6', '#BFE0FF', '#C8F0B0', '#FFD9A8', '#FFE08A', '#A8EBE2', '#CFC4FF', '#F7C9F0', '#D5F0FF'];
export const LTAGS = ['新手入門', '爆笑', '感動', '外景', '系列企劃', '成員推', '冷門寶藏'];
export const DEFAULT_NICK = 'おひさま';
const OLD_DEFAULT_NICK = '匿名おひさま';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root) => (root || document).querySelector(sel);

// ── 狀態 ──────────────────────────────────────────
export const S = {
  ready: false, uid: '', isAnon: true, nick: DEFAULT_NICK,
  seen: {}, favs: [], liked: {}, links: {}, notes: {}, lists: [], stats: {}, comments: {},
  eps: { R: [], H: [], M: [] }, byKey: {}, series: [], tagColor: {}, updated: ''
};
const subs = [];
export const onChange = (fn) => subs.push(fn);
export const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

export const keyOf = (area, id) => area + String(id).replace('.', '_');
export const titleOf = (e) => (e && (e.zh || e.jp)) || '（標題待補）';
export const epLabel = (e) => AREAS[e.area].short + ' #' + e.id;

async function loadData() {
  const r = await fetch('/data/episodes.json', { cache: 'no-cache' });
  const d = await r.json();
  S.updated = d.updated || '';
  Object.assign(SETTINGS, d.settings || {});
  const openKeys = ['R', 'H', 'M'].filter((a) => ('開放：' + AREAS[a].name) in SETTINGS);
  if (openKeys.length) {
    const open = ['R', 'H', 'M'].filter((a) => String(SETTINGS['開放：' + AREAS[a].name]).toUpperCase() === 'TRUE');
    OPEN.splice(0, OPEN.length, ...open);
  }
  ['R', 'H', 'M'].forEach((a) => { AREAS[a].desc = setting(AREA_PREFIX[a] + '：大門票券短說明', AREAS[a].desc); });
  if (lastHeader) { header(lastHeader[0], lastHeader[1]); }
  S.series = d.series || [];
  S.series.forEach((t, i) => { S.tagColor[t] = PAL[i % PAL.length]; });
  ['R', 'H', 'M'].forEach((a) => {
    S.eps[a] = (d.areas[a] || []).map((x) => {
      const id = String(x[0]);
      const tags = String(x[4] || '').split(/[,、，]\s*/).map((t) => t.trim()).filter(Boolean)
        .sort((p, q) => S.series.indexOf(p) - S.series.indexOf(q));
      tags.forEach((t) => { if (!S.tagColor[t]) { S.tagColor[t] = PAL[Object.keys(S.tagColor).length % PAL.length]; } });
      const e = { area: a, id: id, n: parseFloat(id), date: x[1] || '', jp: x[2] || '', zh: x[3] || '', syn: x[5] || '', tags: tags, key: keyOf(a, id) };
      S.byKey[e.key] = e;
      return e;
    });
  });
}

async function loadUser() {
  let u = await fb.get('users/' + S.uid);
  if (!u) {
    u = { nick: DEFAULT_NICK, seen: {}, favs: [] };
    await fb.set('users/' + S.uid, Object.assign({ at: fb.now() }, u));
  }
  S.nick = u.nick || DEFAULT_NICK;
  if (S.nick === OLD_DEFAULT_NICK) { S.nick = DEFAULT_NICK; fb.update('users/' + S.uid, { nick: DEFAULT_NICK }).catch(() => {}); }
  S.seen = u.seen || {};
  S.favs = u.favs || [];
  S.notes = u.notes || {};
  const [mine, likes] = await Promise.all([fb.where('lists', 'owner', S.uid), fb.where('likes', 'uid', S.uid)]);
  S.lists = mine.sort((x, y) => (tsOf(x.at) - tsOf(y.at)));
  S.lists.forEach((l) => { if (l.nick === OLD_DEFAULT_NICK) { l.nick = DEFAULT_NICK; fb.update('lists/' + l.id, { nick: DEFAULT_NICK }).catch(() => {}); } });
  S.liked = {};
  likes.forEach((l) => { S.liked[l.key] = true; });  await loadLinks();
}
async function loadLinks() {
  S.links = {};
  if (S.isAnon) { return; }
  try { const v = await fb.get('vault/links'); if (v) { ['R', 'H', 'M'].forEach((a) => Object.assign(S.links, v[a] || {})); } } catch (e) { /* 不在白名單 */ }
}
const tsOf = (t) => (t && t.toMillis ? t.toMillis() : (typeof t === 'number' ? t : 0));
export { tsOf };

let resolveReady;
const readyP = new Promise((res) => { resolveReady = res; });
let dataP = null;
export function dataReady() { init(); return dataP; }
export function init() {
  if (!dataP) {
    dataP = loadData();
    fb.onUser(async (u, err) => {
      if (!u) { if (err) { console.error(err); showError('登入服務暫時連不上，請稍後重新整理。'); } return; }
      if (u.uid === S.uid) { S.isAnon = u.isAnon; emit(); return; }
      S.uid = u.uid; S.isAnon = u.isAnon;
      try {
        await dataP; await loadUser();
        S.ready = true; resolveReady(); emit();
      } catch (e) { console.error(e); showError('資料讀取失敗，請稍後重新整理。'); }
    });
  }
  return readyP;
}
function showError(msg) { toast(msg, 6000); }

const notReady = () => { if (S.ready) { return false; } toast('還在連線中，請稍等一下再按'); return true; };

// ── 看過 ──────────────────────────────────────────
export async function setSeen(key, on) {
  if (notReady()) { return; }
  if (on) { S.seen[key] = true; } else { delete S.seen[key]; }
  emit();
  await fb.update('users/' + S.uid, { ['seen.' + key]: on ? true : fb.delField() });
}
export const seenIn = (area) => S.eps[area].filter((e) => S.seen[e.key]).length;

// ── 私人筆記（存在自己的使用者資料裡，只有自己讀得到）──
export async function setNote(key, text) {
  if (notReady()) { return; }
  const t = String(text || '').slice(0, 1000);
  if (t.trim()) { S.notes[key] = t; } else { delete S.notes[key]; }
  await fb.update('users/' + S.uid, { ['notes.' + key]: t.trim() ? t : fb.delField() });
}

// ── 統計（讚、收藏數、留言數）────────────────────
export async function loadStats(area) {
  let s = await fb.get('stats/' + area);
  if (!s) {
    s = { likes: {}, adds: {}, cmts: {} };
    try { await fb.set('stats/' + area, s); } catch (e) { s = (await fb.get('stats/' + area)) || s; }
  }
  S.stats[area] = { likes: s.likes || {}, adds: s.adds || {}, cmts: s.cmts || {} };
  emit();
  return S.stats[area];
}
const statOf = (area) => S.stats[area] || (S.stats[area] = { likes: {}, adds: {}, cmts: {} });
export const likesOf = (e) => statOf(e.area).likes[e.key] || 0;
export const addsOf = (e) => statOf(e.area).adds[e.key] || 0;
export const cmtsOf = (e) => statOf(e.area).cmts[e.key] || 0;
async function bump(area, field, key, d) {
  if (!S.stats[area]) { await loadStats(area); }
  const m = statOf(area)[field];
  m[key] = Math.max(0, (m[key] || 0) + d);
  return { op: 'update', path: 'stats/' + area, data: { [field + '.' + key]: fb.inc(d), last: key } };
}

export async function toggleLike(e) {
  if (notReady()) { return; }
  const on = !S.liked[e.key];
  if (on) { S.liked[e.key] = true; } else { delete S.liked[e.key]; }
  const st = await bump(e.area, 'likes', e.key, on ? 1 : -1);
  emit();
  const likePath = 'likes/' + S.uid + '_' + e.key;
  try {
    await fb.batch([on ? { op: 'set', path: likePath, data: { uid: S.uid, key: e.key, at: fb.now() } } : { op: 'delete', path: likePath }, st]);
  } catch (err) { console.error(err); toast('按讚沒有成功（' + (err && err.code ? err.code : err) + '）', 6000); }
}

// ── 清單 ──────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
export const listById = (id) => S.lists.filter((l) => l.id === id)[0];
export async function createList(name, items) {
  if (notReady()) { return; }
  const id = rid();
  const l = { owner: S.uid, nick: S.nick, name: String(name).slice(0, 30), isPublic: false, tags: [], items: (items || []).slice(0, 200), favs: 0, at: Date.now(), upd: Date.now() };
  S.lists.push(Object.assign({ id: id }, l));
  emit();
  await fb.set('lists/' + id, Object.assign({}, l, { at: fb.now(), upd: fb.now() }));
  for (const k of l.items) { const e = S.byKey[k]; if (e) { await fb.batch([await bump(e.area, 'adds', k, 1)]).catch(() => {}); } }
  emit();
  return id;
}
export async function patchList(id, patch) {
  const l = listById(id); if (!l) { return; }
  Object.assign(l, patch);
  emit();
  await fb.update('lists/' + id, Object.assign({}, patch, { upd: fb.now() }));
}
export async function toggleInList(id, key) {
  if (notReady()) { return; }
  const l = listById(id); if (!l) { return; }
  const has = l.items.indexOf(key) >= 0;
  if (!has && l.items.length >= 200) { toast('一份清單最多 200 集'); return; }
  const items = has ? l.items.filter((x) => x !== key) : l.items.concat([key]);
  l.items = items;
  const e = S.byKey[key];
  const ops = [{ op: 'update', path: 'lists/' + id, data: { items: items, upd: fb.now() } }];
  if (e) { ops.push(await bump(e.area, 'adds', key, has ? -1 : 1)); }
  emit();
  try { await fb.batch(ops.slice(0, 1)); if (ops[1]) { await fb.batch([ops[1]]); } } catch (err) { console.error(err); toast('清單沒有存成功，請再試一次'); }
}
export async function deleteList(id) {
  const l = listById(id); if (!l) { return; }
  S.lists = S.lists.filter((x) => x.id !== id);
  emit();
  await fb.del('lists/' + id);
  for (const k of l.items) { const e = S.byKey[k]; if (e) { await fb.batch([await bump(e.area, 'adds', k, -1)]).catch(() => {}); } }
}
export const shareLink = (id) => SITE + '/list?l=' + id;
export function copyText(t, msg) {
  const done = () => toast(msg || '已複製連結');
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done)); }
  else { fallbackCopy(t, done); }
}
function fallbackCopy(t, done) {
  const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { prompt('複製這個連結：', t); }
  ta.remove();
}

// ── 收藏別人的清單 ────────────────────────────────
export async function toggleFav(listId) {
  if (notReady()) { return; }
  const on = S.favs.indexOf(listId) < 0;
  S.favs = on ? S.favs.concat([listId]) : S.favs.filter((x) => x !== listId);
  emit();
  toast(on ? '已收藏，在「我的護照」找得到' : '已取消收藏');
  try {
    await fb.update('users/' + S.uid, { favs: on ? fb.arrAdd(listId) : fb.arrDel(listId) });
    await fb.update('lists/' + listId, { favs: fb.inc(on ? 1 : -1) });
  } catch (e) { console.error(e); }
}

// ── 留言 ──────────────────────────────────────────
export async function loadComments(key) {
  const rows = await fb.where('comments', 'ep', key);
  S.comments[key] = rows.sort((x, y) => tsOf(x.at) - tsOf(y.at));
  emit();
}
// 一次讀進全部留言（搜尋留言用）
let allCmtsP = null;
export function loadAllComments() {
  if (!allCmtsP) {
    allCmtsP = fb.all('comments').then((rows) => {
      const g = {};
      rows.forEach((c) => { (g[c.ep] = g[c.ep] || []).push(c); });
      Object.keys(g).forEach((k) => { if (!S.comments[k]) { S.comments[k] = g[k].sort((x, y) => tsOf(x.at) - tsOf(y.at)); } });
      S.allComments = true;
      emit();
    }).catch((err) => { console.error(err); allCmtsP = null; });
  }
  return allCmtsP;
}
export async function addComment(e, text) {
  if (notReady()) { return; }
  const t = String(text).trim().slice(0, 140); if (!t) { return; }
  const id = fb.newId('comments');
  const c = { ep: e.key, uid: S.uid, nick: S.nick, text: t, at: Date.now() };
  (S.comments[e.key] = S.comments[e.key] || []).push(Object.assign({ id: id }, c));
  const st = await bump(e.area, 'cmts', e.key, 1);
  emit();
  try { await fb.batch([{ op: 'set', path: 'comments/' + id, data: Object.assign({}, c, { at: fb.now() }) }]); await fb.batch([st]); }
  catch (err) { console.error(err); toast('留言沒有送出，請再試一次'); }
}
export async function deleteComment(e, id) {
  S.comments[e.key] = (S.comments[e.key] || []).filter((c) => c.id !== id);
  const st = await bump(e.area, 'cmts', e.key, -1);
  emit();
  await fb.del('comments/' + id);
  await fb.batch([st]).catch(() => {});
}
export async function report(cid, why, more) {
  await fb.add('reports', { cid: cid, why: why, more: String(more || '').slice(0, 200), uid: S.uid, at: fb.now() });
}

// ── 暱稱、登入 ────────────────────────────────────
export async function setNick(n) {
  const v = String(n || '').trim().slice(0, 16) || DEFAULT_NICK;
  S.nick = v; S.lists.forEach((l) => { l.nick = v; });
  emit();
  await fb.update('users/' + S.uid, { nick: v });
  for (const l of S.lists) { await fb.update('lists/' + l.id, { nick: v }).catch(() => {}); }
}
export async function login() {
  const before = { notes: Object.assign({}, S.notes), seen: Object.assign({}, S.seen), favs: S.favs.slice(), lists: S.lists.slice(), nick: S.nick };
  let res;
  try { res = await fb.googleLogin(); } catch (e) {
    if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) { return false; }
    console.error(e); toast('登入沒有成功，請再試一次'); return false;
  }
  if (res.switched) {
    // 這個 Google 帳號以前用過：把剛剛匿名時的紀錄搬過去
    S.uid = res.uid; S.isAnon = false;
    await loadUser();
    const seenAdd = {};
    Object.keys(before.seen).forEach((k) => { if (!S.seen[k]) { seenAdd['seen.' + k] = true; S.seen[k] = true; } });
    const favAdd = before.favs.filter((f) => S.favs.indexOf(f) < 0);
    Object.keys(before.notes).forEach((k) => { if (!S.notes[k]) { seenAdd['notes.' + k] = before.notes[k]; S.notes[k] = before.notes[k]; } });
    if (Object.keys(seenAdd).length) { await fb.update('users/' + S.uid, seenAdd); }
    for (const f of favAdd) { await fb.update('users/' + S.uid, { favs: fb.arrAdd(f) }); S.favs.push(f); }
    if (S.nick === DEFAULT_NICK && before.nick !== DEFAULT_NICK) { await setNick(before.nick); }
    for (const l of before.lists) { if (l.items.length) { await createList(l.name, l.items); } }
  } else {
    S.isAnon = false;
    await loadLinks();
  }
  emit();
  toast('登入成功，資料已經同步到你的帳號');
  return true;
}
export async function logout() {
  await fb.logout();
  location.reload();
}

// ── 畫面元件 ──────────────────────────────────────
const BUNTING = '<svg class="bunting" aria-hidden="true" width="100%" height="36" style="display:block" preserveAspectRatio="none"><defs><pattern id="flags" width="240" height="36" patternUnits="userSpaceOnUse"><path d="M0 0H240" stroke="#1F2A5A" stroke-width="4"/><polygon points="6,2 54,2 30,32" fill="#FF6B5E" stroke="#1F2A5A" stroke-width="3" stroke-linejoin="round"/><polygon points="66,2 114,2 90,32" fill="#FFC83D" stroke="#1F2A5A" stroke-width="3" stroke-linejoin="round"/><polygon points="126,2 174,2 150,32" fill="#2EC4B6" stroke="#1F2A5A" stroke-width="3" stroke-linejoin="round"/><polygon points="186,2 234,2 210,32" fill="#7B5CFF" stroke="#1F2A5A" stroke-width="3" stroke-linejoin="round"/></pattern></defs><rect width="100%" height="36" fill="url(#flags)"/></svg>';
let lastHeader = null;
let headerBound = false;
export function header(page, area) {
  lastHeader = [page, area];
  const items = OPEN.map((a) => { const A = AREAS[a]; return '<a href="' + A.page + '"' + (area === a ? ' aria-current="page"' : '') + '><span class="dot" style="background:' + A.color + '"></span><span class="mn">' + A.name + '<small lang="ja">' + A.jp + '</small></span></a>'; }).join('');
  let h = '<header class="gh' + (area ? ' area' : '') + '"><div class="gh1"><a class="brand hd" href="/">日向坂樂園</a>'
    + '<details class="ghd"><summary class="hd">園區 <span class="car" aria-hidden="true">▾</span></summary><nav class="ghm" aria-label="園區">' + items + '</nav></details>'
    + '<nav class="ghu" aria-label="我的"><a href="/passport"' + (page === 'passport' ? ' aria-current="page"' : '') + '>我的護照</a><a href="/gallery"' + (page === 'gallery' ? ' aria-current="page"' : '') + '>遊客推薦</a></nav></div>';
  if (area) { h += '<nav class="ghs" aria-label="本園區"><a href="#paths">遊玩路線</a><a href="#must">人氣設施</a><a href="#series">主題園區</a><a href="#all">園區地圖</a></nav>'; }
  h += '</header>' + BUNTING;
  $('#hdr').innerHTML = h;
  if (headerBound) { return; }
  headerBound = true;
  document.addEventListener('click', (ev) => { const d = $('.ghd'); if (d && d.open && !d.contains(ev.target)) { d.open = false; } });
}
export const FOOTER = '日向坂樂園是粉絲自製的非官方看點導覽，只整理集數與推薦，不提供任何影片，與節目及相關單位無關。節目內容請以テレビ東京與 Lemino 的官方資訊為準。';
export function footer() { const f = $('#ftr'); if (f) { f.textContent = FOOTER; } }

let toastTimer = null;
export function toast(msg, ms) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, ms || 2200);
}

// 事件：data-act="名稱" data-arg="參數"
export function bind(root, handlers) {
  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || !root.contains(el)) { return; }
    const fn = handlers[el.getAttribute('data-act')];
    if (fn) { ev.preventDefault(); fn(el.getAttribute('data-arg'), el, ev); }
  });
}

const GICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>';
function dialog(html, onReady) {
  const o = document.createElement('div');
  o.className = 'ovl';
  o.innerHTML = html;
  document.body.appendChild(o);
  const close = () => { o.remove(); document.removeEventListener('keydown', esc1); };
  const esc1 = (ev) => { if (ev.key === 'Escape') { close(); } };
  document.addEventListener('keydown', esc1);
  o.addEventListener('click', (ev) => { if (ev.target === o || ev.target.closest('[data-close]')) { ev.preventDefault(); close(); } });
  const f = o.querySelector('input,textarea,button'); if (f) { f.focus(); }
  if (onReady) { onReady(o, close); }
  return close;
}
export function openLogin() {
  dialog('<div class="dlg card" role="dialog" aria-modal="true" aria-labelledby="dl1"><h2 class="hd" id="dl1">登入日向坂樂園</h2>'
    + '<p>登入後，清單和看過紀錄會存在你的 Google 帳號裡，換手機、換電腦都看得到。沒登入時存的資料也會一起搬過去。</p>'
    + '<button type="button" class="gbtn" data-go>' + GICON + '用 Google 登入</button>'
    + '<p class="small">網站只會拿到你的 Google 名稱和大頭貼，不會用你的帳號發文，也碰不到其他資料。</p>'
    + '<div class="dacts"><button type="button" class="btn" data-close>先不用，繼續匿名</button></div></div>', (o, close) => {
    o.querySelector('[data-go]').addEventListener('click', async () => { close(); await login(); });
  });
}
export function openNick() {
  dialog('<form class="dlg card" role="dialog" aria-modal="true" aria-labelledby="dl2"><h2 class="hd" id="dl2">設定暱稱</h2>'
    + '<p>暱稱會顯示在你的留言和公開的清單上，之後隨時可以改。</p>'
    + '<label class="field">暱稱<input name="nick" type="text" maxlength="16" value="' + esc(S.nick) + '" placeholder="' + DEFAULT_NICK + '"></label>'
    + '<p class="small">最多 16 個字。不填的話會顯示「' + DEFAULT_NICK + '」。</p>'
    + '<div class="dacts"><button type="button" class="btn" data-close>取消</button><button type="submit" class="btn pri">儲存</button></div></form>', (o, close) => {
    o.querySelector('form').addEventListener('submit', async (ev) => { ev.preventDefault(); const v = new FormData(ev.target).get('nick'); close(); await setNick(v); toast('暱稱已更新'); });
  });
}
export function openReport(cid) {
  dialog('<form class="dlg card" role="dialog" aria-modal="true" aria-labelledby="dl3"><h2 class="hd" id="dl3">檢舉這則留言</h2>'
    + '<div class="radios" role="radiogroup" aria-label="檢舉原因">'
    + ['劇透結果', '不友善或人身攻擊', '廣告或洗版', '其他'].map((w, i) => '<label><input type="radio" name="why" value="' + w + '"' + (i === 0 ? ' checked' : '') + '> ' + w + '</label>').join('')
    + '</div><label class="field">補充說明（可不填）<textarea name="more" rows="2" maxlength="200"></textarea></label>'
    + '<p class="small">站長會盡快處理，確認違規就會刪掉這則留言。</p>'
    + '<div class="dacts"><button type="button" class="btn" data-close>取消</button><button type="submit" class="btn pri">送出檢舉</button></div></form>', (o, close) => {
    o.querySelector('form').addEventListener('submit', async (ev) => { ev.preventDefault(); const fd = new FormData(ev.target); close(); await report(cid, fd.get('why'), fd.get('more')); toast('檢舉已送出，謝謝你的回報'); });
  });
}
export function openConfirmDelete(name, onYes) {
  dialog('<div class="dlg card" role="alertdialog" aria-modal="true" aria-labelledby="dl4"><h2 class="hd" id="dl4">刪除「' + esc(name) + '」？</h2>'
    + '<p>刪掉就救不回來了。已經分享出去的連結會打不開，遊客推薦裡也會一起消失。</p>'
    + '<div class="dacts"><button type="button" class="btn" data-close>取消</button><button type="button" class="btn danger" data-yes>確定刪除</button></div></div>', (o, close) => {
    o.querySelector('[data-yes]').addEventListener('click', () => { close(); onYes(); });
  });
}
