function switchRankingSubTab(subTab){
  rankingSubTab = subTab;
  renderRanking();
}

function switchRankingMRSubTab(subTab){
  rankingMRSubTab = subTab;
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
    const actLabel = `Act${getCurrentActNumber()}`;

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
    const actNo = getCurrentActNumber();
    const mrSubTabsHtml = `
      <div class="sub-tabs">
        <div class="sub-tab ${rankingMRSubTab === 'max' ? 'active' : ''}" onclick="switchRankingMRSubTab('max')">👑 最高MRランキング</div>
        <div class="sub-tab ${rankingMRSubTab === 'act' ? 'active' : ''}" onclick="switchRankingMRSubTab('act')">📊 Act${actNo}ランキング</div>
      </div>`;
    const head = subTabsHtml + mrSubTabsHtml;

    // 共通: 1行分のカードHTML
    const mrCardHtml = (p, rankLabel, mrBadge, rankBadge) => {
      const color = getMRColor(p.mr);
      const medal = rankLabel === 1 ? '🥇' : rankLabel === 2 ? '🥈' : rankLabel === 3 ? '🥉' : `#${rankLabel}`;
      return `
        <div class="rank-card ${rankLabel === 1 ? 'r1' : ''}" onclick="goToMember('${p.name.replace(/'/g,"\\'")}')">
          <div class="rank-num-wrap">
            <div class="rank-num" style="color:${color}">${medal}</div>
            ${rankBadge}
          </div>
          ${data.players[p.name].icon ? `<img class="member-icon" src="${data.players[p.name].icon}" alt="">` : `<div class="member-icon" style="display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
          <div class="rank-body">
            <div class="rank-top">
              <span class="rank-name">${escapeHtml(p.name)}${mrRankTitleHtmlByValue(p.mr)}</span>
              <span class="rank-meta" style="font-size:26px;font-weight:800;color:${color}">${p.mr}${mrBadge}</span>
            </div>
            ${memberMetaChipsHtml(data.players[p.name])}
          </div>
        </div>`;
    };
    const summaryHtml = (label, list) => {
      const avg = list.reduce((sum, p) => sum + p.mr, 0) / list.length;
      return `
        <div style="margin-bottom:16px;text-align:center;font-size:13px;color:var(--text-dim)">
          ${label} 平均: <span style="font-weight:800;color:${getMRColor(avg)};font-size:18px">${avg.toFixed(0)}</span>
          （登録者 ${list.length}名）
        </div>`;
    };

    if(rankingMRSubTab === 'max'){
      // 最高MR: 管理者/自動更新で登録された maxMR と、記録された現在MR(currentMR)のうち高い方を採用する
      const withMax = names
        .map(n => {
          const pl = data.players[n];
          const mx = parseInt(pl.maxMR, 10) || 0;
          const cur = parseInt(pl.currentMR, 10) || 0;
          return { name: n, mr: Math.max(mx, cur) };
        })
        .filter(p => p.mr > 0)
        .sort((a,b) => b.mr - a.mr);

      if(withMax.length === 0){
        el.innerHTML = head + '<div class="empty">最高MRが登録されているプレイヤーはいません</div>';
        return;
      }
      el.innerHTML = head + summaryHtml('最高MR', withMax)
        + withMax.map((p, i) => mrCardHtml(p, i + 1, '', '')).join('');
      return;
    }

    // Act〇〇ランキング: 現時点のMR(currentMR)で並べる。前日比も表示する。
    const withMR = names
      .filter(n => data.players[n].currentMR && String(data.players[n].currentMR).trim() !== '')
      .map(n => ({
        name: n,
        mr: parseInt(data.players[n].currentMR, 10) || 0,
        previousMR: data.players[n].previousMR,
        previousRank: data.players[n].previousMRRank
      }))
      .filter(p => p.mr > 0)
      .sort((a,b) => b.mr - a.mr);

    if(withMR.length === 0){
      el.innerHTML = head + `<div class="empty">Act${actNo}のMRが登録されているプレイヤーはいません</div>`;
      return;
    }
    el.innerHTML = head + summaryHtml(`Act${actNo} 現在MR`, withMR)
      + withMR.map((p, i) => mrCardHtml(p, i + 1,
          valueDeltaBadgeHtml(p.previousMR, p.mr, ''),
          rankDeltaBadgeHtml(p.previousRank, i + 1))).join('');
    return;
  }

  // ===== 対戦成績(旧・勝率ランキング) =====
  // 対抗戦成績 / 身内イベント成績 / 総合成績 の3つに絞り込める。
  const recordTabsHtml = `
    <div class="sub-tabs" style="margin-top:-6px;">
      <div class="sub-tab ${rankingRecordSubTab === 'interteam' ? 'active' : ''}" onclick="switchRankingRecordSubTab('interteam')">🆚 対抗戦成績</div>
      <div class="sub-tab ${rankingRecordSubTab === 'internal' ? 'active' : ''}" onclick="switchRankingRecordSubTab('internal')">🏠 身内イベント成績</div>
      <div class="sub-tab ${rankingRecordSubTab === 'all' ? 'active' : ''}" onclick="switchRankingRecordSubTab('all')">📋 総合成績</div>
    </div>
  `;

  // ---- 📋 総合成績: 規定試合の判定は行わず、参加率が高い順に並べる ----
  if(rankingRecordSubTab === 'all'){
    const categories = ['interteam','internal'];

    const list = names.map(n=>{
      const p = data.players[n];
      const s = computeStatsForCategory(p, categories);
      const participation = getPlayerParticipationRate(n, categories);
      return {name:n, s, participation};
    });

    // 主催など「参考記録」扱いのメンバーはランキングから外し、最下段に固定する
    const reference = list.filter(x => RANKING_REFERENCE_ONLY_NAMES.includes(x.name));
    const ranked = list.filter(x => !RANKING_REFERENCE_ONLY_NAMES.includes(x.name));

    // 参加率が高い順(参加率がまだ算出できないメンバーは最後に回す)。同率の場合は勝率→勝ち数で比較
    ranked.sort((a,b)=>{
      const pa = a.participation===null ? -1 : a.participation;
      const pb = b.participation===null ? -1 : b.participation;
      if(pb !== pa) return pb - pa;
      if(b.s.winRate !== a.s.winRate) return b.s.winRate - a.s.winRate;
      return b.s.wins - a.s.wins;
    });
    reference.sort((a,b)=>a.name.localeCompare(b.name,'ja'));

    const finalList = [...ranked, ...reference];

    if(finalList.length===0){
      el.innerHTML = subTabsHtml + recordTabsHtml + '<div class="empty">まだ参加者がいません。マイページから登録してください。</div>';
      return;
    }

    let html = '';
    finalList.forEach((info)=>{
      const isReference = RANKING_REFERENCE_ONLY_NAMES.includes(info.name);
      const rankIndex = isReference ? -1 : ranked.indexOf(info);
      const rankLabel = isReference ? '—' : (rankIndex + 1);
      const referenceBadge = isReference
        ? `<span class="pill" style="background:rgba(232,178,61,.12);color:var(--gold);">主催・参考記録</span>`
        : '';
      html += `
        <div class="rank-card ${!isReference && rankIndex===0 ? 'r1':''}" onclick="goToMember('${info.name.replace(/'/g,"\\'")}')">
          <div class="rank-num">${rankLabel}</div>
          ${data.players[info.name].icon ? `<img class="member-icon" src="${data.players[info.name].icon}" alt="">` : `<div class="member-icon" style="display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
          <div class="rank-body">
            <div class="rank-top">
              <span class="rank-name">${escapeHtml(info.name)}</span>
              ${referenceBadge}
            </div>
            <div style="display:flex;gap:8px;margin-top:6px;">
              <div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
                <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">勝率</div>
                <div style="font-size:20px;font-weight:800;color:var(--win);">${info.s.winRate.toFixed(0)}%</div>
              </div>
              <div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
                <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">参加率</div>
                <div style="font-size:20px;font-weight:800;color:var(--goal);">${info.participation!==null ? info.participation.toFixed(0)+'%' : '—'}</div>
              </div>
              <div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
                <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">戦績</div>
                <div style="font-size:20px;font-weight:800;color:var(--text);">${info.s.total}戦${info.s.wins}勝</div>
              </div>
            </div>
            ${memberMetaChipsHtml(data.players[info.name])}
          </div>
        </div>`;
    });

    el.innerHTML = subTabsHtml + recordTabsHtml + `
      <div style="margin-bottom:16px;text-align:center;font-size:13px;color:var(--text-dim)">
        参加率が高い順に表示しています(集計対象:対抗戦+身内イベント)
      </div>
      ${html}
    `;
    return;
  }

  // ---- 🆚 対抗戦成績 / 🏠 身内イベント成績: 規定試合の到達判定つき ----
  const required = getRequiredMatchCount();

  let categories, tagLabel;
  if(rankingRecordSubTab === 'internal'){
    categories = ['internal'];
    tagLabel = '身内イベントのみ';
  } else {
    categories = ['interteam'];
    tagLabel = '対抗戦のみ';
  }

  const withMatches = names.filter(n => (data.players[n].matches||[]).length>0);
  const withoutMatches = names.filter(n => (data.players[n].matches||[]).length===0);

  const withMatchesInfo = withMatches.map(n=>{
    const p = data.players[n];
    const s = computeStatsForCategory(p, categories);
    const interCount = rankingRecordSubTab === 'internal' ? getPlayerInternalMatchCount(p) : getPlayerInterTeamMatchCount(p);
    return {name:n, s, interCount, reached: interCount >= required};
  });

  // 規定到達済みのメンバーを優先し、その中で勝率(同率なら勝ち数)が高い順に並べる。
  // 規定未到達のメンバーは、勝率が上であっても規定到達者より下にくる。
  // ※「参考記録」扱い(主催など)の特別対応は総合成績タブのみで行うため、ここでは通常通り順位に含める。
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
    const p = data.players[name];
    const s = info ? info.s : {total:0, wins:0, winRate:0};
    const interCount = info ? info.interCount : 0;
    const reached = info ? info.reached : false;
    const rankLabel = s.total>0 ? (i+1) : '–';

    // 直近の対戦結果(対戦相手を大きく、勝敗は小さく添える。大会名・相手MRも表示する)
    const latest = getPlayerLatestMatch(p, categories);
    // 自分の最高MRより格上の相手に勝利、または、ストレート勝利(1-0を除く)の場合は特別演出をつける(どちらか一方でよい)
    const notableInfo = getNotableWinInfo(latest, p.maxMR);
    const notableLabel = notableInfo.isUpset && notableInfo.isStraight
      ? '⚡格上ストレート勝利'
      : notableInfo.isUpset
        ? '⚡格上撃破'
        : notableInfo.isStraight
          ? '⚡ストレート勝利'
          : '';
    const latestDetailHtml = latest
      ? `<div class="latest-match-detail">${latest.eventName ? `<div class="latest-match-event">🏷 ${escapeHtml(latest.eventName)}</div>` : ''}${latest.opponentMR ? `<div class="latest-match-oppmr">相手MR ${escapeHtml(latest.opponentMR)}</div>` : ''}</div>`
      : '';
    const latestMatchBoxHtml = `
      <div class="${notableInfo.notable ? 'latest-match-upset' : ''}" style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.04);border-radius:8px;">
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:2px;">直近の対戦結果${notableInfo.notable ? ' 🔥' : ''}</div>
        ${latest
          ? `<div style="font-size:16px;font-weight:800;color:var(--text);">vs ${escapeHtml(latest.opponent||'')}</div>
             <div style="font-size:10px;font-weight:700;color:${latest.result==='win'?'var(--win)':'var(--loss)'};margin-top:2px;">${latest.result==='win'?'勝ち':'負け'}${latest.score?`(${escapeHtml(latest.score)})`:''}</div>
             ${latestDetailHtml}
             ${notableInfo.notable ? `<div style="font-size:9px;font-weight:800;color:var(--gold);margin-top:3px;">${notableLabel}</div>` : ''}`
          : `<div style="font-size:14px;font-weight:700;color:var(--text-dim);margin-top:4px;">記録なし</div>`
        }
      </div>`;

    const regulationBadge = s.total>0
      ? (reached
          ? `<span class="pill" style="background:rgba(var(--win-rgb),.12);color:var(--win);">規定到達</span>`
          : `<span class="pill" style="background:rgba(var(--loss-rgb),.1);color:var(--loss);">規定未到達</span>`)
      : '';

    html += `
      <div class="rank-card ${i===0 && s.total>0 && reached ? 'r1':''}" onclick="goToMember('${name.replace(/'/g,"\\'")}')">
        <div class="rank-num">${rankLabel}</div>
        ${p.icon ? `<img class="member-icon" src="${p.icon}" alt="">` : `<div class="member-icon" style="display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
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
            ${latestMatchBoxHtml}
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;">
            <span style="font-size:11px;color:var(--text-dim);">規定試合 ${required}試合中 ${interCount}試合(${tagLabel})</span>
            ${regulationBadge}
          </div>
          ${memberMetaChipsHtml(p)}
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
