// ===== 管理者ページ =====
// 管理者PIN(data.admin.pinHash)でこのタブをアンロックすると、
// ・メンバーの追加/削除
// ・予定/大会情報の編集(schedule.html側の編集・削除ボタンもここでアンロックされる)
// ・メンバーごとのデータ編集(マイページへショートカット、PIN確認スキップ)
// が行えるようになる。

function renderCurrentPage(){
  renderAdmin();
}

function renderAdmin(){
  const el = document.getElementById('view-admin');
  if(!isAdminUnlocked()){
    el.innerHTML = lockedScreenHtml();
    return;
  }
  el.innerHTML = adminDashboardHtml();
}

function lockedScreenHtml(){
  const hasPinSet = !!(data.admin && data.admin.pinHash);
  return `
    <div class="card">
      <h2>⚙️ 管理者ページ</h2>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.7;margin-bottom:14px;">
        ${hasPinSet
          ? 'サブリーダー間で共有している管理者PINを入力してください。'
          : 'このタブではまだ管理者PINが設定されていません。最初にPINを設定してください。'}
      </div>
      <button class="primary" onclick="adminLoginPrompt()">${hasPinSet ? '🔐 管理者PINを入力してログイン' : '🔐 管理者PINを新規設定'}</button>
    </div>`;
}

function adminLoginPrompt(){
  // asLogin=true: この画面からのログインは「管理者としてサイト全体にログイン」する扱いにし、
  // 現在ログイン中のメンバーアカウントからは自動的にログアウトする
  requireAdminPin(()=>{
    renderAdmin();
    renderLoginStatusBar();
    showToast('管理者としてログインしました');
  }, null, true);
}

function adminLogoutAndRender(){
  // 管理者としてサイト全体にログイン中だった場合は、通常のログアウトと同様に
  // ログイン画面まで戻す(メンバーとしてのログイン状態も残っていないため)
  if(getLoggedInPlayer() === '__admin__'){
    memberLogout();
    return;
  }
  // メンバー本人のまま管理者権限だけを一時的にアンロックしていた場合は、
  // その権限だけを解除してこのページに留まる
  adminLogout();
  renderAdmin();
  showToast('管理者権限をログアウトしました');
}

function adminDashboardHtml(){
  return `
    <div class="card">
      <h2>⚙️ 管理者ページ<span class="tag">ADMIN</span></h2>
      <div style="font-size:12px;color:var(--text-dim);line-height:1.6;">
        このタブは管理者としてログイン中です。予定・目標ページの編集/削除ボタンもこのタブでは確認なしで使えます。
      </div>
      <button class="ghost" style="margin-top:10px;" onclick="adminLogoutAndRender()">ログアウト</button>
    </div>

    ${adminMemberManageHtml()}
    ${adminScheduleShortcutHtml()}
    ${adminMemberEditHtml()}
    ${adminAnnouncementsHtml()}
    ${adminDiscordImportHtml()}
  `;
}

// ---- ① メンバーの追加・削除 ----
function adminMemberManageHtml(){
  const names = Object.keys(data.players).sort((a,b)=>a.localeCompare(b,'ja'));
  const rowsHtml = names.length ? names.map(n=>{
    const p = data.players[n];
    const matchCount = (p.matches||[]).length;
    const pinText = p.pin ? p.pin : '未設定';
    return `
      <div class="history-item">
        <div class="history-main">
          <div class="top"><span class="names">${escapeHtml(n)}</span></div>
          <div class="score-display">対戦数 ${matchCount}　／　PIN: <span class="top-card-highlight">${escapeHtml(pinText)}</span></div>
        </div>
        <button class="ghost" onclick="adminDeleteMember('${escapeHtml(n)}')">削除</button>
      </div>`;
  }).join('') : '<div class="empty">メンバーが登録されていません</div>';

  return `
    <div class="card">
      <h2><span class="tag">STEP 1</span>メンバーの追加・削除</h2>
      <div style="max-height:340px;overflow-y:auto;">${rowsHtml}</div>
      <label>新しいメンバーを追加</label>
      <div class="row">
        <input type="text" id="admin-new-member-name" placeholder="例:ハヤト">
        <button class="primary" style="margin-top:0;width:auto;padding:10px 18px;" onclick="adminAddMember()">追加</button>
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:8px;line-height:1.6;">
        削除すると、そのメンバーの対戦履歴・目標もすべて削除されます。元に戻せないのでご注意ください。<br>
        PINコードはメンバーがログイン時に設定するとここに表示されます(平文で保存されるため、管理者以外に見られないようご注意ください)。
      </div>
    </div>`;
}

