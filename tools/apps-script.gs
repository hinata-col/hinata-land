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
const SETTINGS_TAB = '網站設定';        // A 欄設定項目、B 欄內容
const REPORTS_TAB = '檢舉';
const FRIENDS_TAB = '朋友名單';          // A 欄填朋友的 Gmail（第一列是標題）
const LINK_HEADER = '收看連結';          // 各分頁裡放影片連結的欄位標題
const FIREBASE_PROJECT = 'hinata-land';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('日向坂樂園')
    .addItem('更新網站資料', 'publishSite')
    .addItem('只重新部署網站', 'deployOnly')
    .addItem('只同步影片連結與朋友名單', 'syncPrivateMenu')
    .addSeparator()
    .addItem('改系列名稱（三個分頁一起改）', 'renameSeries')
    .addItem('讀取檢舉', 'loadReports')
    .addItem('處理檢舉（依「處理方式」欄執行）', 'handleReports')
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

// ── 影片連結與朋友名單（寫進 Firebase，網站只讓名單上的人讀）──
function fsValue_(v) {
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue_) } };
  if (v !== null && typeof v === 'object') { const f = {}; Object.keys(v).forEach(function (k) { f[k] = fsValue_(v[k]); }); return { mapValue: { fields: f } }; }
  return { stringValue: String(v) };
}
function fsWrite_(path, obj) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/databases/(default)/documents/' + path;
  const body = { fields: fsValue_(obj).mapValue.fields };
  const r = UrlFetchApp.fetch(url, {
    method: 'patch', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': FIREBASE_PROJECT }
  });
  if (r.getResponseCode() !== 200) throw new Error(path + '：' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
}
function syncPrivate_() {
  const ss = SpreadsheetApp.getActive();
  const links = { R: {}, H: {}, M: {} };
  let n = 0;
  Object.keys(TABS).forEach(function (a) {
    const sh = ss.getSheetByName(TABS[a]); if (!sh) return;
    const v = sh.getDataRange().getDisplayValues();
    const head = v[0].map(function (h) { return String(h).trim(); });
    const ci = head.indexOf('回'), cl = head.indexOf(LINK_HEADER);
    if (ci < 0 || cl < 0) return;
    for (let i = 1; i < v.length; i++) {
      const id = String(v[i][ci]).trim(), url = String(v[i][cl]).trim();
      if (/^\d+(\.\d+)?$/.test(id) && /^https:\/\//.test(url)) { links[a][a + id.replace('.', '_')] = url; n++; }
    }
  });
  let fr = ss.getSheetByName(FRIENDS_TAB);
  if (!fr) { fr = ss.insertSheet(FRIENDS_TAB); fr.getRange(1, 1, 1, 2).setValues([['Gmail', '備註']]); }
  const emails = fr.getRange(1, 1, Math.max(1, fr.getLastRow()), 1).getDisplayValues()
    .map(function (r) { return String(r[0]).trim().toLowerCase(); })
    .filter(function (e) { return /^[^@\s]+@[^@\s]+$/.test(e); });
  const me = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (me && emails.indexOf(me) < 0) emails.push(me);
  fsWrite_('vault/links', links);
  fsWrite_('admin/acl', { emails: emails });
  return '影片連結 ' + n + ' 筆，白名單 ' + emails.length + ' 人（含你自己）';
}
function syncPrivateMenu() {
  const ui = SpreadsheetApp.getUi();
  try { ui.alert('已同步：' + syncPrivate_()); }
  catch (e) { ui.alert('同步失敗：' + e.message); }
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
      const row = [id, clean(v[i][col('播出日')]), jp, zh, tags];
      const syn = col('中文簡介') >= 0 ? clean(v[i][col('中文簡介')]) : '';
      if (syn) row.push(syn); // 有中文簡介才放第 6 欄
      rows.push(row);
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
  const settings = {};
  const sst = ss.getSheetByName(SETTINGS_TAB);
  if (sst && sst.getLastRow() > 1) {
    sst.getRange(2, 1, sst.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) {
      const k = String(r[0]).trim(); if (k) settings[k] = String(r[1]).trim();
    });
  }
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  return { data: { updated: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"), series: series, areas: areas, settings: settings }, warn: warn };
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
    try { const o = JSON.parse(old); o.updated = d.updated; if (JSON.stringify(o) === json) { let priv = ''; try { priv = '\n影片連結：' + syncPrivate_(); } catch (e2) { priv = '\n影片連結同步失敗：' + e2.message; } ui.alert('集數資料跟 GitHub 上的一樣，不用更新。' + priv); return; } } catch (e) {}
  } else if (g.getResponseCode() !== 404) {
    ui.alert('連不上 GitHub（' + g.getResponseCode() + '）。金鑰可能過期或權限不足，請重新設定。\n\n' + g.getContentText().slice(0, 300)); return;
  }
  const body = { message: '更新集數資料（' + summary + '）', content: Utilities.base64Encode(Utilities.newBlob(json, 'application/json').getBytes()), branch: BRANCH };
  if (sha) body.sha = sha;
  const p = UrlFetchApp.fetch(api, { method: 'put', headers: headers, contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
  if (p.getResponseCode() === 200 || p.getResponseCode() === 201) {
    let priv = '';
    try { priv = '\n影片連結：' + syncPrivate_(); } catch (e) { priv = '\n影片連結同步失敗：' + e.message; }
    ui.alert('已送出！' + triggerDeploy_() + '\n大約 1 分鐘後網站就會更新。\n\n' + summary + priv);
  } else {
    ui.alert('更新失敗（' + p.getResponseCode() + '）：\n' + p.getContentText().slice(0, 400));
  }
}


// ── 改系列名稱：系列清單和三個分頁的系列欄一起改；新名稱留空就是刪掉這個系列 ──
function renameSeries() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('改系列名稱', '舊的系列名稱（要一字不差）', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const oldName = a.getResponseText().trim(); if (!oldName) return;
  const b = ui.prompt('改系列名稱', '新的系列名稱\n（留空＝把「' + oldName + '」從所有集數和系列清單刪掉）', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const newName = b.getResponseText().trim();
  const n = renameInTabs_(oldName, newName);
  const st = SpreadsheetApp.getActive().getSheetByName(SERIES_TAB);
  if (st && st.getLastRow() > 1) {
    const v = st.getRange(2, 1, st.getLastRow() - 1, 1).getValues();
    let found = -1; v.forEach(function (r, i) { if (String(r[0]).trim() === oldName) found = i; });
    if (found >= 0) {
      if (newName) { st.getRange(found + 2, 1).setValue(newName); } else { st.deleteRow(found + 2); }
    } else if (newName) { st.appendRow([newName]); }
  }
  ui.alert('完成：改了 ' + n + ' 集。\n記得按「更新網站資料」讓網站也換掉。');
}

// 把三個分頁「系列」欄裡的 oldName 換成 newName（newName 空白＝拿掉），回傳改了幾集
function renameInTabs_(oldName, newName) {
  const ss = SpreadsheetApp.getActive();
  let n = 0;
  Object.keys(TABS).forEach(function (k) {
    const sh = ss.getSheetByName(TABS[k]); if (!sh || sh.getLastRow() < 2) return;
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
    const c = head.indexOf('系列'); if (c < 0) return;
    const rg = sh.getRange(2, c + 1, sh.getLastRow() - 1, 1);
    const v = rg.getValues();
    let changed = false;
    v.forEach(function (row) {
      const tags = String(row[0]).split(/\s*[,、，]\s*/).filter(String);
      const i = tags.indexOf(oldName);
      if (i < 0) return;
      if (newName) { tags[i] = newName; } else { tags.splice(i, 1); }
      const out = []; tags.forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); });
      row[0] = out.join(', '); n++; changed = true;
    });
    if (changed) rg.setValues(v);
  });
  return n;
}

// 在「系列清單」直接改名時，自動同步到三個分頁
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet();
    if (sh.getName() !== SERIES_TAB || e.range.getColumn() !== 1 || e.range.getRow() < 2) return;
    if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
    const oldName = String(e.oldValue == null ? '' : e.oldValue).trim();
    const newName = String(e.value == null ? '' : e.value).trim();
    if (!oldName || oldName === newName) return;
    const ss = SpreadsheetApp.getActive();
    if (!newName) {
      ss.toast('「' + oldName + '」已從系列清單拿掉，但集數上的這個系列還在。要一起拿掉請用選單「改系列名稱」，新名稱留空。', '日向坂樂園', 10);
      return;
    }
    const n = renameInTabs_(oldName, newName);
    ss.toast('已把 ' + n + ' 集的「' + oldName + '」改成「' + newName + '」。記得按「更新網站資料」。', '日向坂樂園', 8);
  } catch (err) { /* 自動同步失敗時不影響編輯 */ }
}

