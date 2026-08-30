/* =========================================================
 * 成都智慧象留学 - 家长端逻辑（只读学习摘要）
 * 家长凭家长账号登录后可查看孩子的进度、评语与成绩摘要。
 * 数据全部来自 /api/parent/summary（RBAC：仅限授权学员）。
 * ========================================================= */
(function () {
  'use strict';

  var S = window.ZHXX;
  var Auth = window.ZHXX_Auth;
  var Data = window.ZHXX_Data;

  var RING_CIRCUM = 2 * Math.PI * 70; // 与页面 SVG r=70 保持一致

  function renderProfile(st) {
    var avatar = document.getElementById('parent-avatar');
    avatar.style.background = S.avatarColor(st.name);
    avatar.textContent = S.firstChar(st.name);
    document.getElementById('topbar-user').textContent = st.name + '的家长';
    document.getElementById('parent-name').textContent = st.name;
    document.getElementById('parent-meta').innerHTML =
      '<span>学号 ' + S.esc(st.studentNo) + '</span>' +
      '<span>' + S.esc(st.grade) + ' · ' + S.esc(st.className) + '</span>' +
      '<span>' + (st.subjects || []).map(S.esc).join(' / ') + '</span>';

    var stageTag = document.getElementById('parent-stage');
    stageTag.textContent = st.stage;
    stageTag.className = 'tag ' + S.stageClass(st.stage);
    stageTag.style.fontSize = '13px';
    stageTag.style.padding = '5px 16px';

    document.getElementById('parent-goal').textContent = st.goal || '—';
    document.getElementById('parent-week-hours').textContent = S.totalWeeklyHours(st);
    document.getElementById('parent-subject-count').textContent = (st.subjects || []).length;

    var value = document.getElementById('ring-value');
    value.innerHTML = Math.round(st.progress) + '<span class="unit">%</span>';
    var circle = document.getElementById('ring-fill');
    var offset = RING_CIRCUM * (1 - (Number(st.progress) || 0) / 100);
    setTimeout(function () {
      circle.setAttribute('stroke-dashoffset', String(Math.round(offset * 100) / 100));
    }, 80);

    // 阶段轨道
    var stages = window.STAGE_LIST || ['基础期', '强化期', '冲刺期'];
    var idx = stages.indexOf(st.stage);
    var html = '';
    for (var i = 0; i < stages.length; i++) {
      var cls = 'stage-step';
      if (i < idx) { cls += ' done'; }
      if (i === idx) { cls += ' current'; }
      html += '<div class="' + cls + '"><div class="s-dot"></div>' + S.esc(stages[i]) + '</div>';
      if (i < stages.length - 1) {
        html += '<div class="stage-line' + (i < idx ? ' done' : '') + '"></div>';
      }
    }
    document.getElementById('stage-track').innerHTML = html;
  }

  function renderComments(comments) {
    var box = document.getElementById('comment-list');
    if (!comments || !comments.length) {
      box.innerHTML = '<div class="empty-tip" style="padding:24px 0;">老师还没有留下评语，请耐心等待</div>';
      return;
    }
    box.innerHTML = comments.map(function (c) {
      return '<div class="tl-item">' +
        '<div class="tl-card">' +
          '<div class="tl-top">' +
            '<span class="tl-date">' + S.esc(S.fmtDateCN(c.date)) + '</span>' +
            '<span>' + S.esc(c.subject) + '</span>' +
          '</div>' +
          '<div class="tl-comment"><span class="c-label">教师评语</span>' + S.esc(c.comment) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderExams(exams) {
    var box = document.getElementById('exam-cards');
    if (!exams || !exams.length) {
      box.innerHTML = '<div class="empty-tip" style="grid-column:1/-1;">暂无测评成绩</div>';
      return;
    }
    box.innerHTML = exams.map(function (e) {
      var score = Number(e.score);
      var val = score < 10 ? score.toFixed(1) : String(score);
      var good = score >= 10 ? (score >= 80 || score >= 600) : score >= 6;
      return '<div class="exam-card">' +
        '<span class="exam-score' + (good ? '' : ' mid') + '">' + val + '</span>' +
        '<div class="exam-info">' +
          '<div class="e-subject">' + S.esc(e.subject) + ' · ' + S.esc(e.stage) + '</div>' +
          '<div class="e-meta">测评日期 ' + S.esc(S.fmtDateCN(e.date)) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function start() {
    var auth = Auth.require('parent');
    if (!auth) { return; }

    Data.parentSummary().then(function (data) {
      document.getElementById('parent-page').style.display = 'block';
      document.getElementById('page-footer').style.display = 'block';
      renderProfile(data.student);
      renderComments(data.recentComments);
      renderExams(data.latestExams);
    }).catch(function (err) {
      if (err && err.status === 401) { Auth.logout(); return; }
      S.toast((err && err.message) || '数据加载失败，请刷新页面重试', 'warn');
    });
  }

  window.ZHXX_READY.then(start);
})();
