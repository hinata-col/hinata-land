/**
 * 日向坂樂園：試算表一鍵更新網站
 * 試算表上方選單「日向坂樂園 → 更新網站資料」，會把三個分頁整理成 data/episodes.json 推到 GitHub，
 * Cloudflare 收到更新後約 1 分鐘重新部署完成。
 *
 * 只會匯出：回、播出日、日文標題、中文標題、系列（備註、來源等欄位不會上網站）
 * 欄位是用「第一列的標題文字」找的，欄位順序調換沒關係，但標題文字不要改。
 */

const REPO = 'hinata-col/hinata-land';
const BRANCH = 'main';
const FILE_PATH = 'data/episodes.json';
const TABS = { R: 'ひらがな推し', H: '日向坂で会いましょう', M: 'まだひな' };
const SERIES_TAB = '系列清單';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('日向坂樂園')
    .addItem('更新網站資料', 'publishSite')
    .addItem('只重新部署網站', 'deployOnly')
    .addSeparator()
    .addItem('設定 GitHub 金鑰', 'setToken')
    .addItem('設定 Cloudflare 部署連結', 'setHook')
    .addToUi();
}

function setToken() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('設定 GitHub 金鑰', '貼上 GitHub 的 Fine-grained token（只有你看得到，存在這份試算表的指令碼設定裡）', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const t = r.getResponseText().trim();
  if (!t) return;
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', t);
  ui.alert('已儲存。之後按「更新網站資料」就會用這組金鑰。');
}

