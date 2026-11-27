// 清單分享頁
import { S, init, dataReady, onChange, header, footer, esc, $, bind, toast, titleOf, epLabel, setSeen, shareLink, copyText, toggleFav, createList,
  loadStats, likesOf, addsOf, cmtsOf, toggleLike, loadComments, addComment, deleteComment, openReport, openNick } from './app.js';
import { fb } from './fb.js';

const id = new URLSearchParams(location.search).get('l') || '';
let L = null;
let openSyn = '';
let openCmt = '';

function notFound() {
  document.title = '找不到這份清單 · 日向坂樂園';
  $('#lv').innerHTML = '<section class="wrap nf"><div class="big" aria-hidden="true">🎡</div><h1 class="hd ptitle" style="margin:0">找不到這份清單</h1>'
    + '<p class="plead" style="margin:0 auto">可能已經被主人刪掉了，也可能是連結沒有複製完整。</p>'
    + '<div class="pills" style="justify-content:center"><a class="btn pri" href="/gallery">看看大家的推薦清單</a><a class="btn" href="/">回樂園大門</a></div></section>';
}

// 留言抽屜（和園區頁相同）
function cmtDrawer(e) {
  const cs = S.comments[e.key];
  let h = '<div class="drawer" style="background:#EAF6FF;margin-top:10px"><h4 class="hd">留言與推薦看點</h4>';
  if (!cs) { h += '<div style="font-size:14px">讀取中…</div>'; }
  else if (!cs.length) { h += '<div style="font-size:14px">還沒有人留言，來當第一個分享看點的人吧。</div>'; }
  else {
    h += cs.map((c) => '<div class="cmt"><div class="cmth"><small>' + esc(c.nick === '匿名おひさま' ? 'おひさま' : c.nick) + '</small>' + (c.uid === S.uid
      ? '<button type="button" class="rpt" data-act="delCmt" data-arg="' + e.key + '|' + c.id + '">刪除</button>'
      : '<button type="button" class="rpt" data-act="report" data-arg="' + c.id + '">檢舉</button>') + '</div>' + esc(c.text) + '</div>').join('');
  }
  h += '<form data-form="cmt" data-key="' + e.key + '"><label>分享這集的看點（請不要劇透結果）<input name="t" type="text" maxlength="140" data-keep="c-' + e.key + '" placeholder="例：前半的即興劇超好笑"></label><button type="submit" class="btn pri">送出</button></form>'
    + '<div class="asnick">留言會顯示為「' + esc(S.nick) + '」　<button type="button" class="lnk" data-act="nick">改暱稱</button></div></div>';
  return h;
}

// 重畫時保留留言框裡打到一半的字
function render() {
  const ae = document.activeElement;
  const keep = ae && ae.getAttribute && ae.getAttribute('data-keep') ? { k: ae.getAttribute('data-keep'), v: ae.value } : null;
  const vals = {};
  document.querySelectorAll('[data-keep]').forEach((i) => { vals[i.getAttribute('data-keep')] = i.value; });
  renderInner();
  document.querySelectorAll('[data-keep]').forEach((i) => { const k = i.getAttribute('data-keep'); if (vals[k]) { i.value = vals[k]; } });
  if (keep) { const i = document.querySelector('[data-keep="' + keep.k + '"]'); if (i) { i.value = keep.v; i.focus(); } }
}