async function adminAddMember(){
  const input = document.getElementById('admin-new-member-name');
  const name = input.value.trim();
  if(!name){ showToast('名前を入力してください'); return; }
  if(data.players[name]){ showToast('その名前は既に登録されています'); return; }
  data.players[name] = {
    matches:[], goals:[], controlTypes:[], maxMR:'', mainGoal:'', mainGoalDone:false, mainGoalAchievedAt:null,
    userCode:'', devices:[], deviceName:'', platforms:[], icon:'', notifications:[],
    streamUrl:'', streamTitle:'', isLive:false,
    twitchLogin:'', pin:''
  };
  await saveData();
  renderAdmin();
  showToast(`${name}さんを追加しました`);
}

async function adminDeleteMember(name){
  if(!await confirmDialog(`${name}さんを削除します。対戦履歴・目標もすべて削除され、元に戻せません。よろしいですか?`)) return;
  delete data.players[name];
  await saveData();
  renderAdmin();
  showToast('削除しました');
}

// ---- ② 大会情報・日程の登録編集 ----
function adminScheduleShortcutHtml(){
  const eventCount = (data.events||[]).length;
  const tournamentCount = (data.tournaments||[]).length;
  return `
    <div class="card">
      <h2><span class="tag">STEP 2</span>大会情報・日程の登録編集</h2>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.7;margin-bottom:12px;">
        登録中の予定: <span class="top-card-highlight">${eventCount}件</span> ／ 大会記録: <span class="top-card-highlight">${tournamentCount}件</span><br>
        予定・大会記録の追加・編集・削除は「予定」ページから行えます。このタブでは管理者ログイン中のため、PIN確認なしでそのまま操作できます。<br>
        出欠確認の回答も、各予定の出欠内訳に並ぶメンバー名の「×」ボタンから個人ごとに取り消せます(管理者ログイン中のみ表示されます)。
      </div>
      <a class="top-link-btn" href="schedule.html">📅 予定ページを開く</a>
    </div>`;
}

// ---- ③ 全員のデータを編集 ----
function adminMemberEditHtml(){
  const names = Object.keys(data.players).sort((a,b)=>a.localeCompare(b,'ja'));
  const rowsHtml = names.length ? names.map(n=>{
    const p = data.players[n];
    return `
      <div class="match-edit-row" style="flex-wrap:wrap;">
        <div style="flex:1;min-width:90px;font-weight:800;font-size:13px;">${escapeHtml(n)}</div>
        <input type="text" value="${escapeHtml(p.mainGoal||'')}" placeholder="大目標"
          onchange="adminUpdatePlayerField('${escapeHtml(n)}','mainGoal',this.value)">
        <input type="text" value="${escapeHtml(p.maxMR||'')}" placeholder="最高MR" style="max-width:90px;"
          onchange="adminUpdatePlayerField('${escapeHtml(n)}','maxMR',this.value)">
        <label style="display:flex;align-items:center;gap:4px;margin:0;flex-shrink:0;font-size:11px;">
          <input type="checkbox" style="width:15px;height:15px;" ${p.mainGoalDone?'checked':''}
            onchange="adminUpdatePlayerField('${escapeHtml(n)}','mainGoalDone',this.checked)">達成
        </label>
        <a class="top-link-btn" href="mypage.html?player=${encodeURIComponent(n)}">詳細編集</a>
      </div>`;
  }).join('') : '<div class="empty">メンバーが登録されていません</div>';

  return `
    <div class="card">
      <h2><span class="tag">STEP 3</span>全員のデータを編集</h2>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">
        大目標・最高MR・達成フラグはここから直接編集できます。対戦履歴や個人目標リストなど詳しい編集は「詳細編集」からマイページを開いてください(管理者ログイン中はPIN確認なしで開けます)。
      </div>
      ${rowsHtml}
    </div>`;
}

