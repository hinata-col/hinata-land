// 清單分享頁
import { S, init, dataReady, onChange, header, footer, esc, $, bind, toast, titleOf, epLabel, setSeen, shareLink, copyText, toggleFav, createList } from './app.js';
import { fb } from './fb.js';

const id = new URLSearchParams(location.search).get('l') || '';
let L = null;
let openSyn = '';

function notFound() {
  document.title = '找不到這份清單 · 日向坂樂園';
  $('#lv').innerHTML = '<section class="wrap nf"><div class="big" aria-hidden="true">🎡</div><h1 class="hd ptitle" style="margin:0">找不到這份清單</h1>'
    + '<p class="plead" style="margin:0 auto">可能已經被主人刪掉了，也可能是連結沒有複製完整。</p>'
    + '<div class="pills" style="justify-content:center"><a class="btn pri" href="/gallery">看看大家的推薦清單</a><a class="btn" href="/">回樂園大門</a></div></section>';
}

function render() {
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
        + (e.syn ? '<div class="syn' + (openSyn === e.key ? ' open' : '') + '">' + esc(e.syn) + '</div><button type="button" class="lnk synt" data-act="syn" data-arg="' + e.key + '">' + (openSyn === e.key ? '收起簡介' : '看完整簡介') + '</button>' : '') + '</div>'
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
  onChange(render);
  bind(document.body, {
    seen: (k) => setSeen(k, !S.seen[k]),
    syn: (k) => { openSyn = openSyn === k ? '' : k; render(); },
    fav: async () => { const on = S.favs.indexOf(L.id) < 0; await toggleFav(L.id); L.favs = (L.favs || 0) + (on ? 1 : -1); },
    dup: async () => { const nid = await createList(L.name + '（複製）', L.items || []); if (nid) { try { localStorage.setItem('hl.active', nid); } catch (e) {} toast('已複製到「我做的清單」，可以自己改了'); } },
    copy: () => copyText(shareLink(L.id)),
    edit: () => { try { localStorage.setItem('hl.active', L.id); } catch (e) {} location.href = '/passport'; }
  });
}
main();