// ── 檢舉 ──
function fsUrl_(path) { return 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/databases/(default)/documents' + (path ? '/' + path : ''); }
function fsReq_(method, url, body) {
  const opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': FIREBASE_PROJECT } };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  const r = UrlFetchApp.fetch(url, opt);
  if (r.getResponseCode() === 404) return null;
  if (r.getResponseCode() >= 300) throw new Error(r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
  const t = r.getContentText(); return t ? JSON.parse(t) : {};
}
const fsStr_ = function (f, k) { return f && f[k] ? (f[k].stringValue || f[k].timestampValue || '') : ''; };

function loadReports() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActive();
  let docs = [];
  try {
    let token = '';
    do {
      const res = fsReq_('get', fsUrl_('reports') + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
      docs = docs.concat((res && res.documents) || []); token = res && res.nextPageToken;
    } while (token);
  } catch (e) { ui.alert('讀取失敗：' + e.message); return; }
  let sh = ss.getSheetByName(REPORTS_TAB);
  if (!sh) sh = ss.insertSheet(REPORTS_TAB);
  sh.clear(); sh.getRange('A:Z').clearDataValidations();
  const head = ['檢舉時間', '原因', '補充說明', '被檢舉的留言', '留言暱稱', '集數', '處理方式', '留言ID', '檢舉ID'];
  const rows = docs.map(function (d) {
    const f = d.fields || {}; const cid = fsStr_(f, 'cid');
    const c = cid ? fsReq_('get', fsUrl_('comments/' + cid)) : null; const cf = c ? c.fields : null;
    return [fsStr_(f, 'at').replace('T', ' ').slice(0, 16), fsStr_(f, 'why'), fsStr_(f, 'more'),
      cf ? fsStr_(cf, 'text') : '（留言已經不在了）', cf ? fsStr_(cf, 'nick') : '', cf ? fsStr_(cf, 'ep') : '', '', cid, d.name.split('/').pop()];
  });
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, head.length).setValues(rows);
    sh.getRange(2, 7, rows.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['刪除留言', '留言沒問題'], true).build());
  }
  sh.setFrozenRows(1); sh.activate();
  ui.alert(rows.length ? '共 ' + rows.length + ' 筆檢舉。\n在「處理方式」欄選「刪除留言」或「留言沒問題」，再按「處理檢舉」。' : '目前沒有檢舉。');
}