async function adminUpdatePlayerField(name, field, value){
  const p = data.players[name];
  if(!p) return;
  if(field === 'mainGoalDone' && value && !p.mainGoalDone){
    p.mainGoalAchievedAt = new Date().toISOString();
    if(p.mainGoal) pushAnnouncement(`🎉 ${name}さんが目標を達成しました:「${p.mainGoal}」`);
  } else if(field === 'mainGoalDone' && !value){
    p.mainGoalAchievedAt = null;
  }
  p[field] = value;
  await saveData();
  showToast('更新しました');
}

// ---- ④ お知らせの手動追加・ピン止め・削除 ----
function adminAnnouncementsHtml(){
  const items = sortedAnnouncements();
  const rowsHtml = items.length ? items.map(a=>`
    <div class="notice-item">
      <div style="flex:1;min-width:0;">
        <div class="notice-item-text">${a.pinned ? '📌 ' : ''}${escapeHtml(a.text)}</div>
        <div class="notice-item-time">${formatTimeAgo(a.at)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="ghost" onclick="adminTogglePinAnnouncement('${a.id}')">${a.pinned ? 'ピン解除' : '📌 ピン止め'}</button>
        <button class="ghost" onclick="adminDeleteAnnouncement('${a.id}')">削除</button>
      </div>
    </div>`).join('') : '<div class="empty">お知らせはありません</div>';

  return `
    <div class="card">
      <h2><span class="tag">STEP 4</span>お知らせの手動追加・削除</h2>
      <label>お知らせ本文</label>
      <input type="text" id="admin-new-announcement-text" placeholder="例:来月のオフ会について相談中です">
      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer">
        <input type="checkbox" id="admin-new-announcement-pin">
        <span style="color:var(--text)">📌 ピン止めする(TOP画面の一番上に固定表示)</span>
      </label>
      <button class="primary" style="margin-top:10px;" onclick="adminAddAnnouncement()">お知らせを追加</button>
      <div style="max-height:340px;overflow-y:auto;margin-top:14px;display:flex;flex-direction:column;gap:8px;">${rowsHtml}</div>
    </div>`;
}

async function adminAddAnnouncement(){
  const input = document.getElementById('admin-new-announcement-text');
  const pinCb = document.getElementById('admin-new-announcement-pin');
  const text = input.value.trim();
  if(!text){ showToast('お知らせ内容を入力してください'); return; }
  pushAnnouncement(text, pinCb.checked);
  await saveData();
  renderAdmin();
  showToast('お知らせを追加しました');
}

async function adminTogglePinAnnouncement(id){
  const a = (data.announcements||[]).find(a=>a.id===id);
  if(!a) return;
  a.pinned = !a.pinned;
  await saveData();
  renderAdmin();
}

async function adminDeleteAnnouncement(id){
  if(!await confirmDialog('このお知らせを削除しますか?')) return;
  data.announcements = (data.announcements||[]).filter(a=>a.id!==id);
  await saveData();
  renderAdmin();
  showToast('削除しました');
}

// ---- ⑤ Discordログ(sf6bot_testの日報)の取り込み ----
// Botの管理者権限が無くても、DiscordChatExporter等でチャンネルをJSON形式に
// エクスポートしてもらえれば、その中の「日報」「全メンバー一覧」「個人の総取得MR」
// メッセージからCP残量・tier・色・MR増加量を読み取ってサイトに反映できるようにする。
// ここでの取り込みはボタン操作による手動インポート(定期実行の自動化は行わない)。

