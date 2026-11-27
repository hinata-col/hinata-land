// 園區頁（平假名推／在日向坂相會／まだひな 共用）
import {
  S, AREAS, AREA_PREFIX, setting, init, dataReady, onChange, header, footer, esc, $, bind, toast, titleOf, epLabel,
  setSeen, loadStats, likesOf, addsOf, cmtsOf, toggleLike, toggleInList, createList,
  loadComments, loadAllComments, addComment, setNote, deleteComment, openReport, openNick
} from './app.js';

const AREA = document.body.getAttribute('data-area');
const A = AREAS[AREA];
const TEXT = {
  R: {
    watch: '平假名推是在日向坂相會的前身，2018–2019 年播出，當時團名還是平假名櫸坂46（けやき坂46）。',
    statLabel: (last) => '全部集數（' + last + ' 完結）',
    p2: '3分鐘接力料理、學力測試、包包檢查等日會熱門企劃的始祖。',
    p3: '全部 50 集一路排下來，可以搜尋標題，邊追邊勾選自己看過的集數。',
    lead: (n, sp) => '「ひらがな推し」全 ' + n + ' 集。搜尋標題、篩選系列，順便記下自己看到哪裡。'
  },
  H: {
    watch: 'テレビ東京　每週日深夜 1:20 播出（時間偶爾會微調）',
    statLabel: (last) => '已播出集數（最新一集 ' + last + '）',
    p2: '男裝短劇、單挑、學力測試、新春特輯、大賣祈願，熱門企劃會回鍋做好幾彈。',
    p3: '全部集數依 50 集分區，可以搜尋標題，邊追邊勾選自己看過的集數。',
    lead: (n, sp) => '「日向坂で会いましょう」全 ' + n + ' 集' + (sp ? '，含 ' + sp + ' 集特別篇' : '') + '。搜尋標題、篩選系列，順便記下自己看到哪裡。'
  },
  M: {
    watch: 'Lemino 獨家配信，和本篇連動的衍生節目。',
    statLabel: (last) => '已配信集數（最新一回 ' + last + '）',
    p2: '本篇企劃的延伸和幕後，熱門企劃會回鍋做好幾彈。',
    p3: '全部集數一路排下來，可以搜尋標題，邊追邊勾選自己看過的集數。',
    lead: (n, sp) => '「まだまだ！日向坂で会いましょう」全 ' + n + ' 回。搜尋標題、篩選系列，順便記下自己看到哪裡。'
  }
}[AREA];

const urlList = new URLSearchParams(location.search).get('list') || '';
const F = { syn: '', note: '', mopen: '', q: '', range: '', cat: '全部', status: '全部', sortBy: '集數', sortDir: 'asc', limit: 20, openSeries: '', allSeries: false, help: false, pop: '', open: '', listFilter: urlList };
const tint = ['#FFB3AB', '#FFE08A', '#A8EBE2', '#CFC4FF', '#FFC2D6', '#BFE0FF'];
let ALL = [], maxN = 0, lastDate = '', ranges = [], SER = [];

const strip = (t) => t.replace(/[\s　]*(上篇|中篇|下篇|前篇|後篇|前編|後編|前半戰|後半戰|前半|後半|完結篇|完結編|上|下|前半戦|後半戦)$/, '').replace(/[\s　]*[\(（]?[0-9０-９①②③④]+[\)）]?$/, '');

function prepare() {
  ALL = S.eps[AREA];
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  let maxAll = 0;
  ALL.forEach((e) => { if (e.n % 1 === 0 && e.n > maxAll) { maxAll = e.n; } if (e.n % 1 === 0 && e.n > maxN && e.date && e.date <= today) { maxN = e.n; lastDate = e.date; } });
  if (!maxN) { maxN = maxAll; }
  ranges = [];
  if (maxAll > 60) {
    const top = Math.floor((maxAll - 1) / 50) * 50 + 1;
    ranges.push(['最新 ' + top + '–' + maxAll, top, 9999]);
    for (let a = 1; a < top; a += 50) { ranges.push([a + '–' + (a + 49), a, a + 49]); }
  }
  ranges.unshift(['全部集數', 0, 9999]);
  F.range = '全部集數';
  SER = S.series.map((name) => {
    const groups = []; let cur = null;
    ALL.forEach((e, i) => {
      if (e.tags.indexOf(name) === -1) { cur = null; return; }
      if (cur && cur.last === i - 1) { cur.to = e.id; cur.last = i; }
      else { cur = { from: e.id, to: e.id, last: i, title: strip(titleOf(e)) }; groups.push(cur); }
    });
    return { name: name, groups: groups };
  }).filter((x) => x.groups.length > 0);
}