function handleReports() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActive().getSheetByName(REPORTS_TAB);
  if (!sh || sh.getLastRow() < 2) { ui.alert('沒有檢舉要處理，先按「讀取檢舉」。'); return; }
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getDisplayValues();
  let del = 0, keep = 0; const done = [];
  try {
    v.forEach(function (r, i) {
      const act = r[6], ep = r[5], cid = r[7], rid = r[8];
      if (act !== '刪除留言' && act !== '留言沒問題') return;
      if (act === '刪除留言' && cid) {
        const c = fsReq_('get', fsUrl_('comments/' + cid));
        if (c) {
          fsReq_('delete', fsUrl_('comments/' + cid));
          if (/^[RHM]/.test(ep)) {
            const dbPath = 'projects/' + FIREBASE_PROJECT + '/databases/(default)/documents';
            fsReq_('post', 'https://firestore.googleapis.com/v1/' + dbPath + ':commit', { writes: [{ transform: { document: dbPath + '/stats/' + ep.charAt(0), fieldTransforms: [{ fieldPath: 'cmts.' + ep, increment: { integerValue: '-1' } }] } }] });
          }
        }
        del++;
      } else { keep++; }
      if (rid) fsReq_('delete', fsUrl_('reports/' + rid));
      done.push(i + 2);
    });
  } catch (e) { ui.alert('處理到一半失敗：' + e.message); }
  done.reverse().forEach(function (row) { sh.deleteRow(row); });
  ui.alert('完成：刪除 ' + del + ' 則留言，保留 ' + keep + ' 則。');
}
