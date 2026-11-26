// 遊客推薦
import { S, LTAGS, PAL, init, dataReady, onChange, header, footer, esc, $, bind, titleOf, epLabel, shareLink, copyText, toggleFav, tsOf } from './app.js';
import { fb } from './fb.js';

let pool = [];
const G = { q: '', tag: '', sort: '最多人收藏', shown: 9, pick: '' };
const tagStyle = (t) => 'background:' + PAL[LTAGS.indexOf(t) % PAL.length];
const favN = (l) => Math.max(0, l.favs || 0);

function card(l) {
  const mine = l.owner === S.uid;
  const fav = S.favs.indexOf(l.id) >= 0;
  const items = l.items || [];
  const prev = items.slice(0, 3).map((k) => S.byKey[k]).filter(Boolean);
  return '<div class="card gcard" style="background:' + (mine ? '#FFF1C2' : '#FFFFFF') + '">'
    + (mine ? '<span class="gbadge">你的清單</span>' : '')
    + '<h3 class="hd">' + esc(l.name) + '</h3><div style="font-size:13px;font-weight:700">' + esc(l.nick || '') + '　·　' + items.length + ' 集　·　★ ' + favN(l) + ' 人收藏</div>'
    + '<div class="gchips">' + (l.tags || []).map((t) => '<button type="button" class="chip gchip" style="' + tagStyle(t) + '" data-act="tag" data-arg="' + esc(t) + '">#' + esc(t) + '</button>').join('') + '</div>'
    + '<div class="gprev">' + prev.map((e) => '<div><b class="hd">' + esc(epLabel(e)) + '</b>' + esc(titleOf(e)) + '</div>').join('')
    + (items.length > 3 ? '<div class="note">還有 ' + (items.length - 3) + ' 集…</div>' : '') + '</div>'
    + '<div class="gacts"><a class="btn pri" href="/list?l=' + esc(l.id) + '">看這份清單</a>'
    + (mine ? '' : '<button type="button" class="btn" data-act="fav" data-arg="' + esc(l.id) + '" aria-pressed="' + fav + '">' + (fav ? '★ 已收藏' : '☆ 收藏') + '</button>')
    + '<button type="button" class="btn" data-act="copy" data-arg="' + esc(l.id) + '">複製連結</button></div></div>';
}

function render() {
  $('#gtags').innerHTML = '<button type="button" class="btn tpb" data-act="tag" data-arg="" aria-pressed="' + !G.tag + '">全部</button>'
    + LTAGS.map((t) => '<button type="button" class="btn tpb" data-act="tag" data-arg="' + t + '" aria-pressed="' + (G.tag === t) + '">#' + t + '</button>').join('');
  const q = G.q.trim().toLowerCase();
  let gl = pool.filter((l) => (!G.tag || (l.tags || []).indexOf(G.tag) >= 0) && (!q || (l.name + (l.nick || '') + (l.tags || []).join('')).toLowerCase().indexOf(q) >= 0));
  gl = gl.sort((x, y) => G.sort === '最新' ? tsOf(y.upd) - tsOf(x.upd) : (favN(y) - favN(x)) || (tsOf(y.upd) - tsOf(x.upd)));
  $('#gcount').textContent = pool.length ? (G.tag || q ? '找到 ' + gl.length + ' 份清單' : '共 ' + pool.length + ' 份清單') : '';
  $('#gg').innerHTML = gl.slice(0, G.shown).map(card).join('');
  $('#gempty').style.display = gl.length ? 'none' : '';
  $('#gempty').textContent = pool.length ? '找不到符合的清單，換個關鍵字或標籤試試看。' : '還沒有人公開清單。到「我的護照」做一份設成公開，你就是第一個！';
  $('#gmore').style.display = gl.length > G.shown ? '' : 'none';
  const p = pool.filter((l) => l.id === G.pick)[0];
  $('#gpick').innerHTML = p ? '<div class="gpickbox"><div class="gpickhead"><span class="hd">🎲 不知道看什麼？就這份吧！</span><button type="button" class="lnk" data-act="closePick">關閉</button></div>' + card(p) + '</div>' : '';
  $('#groll').textContent = p ? '🎲 換一份' : '🎲 隨機推薦一份';
  $('#groll').style.display = pool.length ? '' : 'none';
}

async function main() {
  header('gallery'); footer();
  await dataReady();
  $('#gcount').textContent = '讀取中…';
  await init();
  try {
    pool = (await fb.where('lists', 'isPublic', true)).filter((l) => (l.items || []).length > 0);
  } catch (e) { console.error(e); $('#gcount').textContent = '讀取失敗，請重新整理'; return; }
  render();
  onChange(render);
  bind(document.body, {
    tag: (t) => { G.tag = G.tag === t ? '' : t; G.shown = 9; render(); },
    fav: async (id) => { const on = S.favs.indexOf(id) < 0; const l = pool.filter((x) => x.id === id)[0]; await toggleFav(id); if (l) { l.favs = favN(l) + (on ? 1 : -1); } render(); },
    copy: (id) => copyText(shareLink(id)),
    more: () => { G.shown += 9; render(); },
    roll: () => { if (!pool.length) { return; } let k = Math.floor(Math.random() * pool.length); if (pool.length > 1 && pool[k].id === G.pick) { k = (k + 1) % pool.length; } G.pick = pool[k].id; render(); $('#gpick').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    closePick: () => { G.pick = ''; render(); }
  });
  $('#gq').addEventListener('input', (ev) => { G.q = ev.target.value; G.shown = 9; render(); });
  $('#gsort').addEventListener('change', (ev) => { G.sort = ev.target.value; render(); });
}
main();