function applySettings() {
  const pre = AREA_PREFIX[AREA] + '：';
  TEXT.watch = setting(pre + '園區說明', TEXT.watch);
  TEXT.p2 = setting(pre + '依系列挑說明', TEXT.p2);
  TEXT.p3 = setting(pre + '從頭追說明', TEXT.p3);
}

function renderHero() {
  applySettings();
  const nameHtml = AREA === 'R'
    ? '<h1 class="hd arname hiraname" aria-label="平假名推"><span style="color:#F2569C">平</span><span style="color:#8A63DE">假</span><span style="color:#3A8CEB">名</span><span style="color:#F2569C">推</span></h1>'
    : '<h1 class="hd arname">' + esc(A.name) + '</h1>';
  const sp = ALL.filter((e) => e.n % 1 !== 0).length;
  $('#top').innerHTML = '<div style="flex:1 1 480px;min-width:0"><div class="arhead"><img class="arlogo" src="' + A.logo + '" alt="' + esc(A.jp) + ' 節目 LOGO"><div>' + nameHtml + '<div class="arjp" lang="ja">' + esc(A.jp) + '</div></div></div>'
    + '<div class="watch">' + esc(TEXT.watch) + '</div></div>'
    + '<div class="stats"><div class="card stat" style="background:#FFB3AB"><span class="statnum hd" style="display:block;font-size:40px;font-weight:900;line-height:1.1">' + maxN + '</span><span class="statlab">' + esc(TEXT.statLabel(lastDate)) + '</span></div>'
    + '<div class="card stat" style="background:#A8EBE2"><span class="statnum hd" style="display:block;font-size:40px;font-weight:900;line-height:1.1">' + SER.length + '</span><span class="statlab">主題園區</span></div></div>';
  $('#p2').textContent = TEXT.p2;
  $('#p3').textContent = TEXT.p3;
  $('#lead').textContent = TEXT.lead(ALL.length, sp);
  document.title = A.name + ' · 日向坂樂園';
}

function renderMust() { keepInputs('#mustg', renderMustInner); }
function renderMustInner() {
  const top = ALL.filter((e) => likesOf(e) > 0).sort((x, y) => (likesOf(y) - likesOf(x)) || (x.n - y.n)).slice(0, 6);
  if (!top.length) {
    $('#mustg').innerHTML = '<div class="card must" style="background:#FFFFFF;grid-column:1/-1"><h3 class="hd">還沒有人按讚</h3><div class="meta">到下面的園區地圖，幫你喜歡的集數按個「♡ 讚」，讚最多的幾集就會排到這裡。</div></div>';
    return;
  }
  $('#mustg').innerHTML = top.map((e, k) => '<div class="card must' + (F.mopen === e.key ? ' open' : '') + '" style="background:' + tint[k % tint.length] + '"><div class="pills"><span class="rk hd">第 ' + (k + 1) + ' 名</span><span class="epb hd">#' + esc(e.id) + '</span></div>'
    + '<h3 class="hd">' + esc(titleOf(e)) + '</h3><div class="meta">讚 ' + likesOf(e) + '　收藏 ' + addsOf(e) + '</div>'
    + '<div class="mact"><button type="button" class="btn act" data-act="mcmt" data-arg="' + e.key + '" aria-expanded="' + (F.mopen === e.key) + '">留言 ' + cmtsOf(e) + '</button>' + vlinkHtml(e) + '</div>'
    + (F.mopen === e.key ? cmtDrawer(e, 'mc-') : '') + '</div>').join('');
}

