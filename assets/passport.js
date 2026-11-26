// 我的護照
import {
  S, AREAS, OPEN, LTAGS, init, dataReady, onChange, header, footer, esc, $, bind, toast, titleOf, epLabel, seenIn,
  createList, patchList, toggleInList, deleteList, listById, shareLink, copyText, toggleFav,
  openLogin, openNick, openConfirmDelete, logout
} from './app.js';
import { fb } from './fb.js';

let active = '';
try { active = localStorage.getItem('hl.active') || ''; } catch (e) {}
let shownActive = null;
let dragId = '';
let favCache = {};

const setActive = (id) => { active = id; try { localStorage.setItem('hl.active', id); } catch (e) {} };
const cur = () => listById(active) || S.lists[0] || null;

function renderSeen() {
  $('#seenall').innerHTML = '<h2 class="hd">看過紀錄</h2>' + OPEN.map((a) => {
    const A = AREAS[a]; const n = seenIn(a); const t = S.eps[a].length;
    return '<a class="sarow" href="' + A.page + '#all"><span class="sadot" style="background:' + A.color + '"></span><span class="saname">' + esc(A.name) + '</span><span class="satext">' + n + ' / ' + t + (a === 'M' ? ' 回' : ' 集') + '</span>'
      + '<span class="bar"><span style="display:block;height:100%;background:#7ED9A6;width:' + Math.max(2, Math.round(n / Math.max(1, t) * 100)) + '%"></span></span><span class="sago">繼續看 →</span></a>';
  }).join('');
}

function renderTabs() {
  const l = cur();
  $('#tabs').innerHTML = S.lists.map((x) => '<button type="button" class="btn" data-act="pick" data-arg="' + x.id + '" aria-pressed="' + (l && l.id === x.id) + '">' + esc(x.name) + ' · ' + x.items.length + ' 集' + (x.isPublic ? ' · 公開' : '') + '</button>').join('')
    + '<button type="button" class="btn ghost" data-act="newList">＋ 新增清單</button>';
}

function itemsHtml(l) {
  if (!l.items.length) { return '<div style="font-size:14px">這份清單還沒有集數。去園區逛逛，看到喜歡的按「☆ 收藏」就會放進來。</div>'; }
  return l.items.map((k, i) => {
    const e = S.byKey[k];
    const label = e ? epLabel(e) : k; const title = e ? titleOf(e) : '（這集已不在資料裡）';
    return '<div class="item' + (dragId === k ? ' dragging' : '') + '" data-idx="' + i + '"><button type="button" class="grip" data-grip="' + esc(k) + '" aria-label="拖曳排序：' + esc(label) + '，目前第 ' + (i + 1) + ' 個，也可以按上下鍵移動">⋮⋮</button>'
      + '<span><span class="iep hd">' + esc(label) + '</span>　' + esc(title) + '</span><div class="ibtns"><button type="button" class="ib" data-act="rm" data-arg="' + esc(k) + '" aria-label="從清單移除">✕</button></div></div>';
  }).join('');
}