function setHook() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('設定 Cloudflare 部署連結', '貼上 Cloudflare Pages「Deploy Hooks」產生的網址（https://api.cloudflare.com/...）', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const t = r.getResponseText().trim();
  if (!/^https:\/\/api\.cloudflare\.com\//.test(t)) { ui.alert('這看起來不是 Cloudflare 的部署連結，請再確認一次。'); return; }
  PropertiesService.getScriptProperties().setProperty('DEPLOY_HOOK', t);
  ui.alert('已儲存。之後更新網站資料時，會自動叫 Cloudflare 部署最新版。');
}

function triggerDeploy_() {
  const hook = PropertiesService.getScriptProperties().getProperty('DEPLOY_HOOK');
  if (!hook) return '（還沒設定部署連結，網站可能不會自動更新）';
  const r = UrlFetchApp.fetch(hook, { method: 'post', muteHttpExceptions: true });
  return r.getResponseCode() === 200 ? '已通知 Cloudflare 部署。' : '通知 Cloudflare 失敗（' + r.getResponseCode() + '）';
}

function deployOnly() {
  SpreadsheetApp.getUi().alert(triggerDeploy_() + '\n大約 1 分鐘後網站就會是 GitHub 上的最新版。');
}

function buildData_() {
  const ss = SpreadsheetApp.getActive();
  const warn = [];
  const areas = {};
  Object.keys(TABS).forEach(function (a) {
    const sh = ss.getSheetByName(TABS[a]);
    if (!sh) { warn.push('找不到分頁「' + TABS[a] + '」'); areas[a] = []; return; }
    const v = sh.getDataRange().getDisplayValues();
    const head = v[0].map(function (h) { return String(h).trim(); });
    const col = function (name) { return head.indexOf(name); };
    const need = ['回', '播出日', '日文標題', '中文標題', '系列'];
    const miss = need.filter(function (n) { return col(n) < 0; });
    if (miss.length) { warn.push(TABS[a] + '：找不到欄位「' + miss.join('、') + '」'); areas[a] = []; return; }
    const rows = [];
    const seen = {};
    for (let i = 1; i < v.length; i++) {
      const id = String(v[i][col('回')]).trim();
      if (!/^\d+(\.\d+)?$/.test(id)) continue; // 不是數字的列（空白、說明、待歸位）跳過
      if (seen[id]) { warn.push(TABS[a] + '：第 ' + id + ' 回重複出現，只用第一筆'); continue; }
      seen[id] = 1;
      const clean = function (s) { return String(s).trim(); };
      let jp = clean(v[i][col('日文標題')]);
      if (/^（?標題未查到）?$|^待補$/.test(jp)) jp = '';
      const zh = clean(v[i][col('中文標題')]);
      const tags = clean(v[i][col('系列')]).split(/\s*[,、，]\s*/).filter(String).join(',');
      rows.push([id, clean(v[i][col('播出日')]), jp, zh, tags]);
    }
    rows.sort(function (x, y) { return parseFloat(x[0]) - parseFloat(y[0]); });
    areas[a] = rows;
  });
  let series = [];
  const st = ss.getSheetByName(SERIES_TAB);
  if (st) {
    series = st.getRange(2, 1, Math.max(1, st.getLastRow() - 1), 1).getDisplayValues()
      .map(function (r) { return String(r[0]).trim(); }).filter(String);
  } else { warn.push('找不到分頁「' + SERIES_TAB + '」'); }
  // 系列欄出現、但清單裡沒有的名字也一起收進來（排在最後）
  Object.keys(areas).forEach(function (a) {
    areas[a].forEach(function (r) { r[4].split(',').filter(String).forEach(function (t) { if (series.indexOf(t) < 0) { series.push(t); warn.push('系列「' + t + '」不在「' + SERIES_TAB + '」裡，先排在最後'); } }); });
  });
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  return { data: { updated: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"), series: series, areas: areas }, warn: warn };
}

function publishSite() {
  const ui = SpreadsheetApp.getUi();
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) { ui.alert('還沒設定 GitHub 金鑰，請先按「日向坂樂園 → 設定 GitHub 金鑰」。'); return; }
  const built = buildData_();
  const d = built.data;
  const summary = '平假名推 ' + d.areas.R.length + ' 集、日會 ' + d.areas.H.length + ' 集、まだひな ' + d.areas.M.length + ' 回、系列 ' + d.series.length + ' 個';
  const warnTxt = built.warn.length ? '\n\n注意：\n・' + built.warn.slice(0, 15).join('\n・') : '';
  if (ui.alert('要更新網站嗎？', summary + warnTxt, ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;

  const json = JSON.stringify(d);
  const api = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE_PATH;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  let sha = null;
  const g = UrlFetchApp.fetch(api + '?ref=' + BRANCH, { headers: headers, muteHttpExceptions: true });
  if (g.getResponseCode() === 200) {
    const cur = JSON.parse(g.getContentText());
    sha = cur.sha;
    const old = cur.content ? Utilities.newBlob(Utilities.base64Decode(cur.content.replace(/\n/g, ''))).getDataAsString('UTF-8') : '';
    try { const o = JSON.parse(old); o.updated = d.updated; if (JSON.stringify(o) === json) { ui.alert('資料跟 GitHub 上的一樣，不用更新。\n' + triggerDeploy_()); return; } } catch (e) {}
  } else if (g.getResponseCode() !== 404) {
    ui.alert('連不上 GitHub（' + g.getResponseCode() + '）。金鑰可能過期或權限不足，請重新設定。\n\n' + g.getContentText().slice(0, 300)); return;
  }
  const body = { message: '更新集數資料（' + summary + '）', content: Utilities.base64Encode(Utilities.newBlob(json, 'application/json').getBytes()), branch: BRANCH };
  if (sha) body.sha = sha;
  const p = UrlFetchApp.fetch(api, { method: 'put', headers: headers, contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
  if (p.getResponseCode() === 200 || p.getResponseCode() === 201) {
    ui.alert('已送出！' + triggerDeploy_() + '\n大約 1 分鐘後網站就會更新。\n\n' + summary);
  } else {
    ui.alert('更新失敗（' + p.getResponseCode() + '）：\n' + p.getContentText().slice(0, 400));
  }
}