let discordImportPending = null; // {totals:{discordName:{...}}, daily:{date:{discordName:{...}}}, mapping:{discordName:playerName}}

function adminDiscordImportHtml(){
  let previewHtml = '';
  if(discordImportPending){
    const totals = discordImportPending.totals;
    const daily = discordImportPending.daily;
    if(!discordImportPending.mapping) discordImportPending.mapping = {};
    const mapping = discordImportPending.mapping;

    const dailyDates = Object.keys(daily).sort();
    const allNames = new Set(Object.keys(totals));
    dailyDates.forEach(d => Object.keys(daily[d]).forEach(n => allNames.add(n)));
    const sortedNames = Array.from(allNames).sort((a,b)=>a.localeCompare(b,'ja'));
    const memberOptions = Object.keys(data.players).sort((a,b)=>a.localeCompare(b,'ja'));

    const rowsHtml = sortedNames.map(dn=>{
      if(mapping[dn] === undefined) mapping[dn] = guessDiscordPlayerMatch(dn);
      const info = totals[dn];
      const metaText = info
        ? `総取得MR ${info.totalMR||0} ・ CP ${info.cp||0}${(info.tier!==undefined && info.tier!=='') ? ' ・ tier'+info.tier : ''}`
        : '日報のみ(総取得MR/CPの情報なし)';

      const optionsHtml = `<option value="">— 取り込まない —</option>` + memberOptions.map(n=>
        `<option value="${escapeHtml(n)}" ${mapping[dn]===n?'selected':''}>${escapeHtml(n)}</option>`
      ).join('');

      return `
        <div class="match-edit-row" style="flex-wrap:wrap;">
          <div style="flex:1;min-width:130px;">
            <div style="font-weight:800;font-size:13px;">${escapeHtml(dn)}</div>
            <div style="font-size:11px;color:var(--text-dim);">${metaText}</div>
          </div>
          <select onchange="adminDiscordSetMapping('${dn.replace(/'/g,"\\'")}', this.value)">${optionsHtml}</select>
        </div>`;
    }).join('');

    previewHtml = `
      <div style="font-size:12px;color:var(--text-dim);margin:10px 0;line-height:1.7;">
        ${sortedNames.length}名分のDiscordニックネームが見つかりました（うちCP/tierの情報あり: ${Object.keys(totals).length}名、日報の日数: ${dailyDates.length}日 ${dailyDates.length?`[${dailyDates[0]}〜${dailyDates[dailyDates.length-1]}]`:''}）。<br>
        Discord上のニックネームとサイト上のメンバー名が違う場合は、プルダウンで対応するメンバーに選び直してください。「取り込まない」を選んだ名前は無視されます。
      </div>
      <div style="max-height:360px;overflow-y:auto;">${rowsHtml}</div>
      <button class="primary" style="margin-top:12px;" onclick="adminConfirmDiscordImport()">この内容でサイトに反映する</button>
      <button class="ghost" style="margin-top:8px;" onclick="adminCancelDiscordImport()">キャンセル</button>
    `;
  }

  return `
    <div class="card">
      <h2><span class="tag">STEP 5</span>Discordログの取り込み(CP・tier・日報)</h2>
      <div style="font-size:12px;color:var(--text-dim);line-height:1.7;margin-bottom:10px;">
        DiscordChatExporter等で「bot-メッセージ」チャンネルをJSON形式でエクスポートし、そのファイルをここにアップロードしてください。<br>
        sf6bot_testが投稿する「日報」「全メンバー一覧」「個人の総取得MR」から、CP残量・tier(色)・MR増加量を読み取って、TOP画面・ランキング・メンバー詳細に反映します。<br>
        Botの管理者権限は不要です。自動更新はできないため、エクスポートするたびにこのページから読み込み直してください。
      </div>
      <input type="file" id="admin-discord-file" accept=".json,application/json" onchange="adminDiscordFileSelected(event)">
      <div id="admin-discord-preview">${previewHtml}</div>
    </div>`;
}

