/* =========================================================
 * 成都智慧象留学 - 老师端逻辑
 * 未登录访问将自动跳回登录页（见 ZHXX_Auth.require）。
 * 所有写操作经 ZHXX_Data（服务端模式走 API 落库；演示模式走本地 sessionStorage）。
 * ========================================================= */
(function () {
  'use strict';

  var S = window.ZHXX;
  var Store = window.ZHXX_Store;
  var Auth = window.ZHXX_Auth;
  var Data = window.ZHXX_Data;

  var state = {
    students: [],
    keyword: '',
    stage: '全部',
    klass: '全部',
    subject: '全部',
    showInactive: false,
    currentId: null,
    newRecordIndex: null,
    config: { classes: [], stageStandards: [] }
  };

  /** 用写操作返回的最新学员数据替换内存列表中的旧对象，并刷新统计 */
  function applyStudent(saved) {
    var list = Store.load();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === saved.id) { list[i] = saved; break; }
    }
    state.students = list;
    renderStats();
  }

  /** 刷新班级相关控件（筛选下拉 / datalist） */
  function refreshClassControls() {
    var names = {};
    var cfg = state.config.classes || [];
    for (var i = 0; i < cfg.length; i++) { if (cfg[i].active) { names[cfg[i].name] = true; } }
    for (var j = 0; j < state.students.length; j++) {
      if (state.students[j].className && state.students[j].status !== '停用') { names[state.students[j].className] = true; }
    }
    var sorted = Object.keys(names).sort();
    var sel = document.getElementById('class-filter');
    var cur = sel.value || '全部';
    var html = '<option value="全部">全部班级</option>';
    for (var k = 0; k < sorted.length; k++) {
      html += '<option value="' + S.esc(sorted[k]) + '">' + S.esc(sorted[k]) + '</option>';
    }
    sel.innerHTML = html;
    sel.value = sorted.indexOf(cur) !== -1 || cur === '全部' ? cur : '全部';
    state.klass = sel.value;
    var dl = document.getElementById('class-options');
    if (dl) {
      var opts = '';
      for (var m = 0; m < sorted.length; m++) { opts += '<option value="' + S.esc(sorted[m]) + '">'; }
      dl.innerHTML = opts;
    }
  }

  /** 刷新科目筛选下拉 */
  function refreshSubjectFilter() {
    var sel = document.getElementById('subject-filter');
    var cur = sel.value || '全部';
    var html = '<option value="全部">全部科目</option>';
    S.subjectGroups().forEach(function (g) {
      g.items.forEach(function (it) { html += '<option value="' + S.esc(it) + '">' + S.esc(it) + '</option>'; });
    });
    sel.innerHTML = html;
    sel.value = cur;
    state.subject = sel.value;
  }

  function handleApiError(err, fallback) {
    if (err && err.status === 401) {
      Auth.logout();
      return;
    }
    S.toast((err && err.message) || fallback || '操作失败，请重试', 'warn');
  }

  /* ---------------- 统计总览（只统计在读学员） ---------------- */
  function renderStats() {
    var list = state.students.filter(function (s) { return s.status !== '停用'; });
    var hours = 0;
    var progress = 0;
    var pending = 0;
    for (var i = 0; i < list.length; i++) {
      hours += S.totalWeeklyHours(list[i]);
      progress += Number(list[i].progress) || 0;
      pending += S.pendingCount(list[i]);
    }
    document.getElementById('stat-total').innerHTML = list.length + '<span class="unit">人</span>';
    document.getElementById('stat-hours').innerHTML = (Math.round(hours * 10) / 10) + '<span class="unit">小时</span>';
    document.getElementById('stat-progress').innerHTML =
      (list.length ? Math.round(progress / list.length) : 0) + '<span class="unit">%</span>';
    document.getElementById('stat-pending').innerHTML = pending + '<span class="unit">条</span>';
    // 顶栏待评阅角标
    var badge = document.getElementById('pending-badge');
    if (badge) {
      badge.textContent = pending > 99 ? '99+' : String(pending);
      badge.hidden = pending === 0;
    }
  }

  /** 待评阅角标下拉面板：列出有待评阅记录的学员，点击直达详情 */
  function initPendingBell() {
    var bell = document.getElementById('pending-bell');
    var panel = document.getElementById('pending-panel');
    if (!bell || !panel) { return; }

    bell.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (!panel.hidden) { panel.hidden = true; return; }
      var rows = state.students.filter(function (s) { return s.status !== '停用' && S.pendingCount(s) > 0; })
        .sort(function (a, b) { return S.pendingCount(b) - S.pendingCount(a); });
      panel.innerHTML = rows.length
        ? '<div class="pp-title">待评阅记录</div>' + rows.map(function (s) {
            return '<button class="pp-row" data-id="' + S.esc(s.id) + '" type="button">' +
              '<span class="pp-name">' + S.esc(s.name) + '</span>' +
              '<span class="pp-no">' + S.esc(s.studentNo) + '</span>' +
              '<span class="tag tag-pending">' + S.pendingCount(s) + ' 条</span>' +
            '</button>';
          }).join('')
        : '<div class="pp-title" style="text-align:center;">没有待评阅记录 🎉</div>';
      panel.hidden = false;
    });

    panel.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-id]') : null;
      if (!btn) { return; }
      panel.hidden = true;
      openModal(btn.getAttribute('data-id'));
    });

    document.addEventListener('click', function (ev) {
      if (!panel.hidden && !panel.contains(ev.target) && !bell.contains(ev.target)) { panel.hidden = true; }
    });
  }

  /* ---------------- 学员卡片列表 ---------------- */
  function cardHtml(s) {
    var inactive = s.status === '停用';
    return '' +
      '<article class="student-card' + (inactive ? ' inactive' : '') + '" data-id="' + S.esc(s.id) + '" tabindex="0" role="button" aria-label="查看 ' + S.esc(s.name) + ' 的详情">' +
        '<div class="sc-head">' +
          '<span class="avatar" style="background:' + (inactive ? '#9AA6B2' : S.avatarColor(s.name)) + '">' + S.esc(S.firstChar(s.name)) + '</span>' +
          '<div class="sc-name-block">' +
            '<div class="sc-name">' + S.esc(s.name) + '</div>' +
            '<div class="sc-no">学号 ' + S.esc(s.studentNo) + '</div>' +
          '</div>' +
          '<span class="sc-class">' + S.esc(s.grade) + ' · ' + S.esc(s.className) + '</span>' +
        '</div>' +
        '<div class="sc-tags">' +
          (inactive ? '<span class="tag tag-pending">已停用</span>' : '') +
          '<span class="tag ' + S.stageClass(s.stage) + '">' + S.esc(s.stage) + '</span>' +
          s.subjects.map(function (sub) { return '<span class="tag tag-subject">' + S.esc(sub) + '</span>'; }).join('') +
        '</div>' +
        '<div class="sc-progress">' +
          '<div class="prog-top"><span>备考进度</span><b>' + Number(s.progress) + '%</b></div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + Number(s.progress) + '%"></div></div>' +
        '</div>' +
        '<div class="sc-foot">' +
          '<span><span class="dot"></span>' + S.esc(S.lastActiveLabel(s)) + '</span>' +
          '<span>本周 ' + S.totalWeeklyHours(s) + ' 小时</span>' +
        '</div>' +
      '</article>';
  }

  /** 科目名归一化（去空格），兼容种子数据「A-Level物理」与科目库「A-Level 物理」的差异 */
  function normSubject(x) { return String(x || '').replace(/\s+/g, ''); }

  function renderGrid() {
    var grid = document.getElementById('student-grid');
    var kw = state.keyword.trim().toLowerCase();
    var shown = [];
    for (var i = 0; i < state.students.length; i++) {
      var s = state.students[i];
      var inactive = s.status === '停用';
      if (inactive && !state.showInactive) { continue; }
      if (state.stage !== '全部' && s.stage !== state.stage) { continue; }
      if (state.klass !== '全部' && s.className !== state.klass) { continue; }
      if (state.subject !== '全部' && (s.subjects || []).map(normSubject).indexOf(normSubject(state.subject)) === -1) { continue; }
      if (kw && s.name.toLowerCase().indexOf(kw) === -1 && String(s.studentNo).toLowerCase().indexOf(kw) === -1) { continue; }
      shown.push(s);
    }
    document.getElementById('result-count').textContent = '共 ' + shown.length + ' 名学员';
    if (!shown.length) {
      grid.innerHTML = '<div class="empty-tip">没有符合条件的学员，请调整搜索或筛选条件</div>';
      return;
    }
    grid.innerHTML = shown.map(cardHtml).join('');
  }

  /* ---------------- 通用弹窗开关 ---------------- */
  function openMask(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMask(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---------------- 详情弹窗 ---------------- */
  var mask = document.getElementById('detail-mask');

  function openModal(id) {
    var s = Store.getById(id);
    if (!s) { return; }
    state.currentId = id;
    renderModal(s);
    mask.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    mask.classList.remove('open');
    document.body.style.overflow = '';
    state.currentId = null;
    document.getElementById('record-form-wrap').style.display = 'none';
    document.getElementById('status-form-wrap').style.display = 'none';
    renderGrid();      // 关闭时刷新列表（数据可能已变更）
    renderStats();
  }

  function trendSvg(s) {
    var data = (s.trend && s.trend.length ? s.trend : [0, 0, 0, 0, 0, s.progress]);
    var w = 260, h = 130, padX = 26, padTop = 16, padBottom = 26;
    var max = 100;
    var stepX = (w - padX * 2) / (data.length - 1);
    var pts = data.map(function (v, i) {
      var x = padX + i * stepX;
      var y = padTop + (1 - v / max) * (h - padTop - padBottom);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    var line = pts.map(function (p) { return p.join(','); }).join(' ');
    var area = padX + ',' + (h - padBottom) + ' ' + line + ' ' + pts[pts.length - 1][0] + ',' + (h - padBottom);
    var gridLines = [25, 50, 75].map(function (v) {
      var y = Math.round(padTop + (1 - v / max) * (h - padTop - padBottom));
      return '<line x1="' + padX + '" y1="' + y + '" x2="' + (w - padX) + '" y2="' + y + '" stroke="#E5DFD2" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text x="' + (padX - 6) + '" y="' + (y + 4) + '" font-size="9" fill="#9AA6B2" text-anchor="end">' + v + '</text>';
    }).join('');
    var dots = pts.map(function (p, i) {
      var color = i === pts.length - 1 ? '#C9A85C' : '#12233A';
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="' + color + '" stroke="#FFFDF8" stroke-width="1.5"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="备考进度趋势图">' +
      '<defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#C9A85C" stop-opacity="0.18"/><stop offset="100%" stop-color="#C9A85C" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      gridLines +
      '<polygon points="' + area + '" fill="url(#trendFill)"/>' +
      '<polyline points="' + line + '" fill="none" stroke="#12233A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots +
      '</svg>';
  }

  function timelineHtml(s) {
    var records = s.records || [];
    if (!records.length) {
      return '<div class="empty-tip" style="padding:24px 0;">暂无学习记录</div>';
    }
    return records.map(function (r, idx) {
      var isNew = state.newRecordIndex !== null && idx === state.newRecordIndex;
      var pendingTag = r.status === '待评阅'
        ? '<span class="tag tag-pending tl-status">待评阅</span>'
        : '<span class="tag tag-done tl-status">已完成</span>';
      var commentHtml = r.comment
        ? '<div class="tl-comment"><span class="c-label">教师评语</span>' + S.esc(r.comment) + '</div>'
        : '<div class="tl-comment empty"><span class="c-label">教师评语</span>暂无评语</div>';
      var reviewBtn = r.status === '待评阅'
        ? '<button class="btn-mini" data-review-open="' + idx + '" type="button">评阅</button>'
        : '';
      var reviewForm = r.status === '待评阅'
        ? '<div class="review-form" id="review-form-' + idx + '" style="display:none;">' +
            '<input type="text" class="review-input" id="review-input-' + idx + '" placeholder="请输入教师评语（保存后学员端可见）">' +
            '<button class="btn-mini primary" data-review-save="' + idx + '" type="button">确认评阅</button>' +
          '</div>'
        : '';
      var cls = r.status === '待评阅' ? 'tl-item tl-pending' : 'tl-item';
      if (isNew) { cls += ' tl-new'; }
      return '<div class="' + cls + '">' +
        '<div class="tl-card' + (isNew ? ' flash' : '') + '">' +
          '<div class="tl-top">' +
            '<span class="tl-date">' + S.esc(S.fmtDateCN(r.date)) + '</span>' +
            '<span>' + S.esc(r.subject) + '</span>' +
            '<span>时长 ' + Number(r.duration) + ' 小时</span>' +
            pendingTag +
            reviewBtn +
          '</div>' +
          '<div class="tl-content">' + S.esc(r.content) + '</div>' +
          commentHtml +
          reviewForm +
        '</div>' +
      '</div>';
    }).join('');
  }

  function examsHtml(s) {
    var exams = s.exams || [];
    if (!exams.length) {
      return '<div class="empty-tip" style="padding:16px 0;">暂无测评成绩</div>';
    }
    var rows = exams.map(function (e) {
      var score = Number(e.score);
      var val = score < 10 ? score.toFixed(1) : String(score);
      var good = score >= 10 ? (score >= 80 || score >= 600) : score >= 6;
      return '<tr>' +
        '<td>' + S.esc(e.stage) + '</td>' +
        '<td>' + S.esc(e.subject) + '</td>' +
        '<td class="score"><span class="' + (good ? 'good' : '') + '">' + val + ' 分</span></td>' +
        '<td>' + S.esc(S.fmtDateCN(e.date)) + '</td>' +
      '</tr>';
    }).join('');
    return '<table class="exam-table">' +
      '<thead><tr><th>阶段</th><th>课程</th><th>分数</th><th>测评日期</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';
  }

  function renderModal(s) {
    var inactive = s.status === '停用';
    document.getElementById('modal-avatar').style.background = inactive ? '#9AA6B2' : S.avatarColor(s.name);
    document.getElementById('modal-avatar').textContent = S.firstChar(s.name);
    document.getElementById('modal-name').textContent = s.name + ' · ' + s.stage + (inactive ? '（已停用）' : '');
    document.getElementById('modal-sub').textContent =
      '学号 ' + s.studentNo + '｜' + s.grade + s.className + '｜入学日期 ' + s.enrollDate;

    document.getElementById('modal-parent-account').textContent = s.parentAccount || ('P' + s.studentNo.slice(1));
    var toggleBtn = document.getElementById('btn-toggle-status');
    toggleBtn.textContent = inactive ? '启用学员' : '停用学员';
    document.getElementById('status-form-wrap').style.display = 'none';

    document.getElementById('modal-summary').innerHTML =
      '<span class="item"><span>备考课程</span><b>' + s.subjects.map(S.esc).join('、') + '</b></span>' +
      '<span class="item"><span>备考进度</span><b>' + Number(s.progress) + '%</b></span>' +
      '<span class="item"><span>本周时长</span><b>' + S.totalWeeklyHours(s) + ' 小时</b></span>' +
      '<span class="item"><span>最近活跃</span><b>' + S.esc(S.lastActiveLabel(s)) + '</b></span>' +
      '<span class="item"><span>阶段目标</span><b>' + S.esc(s.goal) + '</b></span>';

    document.getElementById('modal-trend').innerHTML = trendSvg(s);
    document.getElementById('modal-exams').innerHTML = examsHtml(s);
    document.getElementById('modal-timeline').innerHTML = timelineHtml(s);
  }

  /* ---------------- 添加学习记录 ---------------- */
  function initRecordForm() {
    var wrap = document.getElementById('record-form-wrap');
    var subjectSel = document.getElementById('rf-subject');

    document.getElementById('btn-add-record').addEventListener('click', function () {
      var s = Store.getById(state.currentId);
      if (!s) { return; }
      subjectSel.innerHTML = S.subjectOptions(s.subjects);
      document.getElementById('rf-date').value = S.todayStr();
      document.getElementById('rf-content').value = '';
      document.getElementById('rf-comment').value = '';
      document.getElementById('rf-duration').value = '1.5';
      wrap.style.display = 'block';
      document.getElementById('rf-content').focus();
    });

    document.getElementById('rf-cancel').addEventListener('click', function () {
      wrap.style.display = 'none';
    });

    document.getElementById('record-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var target = Store.getById(state.currentId);
      if (!target) { S.toast('未找到学员数据，请重试', 'warn'); return; }

      var date = document.getElementById('rf-date').value;
      var content = document.getElementById('rf-content').value.trim();
      var duration = Number(document.getElementById('rf-duration').value);
      if (!date || !content || !duration || duration <= 0) {
        S.toast('请完整填写日期、学习内容与时长', 'warn');
        return;
      }

      var record = {
        date: date,
        subject: subjectSel.value,
        content: content,
        duration: duration,
        status: document.getElementById('rf-status').value,
        comment: document.getElementById('rf-comment').value.trim()
      };

      Data.addRecord(state.currentId, record).then(function (saved) {
        applyStudent(saved);
        state.newRecordIndex = 0;
        renderModal(saved);
        S.toast('学习记录已添加，学生端刷新后即可查看');
      }).catch(function (err) { handleApiError(err, '添加学习记录失败，请重试'); });
    });
  }

  /* ---------------- 自定义新增科目 ---------------- */
  function addSubjectEverywhere(name) {
    return Data.addSubject(name).then(function (groups) {
      if (groups) { S.setSubjectGroups(groups); }
      refreshSubjectFilter();
    });
  }

  function setupAddSubject(cfg) {
    var btn = document.getElementById(cfg.btn);
    var row = document.getElementById(cfg.row);
    var input = document.getElementById(cfg.input);
    var okBtn = document.getElementById(cfg.ok);
    var cancelBtn = document.getElementById(cfg.cancel);
    var select = document.getElementById(cfg.select);

    btn.addEventListener('click', function () {
      row.style.display = 'flex';
      input.value = '';
      input.focus();
    });
    cancelBtn.addEventListener('click', function () { row.style.display = 'none'; });
    okBtn.addEventListener('click', function () {
      var name = input.value.trim();
      if (!name) { S.toast('请输入科目名称', 'warn'); return; }
      var dup = false;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === name) { dup = true; break; }
      }
      if (dup) { S.toast('该科目已存在', 'warn'); return; }
      addSubjectEverywhere(name).then(function () {
        var current = select.value;
        select.innerHTML = S.subjectOptions([]);
        select.value = name;
        if (!select.value) { select.value = current; }
        row.style.display = 'none';
        S.toast('科目「' + name + '」已加入科目库');
      }).catch(function (err) { handleApiError(err, '科目添加失败，请重试'); });
    });
  }

  function setupProfileCustomSubject() {
    var box = document.getElementById('pf-subjects-box');
    box.addEventListener('click', function (ev) {
      if (!ev.target.closest || !ev.target.closest('#pf-custom-add')) { return; }
      var input = document.getElementById('pf-custom-input');
      var name = (input && input.value || '').trim();
      if (!name) { S.toast('请输入科目名称', 'warn'); return; }
      var selected = [];
      var boxes = box.querySelectorAll('input[type="checkbox"]:checked');
      for (var i = 0; i < boxes.length; i++) { selected.push(boxes[i].value); }
      if (selected.indexOf(name) === -1) { selected.push(name); }
      addSubjectEverywhere(name).then(function () {
        renderSubjectBox(selected);
        S.toast('科目「' + name + '」已添加并勾选');
      }).catch(function (err) { handleApiError(err, '科目添加失败，请重试'); });
    });
  }

  /* ---------------- 编辑学员档案 ---------------- */
  function renderSubjectBox(boxId, selected) {
    var box = document.getElementById(boxId);
    var sel = selected || [];
    box.innerHTML = S.subjectGroups().map(function (g) {
      return '<div class="subj-group"><span class="subj-group-name">' + S.esc(g.group) + '</span>' +
        g.items.map(function (it) {
          var on = sel.indexOf(it) !== -1;
          return '<label class="subj-check"><input type="checkbox" value="' + S.esc(it) + '"' + (on ? ' checked' : '') + '>' + S.esc(it) + '</label>';
        }).join('') + '</div>';
    }).join('') +
      '<div class="subj-group"><span class="subj-group-name">＋新增</span>' +
        '<input type="text" class="review-input" id="' + boxId + '-custom-input" placeholder="输入新科目名称" style="width:150px;height:26px;">' +
        '<button class="btn-mini primary" id="' + boxId + '-custom-add" type="button">添加</button>' +
      '</div>';
  }

  function initProfileForm() {
    var wrap = document.getElementById('profile-form-wrap');

    document.getElementById('btn-edit-profile').addEventListener('click', function () {
      var s = Store.getById(state.currentId);
      if (!s) { return; }
      document.getElementById('pf-name').value = s.name;
      document.getElementById('pf-grade').value = s.grade;
      document.getElementById('pf-classname').value = s.className;
      document.getElementById('pf-stage').value = s.stage;
      renderSubjectBox('pf-subjects-box', s.subjects);
      document.getElementById('pf-enroll').value = s.enrollDate;
      document.getElementById('pf-goal').value = s.goal || '';
      wrap.style.display = 'block';
    });

    document.getElementById('pf-cancel').addEventListener('click', function () {
      wrap.style.display = 'none';
    });

    // 档案科目框底部的自定义新增（事件委托）
    document.getElementById('pf-subjects-box').addEventListener('click', function (ev) {
      if (!ev.target.closest || !ev.target.closest('#pf-subjects-box-custom-add')) { return; }
      var input = document.getElementById('pf-subjects-box-custom-input');
      var name = (input && input.value || '').trim();
      if (!name) { S.toast('请输入科目名称', 'warn'); return; }
      var selected = [];
      var boxes = this.querySelectorAll('input[type="checkbox"]:checked');
      for (var i = 0; i < boxes.length; i++) { selected.push(boxes[i].value); }
      if (selected.indexOf(name) === -1) { selected.push(name); }
      addSubjectEverywhere(name).then(function () {
        renderSubjectBox('pf-subjects-box', selected);
        S.toast('科目「' + name + '」已添加并勾选');
      }).catch(function (err) { handleApiError(err, '科目添加失败，请重试'); });
    });

    document.getElementById('profile-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var target = Store.getById(state.currentId);
      if (!target) { S.toast('未找到学员数据，请重试', 'warn'); return; }

      var name = document.getElementById('pf-name').value.trim();
      var boxes = document.querySelectorAll('#pf-subjects-box input[type="checkbox"]:checked');
      var subjects = [];
      for (var bi = 0; bi < boxes.length; bi++) { subjects.push(boxes[bi].value); }
      if (!name || !subjects.length) {
        S.toast('姓名与备考课程不能为空', 'warn');
        return;
      }

      var fields = {
        name: name,
        grade: document.getElementById('pf-grade').value,
        className: document.getElementById('pf-classname').value.trim() || target.className,
        stage: document.getElementById('pf-stage').value,
        subjects: subjects,
        enrollDate: document.getElementById('pf-enroll').value || target.enrollDate,
        goal: document.getElementById('pf-goal').value.trim()
      };

      Data.updateProfile(state.currentId, fields).then(function (saved) {
        applyStudent(saved);
        refreshClassControls();
        renderGrid();
        renderModal(saved);
        document.getElementById('profile-form-wrap').style.display = 'none';
        S.toast('学员档案已更新，学生端刷新后即可查看');
      }).catch(function (err) { handleApiError(err, '档案保存失败，请重试'); });
    });
  }

  /* ---------------- 录入阶段测评成绩 ---------------- */
  function initExamForm() {
    var wrap = document.getElementById('exam-form-wrap');

    document.getElementById('btn-add-exam').addEventListener('click', function () {
      var s = Store.getById(state.currentId);
      if (!s) { return; }
      document.getElementById('ef-subject').innerHTML = S.subjectOptions(s.subjects);
      document.getElementById('ef-stage').value = s.stage;
      document.getElementById('ef-score').value = '';
      document.getElementById('ef-date').value = S.todayStr();
      wrap.style.display = 'block';
      document.getElementById('ef-score').focus();
    });

    document.getElementById('ef-cancel').addEventListener('click', function () {
      wrap.style.display = 'none';
    });

    document.getElementById('exam-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var target = Store.getById(state.currentId);
      if (!target) { S.toast('未找到学员数据，请重试', 'warn'); return; }

      var score = Number(document.getElementById('ef-score').value);
      var date = document.getElementById('ef-date').value;
      if (!date || isNaN(score) || score < 0) {
        S.toast('请完整填写分数与测评日期', 'warn');
        return;
      }

      var exam = {
        stage: document.getElementById('ef-stage').value,
        subject: document.getElementById('ef-subject').value,
        score: score,
        date: date
      };

      Data.addExam(state.currentId, exam).then(function (saved) {
        applyStudent(saved);
        renderModal(saved);
        document.getElementById('exam-form-wrap').style.display = 'none';
        S.toast('测评成绩已录入，学生端刷新后即可查看');
      }).catch(function (err) { handleApiError(err, '成绩录入失败，请重试'); });
    });
  }

  /* ---------------- 待评阅记录评阅 ---------------- */
  function initReviewFlow() {
    document.getElementById('modal-timeline').addEventListener('click', function (ev) {
      var openBtn = ev.target.closest ? ev.target.closest('[data-review-open]') : null;
      if (openBtn) {
        var idx = openBtn.getAttribute('data-review-open');
        var form = document.getElementById('review-form-' + idx);
        if (form) {
          form.style.display = form.style.display === 'none' ? 'flex' : 'none';
          var input = document.getElementById('review-input-' + idx);
          if (input) { input.focus(); }
        }
        return;
      }
      var saveBtn = ev.target.closest ? ev.target.closest('[data-review-save]') : null;
      if (saveBtn) {
        var ridx = saveBtn.getAttribute('data-review-save');
        var comment = (document.getElementById('review-input-' + ridx) || {}).value || '';
        comment = comment.trim();
        if (!comment) { S.toast('请填写教师评语后再确认评阅', 'warn'); return; }

        var target = Store.getById(state.currentId);
        var rec = target && target.records[Number(ridx)];
        if (!rec) { S.toast('未找到对应记录，请重试', 'warn'); return; }
        var recKey = rec.id === undefined ? Number(ridx) : rec.id;

        Data.reviewRecord(state.currentId, recKey, comment).then(function (saved) {
          applyStudent(saved);
          renderModal(saved);
          S.toast('评阅完成，学生端刷新后即可查看');
        }).catch(function (err) { handleApiError(err, '评阅失败，请重试'); });
      }
    });
  }

  /* ---------------- 停用 / 启用学员（原因进审计） ---------------- */
  function initStatusToggle() {
    document.getElementById('btn-toggle-status').addEventListener('click', function () {
      var s = Store.getById(state.currentId);
      if (!s) { return; }
      var wrap = document.getElementById('status-form-wrap');
      var submit = document.getElementById('sf-submit');
      if (s.status === '停用') {
        // 启用：无需原因，直接执行
        Data.setStudentStatus(s.id, '在读').then(function (saved) {
          applyStudent(saved);
          refreshClassControls();
          renderGrid();
          renderModal(saved);
          S.toast('学员已恢复在读');
        }).catch(function (err) { handleApiError(err, '操作失败，请重试'); });
        return;
      }
      document.getElementById('sf-reason').value = '';
      submit.textContent = '确认停用';
      wrap.style.display = 'block';
      document.getElementById('sf-reason').focus();
    });

    document.getElementById('sf-cancel').addEventListener('click', function () {
      document.getElementById('status-form-wrap').style.display = 'none';
    });

    document.getElementById('status-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var s = Store.getById(state.currentId);
      if (!s) { return; }
      var reason = document.getElementById('sf-reason').value.trim();
      Data.setStudentStatus(s.id, '停用', reason).then(function (saved) {
        applyStudent(saved);
        refreshClassControls();
        renderGrid();
        closeModal();
        S.toast('学员已停用' + (reason ? '（原因已记入审计日志）' : ''));
      }).catch(function (err) { handleApiError(err, '操作失败，请重试'); });
    });
  }

  /* ---------------- 复制家长账号 ---------------- */
  function initCopyParent() {
    document.getElementById('btn-copy-parent').addEventListener('click', function () {
      var s = Store.getById(state.currentId);
      if (!s) { return; }
      var text = s.parentAccount || ('P' + s.studentNo.slice(1));
      function done() { S.toast('已复制家长账号 ' + text + '（初始密码 zx123456）'); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { S.toast('复制失败，请手动记录：' + text, 'warn'); }
        ta.remove();
      }
    });
  }

  /* ---------------- 新建学员 ---------------- */
  function initNewStudent() {
    document.getElementById('btn-new-student').addEventListener('click', function () {
      renderSubjectBox('ns-subjects-box', []);
      document.getElementById('ns-name').value = '';
      document.getElementById('ns-grade').value = '高一';
      document.getElementById('ns-classname').value = '';
      document.getElementById('ns-stage').value = '基础期';
      document.getElementById('ns-enroll').value = S.todayStr();
      document.getElementById('ns-goal').value = '';
      openMask('ns-mask');
      setTimeout(function () { document.getElementById('ns-name').focus(); }, 60);
    });

    document.getElementById('ns-close').addEventListener('click', function () { closeMask('ns-mask'); });
    document.getElementById('ns-cancel').addEventListener('click', function () { closeMask('ns-mask'); });
    document.getElementById('ns-mask').addEventListener('click', function (ev) {
      if (ev.target === this) { closeMask('ns-mask'); }
    });

    // 新建学员科目框的自定义新增
    document.getElementById('ns-subjects-box').addEventListener('click', function (ev) {
      if (!ev.target.closest || !ev.target.closest('#ns-subjects-box-custom-add')) { return; }
      var input = document.getElementById('ns-subjects-box-custom-input');
      var name = (input && input.value || '').trim();
      if (!name) { S.toast('请输入科目名称', 'warn'); return; }
      var selected = [];
      var boxes = this.querySelectorAll('input[type="checkbox"]:checked');
      for (var i = 0; i < boxes.length; i++) { selected.push(boxes[i].value); }
      if (selected.indexOf(name) === -1) { selected.push(name); }
      addSubjectEverywhere(name).then(function () {
        renderSubjectBox('ns-subjects-box', selected);
        S.toast('科目「' + name + '」已添加并勾选');
      }).catch(function (err) { handleApiError(err, '科目添加失败，请重试'); });
    });

    document.getElementById('ns-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = document.getElementById('ns-name').value.trim();
      var boxes = document.querySelectorAll('#ns-subjects-box input[type="checkbox"]:checked');
      var subjects = [];
      for (var i = 0; i < boxes.length; i++) { subjects.push(boxes[i].value); }
      if (!name || !subjects.length) { S.toast('请填写姓名并至少勾选一门课程', 'warn'); return; }

      Data.createStudent({
        name: name,
        grade: document.getElementById('ns-grade').value,
        className: document.getElementById('ns-classname').value.trim(),
        stage: document.getElementById('ns-stage').value,
        subjects: subjects,
        enrollDate: document.getElementById('ns-enroll').value || S.todayStr(),
        goal: document.getElementById('ns-goal').value.trim()
      }).then(function (saved) {
        var list = Store.load();
        var exists = false;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === saved.id) { list[i] = saved; exists = true; break; }
        }
        if (!exists) { list.push(saved); }
        state.students = list;
        refreshClassControls();
        renderGrid();
        closeMask('ns-mask');
        S.toast('学员 ' + saved.name + ' 已创建：学号 ' + saved.studentNo + '，初始密码 zx123456，家长账号 ' + (saved.parentAccount || 'P' + saved.studentNo.slice(1)));
      }).catch(function (err) { handleApiError(err, '创建失败，请重试'); });
    });
  }

  /* ---------------- 教师速记 ---------------- */
  function initQuickNote() {
    document.getElementById('btn-quick-note').addEventListener('click', function () {
      var active = state.students.filter(function (s) { return s.status !== '停用'; });
      if (!active.length) { S.toast('暂无在读学员', 'warn'); return; }
      var sel = document.getElementById('qn-student');
      sel.innerHTML = active.map(function (s) {
        return '<option value="' + S.esc(s.id) + '">' + S.esc(s.name) + ' · ' + S.esc(s.studentNo) + '</option>';
      }).join('');
      fillQnSubjects();
      document.getElementById('qn-duration').value = '1.0';
      document.getElementById('qn-content').value = '';
      openMask('qn-mask');
      setTimeout(function () { document.getElementById('qn-content').focus(); }, 60);
    });

    document.getElementById('qn-student').addEventListener('change', fillQnSubjects);

    document.getElementById('qn-close').addEventListener('click', function () { closeMask('qn-mask'); });
    document.getElementById('qn-cancel').addEventListener('click', function () { closeMask('qn-mask'); });
    document.getElementById('qn-mask').addEventListener('click', function (ev) {
      if (ev.target === this) { closeMask('qn-mask'); }
    });

    document.getElementById('qn-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var sid = document.getElementById('qn-student').value;
      var content = document.getElementById('qn-content').value.trim();
      var duration = Number(document.getElementById('qn-duration').value) || 1;
      if (!sid || !content) { S.toast('请选择学员并填写课堂要点', 'warn'); return; }
      Data.addRecord(sid, {
        date: S.todayStr(),
        subject: document.getElementById('qn-subject').value,
        content: content,
        duration: duration,
        status: '已完成',
        comment: ''
      }).then(function (saved) {
        applyStudent(saved);
        closeMask('qn-mask');
        S.toast('速记完成：' + saved.name + ' 已登记 ' + duration + ' 小时');
      }).catch(function (err) { handleApiError(err, '速记失败，请重试'); });
    });
  }

  function fillQnSubjects() {
    var sid = document.getElementById('qn-student').value;
    var s = Store.getById(sid);
    document.getElementById('qn-subject').innerHTML = S.subjectOptions(s ? s.subjects : []);
  }

  /* ---------------- 导出 Excel（按学期） ---------------- */
  function semesterOf(dateStr) {
    var parts = String(dateStr || '').split('-');
    if (parts.length < 2) { return '未知'; }
    var y = Number(parts[0]), m = Number(parts[1]);
    if (m >= 2 && m <= 7) { return y + ' 春季学期'; }
    return (m >= 8 ? y : y - 1) + ' 秋季学期';
  }

  function initExport() {
    document.getElementById('btn-export').addEventListener('click', function () {
      var set = {};
      state.students.forEach(function (s) { set[semesterOf(s.enrollDate)] = true; });
      var sems = Object.keys(set).sort().reverse();
      var sel = document.getElementById('export-semester');
      sel.innerHTML = '<option value="全部学期">全部学期</option>' +
        sems.map(function (t) { return '<option value="' + S.esc(t) + '">' + S.esc(t) + '</option>'; }).join('');
      openMask('export-mask');
    });
    document.getElementById('export-close').addEventListener('click', function () { closeMask('export-mask'); });
    document.getElementById('export-cancel').addEventListener('click', function () { closeMask('export-mask'); });
    document.getElementById('export-mask').addEventListener('click', function (ev) {
      if (ev.target === this) { closeMask('export-mask'); }
    });
    document.getElementById('export-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var sem = document.getElementById('export-semester').value;
      Data.exportExcel(sem).then(function () {
        closeMask('export-mask');
        S.toast(Data.mode === 'server' ? '导出成功：' + (sem === '全部学期' ? '学员进度总览.xlsx' : '学员进度总览_' + sem + '.xlsx') : '已导出 CSV（演示模式无后端，Excel 可直接打开）');
      }).catch(function (err) {
        closeMask('export-mask');
        handleApiError(err, '导出失败，请重试');
      });
    });
  }

  /* ---------------- 班级与阶段配置 ---------------- */
  function renderConfigLists() {
    var clsBox = document.getElementById('class-list');
    clsBox.innerHTML = state.config.classes.map(function (c) {
      return '<div class="cfg-row"><span class="cfg-name">' + S.esc(c.name) + '</span>' +
        '<span class="tag ' + (c.active ? 'tag-done' : 'tag-pending') + '">' + (c.active ? '启用中' : '已停用') + '</span>' +
        '<button class="btn-mini" data-class-toggle="' + S.esc(c.name) + '" data-active="' + (c.active ? '0' : '1') + '" type="button">' + (c.active ? '停用' : '启用') + '</button></div>';
    }).join('') || '<div class="empty-tip">暂无班级</div>';

    document.getElementById('stage-list').innerHTML = state.config.stageStandards.map(function (st) {
      return '<div class="cfg-row" style="align-items:flex-start;"><span class="cfg-name" style="width:56px;flex:none;">' + S.esc(st.name) + '</span>' +
        '<input type="text" class="review-input" data-stage-desc="' + S.esc(st.name) + '" value="' + S.esc(st.description || '') + '" style="flex:1;">' +
        '<button class="btn-mini primary" data-stage-save="' + S.esc(st.name) + '" type="button">保存</button></div>';
    }).join('');
  }

  function loadConfig() {
    return Data.getConfig().then(function (cfg) {
      state.config = cfg;
      renderConfigLists();
      refreshClassControls();
    });
  }

  function initConfig() {
    document.getElementById('config-link').addEventListener('click', function (ev) {
      ev.preventDefault();
      loadConfig().then(function () { openMask('config-mask'); })
        .catch(function (err) { handleApiError(err, '配置加载失败'); });
    });
    document.getElementById('config-close').addEventListener('click', function () { closeMask('config-mask'); });
    document.getElementById('config-mask').addEventListener('click', function (ev) {
      if (ev.target === this) { closeMask('config-mask'); }
    });

    document.getElementById('cfg-add-class').addEventListener('click', function () {
      var input = document.getElementById('cfg-new-class');
      var name = input.value.trim();
      if (!name) { S.toast('请输入班级名称', 'warn'); return; }
      Data.addClass(name).then(function (classes) {
        state.config.classes = classes;
        input.value = '';
        renderConfigLists();
        refreshClassControls();
        S.toast('班级「' + name + '」已新增');
      }).catch(function (err) { handleApiError(err, '新增失败，请重试'); });
    });

    document.getElementById('class-list').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-class-toggle]') : null;
      if (!btn) { return; }
      var name = btn.getAttribute('data-class-toggle');
      var active = btn.getAttribute('data-active') === '1';
      Data.setClassStatus(name, active).then(function (classes) {
        state.config.classes = classes;
        renderConfigLists();
        refreshClassControls();
        renderGrid();
        S.toast('班级「' + name + '」已' + (active ? '启用' : '停用'));
      }).catch(function (err) { handleApiError(err, '操作失败，请重试'); });
    });

    document.getElementById('stage-list').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-stage-save]') : null;
      if (!btn) { return; }
      var name = btn.getAttribute('data-stage-save');
      var input = document.querySelector('[data-stage-desc="' + name + '"]');
      var desc = (input && input.value || '').trim();
      Data.updateStageStandard(name, desc).then(function (stages) {
        state.config.stageStandards = stages;
        S.toast('阶段「' + name + '」标准已更新');
      }).catch(function (err) { handleApiError(err, '保存失败，请重试'); });
    });
  }

  /* ---------------- 审计日志 ---------------- */
  var AUDIT_ACTIONS = ['登录', '新建学员', '编辑学员档案', '停用学员', '启用学员', '评阅记录', '登记学习记录', '录入测评成绩', '导出数据', '修改密码', '新增科目', '新增班级', '停用班级', '启用班级', '修改阶段标准', '家长登录', '数据重置'];

  function loadAudit(action) {
    var wrap = document.getElementById('audit-table-wrap');
    wrap.innerHTML = '<div class="empty-tip">加载中…</div>';
    Data.auditList(action).then(function (logs) {
      if (!logs.length) {
        wrap.innerHTML = '<div class="empty-tip">暂无审计记录</div>';
        return;
      }
      var rows = logs.map(function (l) {
        return '<tr>' +
          '<td class="audit-ts">' + S.esc((l.ts || '').replace('T', ' ')) + '</td>' +
          '<td>' + S.esc(l.actor) + '</td>' +
          '<td><span class="tag tag-subject">' + S.esc(l.action) + '</span></td>' +
          '<td>' + S.esc(l.target) + '</td>' +
          '<td class="audit-detail">' + S.esc(l.detail || '') + '</td>' +
        '</tr>';
      }).join('');
      wrap.innerHTML = '<table class="exam-table audit-table">' +
        '<thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>';
    }).catch(function (err) {
      wrap.innerHTML = '<div class="empty-tip">' + S.esc(err.message || '加载失败') + '</div>';
    });
  }

  function initAudit() {
    document.getElementById('audit-link').addEventListener('click', function (ev) {
      ev.preventDefault();
      var sel = document.getElementById('audit-action-filter');
      var cur = sel.value;
      sel.innerHTML = '<option value="全部">全部动作</option>' +
        AUDIT_ACTIONS.map(function (a) { return '<option value="' + a + '">' + a + '</option>'; }).join('');
      sel.value = cur || '全部';
      openMask('audit-mask');
      loadAudit(sel.value);
    });
    document.getElementById('audit-action-filter').addEventListener('change', function () {
      loadAudit(this.value);
    });
    document.getElementById('audit-close').addEventListener('click', function () { closeMask('audit-mask'); });
    document.getElementById('audit-mask').addEventListener('click', function (ev) {
      if (ev.target === this) { closeMask('audit-mask'); }
    });
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    document.getElementById('search-input').addEventListener('input', function () {
      state.keyword = this.value;
      renderGrid();
    });

    document.getElementById('stage-filter').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.filter-tab') : null;
      if (!btn) { return; }
      var tabs = this.querySelectorAll('.filter-tab');
      for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
      btn.classList.add('active');
      state.stage = btn.getAttribute('data-stage');
      renderGrid();
    });

    document.getElementById('class-filter').addEventListener('change', function () {
      state.klass = this.value;
      renderGrid();
    });
    document.getElementById('subject-filter').addEventListener('change', function () {
      state.subject = this.value;
      renderGrid();
    });
    document.getElementById('show-inactive').addEventListener('change', function () {
      state.showInactive = this.checked;
      renderGrid();
    });

    document.getElementById('student-grid').addEventListener('click', function (ev) {
      var card = ev.target.closest ? ev.target.closest('.student-card') : null;
      if (card) { openModal(card.getAttribute('data-id')); }
    });
    document.getElementById('student-grid').addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') { return; }
      var card = ev.target.closest ? ev.target.closest('.student-card') : null;
      if (card) { ev.preventDefault(); openModal(card.getAttribute('data-id')); }
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    mask.addEventListener('click', function (ev) {
      if (ev.target === mask) { closeModal(); }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (mask.classList.contains('open')) { closeModal(); }
        ['ns-mask', 'qn-mask', 'export-mask', 'config-mask', 'audit-mask'].forEach(function (id) {
          if (document.getElementById(id).classList.contains('open')) { closeMask(id); }
        });
      }
    });

    document.getElementById('logout-link').addEventListener('click', function (ev) {
      ev.preventDefault();
      Auth.logout();
    });

    initRecordForm();
    initProfileForm();
    initExamForm();
    initReviewFlow();
    initStatusToggle();
    initCopyParent();
    initNewStudent();
    initQuickNote();
    initExport();
    initConfig();
    initAudit();
    initPendingBell();
    setupAddSubject({ btn: 'rf-add-subject', row: 'rf-new-subject-row', input: 'rf-new-subject-input', ok: 'rf-new-subject-ok', cancel: 'rf-new-subject-cancel', select: 'rf-subject' });
    setupAddSubject({ btn: 'ef-add-subject', row: 'ef-new-subject-row', input: 'ef-new-subject-input', ok: 'ef-new-subject-ok', cancel: 'ef-new-subject-cancel', select: 'ef-subject' });
  }

  /* ---------------- 启动 ---------------- */
  function start() {
    var auth = Auth.require('teacher');
    if (!auth) { return; }

    Data.bootstrap().then(function (data) {
      if (data) {
        Store.useServerData(data.students);
        S.setSubjectGroups(data.subjects);
      }
      document.getElementById('topbar-user').textContent = auth.name + (auth.title ? ' · ' + auth.title : '');
      state.students = Store.load();
      refreshSubjectFilter();
      refreshClassControls();
      renderStats();
      renderGrid();
      bindEvents();
    }).catch(function (err) {
      if (err && err.status === 401) { Auth.logout(); return; }
      S.toast('数据加载失败，请刷新页面重试', 'warn');
    });
  }

  window.ZHXX_READY.then(start);
})();
