# 產生各頁 HTML（只需在改版時執行一次；網站本身不需要這個檔）
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HEAD = '''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:type" content="website">
<link rel="icon" href="/assets/favicon.ico" sizes="any">
<link rel="icon" href="/assets/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;500&family=Zen+Maru+Gothic:wght@500;700;900&family=Huninn&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">%(extra_css)s
</head>
<body%(body_attr)s>
<div class="page">
<div id="hdr"></div>
'''
TAIL = '''<footer id="ftr"></footer>
</div>
<script type="module" src="/assets/%(js)s"></script>
</body>
</html>
'''
DESC = '日向坂46 冠番組的看點導覽：查集數、找系列企劃、記下自己看到哪裡，和其他おひさま分享推薦清單。'


def page(fn, title, body, js, extra_css='', body_attr=''):
    html = HEAD % {'title': title, 'desc': DESC, 'extra_css': extra_css, 'body_attr': body_attr} + body + TAIL % {'js': js}
    open(os.path.join(ROOT, fn), 'w', encoding='utf-8').write(html)


AREA_BODY = '''<section id="top" class="wrap hero"></section>

<section id="paths" class="wrap">
<div class="stitle hd" style="background:#D6382E;color:#FFFFFF">遊玩路線</div>
<div class="pg">
<a class="card path" href="#must" style="background:#FFB3AB"><span class="tag hd">快速通關券</span><h3 class="hd">我想先挑一集來看</h3><p>從大家按讚最多的集數挑一集。每集約 30 分鐘，有些企劃分上下兩集。</p><span class="go">去人氣設施 →</span></a>
<a class="card path" href="#series" style="background:#FFE08A"><span class="tag hd">主題園區巡禮</span><h3 class="hd">我想依系列挑</h3><p id="p2"></p><span class="go">去主題園區 →</span></a>
<a class="card path" href="#all" style="background:#A8EBE2"><span class="tag hd">完整暢遊券</span><h3 class="hd">我想從頭追</h3><p id="p3"></p><span class="go">打開園區地圖 →</span></a>
</div>
</section>

<section id="must" class="wrap">
<div class="stitle hd" style="background:#FFC83D">人氣設施</div>
<div class="mustg" id="mustg"></div>
</section>

<section id="series" class="wrap">
<div class="stitle hd" style="background:#0B7A70;color:#FFFFFF">主題園區</div>
<div class="sgrid" id="sgrid"></div>
<div id="smore" style="display:none;justify-content:center;margin-top:18px"></div>
</section>

<section id="all" class="wrap" style="padding-bottom:72px">
<div class="stitle hd" style="background:#5B3FD6;color:#FFFFFF">園區地圖</div>
<p class="lead" id="lead"></p>
<div class="card fpanel">
<label class="search">搜尋<input id="fSearch" type="search" placeholder="中文或日文標題、集數，例如：運動會、ダービー、47" aria-label="搜尋集數"></label>
<div class="fgrid">
<label class="sl" id="fRangeWrap">集數<select id="fRange"></select></label>
<label class="sl">類別<select id="fCat"></select></label>
<label class="sl">狀態<select id="fStatus"></select></label>
<div class="sl"><span id="fSortLab">排序</span><div class="sortc"><select id="fSort" aria-label="排序方式"></select><button type="button" class="btn" id="fDir" data-act="dir">▲</button></div></div>
</div>
<div class="frow"><button type="button" class="btn ghost" id="helpBtn" data-act="help" aria-expanded="false">怎麼用？</button><div class="prog" id="prog"></div></div>
<div class="help" id="help" style="display:none">
<div class="hbox" style="background:#EFFBF4"><b>☐ 看過</b>幫自己記進度，只有你看得到。</div>
<div class="hbox" style="background:#FFF1C2"><b>讚</b>覺得好看就按一下，讚最多的幾集會排進「人氣設施」。</div>
<div class="hbox" style="background:#FFE3EC"><b>收藏</b>把這集放進你的清單，同一集可以放進好幾份。</div>
<div class="hbox" style="background:#EAF6FF"><b>留言</b>分享你覺得好看的地方，也可以看看別人怎麼說。</div>
</div>
</div>
<div class="banner" id="banner" style="display:none"></div>
<p class="note" id="note" style="display:none"></p>
<div class="card rows" id="rows"></div>
<div class="empty" id="empty" style="display:none">找不到符合的集數，換個關鍵字或篩選條件試試看。</div>
<div class="more" id="more" style="display:none"></div>
</section>
<div class="stk" id="stk"></div>
'''
for fn, area, title in [('hira.html', 'R', '平假名推'), ('hinaai.html', 'H', '在日向坂相會'), ('madahina.html', 'M', '還沒結束！在日向坂相會')]:
    page(fn, title + ' · 日向坂樂園', AREA_BODY, 'area.js', body_attr=' data-area="%s"' % area)

