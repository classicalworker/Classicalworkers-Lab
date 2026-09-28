function switchRankingSubTab(subTab){
  rankingSubTab = subTab;
  renderRanking();
}

function switchRankingRecordSubTab(subTab){
  rankingRecordSubTab = subTab;
  renderRanking();
}

function renderRanking(){
  const el = document.getElementById('view-ranking');
  const names = Object.keys(data.players);

  const subTabsHtml = `
    <div class="sub-tabs">
      <div class="sub-tab ${rankingSubTab === 'winrate' ? 'active' : ''}" onclick="switchRankingSubTab('winrate')">🏆 対戦成績</div>
      <div class="sub-tab ${rankingSubTab === 'mr' ? 'active' : ''}" onclick="switchRankingSubTab('mr')">📊 MRランキング</div>
      <div class="sub-tab ${rankingSubTab === 'battles' ? 'active' : ''}" onclick="switchRankingSubTab('battles')">🎮 試合数ランキング</div>
    </div>
  `;

  if(rankingSubTab === 'battles'){
    const withBattles = names
      .filter(n => data.players[n].actBattleCount && Number(data.players[n].actBattleCount) > 0)
      .map(n => ({
        name: n,
        count: parseInt(data.players[n].actBattleCount, 10) || 0,
        actNumber: data.players[n].currentActNumber || '',
        previousCount: data.players[n].previousActBattleCount,
        previousRank: data.players[n].previousBattleRank
      }));

    if(withBattles.length === 0){
      el.innerHTML = subTabsHtml + '<div class="empty">試合数が登録されているプレイヤーはいません</div>';
      return;
    }

    withBattles.sort((a,b) => b.count - a.count);
    const actLabel = withBattles[0].actNumber ? `ACT${withBattles[0].actNumber}` : '今シーズン';

    let html = '';
    withBattles.forEach((p, i) => {
      const rankLabel = i + 1;
      const medal = rankLabel === 1 ? '🥇' : rankLabel === 2 ? '🥈' : rankLabel === 3 ? '🥉' : `#${rankLabel}`;
      const countBadge = valueDeltaBadgeHtml(p.previousCount, p.count, '戦');
      const rankBadge = rankDeltaBadgeHtml(p.previousRank, rankLabel);
      html += `
        <div class="rank-card ${rankLabel === 1 ? 'r1' : ''}" onclick="goToMember('${p.name.replace(/'/g,"\\'")}')">
          <div class="rank-num-wrap">
            <div class="rank-num">${medal}</div>
            ${rankBadge}
          </div>
          ${data.players[p.name].icon ? `<img class="member-icon" src="${data.players[p.name].icon}" alt="">` : `<div class="member-icon" style="display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
          <div class="rank-body">
            <div class="rank-top">
              <span class="rank-name">${escapeHtml(p.name)}</span>
              <span class="rank-meta" style="font-size:24px;font-weight:800;">${p.count}<span style="font-size:13px;font-weight:600;color:var(--text-dim);margin-left:2px;">戦</span>${countBadge}</span>
            </div>
            ${memberMetaChipsHtml(data.players[p.name])}
          </div>
        </div>`;
    });

    el.innerHTML = subTabsHtml + `
      <div style="margin-bottom:16px;text-align:center;font-size:13px;color:var(--text-dim)">
        ${escapeHtml(actLabel)}の試合数（登録者 ${withBattles.length}名）
      </div>
      ${html}
    `;
    return;
  }

  if(rankingSubTab === 'mr'){
    const withMR = names
      .filter(n => data.players[n].currentMR && String(data.players[n].currentMR).trim() !== '')
      .map(n => ({
        name: n,
        mr: parseInt(data.players[n].currentMR, 10) || 0,
        previousMR: data.players[n].previousMR,
        previousRank: data.players[n].previousMRRank
      }))
      .filter(p => p.mr > 0);

    if(withMR.length === 0){
      el.innerHTML = subTabsHtml + '<div class="empty">MRが登録されているプレイヤーはいません</div>';
      return;
    }

    withMR.sort((a,b) => b.mr - a.mr);

    let html = '';
    withMR.forEach((p, i) => {
      const color = getMRColor(p.mr);
      const rankLabel = i + 1;
      const medal = rankLabel === 1 ? '🥇' : rankLabel === 2 ? '🥈' : rankLabel === 3 ? '🥉' : `#${rankLabel}`;
      const mrBadge = valueDeltaBadgeHtml(p.previousMR, p.mr, '');
      const rankBadge = rankDeltaBadgeHtml(p.previousRank, rankLabel);

      html += `
        <div class="rank-card ${rankLabel === 1 ? 'r1' : ''}" onclick="goToMember('${p.name.replace(/'/g,"\\'")}')">
          <div class="rank-num-wrap">
            <div class="rank-num" style="color:${color}">${medal}</div>
            ${rankBadge}
          </div>
          ${data.players[p.name].icon ? `<img class="member-icon" src="${data.players[p.name].icon}" alt="">` : `<div class="member-icon" style="display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
          <div class="rank-body">
            <div class="rank-top">
              <span class="rank-name">${escapeHtml(p.name)}</span>
              <span class="rank-meta" style="font-size:26px;font-weight:800;color:${color}">${p.mr}${mrBadge}</span>
            </div>
            ${memberMetaChipsHtml(data.players[p.name])}
          </div>
        </div>`;
    });

    const avgMR = withMR.reduce((sum, p) => sum + p.mr, 0) / withMR.length;
    const avgColor = getMRColor(avgMR);

    el.innerHTML = subTabsHtml + `
      <div style="margin-bottom:16px;text-align:center;font-size:13px;color:var(--text-dim)">
        平均MR: <span style="font-weight:800;color:${avgColor};font-size:18px">${avgMR.toFixed(0)}</span>
        （登録者 ${withMR.length}名）
      </div>
      ${html}
    `;
    return;
  }

  // ===== 対戦成績(旧・勝率ランキング) =====
  // 対抗戦成績 / 身内イベント成績 / 総合成績 の3つに絞り込める。
  // 規定試合数の計算式(開催された対抗戦数 × 50% + 1)はどの絞り込みでも共通で従来通り(表示はしない)。
  const required = getRequiredMatchCount();

  const recordTabsHtml = `
    <div class="sub-tabs" style="margin-top:-6px;">
      <div class="sub-tab ${rankingRecordSubTab === 'interteam' ? 'active' : ''}" onclick="switchRankingRecordSubTab('interteam')">🆚 対抗戦成績</div>
      <div class="sub-tab ${rankingRecordSubTab === 'internal' ? 'active' : ''}" onclick="switchRankingRecordSubTab('internal')">🏠 身内イベント成績</div>
      <div class="sub-tab ${rankingRecordSubTab === 'all' ? 'active' : ''}" onclick="switchRankingRecordSubTab('all')">📋 総合成績</div>
    </div>
  `;

  // 絞り込みモードごとに、集計対象カテゴリ・規定試合の分子カウント・表示ラベルを切り替える
  let categories, tagLabel;
  if(rankingRecordSubTab === 'internal'){
    categories = ['internal'];
    tagLabel = '身内イベントのみ';
  } else if(rankingRecordSubTab === 'all'){
    categories = ['interteam','internal']; // 総合成績は対抗戦・身内イベント両方のタグ付き対戦を集計する
    tagLabel = '対抗戦+身内イベント';
  } else {
    categories = ['interteam'];
    tagLabel = '対抗戦のみ';
  }
  // 総合成績では「直近の対戦結果」は表示せず、代わりに参加率を表示する
  const showLatestMatch = rankingRecordSubTab !== 'all';

  const withMatches = names.filter(n => (data.players[n].matches||[]).length>0);
  const withoutMatches = names.filter(n => (data.players[n].matches||[]).length===0);

  const withMatchesInfo = withMatches.map(n=>{
    const p = data.players[n];
    const s = computeStatsForCategory(p, categories);
    let interCount;
    if(rankingRecordSubTab === 'internal') interCount = getPlayerInternalMatchCount(p);
    else if(rankingRecordSubTab === 'all') interCount = getPlayerInterTeamMatchCount(p) + getPlayerInternalMatchCount(p);
    else interCount = getPlayerInterTeamMatchCount(p);
    return {name:n, s, interCount, reached: interCount >= required};
  });

  // 規定到達済みのメンバーを優先し、その中で勝率(同率なら勝ち数)が高い順に並べる。
  // 規定未到達のメンバーは、勝率が上であっても規定到達者より下にくる。
  withMatchesInfo.sort((a,b)=>{
    if(a.reached !== b.reached) return a.reached ? -1 : 1;
    if(b.s.winRate !== a.s.winRate) return b.s.winRate - a.s.winRate;
    return b.s.wins - a.s.wins;
  });
  withoutMatches.sort((a,b)=>a.localeCompare(b,'ja'));

  const infoByName = {};
  withMatchesInfo.forEach(x=>{ infoByName[x.name] = x; });

  const ordered = [...withMatchesInfo.map(x=>x.name), ...withoutMatches];

  if(ordered.length===0){
    el.innerHTML = subTabsHtml + recordTabsHtml + '<div class="empty">まだ参加者がいません。マイページから登録してください。</div>';
    return;
  }

  let html = '';
  ordered.forEach((name, i)=>{
    const info = infoByName[name];
    const s = info ? info.s : {total:0, wins:0, winRate:0};
    const interCount = info ? info.interCount : 0;
    const reached = info ? info.reached : false;
    const rankLabel = s.total>0 ? (i+1) : '–';
    const regulationBadge = s.total>0
      ? (reached
          ? `<span class="pill" style="background:rgba(var(--win-rgb),.12);color:var(--win);">規定到達</span>`
          : `<span class="pill" style="background:rgba(var(--loss-rgb),.1);color:var(--loss);">規定未到達</span>`)
      : '';

    // 2つ目のボックス: 対抗戦/身内イベント成績では「直近の対戦結果」、総合成績では「参加率」を表示
    let secondBoxHtml;
    if(showLatestMatch){
      const latest = getPlayerLatestMatch(data.players[name], categories);
      secondBoxHtml = `
        <div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
          <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">直近の対戦結果</div>
          ${latest
            ? `<div style="font-size:16px;font-weight:800;color:${latest.result==='win'?'var(--win)':'var(--loss)'};">${latest.result==='win'?'勝ち':'負け'}</div>
               <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">vs ${escapeHtml(latest.opponent||'')}${latest.score?`(${escapeHtml(latest.score)})`:''}</div>`
            : `<div style="font-size:14px;font-weight:700;color:var(--text-dim);margin-top:4px;">記録なし</div>`
          }
        </div>`;
    } else {
      const participation = getPlayerParticipationRate(name, categories);
      secondBoxHtml = `
        <div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
          <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">参加率</div>
          <div style="font-size:20px;font-weight:800;color:var(--goal);">${participation!==null ? participation.toFixed(0)+'%' : '—'}</div>
        </div>`;
    }

    html += `
      <div class="rank-card ${i===0 && s.total>0 && reached ? 'r1':''}" onclick="goToMember('${name.replace(/'/g,"\\'")}')">
        <div class="rank-num">${rankLabel}</div>
        ${data.players[name].icon ? `<img class="member-icon" src="${data.players[name].icon}" alt="">` : `<div class="member-icon" style="display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
        <div class="rank-body">
          <div class="rank-top">
            <span class="rank-name">${escapeHtml(name)}</span>
            <span class="rank-meta">${s.total}戦 ${s.wins}勝</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px;">
            <div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
              <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">勝率</div>
              <div style="font-size:20px;font-weight:800;color:var(--win);">${s.winRate.toFixed(0)}%</div>
            </div>
            ${secondBoxHtml}
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;">
            <span style="font-size:11px;color:var(--text-dim);">規定試合 ${required}試合中 ${interCount}試合(${tagLabel})</span>
            ${regulationBadge}
          </div>
          ${memberMetaChipsHtml(data.players[name])}
        </div>
      </div>`;
  });

  el.innerHTML = subTabsHtml + recordTabsHtml + `
    <div style="margin-bottom:16px;text-align:center;font-size:13px;color:var(--text-dim)">
      規定試合 <span style="font-weight:800;color:var(--gold);font-size:16px">${required}試合</span>
      (集計対象:${tagLabel})
    </div>
    ${html}
  `;
}



function renderCurrentPage(){
  renderRanking();
}

(async function(){
  document.getElementById('view-ranking').innerHTML = '<div class="empty">読み込み中...</div>';
  await initPage();
})();