function renderEditor() {
  const l = cur();
  const ed = $('#editor');
  const who = '<div class="ed-top"><span>' + (S.isAnon ? '還沒登入，資料只存在這台裝置的瀏覽器' : '已用 Google 登入，換裝置也看得到') + '</span><button type="button" class="btn" data-act="' + (S.isAnon ? 'login' : 'logout') + '">' + (S.isAnon ? '用 Google 登入' : '登出') + '</button></div>'
    + '<div class="ed-top"><span>暱稱：<b>' + esc(S.nick) + '</b></span><button type="button" class="lnk" data-act="nick">改暱稱</button></div>';
  if (!l) {
    ed.innerHTML = who + '<div style="font-size:14px;line-height:1.7">還沒有清單。按上面的「＋ 新增清單」開一份，或是在園區地圖按「☆ 收藏」時直接新增。</div>';
    shownActive = null; return;
  }
  if (shownActive !== l.id || !$('#edName')) {
    shownActive = l.id;
    ed.innerHTML = '<div id="edWho"></div>'
      + '<label class="field">清單名稱<input id="edName" type="text" maxlength="30"></label>'
      + '<div id="edVis"></div><div id="edHead"></div>'
      + '<div style="font-size:12px;color:#44507F;margin-top:-8px">按住左邊的 ⋮⋮ 上下拖曳可以調整順序，朋友打開連結看到的也是這個順序。</div>'
      + '<div class="items" id="edItems"></div><div id="edShare"></div>';
    $('#edName').value = l.name;
  }
  $('#edWho').innerHTML = who;
  $('#edVis').innerHTML = '<div class="pills"><button type="button" class="btn" data-act="pub" aria-pressed="' + !!l.isPublic + '">公開在遊客推薦</button><button type="button" class="btn" data-act="priv" aria-pressed="' + !l.isPublic + '">不公開，拿到連結才看得到</button></div>'
    + '<div class="tagpick"><span class="tplabel">標籤<small>最多 3 個，別人在遊客推薦比較好找到</small></span><div class="pills">'
    + LTAGS.map((t) => '<button type="button" class="btn tpb" data-act="tag" data-arg="' + t + '" aria-pressed="' + ((l.tags || []).indexOf(t) >= 0) + '">#' + t + '</button>').join('') + '</div></div>';
  $('#edHead').innerHTML = '<div class="ed-top"><span style="font-size:14px;font-weight:900">清單內容（' + l.items.length + ' 集）</span><button type="button" class="btn" data-act="sortEp">依集數排序</button></div>';
  $('#edItems').innerHTML = itemsHtml(l);
  const firstArea = (l.items.map((k) => S.byKey[k]).filter(Boolean)[0] || { area: OPEN[0] }).area;
  $('#edShare').innerHTML = '<label class="share">分享連結<input type="text" value="' + esc(shareLink(l.id)) + '" readonly></label><div class="ed-acts">'
    + '<button type="button" class="btn pri" data-act="copy">複製連結</button><a class="btn" href="/list?l=' + l.id + '">看看朋友打開的樣子</a>'
    + (l.items.length ? '<a class="btn" href="' + AREAS[firstArea].page + '?list=' + l.id + '">在園區地圖只顯示這份清單</a>' : '')
    + '<button type="button" class="btn ghost" data-act="del">刪除這份清單</button></div>';
}

async function renderFavs() {
  const box = $('#favs');
  if (!S.favs.length) { box.innerHTML = '<p class="note">還沒有收藏別人的清單。到「遊客推薦」逛逛，看到喜歡的按「☆ 收藏」就會出現在這裡。</p>'; return; }
  const missing = S.favs.filter((id) => !(id in favCache));
  if (missing.length) {
    box.innerHTML = '<p class="note">讀取中…</p>';
    await Promise.all(missing.map(async (id) => { try { favCache[id] = await fb.get('lists/' + id); } catch (e) { favCache[id] = null; } }));
  }
  box.innerHTML = '<div class="favg">' + S.favs.map((id) => {
    const l = favCache[id];
    if (!l) { return '<div class="card favc"><div><h3 class="hd">這份清單已經被作者刪除</h3></div><div class="gacts"><button type="button" class="btn" data-act="unfav" data-arg="' + esc(id) + '">從收藏移除</button></div></div>'; }
    return '<div class="card favc"><div><h3 class="hd">' + esc(l.name) + '</h3><div class="note">' + esc(l.nick || '') + '　·　' + (l.items || []).length + ' 集</div></div>'
      + '<div class="gacts"><a class="btn pri" href="/list?l=' + esc(id) + '">看這份清單</a><button type="button" class="btn" data-act="unfav" data-arg="' + esc(id) + '">取消收藏</button></div></div>';
  }).join('') + '</div>';
}

function renderAll() { renderSeen(); renderTabs(); renderEditor(); renderFavs(); }