GATE_BODY = '''<section id="top" class="wrap hero">
<div style="flex:1 1 480px;min-width:0">
<div><div class="marquee hd">日向坂冠番　歡樂導覽</div></div>
<div class="ttlw"><h1 class="hd ttl2">在日向坂相會！</h1><span class="stars" aria-hidden="true"><span class="s s1"></span><span class="s s2"></span><span class="s s3"></span></span></div>
<div class="watch">這裡是日向坂46 冠番組的<b>看點導覽</b>：查集數、找系列企劃、記下自己看到哪裡、和其他おひさま（日向坂粉絲）分享推薦清單。<b>本站未提供影片</b>，官方正版節目可至 <a href="https://lemino.docomo.ne.jp/ft/0000013" target="_blank" rel="noopener">Lemino</a> 付費收看，中字版問問おひさま，大家都很樂意幫你指路。</div>
</div>
</section>

<section id="areas" class="wrap" style="padding-top:8px">
<div class="stitle hd" style="background:#D6382E;color:#FFFFFF">選一張入園券</div>
<div class="gate" id="gate"></div>
<div id="more" class="subg">
<a class="card sub" href="/passport" style="background:#FFE08A"><div><h3 class="hd">我的護照</h3><p>記下看到哪一集、整理自己的推薦清單，再把連結傳給朋友。</p></div><span class="arr">打開 →</span></a>
<a class="card sub" href="/gallery" style="background:#FFB3AB"><div><h3 class="hd">遊客推薦</h3><p>其他粉絲公開分享的私房清單，點開就能照著看。</p></div><span class="arr">去逛逛 →</span></a>
</div>
</section>
'''
page('index.html', '日向坂樂園｜日向坂46 冠番組看點導覽', GATE_BODY, 'gate.js', extra_css='\n<link rel="stylesheet" href="/assets/gate.css">')

PASS_BODY = '''<section class="wrap ptop">
<h1 class="hd ptitle">我的護照</h1>
<p class="plead">看到哪一集、收藏了哪些清單，都記在這本護照裡。清單可以開好幾份，自己取名、排順序，要公開給大家看，或只傳給朋友都可以。</p>
</section>
<section class="wrap" style="padding-top:8px;padding-bottom:72px" id="pp">
<div class="card seenall" id="seenall"><h2 class="hd">看過紀錄</h2></div>
<h2 class="hd psec">我做的清單</h2>
<div class="tabs" role="group" aria-label="我的清單" id="tabs"></div>
<div class="pgrid">
<div class="card editor" id="editor"></div>
<div class="card info">
<h3 class="hd">公開還是不公開？</h3>
<p>設成公開，清單會出現在「遊客推薦」，大家都逛得到。不公開的話，只有拿到連結的人看得到。</p>
<h3 class="hd" style="margin-top:12px">一定要登入嗎？</h3>
<p>不用。沒登入時，資料存在這台裝置的瀏覽器裡，清掉瀏覽資料或換手機就會不見，不過已經傳出去的連結還是打得開。</p>
<p>用 Google 登入後，資料存在帳號裡，換裝置也看得到，之前存的紀錄會一起搬過去。</p>
<h3 class="hd" style="margin-top:12px">收藏清單和複製清單差在哪？</h3>
<p>收藏別人的清單，會一直看到作者的最新版本，但不能改。按「複製一份來改」則會變成你自己的清單，之後跟原版無關。</p>
</div>
</div>
<h2 class="hd psec" style="margin-top:32px">我收藏的清單</h2>
<div id="favs"></div>
<p class="note" style="margin-top:10px">收藏的清單會跟著原作者更新；想自己改的話，打開清單按「複製一份來改」。</p>
</section>
'''
page('passport.html', '我的護照 · 日向坂樂園', PASS_BODY, 'passport.js')

