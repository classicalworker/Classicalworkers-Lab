// ===== 対抗戦スタッツ =====
// 手動集計ツール(SF6手動集計.html)の「集計を見る」→「この表をCSVで保存」で書き出したCSVを、
// 管理者ページで data.matchStats に保存し、
//   ・ランキング「📈 対抗戦スタッツ」…並び替えできる一覧表
//   ・メンバー詳細「📈 対抗戦スタッツ」…チーム内順位のリング・レーダーチャート
// として表示する。ranking.html / members.html / admin.html から読み込む(core.js より後)。
//
// 保存形式(data.matchStats):
//   { currentId: 'xxxx', history: [ {id, csv, memo, savedAt, savedBy, count}, ... ] }  ※新しい順・最大 STATS_HISTORY_MAX 件
//   CSV はそのまま文字列で保存し、表示するときに読み取る(列の順番は問わない。見出しの名前で読む)。

const STATS_HISTORY_MAX = 10;

// ---- ランキングの一覧表の列(type: pct=CSVの%値, rate=成功÷企図で計算, なし=回数) ----
const STATS_COLS = [
  {key:'1P側勝率(%)', h:'1P側勝率', type:'pct'},
  {key:'2P側勝率(%)', h:'2P側勝率', type:'pct'},
  {key:'ドライブラッシュ', h:'ドライブラッシュ'},
  {key:'キャンセルドライブラッシュ', h:'キャンセルDR'},
  {key:'ドライブインパクト', h:'DI'},
  {key:'ドライブインパクト成功', h:'DI成功'},
  {key:'ドライブインパクト返し', h:'DI返し'},
  {key:'ドライブインパクトパリィ受け', h:'DIパリィ受け'},
  {key:'ドライブパリイ', h:'パリィ'},
  {key:'ジャストパリイ(暗転)', h:'ジャスパ(暗転)'},
  {key:'ジャストパリイ(飛び道具)', h:'ジャスパ(飛び道具)'},
  {key:'ドライブリバーサル', h:'ドライブリバーサル'},
  {key:'オーバードライブ', h:'OD技'},
  {key:'バーンアウト', h:'バーンアウト', low:true},
  {key:'対空_企図', h:'対空機会'},
  {key:'対空_成功', h:'対空成功'},
  {key:'対空率', h:'対空成功率', type:'rate', ok:'対空_成功', tr:'対空_企図'},
  {key:'投げ抜け_企図', h:'投げ抜け回数'},
  {key:'投げ抜け_成功', h:'投げ抜け成功'},
  {key:'投げ抜け率', h:'投げ抜け成功率', type:'rate', ok:'投げ抜け_成功', tr:'投げ抜け_企図'},
  {key:'無敵技暴れ_企図', h:'無敵技暴れ回数'},
  {key:'無敵技暴れ_成功', h:'無敵技暴れ成功'},
  {key:'無敵技暴れ率', h:'無敵技暴れ成功率', type:'rate', ok:'無敵技暴れ_成功', tr:'無敵技暴れ_企図'},
];