function renderInner() {
  const mine = L.owner === S.uid;
  const fav = S.favs.indexOf(L.id) >= 0;
  const eps = (L.items || []).map((k) => S.byKey[k]).filter(Boolean);
  const seenN = eps.filter((e) => S.seen[e.key]).length;
  document.title = L.name + ' · 日向坂樂園';
  $('#lv').innerHTML = '<section class="wrap ptop"><h1 class="hd ptitle">' + esc(L.name) + '</h1>'
    + '<div class="vmeta">' + esc(L.nick === '匿名おひさま' ? 'おひさま' : (L.nick || '')) + '　·　共 ' + eps.length + ' 集　·　' + (L.isPublic ? '公開在遊客推薦' : '只有拿到連結的人看得到') + '</div>'
    + ((L.tags || []).length ? '<div class="gchips" style="margin-top:8px">' + L.tags.map((t) => '<span class="chip">#' + esc(t) + '</span>').join('') + '</div>' : '')
    + '<div class="vhead">'
    + (mine ? '<a class="btn pri" href="/passport" data-act="edit">編輯這份清單</a>' : '<button type="button" class="btn pri" data-act="fav" aria-pressed="' + fav + '">' + (fav ? '★ 已收藏' : '☆ 收藏這份清單') + '</button><button type="button" class="btn" data-act="dup">複製一份來改</button>')
    + '<button type="button" class="btn" data-act="copy">複製連結</button></div></section>'
    + '<section class="wrap" style="padding-top:8px;padding-bottom:8px">'
    + '<div class="card seenbox"><span>你看過 ' + seenN + ' / ' + eps.length + ' 集</span><div class="bar"><div style="height:100%;background:#7ED9A6;width:' + Math.max(2, Math.round(seenN / Math.max(1, eps.length) * 100)) + '%"></div></div></div>'
    + '<div class="card rows">' + eps.map((e, i) => {
      const s = !!S.seen[e.key];
      return '<article class="vrow" style="background:' + (s ? '#EFFBF4' : '#FFFFFF') + '"><span class="vno hd">' + (i + 1) + '</span>'
        + '<div class="ra"><span class="ep hd">' + esc(epLabel(e)) + '</span><span class="date">' + esc(e.date || '特別篇') + '</span></div>'
        + '<div class="rb"><div class="tt">' + esc(titleOf(e)) + '</div>' + (e.jp && e.zh ? '<div class="jp" lang="ja">' + esc(e.jp) + '</div>' : '')
        + (e.syn ? '<div class="syn' + (openSyn === e.key ? ' open' : '') + '">' + esc(e.syn) + '</div><button type="button" class="lnk synt" data-act="syn" data-arg="' + e.key + '">' + (openSyn === e.key ? '收起簡介' : '看完整簡介') + '</button>' : '')
        + '<div class="rd" style="margin-top:8px;flex-wrap:wrap;justify-content:flex-start"><button type="button" class="btn act" data-act="like" data-arg="' + e.key + '" aria-pressed="' + !!S.liked[e.key] + '">' + (S.liked[e.key] ? '♥ 讚 ' : '♡ 讚 ') + likesOf(e) + '</button>'
        + '<button type="button" class="btn act" data-act="cmt" data-arg="' + e.key + '" aria-expanded="' + (openCmt === e.key) + '">留言 ' + cmtsOf(e) + '</button>'
        + '<span class="date">收藏 ' + addsOf(e) + '</span></div>'
        + (openCmt === e.key ? cmtDrawer(e) : '') + '</div>'
        + '<div class="rc">' + e.tags.map((t) => '<span class="chip" style="background:' + S.tagColor[t] + '">' + esc(t) + '</span>').join('') + '</div>'
        + '<div class="rs"><button type="button" class="seen" data-act="seen" data-arg="' + e.key + '" aria-pressed="' + s + '">' + (s ? '☑ 看過' : '☐ 看過') + '</button>'
        + (S.links[e.key] && /^https:\/\//.test(S.links[e.key]) ? '<a class="btn act vlink" style="margin-top:6px" href="' + esc(S.links[e.key]) + '" target="_blank" rel="noopener noreferrer">▶ 中字</a>' : '') + '</div></article>';
    }).join('') + (eps.length ? '' : '<div class="empty">這份清單還沒有集數。</div>') + '</div></section>';
  fitSyn();
}

// 簡介兩行內放得下就不顯示「看完整簡介」
function fitSyn() {
  document.querySelectorAll('.syn:not(.open)').forEach((el) => {
    const t = el.nextElementSibling;
    if (t && t.classList.contains('synt')) { t.hidden = el.scrollHeight <= el.clientHeight + 1; }
  });
}
let synTimer = 0;
window.addEventListener('resize', () => { clearTimeout(synTimer); synTimer = setTimeout(fitSyn, 150); });

async function main() {
  header('list'); footer();
  await dataReady();
  if (!id) { notFound(); return; }
  try { L = await fb.get('lists/' + id); } catch (e) { L = null; }
  if (!L) { await init().catch(() => {}); try { L = await fb.get('lists/' + id); } catch (e) { L = null; } }
  if (!L) { notFound(); return; }
  await init();
  render();
  const areas = {}; (L.items || []).forEach((k) => { const e = S.byKey[k]; if (e) { areas[e.area] = 1; } });
  Object.keys(areas).forEach((a) => { loadStats(a).catch(() => {}); });
  onChange(render);
  bind(document.body, {
    seen: (k) => setSeen(k, !S.seen[k]),
    syn: (k) => { openSyn = openSyn === k ? '' : k; render(); },
    like: (k) => toggleLike(S.byKey[k]),
    cmt: (k) => { openCmt = openCmt === k ? '' : k; render(); if (openCmt) { loadComments(k); } },
    delCmt: (arg) => { const p = arg.split('|'); deleteComment(S.byKey[p[0]], p[1]); },
    report: (cid) => openReport(cid),
    nick: () => openNick(),
    fav: async () => { const on = S.favs.indexOf(L.id) < 0; await toggleFav(L.id); L.favs = (L.favs || 0) + (on ? 1 : -1); },
    dup: async () => { const nid = await createList(L.name + '（複製）', L.items || []); if (nid) { try { localStorage.setItem('hl.active', nid); } catch (e) {} toast('已複製到「我做的清單」，可以自己改了'); } },
    copy: () => copyText(shareLink(L.id)),
    edit: () => { try { localStorage.setItem('hl.active', L.id); } catch (e) {} location.href = '/passport'; }
  });
}
document.addEventListener('submit', async (ev) => {
  const f = ev.target.closest && ev.target.closest('form[data-form="cmt"]'); if (!f) { return; }
  ev.preventDefault();
  const e = S.byKey[f.getAttribute('data-key')];
  const v = String(new FormData(f).get('t') || '').trim(); if (!v || !e) { return; }
  f.querySelector('input').value = ''; await addComment(e, v);
});
main();
