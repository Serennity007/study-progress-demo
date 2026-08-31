/* =========================================================
 * 成都智慧象留学 - 学员端逻辑（我的备考档案）
 * 登录身份保存在 sessionStorage；未登录直接访问将跳回登录页。
 * ========================================================= */
(function () {
  'use strict';

  var S = window.ZHXX;
  var Store = window.ZHXX_Store;
  var Auth = window.ZHXX_Auth;

  var RING_CIRCUM = 2 * Math.PI * 70; // 与页面 SVG r=70 保持一致

  /** 从 URL 读取学员 id */
  function getIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
  }

  /** 头像 */
  function renderAvatar(s) {
    var el = document.getElementById('profile-avatar');
    el.style.background = S.avatarColor(s.name);
    el.textContent = S.firstChar(s.name);
  }

  /** 个人信息头部 */
  function renderProfile(s) {
    renderAvatar(s);
    document.getElementById('topbar-user').textContent = s.name;
    document.getElementById('profile-name').textContent = s.name;
    document.getElementById('profile-meta').innerHTML =
      '<span>学号 ' + S.esc(s.studentNo) + '</span>' +
      '<span>' + S.esc(s.grade) + ' · ' + S.esc(s.className) + '</span>' +
      '<span>' + s.subjects.map(S.esc).join(' / ') + '</span>' +
      '<span>入学日期 ' + S.esc(s.enrollDate) + '</span>';

    var stageTag = document.getElementById('profile-stage');
    stageTag.textContent = s.stage;
    stageTag.className = 'tag ' + S.stageClass(s.stage);
    stageTag.style.fontSize = '13px';
    stageTag.style.padding = '5px 16px';

    document.getElementById('profile-goal').textContent = s.goal;
    document.getElementById('profile-week-hours').textContent = S.totalWeeklyHours(s);
    document.getElementById('profile-record-count').textContent = (s.records || []).length;
    document.getElementById('profile-exam-count').textContent = (s.exams || []).length;
  }

  /** 进度环形图（进入后动画填充） */
  function renderRing(progress) {
    var circle = document.getElementById('ring-fill');
    var value = document.getElementById('ring-value');
    value.innerHTML = Math.round(progress) + '<span class="unit">%</span>';
    var offset = RING_CIRCUM * (1 - progress / 100);
    // 触发过渡动画
    setTimeout(function () {
      circle.setAttribute('stroke-dashoffset', String(Math.round(offset * 100) / 100));
    }, 80);
  }

  /** 阶段轨道：基础期 → 强化期 → 冲刺期 */
  function renderStageTrack(stage) {
    var stages = window.STAGE_LIST || ['基础期', '强化期', '冲刺期'];
    var idx = stages.indexOf(stage);
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

  /** 学习记录时间线 */
  function renderTimeline(s) {
    var records = s.records || [];
    document.getElementById('timeline-count').textContent = records.length;
    var box = document.getElementById('timeline');
    if (!records.length) {
      box.innerHTML = '<div class="empty-tip" style="padding:24px 0;">暂无学习记录</div>';
      return;
    }
    box.innerHTML = records.map(function (r) {
      var statusTag = r.status === '待评阅'
        ? '<span class="tag tag-pending tl-status">待评阅</span>'
        : '<span class="tag tag-done tl-status">已完成</span>';
      var commentHtml = r.comment
        ? '<div class="tl-comment"><span class="c-label">教师评语</span>' + S.esc(r.comment) + '</div>'
        : '';
      var cls = r.status === '待评阅' ? 'tl-item tl-pending' : 'tl-item';
      return '<div class="' + cls + '">' +
        '<div class="tl-card">' +
          '<div class="tl-top">' +
            '<span class="tl-date">' + S.esc(S.fmtDateCN(r.date)) + '</span>' +
            '<span>' + S.esc(r.subject) + '</span>' +
            '<span>时长 ' + Number(r.duration) + ' 小时</span>' +
            statusTag +
          '</div>' +
          '<div class="tl-content">' + S.esc(r.content) + '</div>' +
          commentHtml +
        '</div>' +
      '</div>';
    }).join('');
  }

  /** 阶段测评成绩卡片 */
  function renderExams(s) {
    var exams = (s.exams || []).slice().sort(function (a, b) { return b.date > a.date ? 1 : -1; });
    var box = document.getElementById('exam-cards');
    if (!exams.length) {
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

  /** 本周学习时长柱状图（纯 CSS） */
  function renderWeeklyBars(s) {
    var hours = s.weeklyHours || [0, 0, 0, 0, 0, 0, 0];
    var labels = S.weekDayLabels();
    var todayIdx = (new Date().getDay() + 6) % 7; // 周一=0
    var max = 0;
    for (var i = 0; i < hours.length; i++) { max = Math.max(max, Number(hours[i]) || 0); }
    if (max <= 0) { max = 1; }

    var html = '';
    for (var j = 0; j < hours.length; j++) {
      var h = Math.round((Number(hours[j]) || 0) / max * 100);
      var colCls = 'bar-col' + (j >= 5 ? ' weekend' : '');
      html += '<div class="' + colCls + '" title="' + labels[j] + ' ' + hours[j] + ' 小时">' +
        '<span class="bar-val">' + Number(hours[j]).toFixed(1) + '</span>' +
        '<div class="bar" style="height:' + Math.max(h, 3) + '%;"></div>' +
        '<span class="bar-label' + (j === todayIdx ? ' today' : '') + '">' + labels[j] + '</span>' +
      '</div>';
    }
    document.getElementById('bar-chart').innerHTML = html;
  }

  /** 启动 */
  function start() {
    // 登录守卫：未登录直接访问将跳回登录页
    var auth = Auth.require('student');
    if (!auth) { return; }

    // 身份只允许是自己：URL 里的 id 与登录身份不一致时纠正
    var urlId = getIdFromUrl();
    if (urlId && urlId !== auth.id) {
      window.location.replace('student.html?id=' + encodeURIComponent(auth.id));
      return;
    }

    // 服务端模式：拉取权威数据（RBAC：后端仅返回本人）；演示模式直接用本地数据
    window.ZHXX_Data.bootstrap().then(function (data) {
      if (data) {
        Store.useServerData(data.students);
        window.ZHXX.setSubjectGroups(data.subjects);
      }
      var s = Store.getById(auth.id);
      if (!s) {
        Auth.logout();
        return;
      }
      document.getElementById('student-page').style.display = 'block';
      document.getElementById('page-footer').style.display = 'block';
      renderProfile(s);
      renderRing(Number(s.progress) || 0);
      renderRingNote(s);
      renderStageTrack(s.stage);
      renderCourseProgress(s);
      renderTimeline(s);
      renderExams(s);
      renderWeeklyBars(s);
    }).catch(function () {
      window.ZHXX.toast('数据加载失败，请刷新页面重试', 'warn');
    });
  }

  /** 进度换算说明（含距 100% 缺口 / 目标达成） */
  function renderRingNote(s) {
    var note = document.getElementById('ring-note');
    if (!note) { return; }
    var pd = s.progressDetail;
    if (!pd) {
      note.textContent = '口径：学习记录 +1 · 阶段测评 +2，上限 99%';
      return;
    }
    if (pd.achieved) {
      note.innerHTML = '换算：学习时长 ' + pd.hoursDone + '/' + pd.targetHours + 'h（' + pd.hoursRatio + '%）· 测评 ' + pd.examsDone + '/' + pd.targetExams + ' 次（' + pd.examsRatio + '%）· <b style="color:#8A6D2F;">目标已达成 100%</b>';
      return;
    }
    var gaps = [];
    if (pd.hoursGap > 0) { gaps.push('再学 ' + pd.hoursGap + ' 小时'); }
    if (pd.examsGap > 0) { gaps.push('再考 ' + pd.examsGap + ' 次'); }
    note.innerHTML = '换算：学习时长 ' + pd.hoursDone + '/' + pd.targetHours + 'h（' + pd.hoursRatio + '%）· 测评 ' + pd.examsDone + '/' + pd.targetExams + ' 次（' + pd.examsRatio + '%）' +
      (gaps.length ? ' · 距 100% 还' + gaps.join('、') : '');
  }

  /** 课程进度「学到哪里」（逐科目展示） */
  function renderCourseProgress(s) {
    var box = document.getElementById('course-progress-list');
    if (!box) { return; }
    var marks = s.courseProgress || [];
    document.getElementById('course-progress').style.display = 'block';
    document.getElementById('course-progress-list').style.display = 'block';
    var rows = (s.subjects || []).map(function (sub) {
      var hit = null;
      for (var i = 0; i < marks.length; i++) {
        if (marks[i].subject === sub) { hit = marks[i]; break; }
      }
      var mark = hit && hit.mark ? S.esc(hit.mark) : '老师还没有登记进度';
      return '<div class="tl-item"><div class="tl-card">' +
        '<div class="tl-top"><span>' + S.esc(sub) + '</span></div>' +
        '<div class="tl-content">' + mark + '</div>' +
        '</div></div>';
    }).join('');
    box.innerHTML = rows || '<div class="empty-tip" style="padding:24px 0;">暂无课程</div>';
  }

  window.ZHXX_READY.then(start);
})();