// ---- メンバー詳細の項目(g=大項目) ----
const STATS_ITEMS = [
  {g:'勝率', key:'1P側勝率(%)', h:'1P側勝率', unit:'%', type:'pct'},
  {g:'勝率', key:'2P側勝率(%)', h:'2P側勝率', unit:'%', type:'pct'},
  {g:'ドライブインパクト', key:'ドライブインパクト', h:'ドライブインパクト', unit:'回'},
  {g:'ドライブインパクト', key:'ドライブインパクト成功', h:'ドライブインパクト成功', unit:'回'},
  {g:'ドライブインパクト', key:'ドライブインパクト返し', h:'ドライブインパクト返し', unit:'回'},
  {g:'ドライブインパクト', key:'ドライブインパクトパリィ受け', h:'ドライブインパクトパリィ受け', unit:'回'},
  {g:'パリィ', key:'ドライブパリイ', h:'パリィ', unit:'回'},
  {g:'パリィ', key:'ジャストパリイ(暗転)', h:'ジャストパリイ(暗転)', unit:'回'},
  {g:'パリィ', key:'ジャストパリイ(飛び道具)', h:'ジャストパリイ(飛び道具)', unit:'回'},
  {g:'ドライブ', key:'ドライブラッシュ', h:'ドライブラッシュ', unit:'回'},
  {g:'ドライブ', key:'キャンセルドライブラッシュ', h:'キャンセルドライブラッシュ', unit:'回'},
  {g:'ドライブ', key:'ドライブリバーサル', h:'ドライブリバーサル', unit:'回'},
  {g:'ドライブ', key:'オーバードライブ', h:'OD技', unit:'回'},
  {g:'ドライブ', key:'バーンアウト', h:'バーンアウト', unit:'回', low:true},
  {g:'対応力', key:'対空', h:'対空成功率', unit:'%', type:'rate', ok:'対空_成功', tr:'対空_企図', trh:'機会'},
  {g:'対応力', key:'投げ抜け', h:'投げ抜け成功率', unit:'%', type:'rate', ok:'投げ抜け_成功', tr:'投げ抜け_企図', trh:'回数'},
  {g:'対応力', key:'無敵技暴れ', h:'無敵技暴れ成功率', unit:'%', type:'rate', ok:'無敵技暴れ_成功', tr:'無敵技暴れ_企図', trh:'回数'},
];
const STATS_GROUPS = ['勝率', 'ドライブインパクト', 'パリィ', 'ドライブ', '対応力'];
const STATS_GROUP_TAB = {'勝率':'勝率', 'ドライブインパクト':'DI', 'パリィ':'パリィ', 'ドライブ':'ドライブ', '対応力':'対応力'};
// レーダーチャート・順位まとめの5項目
const STATS_SUMMARY = [
  {key:'1P側勝率(%)', short:'1P側勝率', tile:'1P勝率'},
  {key:'2P側勝率(%)', short:'2P側勝率', tile:'2P勝率'},
  {key:'対空', short:'対空', tile:'対空'},
  {key:'投げ抜け', short:'投げ抜け', tile:'投げ抜け'},
  {key:'無敵技暴れ', short:'無敵技暴れ', tile:'無敵技暴れ'},
];
// CSVに必ず必要な列
const STATS_REQUIRED = ['選手', '対空_企図', '対空_成功', '投げ抜け_企図', '投げ抜け_成功', '無敵技暴れ_企図', '無敵技暴れ_成功'];

// ---- 画面の状態 ----
let statsSortCol = 0;          // ランキング表の並び替え列
let statsMemberGroup = '勝率';  // メンバー詳細(スマホ表示)で開いている大項目