function adminDiscordSetMapping(discordName, playerName){
  if(!discordImportPending) return;
  discordImportPending.mapping[discordName] = playerName;
}

function adminCancelDiscordImport(){
  discordImportPending = null;
  renderAdmin();
}

function adminDiscordFileSelected(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let json;
    try{
      json = JSON.parse(reader.result);
    }catch(e){
      showToast('JSONとして読み込めませんでした。DiscordChatExporterの「JSON」形式でエクスポートしたファイルを選んでください');
      return;
    }
    const parsed = parseDiscordExportJson(json);
    if(Object.keys(parsed.totals).length === 0 && Object.keys(parsed.daily).length === 0){
      showToast('sf6bot_testのメッセージ(日報・総取得MR等)が見つかりませんでした。エクスポート範囲やチャンネルを確認してください');
      return;
    }
    discordImportPending = {totals: parsed.totals, daily: parsed.daily, mapping: {}};
    renderAdmin();
    showToast('内容を確認し、必要であればメンバーとの対応を選び直してください');
  };
  reader.readAsText(file);
}

// DiscordChatExporterのJSONを解析し、
// totals: {discordName: {totalMR, cp, tier, color, currentMRText}} (最新のものだけ)
// daily:  {"YYYY-MM-DD": {discordName: {mrGain, cpGain}}}
// を返す
function parseDiscordExportJson(json){
  const messages = Array.isArray(json.messages) ? json.messages : [];
  const totals = {};
  const daily = {};

  function considerTotal(name, info, ts){
    const existing = totals[name];
    if(!existing || new Date(ts) > new Date(existing.__ts)){
      totals[name] = Object.assign({}, info, {__ts: ts});
    }
  }

  messages.forEach(m=>{
    const embeds = m.embeds || [];
    embeds.forEach(e=>{
      const title = (e.title||'').trim();
      let mm;

      // 「日報 2026-09-04」: 1日ごとのMR/CP増加量一覧
      if((mm = title.match(/^日報\s+(\d{4}-\d{2}-\d{2})$/))){
        const date = mm[1];
        const lines = (e.description||'').split('\n').map(s=>s.trim()).filter(Boolean);
        lines.forEach(line=>{
          const lm = line.match(/^(.+?):\s*MR\s*([+-]?\d+)\s*\/\s*CP\s*([+-]?\d+)$/);
          if(lm){
            const name = lm[1].trim();
            if(!daily[date]) daily[date] = {};
            daily[date][name] = {mrGain: parseInt(lm[2],10)||0, cpGain: parseInt(lm[3],10)||0};
          }
        });

      // 「全メンバー MR増加量・CP一覧」: 全員分の総取得量スナップショット
      } else if(title === '全メンバー MR増加量・CP一覧'){
        const lines = (e.description||'').split('\n').map(s=>s.trim()).filter(Boolean);
        lines.forEach(line=>{
          const lm = line.match(/^\d+\.\s*(.+?)\s*—\s*MR\s*\+(\d+)\s*\(tier\s*(\d+)\s*(#[0-9A-Fa-f]{6})\)\s*\/\s*CP\s*(\d+)$/);
          if(lm){
            considerTotal(lm[1].trim(), {
              totalMR: parseInt(lm[2],10)||0,
              tier: parseInt(lm[3],10)||0,
              color: lm[4],
              cp: parseInt(lm[5],10)||0,
              currentMRText: ''
            }, m.timestamp);
          }
        });

      // 「〇〇 の総取得MR」: 個人が照会した際に投稿される詳細カード
      } else if((mm = title.match(/^(.+?)\s*の総取得MR$/))){
        const name = mm[1].trim();
        const fields = e.fields || [];
        const getField = fname => { const f = fields.find(f=>f.name===fname); return f ? (f.value||'') : ''; };
        const colorStr = getField('色');
        const cm = colorStr.match(/tier\s*(\d+)\s*\/\s*\d+\s*(#[0-9A-Fa-f]{6})/);
        considerTotal(name, {
          totalMR: parseInt(getField('総取得量'),10)||0,
          cp: parseInt(getField('CP残量'),10)||0,
          tier: cm ? parseInt(cm[1],10) : '',
          color: cm ? cm[2] : '',
          currentMRText: getField('現在のMR') || ''
        }, m.timestamp);
      }
    });
  });

  // 内部用の__tsはサイトのデータには不要なので取り除く
  Object.keys(totals).forEach(k => { delete totals[k].__ts; });

  return {totals, daily};
}

// Discordのニックネーム(絵文字・記号付き)からサイト上のメンバー名を推測する
function normalizeDiscordName(s){
  return String(s||'')
    .normalize('NFKC')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/[@#・。.\-_ｰー\s]/g, '')
    .toLowerCase();
}

function guessDiscordPlayerMatch(discordName){
  // すでに同じdiscordNameを取り込み済みのメンバーがいれば最優先でそれを使う
  const exact = Object.keys(data.players).find(n => data.players[n].discordName === discordName);
  if(exact) return exact;

  const dn = normalizeDiscordName(discordName);
  if(!dn) return '';

  let best = '';
  let bestScore = -1;
  Object.keys(data.players).forEach(n=>{
    const pn = normalizeDiscordName(n);
    if(!pn) return;
    let score = -1;
    if(pn === dn) score = 100;
    else if(dn.startsWith(pn) || pn.startsWith(dn)) score = 80 - Math.abs(dn.length - pn.length);
    else if(dn.includes(pn) || pn.includes(dn)) score = 60 - Math.abs(dn.length - pn.length);
    if(score > bestScore){ bestScore = score; best = n; }
  });
  return bestScore >= 50 ? best : '';
}

async function adminConfirmDiscordImport(){
  if(!discordImportPending) return;
  const {totals, daily, mapping} = discordImportPending;
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  Object.keys(totals).forEach(dn=>{
    const playerName = mapping[dn];
    if(!playerName || !data.players[playerName]) return;
    const info = totals[dn];
    const p = data.players[playerName];
    p.discordName = dn;
    p.discordTotalMR = String(info.totalMR ?? '');
    p.discordCP = String(info.cp ?? '');
    p.discordTier = (info.tier !== undefined && info.tier !== '') ? String(info.tier) : '';
    p.discordColor = info.color || '';
    if(info.currentMRText) p.discordCurrentMRText = info.currentMRText;
    p.discordUpdatedAt = nowIso;
    updatedCount++;
  });

  // 個人の総取得MR一覧に出てこなかった(=日報にしか名前が無い)メンバーも、
  // マッピングだけ選ばれていればdiscordNameだけ保存しておき、次回以降の自動対応に使う
  Object.keys(mapping).forEach(dn=>{
    if(totals[dn]) return;
    const playerName = mapping[dn];
    if(!playerName || !data.players[playerName]) return;
    if(!data.players[playerName].discordName) data.players[playerName].discordName = dn;
  });

  if(!data.discordDailyReports) data.discordDailyReports = {};
  let dailyDaysCount = 0;
  Object.keys(daily).forEach(date=>{
    let addedThisDate = false;
    Object.keys(daily[date]).forEach(dn=>{
      const playerName = mapping[dn] || Object.keys(data.players).find(n=>data.players[n].discordName===dn);
      if(!playerName || !data.players[playerName]) return;
      if(!data.discordDailyReports[date]) data.discordDailyReports[date] = {};
      data.discordDailyReports[date][playerName] = daily[date][dn];
      addedThisDate = true;
    });
    if(addedThisDate) dailyDaysCount++;
  });

  await saveData();
  discordImportPending = null;
  renderAdmin();
  showToast(`${updatedCount}人分のCP/tierデータと、${dailyDaysCount}日分の日報を反映しました`);
}

(async function(){
  document.getElementById('view-admin').innerHTML = '<div class="empty">読み込み中...</div>';
  await initPage();
})();