let nameTimer = null;
async function main() {
  header('passport'); footer();
  await dataReady();
  await init();
  if (!listById(active) && S.lists[0]) { setActive(S.lists[0].id); }
  renderAll();
  onChange(() => { if (!dragId) { renderSeen(); renderTabs(); renderEditor(); } });

  const root = $('#pp');
  bind(root, {
    pick: (id) => { setActive(id); renderTabs(); renderEditor(); },
    newList: async () => { const id = await createList('新清單 ' + (S.lists.length + 1), []); if (id) { setActive(id); renderTabs(); renderEditor(); $('#edName').focus(); $('#edName').select(); } },
    login: () => openLogin(),
    logout: () => logout(),
    nick: () => openNick(),
    pub: () => patchList(cur().id, { isPublic: true }),
    priv: () => patchList(cur().id, { isPublic: false }),
    tag: (t) => {
      const l = cur(); const tags = l.tags || [];
      if (tags.indexOf(t) >= 0) { patchList(l.id, { tags: tags.filter((x) => x !== t) }); }
      else if (tags.length >= 3) { toast('最多選 3 個標籤'); }
      else { patchList(l.id, { tags: tags.concat([t]) }); }
    },
    sortEp: () => {
      const l = cur(); const order = ['R', 'H', 'M'];
      const items = l.items.slice().sort((x, y) => { const a = S.byKey[x], b = S.byKey[y]; if (!a || !b) { return 0; } return (order.indexOf(a.area) - order.indexOf(b.area)) || (a.n - b.n); });
      patchList(l.id, { items: items });
    },
    rm: (k) => toggleInList(cur().id, k),
    copy: () => copyText(shareLink(cur().id)),
    del: () => { const l = cur(); openConfirmDelete(l.name, async () => { await deleteList(l.id); setActive(S.lists[0] ? S.lists[0].id : ''); renderAll(); toast('清單已刪除'); }); },
    unfav: async (id) => { await toggleFav(id); delete favCache[id]; renderFavs(); }
  });
  root.addEventListener('input', (ev) => {
    if (ev.target.id !== 'edName') { return; }
    const l = cur(); const v = ev.target.value;
    l.name = v; renderTabs();
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => patchList(l.id, { name: v.trim() || '未命名清單' }), 600);
  });

  // 拖曳排序
  let dragItems = null;
  root.addEventListener('pointerdown', (ev) => {
    const g = ev.target.closest('[data-grip]'); if (!g) { return; }
    ev.preventDefault(); dragId = g.getAttribute('data-grip'); dragItems = cur().items.slice();
    try { g.setPointerCapture(ev.pointerId); } catch (e) {}
    $('#edItems').innerHTML = itemsHtml(Object.assign({}, cur(), { items: dragItems }));
  });
  root.addEventListener('pointermove', (ev) => {
    if (!dragId) { return; }
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const box = el && el.closest ? el.closest('#edItems [data-idx]') : null; if (!box) { return; }
    const to = Number(box.getAttribute('data-idx')); const from = dragItems.indexOf(dragId);
    if (to === from) { return; }
    dragItems.splice(from, 1); dragItems.splice(to, 0, dragId);
    $('#edItems').innerHTML = itemsHtml(Object.assign({}, cur(), { items: dragItems }));
  });
  const end = () => { if (!dragId) { return; } const items = dragItems; dragId = ''; dragItems = null; patchList(cur().id, { items: items }); };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('keydown', (ev) => {
    const g = ev.target.closest('[data-grip]'); if (!g || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) { return; }
    ev.preventDefault();
    const k = g.getAttribute('data-grip'); const items = cur().items.slice(); const i = items.indexOf(k);
    const to = Math.max(0, Math.min(items.length - 1, i + (ev.key === 'ArrowUp' ? -1 : 1)));
    if (to === i) { return; }
    items.splice(i, 1); items.splice(to, 0, k);
    patchList(cur().id, { items: items }).then(() => { const ng = document.querySelector('[data-grip="' + k + '"]'); if (ng) { ng.focus(); } });
    setTimeout(() => { const ng = document.querySelector('[data-grip="' + k + '"]'); if (ng) { ng.focus(); } }, 0);
  });
}
main();