function renderSeries() {
  const shown = SER.filter((sr, i) => F.allSeries || i < 8 || sr.name === F.openSeries);
  $('#sgrid').innerHTML = shown.map((sr) => {
    const isOpen = F.openSeries === sr.name;
    const first = '#' + sr.groups[0].from;
    const last = '#' + sr.groups[sr.groups.length - 1].to;
    let h = '<div class="card scard' + (isOpen ? ' open' : '') + '" style="background:#FFFFFF"><button type="button" class="shead hd" data-act="ser" data-arg="' + esc(sr.name) + '" aria-expanded="' + isOpen + '" style="background:' + S.tagColor[sr.name] + '">'
      + '<span class="sname" style="font-size:22px;font-weight:900;line-height:1.3">' + esc(sr.name) + '</span><em>' + (isOpen ? '收合 ▴' : '展開 ▾') + '</em></button>';
    if (isOpen) {
      h += '<div class="sbody"><div class="slist">' + sr.groups.map((g) => '<div class="sitem"><span class="sep hd">' + (g.from === g.to ? '#' + esc(g.from) : '#' + esc(g.from) + '–' + esc(g.to)) + '</span><span>' + esc(g.title) + '</span></div>').join('')
        + '</div><a class="slink" href="#all" data-act="serAll" data-arg="' + esc(sr.name) + '">在園區地圖看這個系列 →</a></div>';
    }
    return h + '</div>';
  }).join('');
  const more = $('#smore');
  if (SER.length > 8) { more.style.display = 'flex'; more.innerHTML = '<button type="button" class="btn big" data-act="serMore" aria-expanded="' + F.allSeries + '">' + (F.allSeries ? '收合 ▴' : '顯示全部 ' + SER.length + ' 個系列 ▾') + '</button>'; }
  else { more.style.display = 'none'; }
}