// ---------- CSV ----------
function parseStatsCSV(text){
  const lines = String(text || '').replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
  if(lines.length === 0) return {head:[], rows:[]};
  const split = l => {
    const out = []; let cur = '', q = false;
    for(let i = 0; i < l.length; i++){
      const ch = l[i];
      if(q){
        if(ch === '"' && l[i+1] === '"'){ cur += '"'; i++; }
        else if(ch === '"') q = false;
        else cur += ch;
      } else if(ch === '"') q = true;
      else if(ch === ','){ out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const head = split(lines[0]);
  const rows = lines.slice(1).map(l => {
    const v = split(l);
    const r = {};
    head.forEach((h, i) => { r[h] = v[i] !== undefined ? v[i] : ''; });
    return r;
  }).filter(r => r['選手']);
  return {head, rows};
}

function statsNum(v){
  if(v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
// 名前の照合用(全角半角・大文字小文字・前後の空白の違いを吸収)
function statsNameKey(s){
  return String(s || '').normalize('NFKC').trim().toLowerCase();
}

// ---------- 保存データ ----------
function getStatsStore(){
  const ms = data && data.matchStats;
  if(!ms) return {currentId:'', history:[]};
  let hist = ms.history;
  if(hist && !Array.isArray(hist)) hist = Object.values(hist);   // Firebaseが配列をオブジェクトで返した場合
  return {currentId: ms.currentId || '', history: (hist || []).filter(h => h && h.csv)};
}

let _statsCache = {id:null, csv:null, parsed:null};
// 表示中の集計(なければ null)
function getCurrentStats(){
  const st = getStatsStore();
  const snap = st.history.find(h => h.id === st.currentId) || st.history[0];
  if(!snap) return null;
  if(_statsCache.id !== snap.id || _statsCache.csv !== snap.csv){
    _statsCache = {id: snap.id, csv: snap.csv, parsed: parseStatsCSV(snap.csv)};
  }
  return {snap, rows: _statsCache.parsed.rows};
}

// CSVの選手名に対応するメンバー名(data.players のキー)。見つからなければ null
function statsMemberNameFor(csvName){
  if(!data || !data.players) return null;
  if(data.players[csvName]) return csvName;
  const k = statsNameKey(csvName);
  return Object.keys(data.players).find(n => statsNameKey(n) === k) || null;
}
// メンバー名に対応するCSVの行
function statsRowForMember(rows, memberName){
  const k = statsNameKey(memberName);
  return rows.find(r => r['選手'] === memberName) || rows.find(r => statsNameKey(r['選手']) === k) || null;
}

// ---------- 値・順位 ----------
// 項目の値(率の項目は 成功÷企図×100)
function statsVal(r, it){
  if(!r) return null;
  if(it.type === 'rate'){
    const t = statsNum(r[it.tr]), o = statsNum(r[it.ok]);
    return t ? (o || 0) / t * 100 : null;
  }
  return statsNum(r[it.key]);
}
function statsTries(r, it){ return it.type === 'rate' ? (statsNum(r[it.tr]) || 0) : 0; }

// 並び替え(多い順。lowの項目は少ない順。成功率が同じなら企図数が多い方が上。記録なしは最後)
function statsCompare(a, b, it){
  const x = statsVal(a, it), y = statsVal(b, it);
  if((x === null) !== (y === null)) return x === null ? 1 : -1;
  if(x === null) return 0;
  let d = it.low ? x - y : y - x;
  if(d === 0) d = statsTries(b, it) - statsTries(a, it);
  return d;
}

// チーム内順位・平均・最大(または最少)
function statsStanding(rows, row, it){
  const list = rows.filter(r => statsVal(r, it) !== null).sort((a, b) => statsCompare(a, b, it));
  let rank = null;
  const me = row ? list.indexOf(row) : -1;
  if(me >= 0){
    rank = 1;
    for(let i = 0; i < me; i++){
      if(statsCompare(list[i], list[me], it) !== 0) rank = i + 2;
    }
  }
  const vs = list.map(r => statsVal(r, it));
  return {
    rank, n: list.length,
    avg: vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null,
    best: vs.length ? (it.low ? Math.min(...vs) : Math.max(...vs)) : null,
    max: vs.length ? Math.max(...vs) : 0
  };
}
function statsFmt(v, it){
  if(v === null || v === undefined) return '-';
  if(it.unit === '%' || it.type === 'pct' || it.type === 'rate') return String(Math.round(v));
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
function statsSavedAtLabel(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d)) return '';
  return `${d.getMonth()+1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// =====================================================================
// ランキング:📈 対抗戦スタッツ(一覧表。見出しをタップで並び替え)
// =====================================================================
function statsRankingHtml(){
  const cur = getCurrentStats();
  if(!cur || cur.rows.length === 0){
    return `<div class="empty">対抗戦スタッツはまだ登録されていません。<br>管理者ページの「📈 対抗戦スタッツの更新」からCSVを保存すると表示されます。</div>`;
  }
  const rows = cur.rows;
  if(statsSortCol < 0 || statsSortCol >= STATS_COLS.length) statsSortCol = 0;
  const c = STATS_COLS[statsSortCol];
  const sorted = rows.slice().sort((a, b) => statsCompare(a, b, c));
  const best = STATS_COLS.map(col => {
    const vs = rows.map(r => statsVal(r, col)).filter(v => v !== null);
    if(!vs.length) return null;
    return col.low ? Math.min(...vs) : Math.max(...vs);
  });
  const cell = (r, col) => {
    const v = statsVal(r, col);
    if(v === null) return null;
    if(col.type === 'rate') return `${Math.round(v)}%`;
    if(col.type === 'pct') return `${v}%`;
    return String(v);
  };

  const head = `<tr><th class="cws-n">選手</th>` + STATS_COLS.map((col, i) =>
    `<th tabindex="0" data-i="${i}" class="${i === statsSortCol ? 'cws-sorted' : ''}" onclick="statsSortBy(${i})" onkeydown="if(event.key==='Enter')statsSortBy(${i})" title="${escapeHtml(col.h)}で並び替え">${escapeHtml(col.h)}${i === statsSortCol ? '<span class="cws-arw">▼</span>' : ''}</th>`
  ).join('') + `</tr>`;

  const body = sorted.map(r => {
    const member = statsMemberNameFor(r['選手']);
    const nameHtml = member
      ? `<a class="cws-name-link" data-member="${escapeHtml(member)}" onclick="goToMember(this.dataset.member)">${escapeHtml(r['選手'])}</a>`
      : escapeHtml(r['選手']);
    return `<tr><td class="cws-n">${nameHtml}</td>` + STATS_COLS.map((col, i) => {
      const h = cell(r, col), v = statsVal(r, col);
      const cls = [i === statsSortCol ? 'cws-sorted' : '', h === null ? 'cws-na' : (v === best[i] ? 'cws-top' : '')].filter(Boolean).join(' ');
      return `<td class="${cls}">${h === null ? '-' : h}</td>`;
    }).join('') + `</tr>`;
  }).join('');

  const memo = cur.snap.memo ? escapeHtml(cur.snap.memo) : '対抗戦スタッツ';
  return `
    <div class="cws-meta-row">
      <div class="cws-dim">${memo}　・　<b>${rows.length}</b> 名</div>
      <div class="cws-dim">並び順：<b class="cws-gold">${escapeHtml(c.h)}</b>${c.low ? '（少ない順）' : ''}</div>
    </div>
    <div class="cws-table-wrap"><table class="cws-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <div class="cws-legend">
      見出しをタップすると、その項目の多い順（バーンアウトは少ない順）に並び替わります。金色は各項目の1位、「-」は記録なしです。<br>
      対空・投げ抜け・無敵技暴れの成功率は、野球の盗塁と同じく「成功 ÷ 対空機会（投げ抜け・無敵技暴れは回数）」。成功率が同じときは機会・回数の多い方が上です。<br>
      1P側・2P側勝率はセット単位です。選手名をタップするとメンバーページを開きます。
    </div>`;
}
function statsSortBy(i){
  statsSortCol = i;
  // 並び替えても表の横スクロール位置・ページの縦位置はそのままにする
  const wrap = document.querySelector('.cws-table-wrap');
  const left = wrap ? wrap.scrollLeft : 0, top = window.scrollY;
  if(typeof renderRanking === 'function') renderRanking();
  const w2 = document.querySelector('.cws-table-wrap');
  if(w2) w2.scrollLeft = left;
  window.scrollTo(window.scrollX, top);
  const th = document.querySelector(`.cws-table th[data-i="${i}"]`);
  if(th) th.focus({preventScroll:true});
}

// =====================================================================
// メンバー詳細:📈 対抗戦スタッツ
//   PC … レーダー＋順位まとめ、大項目ごとのカード(リング・合計・平均値/最大値)
//   スマホ(〜560px) … レーダー＋順位5項目、大項目タブ、1項目1行のリスト
// =====================================================================
function statsRingSvg(rank, n){
  // リングは順位を表す(1位で満タン、最下位でほぼ空)
  const R = 30, C = 2 * Math.PI * R, f = rank ? (n - rank + 1) / n : 0;
  return `<svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="${R}" fill="none" stroke="var(--cws-track)" stroke-width="9"/>` +
    (f ? `<circle cx="38" cy="38" r="${R}" fill="none" stroke="var(--gold)" stroke-width="9" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}"/>` : '') + `</svg>`;
}
function statsRingHtml(s){
  return `<div class="cws-ring">${statsRingSvg(s.rank, s.n)}<div class="cws-ring-c">` +
    (s.rank ? `<span class="cws-pos">${s.rank}<small>位</small></span><span class="cws-of">${s.n}名中</span>` : `<span class="cws-of">記録なし</span>`) +
    `</div></div>`;
}

// レーダーチャート(5項目とも 0〜100%。金=本人、点線=チーム平均)
function statsRadarHtml(rows, row, playerName){
  const W = 360, H = 270, cx = 180, cy = 140, R = 94;
  const its = STATS_SUMMARY.map(s => STATS_ITEMS.find(i => i.key === s.key));
  const pt = (i, f) => { const a = -Math.PI / 2 + i * 2 * Math.PI / its.length; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  const poly = fs => fs.map((f, i) => pt(i, f).map(n => n.toFixed(1)).join(',')).join(' ');
  let g = '';
  [0.25, 0.5, 0.75, 1].forEach(f => { g += `<polygon points="${poly(its.map(() => f))}" fill="none" stroke="var(--panel-border)" stroke-width="1"/>`; });
  its.forEach((_, i) => { const [x, y] = pt(i, 1); g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--panel-border)" stroke-width="1"/>`; });
  g += `<text x="${cx + 3}" y="${(cy - R / 2 + 4).toFixed(1)}" font-size="9" fill="var(--cws-muted)">50</text>`;
  const avg = its.map(it => Math.min(1, (statsStanding(rows, null, it).avg || 0) / 100));
  const me = its.map(it => Math.min(1, (statsVal(row, it) || 0) / 100));
  g += `<polygon points="${poly(avg)}" fill="none" stroke="var(--cws-avg)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  g += `<polygon points="${poly(me)}" fill="rgba(var(--gold-rgb),.28)" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round"/>`;
  me.forEach((f, i) => { const [x, y] = pt(i, f); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--gold)"/>`; });
  its.forEach((it, i) => {
    const [x, y] = pt(i, 1.2), v = statsVal(row, it);
    const anc = Math.abs(x - cx) < 8 ? 'middle' : (x > cx ? 'start' : 'end');
    const dy = y < cy - 20 ? -6 : 0;
    g += `<text class="cws-rl" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anc}">${escapeHtml(STATS_SUMMARY[i].short)}</text>` +
         `<text class="cws-rv" x="${x.toFixed(1)}" y="${(y + dy + 14).toFixed(1)}" text-anchor="${anc}">${v === null ? '記録なし' : Math.round(v) + '%'}</text>`;
  });
  return `<div class="cws-radar"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="勝率・対応力のレーダーチャート">${g}</svg>
    <div class="cws-radar-lg"><span><i style="background:var(--gold)"></i>${escapeHtml(playerName)}</span><span><i style="background:var(--cws-avg)"></i>チーム平均</span></div></div>`;
}

// PC: 順位まとめのタイル
function statsRankTilesHtml(rows, row){
  return STATS_SUMMARY.map(sm => {
    const it = STATS_ITEMS.find(i => i.key === sm.key), s = statsStanding(rows, row, it), v = statsVal(row, it);
    return `<div class="cws-rk${s.rank === 1 ? ' cws-first' : ''}"><span class="cws-rk-l">${escapeHtml(it.h)}</span><span class="cws-rk-v">` +
      (s.rank ? `<span class="cws-rk-pos">${s.rank}<small>位</small></span>` : `<span class="cws-rk-pos cws-na">-</span>`) +
      `<span class="cws-rk-num">${v === null ? '記録なし' : Math.round(v) + '%'}</span></span></div>`;
  }).join('');
}
// スマホ: 順位5項目(横一列)
function statsRankStripHtml(rows, row){
  return STATS_SUMMARY.map(sm => {
    const it = STATS_ITEMS.find(i => i.key === sm.key), s = statsStanding(rows, row, it);
    return `<div class="cws-rs${s.rank === 1 ? ' cws-first' : ''}"><span class="cws-rs-l">${escapeHtml(sm.tile)}</span>` +
      (s.rank ? `<span class="cws-rs-pos">${s.rank}<small>位</small></span>` : `<span class="cws-rs-pos cws-na">-</span>`) + `</div>`;
  }).join('');
}

// PC: 項目カード
function statsCardHtml(rows, row, it){
  const v = statsVal(row, it), s = statsStanding(rows, row, it);
  const sb = it.type === 'rate' ? `<div class="cws-sb">成功 <b>${statsNum(row[it.ok]) || 0}</b> / ${it.trh} <b>${statsNum(row[it.tr]) || 0}</b></div>` : '';
  return `<div class="cws-sc${s.rank === 1 ? ' cws-first' : ''}">
    <div class="cws-sc-t">${escapeHtml(it.h)}${it.low ? '<small>少ないほど上位</small>' : ''}</div>
    <div class="cws-sc-body">
      ${statsRingHtml(s)}
      <div class="cws-sc-val">
        ${v === null ? `<span class="cws-nodata">-</span>` : `<div class="cws-total"><span class="cws-lbl">${it.unit === '%' ? '' : '合計'}</span>${statsFmt(v, it)}<small>${it.unit}</small></div>`}
        ${sb}
        <div class="cws-leg"><span><i style="background:var(--cws-avg)"></i>平均値 <b>${statsFmt(s.avg, it)}</b>${it.unit}</span>
          <span><i style="background:var(--gold)"></i>${it.low ? '最少' : '最大'}値 <b>${statsFmt(s.best, it)}</b>${it.unit}</span></div>
      </div>
    </div></div>`;
}
// スマホ: 1項目1行
function statsRowHtml(rows, row, it){
  const v = statsVal(row, it), s = statsStanding(rows, row, it);
  const top = it.unit === '%' ? 100 : (s.max || 1);
  const w = v === null ? 0 : Math.min(100, v / top * 100);
  const a = s.avg === null ? null : Math.min(100, s.avg / top * 100);
  const ok = it.type === 'rate' ? `<span>成功 <em>${statsNum(row[it.ok]) || 0}</em> / ${it.trh} <em>${statsNum(row[it.tr]) || 0}</em></span>` : '';
  return `<div class="cws-row${s.rank === 1 ? ' cws-first' : ''}">
    ${statsRingHtml(s)}
    <div class="cws-row-nm">${escapeHtml(it.h)}${it.low ? '<small>少ないほど上位</small>' : ''}</div>
    ${v === null ? `<div class="cws-big cws-na">-</div>` : `<div class="cws-big">${statsFmt(v, it)}<small>${it.unit}</small></div>`}
    <div class="cws-bar"><i style="width:${w.toFixed(1)}%"></i>${a === null ? '' : `<b style="left:calc(${a.toFixed(1)}% - 1px)"></b>`}</div>
    <div class="cws-row-sub">${ok}<span>平均 <em>${statsFmt(s.avg, it)}</em></span><span>${it.low ? '最少' : '最大'} <em>${statsFmt(s.best, it)}</em></span></div>
  </div>`;
}

// メンバー詳細のカード全体(データがなければ空文字=カード自体を出さない)
function statsMemberCardHtml(memberName){
  const cur = getCurrentStats();
  if(!cur || cur.rows.length === 0) return '';
  const rows = cur.rows;
  const row = statsRowForMember(rows, memberName);
  const meta = `${cur.snap.memo ? escapeHtml(cur.snap.memo) + '・' : ''}クラシカルワーカー <b>${rows.length}</b> 名の中での順位`;
  if(!row){
    return `<div class="card cws-member">
      <h2>📈 対抗戦スタッツ</h2>
      <div class="cws-meta">${meta}</div>
      <div class="empty" style="padding:10px 0">このメンバーの対抗戦スタッツはまだありません</div>
    </div>`;
  }
  if(!STATS_GROUPS.includes(statsMemberGroup)) statsMemberGroup = STATS_GROUPS[0];

  const groupsPc = STATS_GROUPS.map(g =>
    `<div class="cws-grp-h">${escapeHtml(g)}</div><div class="cws-grid">${STATS_ITEMS.filter(it => it.g === g).map(it => statsCardHtml(rows, row, it)).join('')}</div>`
  ).join('');
  const seg = STATS_GROUPS.map(g =>
    `<button type="button" class="${g === statsMemberGroup ? 'cws-on' : ''}" onclick="statsSwitchMemberGroup('${g}')">${STATS_GROUP_TAB[g]}</button>`
  ).join('');
  const listSp = STATS_ITEMS.filter(it => it.g === statsMemberGroup).map(it => statsRowHtml(rows, row, it)).join('');

  return `<div class="card cws-member" id="cws-member-card">
    <h2>📈 対抗戦スタッツ <span class="cws-h-tag">チーム内順位</span></h2>
    <div class="cws-meta">${meta}</div>
    <div class="cws-overview">
      ${statsRadarHtml(rows, row, memberName)}
      <div class="cws-ranks cws-only-pc">${statsRankTilesHtml(rows, row)}</div>
      <div class="cws-strip cws-only-sp">${statsRankStripHtml(rows, row)}</div>
    </div>
    <div class="cws-only-pc">${groupsPc}</div>
    <div class="cws-only-sp">
      <div class="cws-seg" id="cws-seg">${seg}</div>
      <div class="cws-list" id="cws-list">${listSp}</div>
    </div>
    <div class="cws-note">
      リングと数字はクラシカルワーカーの中での順位（リングが満タンに近いほど上位）。平均値・最大値もチーム内の値です。<br>
      <span class="cws-only-sp">バーの右端は回数ならチーム最大値、率なら100%、縦線がチーム平均です。</span>
      成功率は「成功 ÷ 対空機会（投げ抜け・無敵技暴れは回数）」。1P側・2P側勝率はセット単位です。
    </div>
  </div>`;
}
// スマホ表示の大項目タブ切り替え(ページ全体は描き直さず、リストだけ差し替える)
function statsSwitchMemberGroup(g){
  statsMemberGroup = g;
  const name = (typeof statsCurrentMemberName === 'string') ? statsCurrentMemberName : null;
  const cur = getCurrentStats();
  const row = cur && name ? statsRowForMember(cur.rows, name) : null;
  const seg = document.getElementById('cws-seg'), list = document.getElementById('cws-list');
  if(!row || !seg || !list) return;
  seg.querySelectorAll('button').forEach(b => b.classList.toggle('cws-on', b.textContent === STATS_GROUP_TAB[g]));
  list.innerHTML = STATS_ITEMS.filter(it => it.g === g).map(it => statsRowHtml(cur.rows, row, it)).join('');
}
let statsCurrentMemberName = null;

// =====================================================================
// 管理者:📈 対抗戦スタッツの更新(CSV保存・履歴から戻す)
// =====================================================================
let statsPending = null;   // {csv, rows, fileName}

function statsAdminHtml(){
  const st = getStatsStore();
  const cur = getCurrentStats();
  const curId = cur ? cur.snap.id : '';
  const preview = statsAdminPreviewHtml();
  const histHtml = st.history.length
    ? st.history.map(h => `
        <div class="cws-hist-row">
          <span class="cws-when">${escapeHtml(statsSavedAtLabel(h.savedAt))}</span>
          <span class="cws-what">${escapeHtml(h.memo || '（メモなし）')}・${Number(h.count) || parseStatsCSV(h.csv).rows.length}名</span>
          ${h.id === curId
            ? `<span class="cws-cur">表示中</span>`
            : `<button class="ghost" onclick="statsAdminRestore('${escapeHtml(h.id)}')">この内容に戻す</button>`}
        </div>`).join('')
    : `<div class="empty" style="padding:8px 0">まだ保存されていません</div>`;

  return `
    <div class="card">
      <h2>📈 対抗戦スタッツの更新<span class="tag">CSV</span></h2>
      <div style="font-size:12px;color:var(--text-dim);line-height:1.7;">
        手動集計ツールの「集計を見る」→「この表をCSVで保存」で書き出したファイルを選んで保存します。
        保存すると、ランキングの「📈 対抗戦スタッツ」とメンバーページのスタッツがこの内容に置き換わります。
      </div>
      <div class="cws-drop" id="cws-drop" tabindex="0" role="button"
        onclick="document.getElementById('cws-file').click()"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();document.getElementById('cws-file').click();}"
        ondragover="event.preventDefault();this.classList.add('cws-hover')"
        ondragleave="this.classList.remove('cws-hover')"
        ondrop="event.preventDefault();this.classList.remove('cws-hover');statsAdminTakeFile(event.dataTransfer.files[0])">
        <div><b>CSVファイルを選ぶ</b>（ここにドラッグしてもOK）</div>
        <div class="cws-dim" style="margin-top:4px">${statsPending ? escapeHtml(statsPending.fileName) : 'まだ選ばれていません'}</div>
      </div>
      <input type="file" id="cws-file" accept=".csv,text/csv" hidden onchange="statsAdminTakeFile(this.files[0]);this.value='';">
      <label for="cws-memo">メモ（どの対抗戦までを集計したか）</label>
      <input type="text" id="cws-memo" placeholder="例: 10/12 SFBS戦まで" value="${statsPending ? escapeHtml(statsPending.memo || '') : ''}" oninput="if(statsPending) statsPending.memo=this.value">
      <div class="cws-preview" id="cws-preview">${preview}</div>
      <button class="primary" id="cws-save" ${statsPending && statsPending.rows ? '' : 'disabled'} onclick="statsAdminSave()">保存してランキングに反映</button>
    </div>
    <div class="card">
      <h2>📈 対抗戦スタッツ 保存の履歴</h2>
      <div style="font-size:12px;color:var(--text-dim);line-height:1.6;margin-bottom:6px;">前の内容に戻したいときは「この内容に戻す」を押します（新しい順に${STATS_HISTORY_MAX}件まで残ります）。</div>
      <div class="cws-hist">${histHtml}</div>
    </div>`;
}

function statsAdminPreviewHtml(){
  if(!statsPending) return '';
  if(statsPending.error) return `<span class="cws-ng">読み込めません：</span>${statsPending.error}`;
  const rows = statsPending.rows;
  const unknown = rows.map(r => r['選手']).filter(n => !statsMemberNameFor(n));
  return `<span class="cws-ok">${rows.length} 名分を読み込みました：</span>${rows.slice(0, 8).map(r => escapeHtml(r['選手'])).join('、')}${rows.length > 8 ? ' ほか' : ''}` +
    (unknown.length
      ? `<div class="cws-warn">⚠ メンバー一覧にいない名前があります：${unknown.map(escapeHtml).join('、')}<br>ランキングには表示されますが、メンバーページには出ません。名前の表記をメンバー一覧と合わせると表示されます。</div>`
      : '');
}

async function statsAdminTakeFile(f){
  if(!f) return;
  const memoEl = document.getElementById('cws-memo');
  const memo = memoEl ? memoEl.value : '';
  try{
    const csv = await f.text();
    const p = parseStatsCSV(csv);
    const missing = STATS_REQUIRED.filter(h => !p.head.includes(h));
    if(missing.length){
      statsPending = {fileName: f.name, memo, error: `列 ${missing.map(escapeHtml).join('、')} がありません。手動集計ツールの「この表をCSVで保存」で書き出したCSVか確認してください。`};
    } else if(p.rows.length === 0){
      statsPending = {fileName: f.name, memo, error: '選手の行がありません。'};
    } else {
      statsPending = {fileName: f.name, memo, csv: csv.replace(/^\ufeff/, ''), rows: p.rows};
    }
  } catch(e){
    statsPending = {fileName: f.name, memo, error: 'ファイルを読み込めませんでした。'};
  }
  renderAdmin();
}

async function statsAdminSave(){
  if(!statsPending || !statsPending.rows) return;
  const memoEl = document.getElementById('cws-memo');
  const st = getStatsStore();
  const entry = {
    id: genId(),
    csv: statsPending.csv,
    memo: (memoEl ? memoEl.value : statsPending.memo || '').trim(),
    savedAt: new Date().toISOString(),
    savedBy: (typeof getLoggedInPlayer === 'function' ? (getLoggedInPlayer() || '') : ''),
    count: statsPending.rows.length
  };
  const history = [entry, ...st.history].slice(0, STATS_HISTORY_MAX);
  data.matchStats = {currentId: entry.id, history};
  statsPending = null;
  await saveData();
  renderAdmin();
  showToast('保存しました。ランキングに反映されています');
}

async function statsAdminRestore(id){
  const st = getStatsStore();
  const h = st.history.find(x => x.id === id);
  if(!h) return;
  const ok = await confirmDialog(`「${h.memo || '（メモなし）'}」の内容に戻しますか？`);
  if(!ok) return;
  data.matchStats = {currentId: id, history: st.history};
  await saveData();
  renderAdmin();
  showToast('対抗戦スタッツをこの内容に戻しました');
}