GAL_BODY = '''<section class="wrap ptop">
<h1 class="hd ptitle">大家的推薦清單</h1>
<p class="plead">其他おひさま公開分享的私房清單，點開就能照著看。</p>
</section>
<section class="wrap" style="padding-top:8px;padding-bottom:72px">
<div class="card gfilter">
<div class="gfrow">
<label class="search gsearch">搜尋<input id="gq" type="search" placeholder="清單名稱、暱稱或標籤，例如：新手、爆笑"></label>
<label class="sl gsort">排序<select id="gsort"><option>最多人收藏</option><option>最新</option></select></label>
<button type="button" class="btn pri groll" data-act="roll" id="groll">🎲 隨機推薦一份</button>
</div>
<div class="pills gtags" role="group" aria-label="依標籤篩選" id="gtags"></div>
</div>
<div id="gpick"></div>
<div class="gcount" id="gcount"></div>
<div class="gg" id="gg"></div>
<div class="empty" id="gempty" style="display:none">找不到符合的清單，換個關鍵字或標籤試試看。</div>
<div class="more" id="gmore" style="display:none"><button type="button" class="btn big" data-act="more">再顯示 9 份</button></div>
<p class="note" style="margin-top:18px">想把自己的清單也放上來？到「我的護照」把它設成公開，再挑幾個標籤就可以了。按「☆ 收藏」的清單，會出現在你的護照裡。</p>
</section>
'''
page('gallery.html', '遊客推薦 · 日向坂樂園', GAL_BODY, 'gallery.js')

LIST_BODY = '''<div id="lv"><section class="wrap ptop"><p class="plead">讀取中…</p></section></div>
<section class="wrap" style="padding-bottom:72px">
<div class="card about">
<h3 class="hd">這是什麼網站？</h3>
<p>日向坂樂園是日向坂46 冠番組的看點導覽：查集數、找系列企劃、記下自己看到哪裡，和其他おひさま（日向坂粉絲）分享推薦清單。<b>本站未提供影片</b>，官方正版節目可至 <a href="https://lemino.docomo.ne.jp/ft/0000013" target="_blank" rel="noopener">Lemino</a> 付費收看，中字版問問おひさま，大家都很樂意幫你指路。</p>
<div class="pills"><a class="btn pri" href="/">逛逛日向坂樂園</a><a class="btn" href="/passport">做一份自己的清單</a></div>
</div>
</section>
'''
page('list.html', '推薦清單 · 日向坂樂園', LIST_BODY, 'list.js')

NF_BODY = '''<section class="wrap nf">
<div class="big" aria-hidden="true">🎡</div>
<h1 class="hd ptitle" style="margin:0">這一頁不存在</h1>
<p class="plead" style="margin:0 auto">可能是網址打錯了，或是這一頁已經搬家。</p>
<div class="pills" style="justify-content:center"><a class="btn pri" href="/">回樂園大門</a><a class="btn" href="/gallery">看看大家的推薦清單</a></div>
</section>
'''
page('404.html', '找不到這一頁 · 日向坂樂園', NF_BODY, 'simple.js')
print('ok')