const opt = (labels, cur) => labels.map((l) => '<option value="' + esc(l) + '"' + (l === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
function renderFilters() {
  $('#fRange').innerHTML = opt(ranges.map((r) => r[0]), F.range);
  $('#fRangeWrap').style.display = ranges.length > 1 ? '' : 'none';
  $('#fCat').innerHTML = opt(['全部'].concat(SER.map((s) => s.name)), F.cat);
  $('#fStatus').innerHTML = opt(['全部', '還沒看', '已看過'], F.status);
  $('#fSort').innerHTML = opt(['集數', '按讚數', '收藏數', '留言數'], F.sortBy);
  const isEp = F.sortBy === '集數';
  const dl = F.sortDir === 'desc' ? (isEp ? '▼ 新→舊' : '▼ 多→少') : (isEp ? '▲ 舊→新' : '▲ 少→多');
  $('#fSortLab').textContent = '排序 · ' + dl.slice(2);
  $('#fDir').textContent = dl.slice(0, 1);
  $('#fDir').setAttribute('aria-label', '排序方向，目前' + dl.slice(2));
}

// 搜尋時，留言裡有關鍵字的那一則
function cmtHit(e, q) {
  if (!q || /^#?\d+(\.5)?$/.test(q)) { return null; }
  const c = (S.comments[e.key] || []).filter((x) => String(x.text).toLowerCase().indexOf(q) !== -1);
  return c.length ? c[c.length - 1] : null;
}
function snippet(t, q) {
  const i = t.toLowerCase().indexOf(q); const a = Math.max(0, i - 18);
  return (a > 0 ? '…' : '') + t.slice(a, i + q.length + 30) + (i + q.length + 30 < t.length ? '…' : '');
}

function filtered() {
  const q = F.q.trim().toLowerCase();
  let base;
  if (q) {
    const num = q.replace(/^#/, '');
    base = /^\d+(\.5)?$/.test(num) ? ALL.filter((e) => e.id === num || e.id === num + '.5') : ALL.filter((e) => (e.zh + ' ' + e.jp + ' ' + e.syn + ' ' + (S.notes[e.key] || '')).toLowerCase().indexOf(q) !== -1 || !!cmtHit(e, q));
  } else {
    const rg = ranges.filter((x) => x[0] === F.range)[0] || ranges[0];
    base = ALL.filter((e) => e.n >= rg[1] && e.n <= rg[2] + 0.9);
  }
  const lf = F.listFilter ? (S.lists.filter((l) => l.id === F.listFilter)[0] || null) : null;
  const val = (e) => F.sortBy === '按讚數' ? likesOf(e) : F.sortBy === '收藏數' ? addsOf(e) : F.sortBy === '留言數' ? cmtsOf(e) : e.n;
  const mul = F.sortDir === 'desc' ? -1 : 1;
  return base
    .filter((e) => F.cat === '全部' || e.tags.indexOf(F.cat) !== -1)
    .filter((e) => !lf || lf.items.indexOf(e.key) >= 0)
    .filter((e) => F.status === '全部' || (F.status === '已看過' ? !!S.seen[e.key] : !S.seen[e.key]))
    .sort((x, y) => (mul * (val(x) - val(y))) || (x.n - y.n));
}

function cmtDrawer(e, kp) {
  let h = '';
    const cs = S.comments[e.key];
    h += '<div class="drawer" style="background:#EAF6FF"><h4 class="hd">留言與推薦看點</h4>';
    if (!cs) { h += '<div style="font-size:14px">讀取中…</div>'; }
    else if (!cs.length) { h += '<div style="font-size:14px">還沒有人留言，來當第一個分享看點的人吧。</div>'; }
    else {
      h += cs.map((c) => '<div class="cmt"><div class="cmth"><small>' + esc(c.nick === '匿名おひさま' ? 'おひさま' : c.nick) + '</small>' + (c.uid === S.uid
        ? '<button type="button" class="rpt" data-act="delCmt" data-arg="' + e.key + '|' + c.id + '">刪除</button>'
        : '<button type="button" class="rpt" data-act="report" data-arg="' + c.id + '">檢舉</button>') + '</div>' + esc(c.text) + '</div>').join('');
    }
    h += '<form data-form="cmt" data-key="' + e.key + '"><label>分享這集的看點（請不要劇透結果）<input name="t" type="text" maxlength="140" data-keep="' + kp + e.key + '" placeholder="例：前半的即興劇超好笑"></label><button type="submit" class="btn pri">送出</button></form>'
      + '<div class="asnick">留言會顯示為「' + esc(S.nick) + '」　<button type="button" class="lnk" data-act="nick">改暱稱</button></div></div>';
  return h;
}
const vlinkHtml = (e) => (S.links[e.key] && /^https:\/\//.test(S.links[e.key]) ? '<a class="btn act vlink" href="' + esc(S.links[e.key]) + '" target="_blank" rel="noopener noreferrer">▶ 中字</a>' : '');

function rowHtml(e) {
  const seen = !!S.seen[e.key], liked = !!S.liked[e.key];
  const picked = S.lists.some((l) => l.items.indexOf(e.key) >= 0);
  const isPop = F.pop === e.key, isOpen = F.open === e.key;
  let h = '<article class="row" style="background:' + (seen ? '#EFFBF4' : '#FFFFFF') + '">'
    + '<div class="ra"><span class="ep hd">#' + esc(e.id) + '</span><span class="date">' + esc(e.date || '特別篇') + '</span></div>'
    + '<div class="rs"><button type="button" class="seen" data-act="seen" data-arg="' + e.key + '" aria-pressed="' + seen + '" aria-label="第 ' + esc(e.id) + ' 回 標記為看過">' + (seen ? '☑ 看過' : '☐ 看過') + '</button></div>'
    + '<div class="rb"><div class="tt">' + esc(titleOf(e)) + '</div>' + (e.jp && e.zh ? '<div class="jp" lang="ja">' + esc(e.jp) + '</div>' : '')
    + (e.syn ? '<div class="syn' + (F.syn === e.key ? ' open' : '') + '">' + esc(e.syn) + '</div><button type="button" class="lnk synt" data-act="syn" data-arg="' + e.key + '">' + (F.syn === e.key ? '收起簡介' : '看完整簡介') + '</button>' : '')
    + (S.notes[e.key] ? '<div class="mynote">📝 ' + esc(S.notes[e.key].length > 60 ? S.notes[e.key].slice(0, 60) + '…' : S.notes[e.key]) + '</div>' : '')
    + (function () { const q = F.q.trim().toLowerCase(); const c = cmtHit(e, q); return c ? '<div class="chit">💬 ' + esc(snippet(String(c.text), q)) + '</div>' : ''; })() + '</div>'
    + '<div class="rc">' + e.tags.map((t) => '<span class="chip" style="background:' + S.tagColor[t] + '">' + esc(t) + '</span>').join('') + '</div>'
    + '<div class="rd"><button type="button" class="btn act" data-act="like" data-arg="' + e.key + '" aria-pressed="' + liked + '">' + (liked ? '♥ 讚 ' : '♡ 讚 ') + likesOf(e) + '</button>'
    + '<button type="button" class="btn act" data-act="pop" data-arg="' + e.key + '" aria-expanded="' + isPop + '">' + (picked ? '★ 收藏 ' : '☆ 收藏 ') + addsOf(e) + '</button>'
    + '<button type="button" class="btn act" data-act="cmt" data-arg="' + e.key + '" aria-expanded="' + isOpen + '">留言 ' + cmtsOf(e) + '</button>'
    + '<button type="button" class="btn act" data-act="note" data-arg="' + e.key + '" aria-pressed="' + !!S.notes[e.key] + '" aria-expanded="' + (F.note === e.key) + '">📝 筆記</button>'
    + vlinkHtml(e) + '</div>';
  if (isPop) {
    h += '<div class="drawer" style="background:#FFF1C2"><h4 class="hd">放進哪份清單？（可以多選）</h4><div class="pills">'
      + S.lists.map((l) => { const on = l.items.indexOf(e.key) >= 0; return '<button type="button" class="btn" data-act="inList" data-arg="' + l.id + '|' + e.key + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + esc(l.name) + '（' + l.items.length + '）</button>'; }).join('')
      + '</div><form data-form="newList" data-key="' + e.key + '"><label>或是開一份新清單，直接把這集放進去<input name="n" type="text" maxlength="30" data-keep="nl-' + e.key + '" placeholder="清單名稱，例如：新手入門 5 選"></label><button type="submit" class="btn pri">新增並放進去</button></form></div>';
  }
  if (isOpen) { h += cmtDrawer(e, 'c-'); }
  if (F.note === e.key) {
    h += '<div class="drawer" style="background:#F3EEFF"><h4 class="hd">我的筆記<small class="nsub">🔒 只有你看得到，可以被搜尋</small></h4>'
      + '<div><textarea class="ntext" data-note="' + e.key + '" data-keep="n-' + e.key + '" rows="3" maxlength="1000" placeholder="寫下這集的重點、喜歡的片段、時間點…">' + esc(S.notes[e.key] || '') + '</textarea></div>'
      + '<div class="nfoot"><span class="nstat" data-nstat="' + e.key + '">' + (S.notes[e.key] ? '✓ 已儲存' : '打完字會自動儲存') + '</span><button type="button" class="lnk" data-act="noteDel" data-arg="' + e.key + '">刪除筆記</button></div></div>';
  }
  return h + '</article>';
}

// 重畫時保留正在輸入的文字
function keepInputs(sel, fn) {
  const ae = document.activeElement;
  const keep = ae && ae.getAttribute && ae.getAttribute('data-keep') ? { k: ae.getAttribute('data-keep'), v: ae.value, s: ae.selectionStart } : null;
  const vals = {};
  document.querySelectorAll(sel + ' [data-keep]').forEach((i) => { vals[i.getAttribute('data-keep')] = i.value; });
  fn();
  document.querySelectorAll(sel + ' [data-keep]').forEach((i) => { const k = i.getAttribute('data-keep'); if (vals[k]) { i.value = vals[k]; } });
  if (keep) { const i = document.querySelector(sel + ' [data-keep="' + keep.k + '"]'); if (i) { i.value = keep.v; i.focus(); try { i.setSelectionRange(keep.s, keep.s); } catch (err) {} } }
}

function renderRows() { keepInputs('#rows', renderRowsInner); fitSyn(); }
// 簡介沒被截斷（兩行內放得下）就不顯示「看完整簡介」
function fitSyn() {
  document.querySelectorAll('.syn:not(.open)').forEach((el) => {
    const t = el.nextElementSibling;
    if (t && t.classList.contains('synt')) { t.hidden = el.scrollHeight <= el.clientHeight + 1; }
  });
}
let synTimer = 0;
window.addEventListener('resize', () => { clearTimeout(synTimer); synTimer = setTimeout(fitSyn, 150); });
function renderRowsInner() {

  const list = filtered();
  const shown = list.slice(0, F.limit);
  $('#rows').innerHTML = shown.map(rowHtml).join('');
  $('#empty').style.display = list.length ? 'none' : '';
  const more = $('#more');
  if (list.length > F.limit) { more.style.display = ''; more.innerHTML = '<span style="font-size:13px;font-weight:700">已顯示 ' + shown.length + ' / ' + list.length + ' 集</span><button type="button" class="btn big" data-act="more">再顯示 20 集</button>'; }
  else { more.style.display = 'none'; }
  const note = $('#note');
  if (F.q.trim()) { note.style.display = ''; note.textContent = '搜尋「' + F.q.trim() + '」：在全部集數中找到 ' + list.length + ' 集（搜尋時不套用集數分區）。'; }
  else { note.style.display = 'none'; }
  const lf = F.listFilter ? S.lists.filter((l) => l.id === F.listFilter)[0] : null;
  const ban = $('#banner');
  if (lf) { ban.style.display = ''; ban.innerHTML = '<span>目前只看你的清單「' + esc(lf.name) + '」，共 ' + list.length + ' 集</span><button type="button" class="btn" data-act="clearList">顯示全部集數</button>'; }
  else { ban.style.display = 'none'; }

}

function renderProg() {
  const n = ALL.filter((e) => S.seen[e.key]).length;
  $('#prog').innerHTML = '<span>我看過 ' + n + ' / ' + ALL.length + ' 集</span><div class="bar"><div style="height:100%;background:#7ED9A6;width:' + Math.max(2, Math.round(n / Math.max(1, ALL.length) * 100)) + '%"></div></div>';
  const uniq = {}; S.lists.forEach((l) => l.items.forEach((k) => { uniq[k] = 1; }));
  const bar = $('#stk');
  if (S.lists.length) { bar.innerHTML = '<div class="stkin"><span>' + S.lists.length + ' 份清單 · 收藏 ' + Object.keys(uniq).length + ' 集</span><a class="btn pri" href="/passport" style="min-height:36px;padding:4px 14px;font-size:13px;box-shadow:none">我的護照</a></div>'; }
  else { bar.innerHTML = ''; }
}

function renderAll() { renderMust(); renderRows(); renderProg(); }

async function main() {
  header('area', AREA); footer();
  if (AREA === 'R') { document.querySelector('.page').classList.add('hira'); }
  await dataReady();
  prepare(); renderHero(); renderSeries(); renderFilters(); renderAll();
  init().then(() => { renderAll(); onChange(renderAll); loadStats(AREA); });

  const root = document.body;
  const byKey = (k) => S.byKey[k];
  bind(root, {
    ser: (name) => { F.openSeries = F.openSeries === name ? '' : name; renderSeries(); },
    serMore: () => { F.allSeries = !F.allSeries; renderSeries(); },
    serAll: (name) => { Object.assign(F, { cat: name, range: '全部集數', status: '全部', listFilter: '', limit: 20 }); renderFilters(); renderRows(); $('#all').scrollIntoView({ behavior: 'smooth' }); },
    seen: (k) => setSeen(k, !S.seen[k]),
    like: (k) => toggleLike(byKey(k)),
    pop: (k) => { F.pop = F.pop === k ? '' : k; F.open = ''; renderRows(); },
    syn: (k) => { F.syn = F.syn === k ? '' : k; renderRows(); },
    note: (k) => { F.note = F.note === k ? '' : k; F.pop = ''; F.open = ''; renderRows(); const t = document.querySelector('[data-note="' + k + '"]'); if (t) { t.focus(); } },
    noteDel: async (k) => { const t = document.querySelector('[data-note="' + k + '"]'); if (t) { t.value = ''; } await setNote(k, ''); F.note = ''; renderRows(); toast('筆記已刪除'); },
    mcmt: (k) => { F.mopen = F.mopen === k ? '' : k; renderMust(); if (F.mopen) { loadComments(k); } },
    cmt: (k) => { F.open = F.open === k ? '' : k; F.pop = ''; renderRows(); if (F.open) { loadComments(k); } },
    inList: (arg) => { const p = arg.split('|'); toggleInList(p[0], p[1]); },
    delCmt: (arg) => { const p = arg.split('|'); deleteComment(byKey(p[0]), p[1]); },
    report: (cid) => openReport(cid),
    nick: () => openNick(),
    more: () => { F.limit += 20; renderRows(); },
    help: () => { F.help = !F.help; $('#help').style.display = F.help ? '' : 'none'; $('#helpBtn').setAttribute('aria-expanded', F.help); },
    dir: () => { F.sortDir = F.sortDir === 'desc' ? 'asc' : 'desc'; F.limit = 20; renderFilters(); renderRows(); },
    clearList: () => { F.listFilter = ''; history.replaceState(null, '', location.pathname + '#all'); F.range = ranges[0][0]; renderFilters(); renderRows(); }
  });
  root.addEventListener('submit', async (ev) => {
    const f = ev.target.closest('form[data-form]'); if (!f) { return; }
    ev.preventDefault();
    const e = byKey(f.getAttribute('data-key'));
    if (f.getAttribute('data-form') === 'cmt') {
      const v = String(new FormData(f).get('t') || '').trim(); if (!v) { return; }
      f.querySelector('input').value = ''; await addComment(e, v);
    } else {
      const v = String(new FormData(f).get('n') || '').trim();
      f.querySelector('input').value = '';
      await createList(v || ('新清單 ' + (S.lists.length + 1)), [e.key]);
      toast('已新增清單並放進這一集');
    }
  });
  const noteTimers = {};
  root.addEventListener('input', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-note]'); if (!t) { return; }
    const k = t.getAttribute('data-note'); const st = document.querySelector('[data-nstat="' + k + '"]');
    if (st) { st.textContent = '輸入中…'; }
    clearTimeout(noteTimers[k]);
    noteTimers[k] = setTimeout(async () => {
      const had = !!S.notes[k];
      try { await setNote(k, t.value); if (st) { st.textContent = '✓ 已自動儲存'; } } catch (err) { console.error(err); if (st) { st.textContent = '沒有存成功，請再打一個字試試'; } }
      if (had !== !!S.notes[k]) { renderRows(); }
    }, 800);
  });
  $('#fSearch').addEventListener('input', (ev) => { F.q = ev.target.value; F.limit = 20; renderRows(); if (F.q.trim() && !/^#?\d/.test(F.q.trim())) { loadAllComments(); } });
  $('#fRange').addEventListener('change', (ev) => { F.range = ev.target.value; F.limit = 20; renderRows(); });
  $('#fCat').addEventListener('change', (ev) => { F.cat = ev.target.value; F.limit = 20; renderRows(); });
  $('#fStatus').addEventListener('change', (ev) => { F.status = ev.target.value; F.limit = 20; renderRows(); });
  $('#fSort').addEventListener('change', (ev) => { F.sortBy = ev.target.value; F.sortDir = ev.target.value === '集數' ? 'asc' : 'desc'; F.limit = 20; renderFilters(); renderRows(); });
  if (F.listFilter) { setTimeout(() => $('#all').scrollIntoView(), 50); }
}
main();
