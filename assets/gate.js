// 樂園大門
import { S, AREAS, OPEN, init, dataReady, onChange, header, footer, esc, $, seenIn } from './app.js';

function render() {
  const g = $('#gate');
  g.className = 'gate' + (OPEN.length === 1 ? ' one' : OPEN.length === 2 ? ' two' : '');
  g.innerHTML = OPEN.map((a) => {
    const A = AREAS[a]; const eps = S.eps[a];
    const total = eps.length; const seen = S.ready ? seenIn(a) : 0;
    const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
    const maxN = eps.reduce((m, e) => (e.n % 1 === 0 && e.n > m && (!e.date || e.date <= today) ? e.n : m), 0);
    const unit = a === 'M' ? ' 回' : ' 集';
    return '<a class="tk" href="' + A.page + '"><div class="ticket">'
      + '<div class="tmain"><span class="tno hd" style="background:' + A.ink + '">入園券 ' + A.no + '</span><img src="' + A.logo + '" alt="' + esc(A.jp) + ' 節目 LOGO"></div>'
      + '<div class="tstub" style="background:' + A.color + '"><div class="nm hd">' + esc(A.jp) + '</div><div class="zh">' + esc(A.name) + '</div>'
      + '<div class="mt">' + A.years + ' · ' + maxN + unit + '</div><div class="mt ds" style="font-weight:500">' + esc(A.desc) + '</div>'
      + '<div class="pr"><span>我看過 ' + seen + ' / ' + total + '</span><div class="bar"><div style="height:100%;background:#1F2A5A;width:' + Math.max(2, Math.round(seen / Math.max(1, total) * 100)) + '%"></div></div></div>'
      + '<span class="go">剪票入園 →</span></div></div></a>';
  }).join('');
}
header('gate'); footer(true);
dataReady().then(render);
init().then(() => { render(); onChange(render); });
