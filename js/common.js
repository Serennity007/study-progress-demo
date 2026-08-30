/* =========================================================
 * 成都智慧象留学 - 公共工具 / 登录鉴权 / 数据同步
 * 登录身份写入 sessionStorage；未登录访问工作台自动跳回登录页。
 *
 * 数据模式（由 js/api.js 的 ZHXX_Data 统一提供）：
 *   服务端模式：python backend/app.py 启动后，数据走 REST API 持久化，
 *               老师端写入 → 学员端刷新即可见（跨浏览器成立）。
 *   演示模式：  仅 server.py 静态托管时，数据在 sessionStorage 内同步，
 *               换标签页/关浏览器恢复初始 mock（演示特性）。
 * ========================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'zhxx_demo_data_v1';
  var AUTH_KEY = 'zhxx_demo_auth_v1';

  /* ---------------------- 登录鉴权 ---------------------- */

  var Auth = {
    /** 读取当前登录身份（未登录返回 null） */
    get: function () {
      try {
        var raw = sessionStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    /** 写入登录身份 */
    set: function (auth) {
      try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (e) { /* 忽略 */ }
      return auth;
    },
    /** 页面守卫：校验角色，未登录或角色不符则跳回登录页 */
    require: function (role) {
      var auth = Auth.get();
      if (!auth || auth.role !== role) {
        window.location.replace('index.html');
        return null;
      }
      return auth;
    },
    /** 退出登录：仅清除登录身份与后端会话，保留数据 */
    logout: function () {
      try {
        if (window.ZHXX_Data) { window.ZHXX_Data.logout(); }
        sessionStorage.removeItem(AUTH_KEY);
      } catch (e) { /* 忽略 */ }
      window.location.replace('index.html');
    }
  };
  window.ZHXX_Auth = Auth;

  /* ---------------------- 演示数据中心 ---------------------- */

  /** 演示数据中心：优先读取 sessionStorage，保证两端数据一致；
   *  服务端模式下由 useServerData 注入权威数据，load/save 直接走内存列表 */
  var Store = {
    _remote: null,
    load: function () {
      if (Store._remote) { return Store._remote; }
      var raw = null;
      try { raw = sessionStorage.getItem(STORE_KEY); } catch (e) { /* 隐私模式等情况下降级 */ }
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (parsed && Object.prototype.toString.call(parsed) === '[object Array]' && parsed.length) {
            return parsed;
          }
        } catch (e) { /* 数据损坏时回退到内置数据 */ }
      }
      return Store.loadFresh();
    },
    /** 取一份全新的内置数据副本（不落盘） */
    loadFresh: function () {
      return JSON.parse(JSON.stringify(window.MOCK_STUDENTS || []));
    },
    save: function (list) {
      if (Store._remote) { return list; } // 服务端模式：写操作由 API 落库
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* 忽略写入失败 */ }
      return list;
    },
    /** 服务端模式首屏注入（bootstrap 返回的权威数据） */
    useServerData: function (list) {
      Store._remote = list;
      try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* 忽略 */ }
      return list;
    },
    getById: function (id) {
      var list = Store.load();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { return list[i]; }
      }
      return null;
    }
  };
  window.ZHXX_Store = Store;

  /* ---------------------- 科目目录 ---------------------- */
  /** 全课程科目库：雅思四科 / 托福四科 / A-Level / AP */
  var SUBJECT_CATALOG = [
    { group: '雅思', items: ['雅思听力', '雅思口语', '雅思阅读', '雅思写作'] },
    { group: '托福', items: ['托福阅读', '托福听力', '托福口语', '托福写作'] },
    { group: 'A-Level', items: ['A-Level 数学', 'A-Level 物理', 'A-Level 化学', 'A-Level 经济'] },
    { group: 'AP', items: ['AP 微积分', 'AP 物理', 'AP 化学', 'AP 经济学', 'AP 计算机科学A'] }
  ];

  /** 自定义科目：演示模式存 sessionStorage；服务端模式落库（见 api.js） */
  var CUSTOM_SUBJECT_KEY = 'zhxx_demo_custom_subjects_v1';
  function getCustomSubjects() {
    try {
      var raw = sessionStorage.getItem(CUSTOM_SUBJECT_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
    } catch (e) { return []; }
  }
  function addCustomSubject(name) {
    name = String(name || '').trim();
    if (!name) { return false; }
    var exists = getCustomSubjects().indexOf(name) !== -1;
    if (!exists) {
      var list = getCustomSubjects();
      list.push(name);
      try { sessionStorage.setItem(CUSTOM_SUBJECT_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
    }
    return true;
  }

  /** 当前生效的科目分组：服务端模式由 bootstrap 注入（含已落库的自定义科目） */
  var liveGroups = null;
  function setSubjectGroups(groups) {
    if (Object.prototype.toString.call(groups) === '[object Array]' && groups.length) {
      liveGroups = groups;
    }
    return liveGroups || subjectGroups();
  }
  function subjectGroups() {
    if (liveGroups) { return liveGroups; }
    var groups = [];
    for (var i = 0; i < SUBJECT_CATALOG.length; i++) {
      groups.push({ group: SUBJECT_CATALOG[i].group, items: SUBJECT_CATALOG[i].items.slice() });
    }
    var custom = getCustomSubjects();
    if (custom.length) { groups.push({ group: '自定义', items: custom }); }
    return groups;
  }
  /** 科目是否已在库中（内置或自定义） */
  function knownSubject(name) {
    var groups = subjectGroups();
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].items.indexOf(name) !== -1) { return true; }
    }
    return false;
  }

  /** 构建带 optgroup 的科目下拉选项（当前生效分组）；selectedSubjects 用于置默认选中 */
  function subjectOptions(selectedSubjects) {
    var sel = selectedSubjects || [];
    function inSel(x) {
      for (var k = 0; k < sel.length; k++) { if (sel[k] === x) { return true; } }
      return false;
    }
    return subjectGroups().map(function (g) {
      return '<optgroup label="' + esc(g.group) + '">' + g.items.map(function (it) {
        return '<option value="' + esc(it) + '"' + (inSel(it) ? ' selected' : '') + '>' + esc(it) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }
  window.ZHXX_SUBJECT_CATALOG = SUBJECT_CATALOG;

  /* ---------------------- 通用工具 ---------------------- */

  /** HTML 转义，防止内容破坏页面结构 */
  function esc(text) {
    if (text === null || text === undefined) { return ''; }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 计算距离今天多少天（入参 YYYY-MM-DD） */
  function daysFromToday(dateStr) {
    if (!dateStr) { return Infinity; }
    var parts = String(dateStr).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((today - d) / 86400000);
  }

  /** 将日期格式化为「8月29日」样式 */
  function fmtDateCN(dateStr) {
    var parts = String(dateStr || '').split('-');
    if (parts.length < 3) { return String(dateStr || ''); }
    return Number(parts[1]) + '月' + Number(parts[2]) + '日';
  }

  /** 最后活跃时间的人性化描述 */
  function lastActiveLabel(student) {
    var records = student.records || [];
    var latest = '';
    for (var i = 0; i < records.length; i++) {
      if (!latest || records[i].date > latest) { latest = records[i].date; }
    }
    if (!latest) { return '暂无学习记录'; }
    var diff = daysFromToday(latest);
    if (diff <= 0) { return '今天活跃'; }
    if (diff === 1) { return '昨天活跃'; }
    if (diff < 7) { return diff + ' 天前活跃'; }
    return Math.floor(diff / 7) + ' 周前活跃';
  }

  /** 本周学习总时长（小时） */
  function totalWeeklyHours(student) {
    var sum = 0;
    var arr = student.weeklyHours || [];
    for (var i = 0; i < arr.length; i++) { sum += Number(arr[i]) || 0; }
    return Math.round(sum * 10) / 10;
  }

  /** 待评阅记录数 */
  function pendingCount(student) {
    var n = 0;
    var records = student.records || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].status === '待评阅') { n++; }
    }
    return n;
  }

  /** 阶段标签对应的样式类名 */
  function stageClass(stage) {
    if (stage === '基础期') { return 'tag-stage-basic'; }
    if (stage === '强化期') { return 'tag-stage-boost'; }
    if (stage === '冲刺期') { return 'tag-stage-sprint'; }
    return '';
  }

  /** 姓名首字（头像用） */
  function firstChar(name) {
    return String(name || '?').charAt(0);
  }

  /** 根据姓名生成稳定的头像配色（低饱和藏蓝/墨金系） */
  var AVATAR_COLORS = ['#12233A', '#3E5C76', '#8A6D2F', '#A9853B', '#4A7A5E', '#5B4A6B', '#7A5C3E', '#34655E'];
  function avatarColor(name) {
    var s = String(name || '');
    var sum = 0;
    for (var i = 0; i < s.length; i++) { sum += s.charCodeAt(i); }
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
  }

  /** 轻量提示浮层 */
  var toastTimer = null;
  function toast(message, type) {
    var el = document.getElementById('zhxx-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zhxx-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.className = 'toast toast-' + (type || 'success') + ' toast-show';
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.className = 'toast toast-' + (type || 'success');
    }, 2400);
  }

  /** 近 7 天（周一至周日）的中文标签 */
  function weekDayLabels() {
    return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  }

  /** 今天的日期字符串（YYYY-MM-DD），用于表单默认值 */
  function todayStr() {
    var t = new Date();
    var m = t.getMonth() + 1;
    var day = t.getDate();
    return t.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  /* ---------------------- 登录页逻辑 ---------------------- */

  /** 初始化登录页（存在 #login-form 时启用） */
  function initLoginPage() {
    var S = window.ZHXX;
    var form = document.getElementById('login-form');
    if (!form) { return; }

    var tabs = document.querySelectorAll('#login-tabs .login-tab');
    var groupTeacher = document.getElementById('group-teacher');
    var groupStudent = document.getElementById('group-student');
    var groupParent = document.getElementById('group-parent');
    var errBox = document.getElementById('login-error');
    var tAccount = document.getElementById('t-account');
    var tPassword = document.getElementById('t-password');
    var sAccount = document.getElementById('s-account');
    var sPassword = document.getElementById('s-password');
    var pAccount = document.getElementById('p-account');
    var pPassword = document.getElementById('p-password');
    var creds = window.DEMO_CREDENTIALS || { teacher: { account: 'teacher', password: 'zx123456' }, studentPassword: 'zx123456' };

    var role = 'teacher';

    /** 切换登录身份标签 */
    function switchRole(next) {
      role = next;
      for (var i = 0; i < tabs.length; i++) {
        var active = tabs[i].getAttribute('data-role') === next;
        tabs[i].classList.toggle('active', active);
        tabs[i].setAttribute('aria-selected', active ? 'true' : 'false');
      }
      groupTeacher.hidden = next !== 'teacher';
      groupStudent.hidden = next !== 'student';
      if (groupParent) { groupParent.hidden = next !== 'parent'; }
      clearError();
    }

    /** 清除错误状态 */
    function clearError() {
      errBox.classList.remove('show');
      var fields = form.querySelectorAll('.field');
      for (var i = 0; i < fields.length; i++) { fields[i].classList.remove('has-error'); }
    }

    /** 行内错误提示（红描边 + 文案，不使用 alert） */
    function showError(fieldIds, message) {
      errBox.textContent = message || '账号或密码不正确';
      errBox.classList.remove('show');
      // 强制重启动画
      void errBox.offsetWidth;
      errBox.classList.add('show');
      for (var i = 0; i < fieldIds.length; i++) {
        var el = document.getElementById(fieldIds[i]);
        if (el) { el.classList.add('has-error'); }
      }
    }

    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        switchRole(this.getAttribute('data-role'));
      });
    }

    // 输入即清除错误状态
    tAccount.addEventListener('input', clearError);
    tPassword.addEventListener('input', clearError);
    sPassword.addEventListener('input', clearError);
    if (pPassword) { pPassword.addEventListener('input', clearError); }

    /** 服务端登录成功后的跳转 */
    function gotoPage(profile) {
      if (profile.role === 'parent') {
        window.location.href = 'parent.html';
      } else if (profile.role === 'student') {
        window.location.href = 'student.html?id=' + encodeURIComponent(profile.id);
      } else {
        window.location.href = 'admin.html';
      }
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      clearError();

      if (role === 'teacher') {
        var acc = tAccount.value.trim();
        var pwd = tPassword.value;
        if (window.ZHXX_Data.mode === 'server') {
          window.ZHXX_Data.login(acc, pwd).then(function (profile) {
            if (profile.role !== 'teacher') { showError(['field-t-account', 'field-t-password']); return; }
            Auth.set({ role: 'teacher', name: profile.name, title: profile.title, account: profile.account });
            window.location.href = 'admin.html';
          }).catch(function (err) {
            showError(['field-t-account', 'field-t-password'], err && err.message);
          });
        } else if (acc === creds.teacher.account && pwd === creds.teacher.password) {
          Auth.set({ role: 'teacher', name: creds.teacher.name, title: creds.teacher.title, account: acc });
          window.location.href = 'admin.html';
        } else {
          showError(['field-t-account', 'field-t-password']);
        }
      } else if (role === 'student') {
        var no = sAccount.value.trim();
        var spwd = sPassword.value;
        if (window.ZHXX_Data.mode === 'server') {
          window.ZHXX_Data.login(no, spwd).then(function (profile) {
            if (profile.role !== 'student') { showError(['field-s-account', 'field-s-password']); return; }
            Auth.set({ role: 'student', id: profile.id, name: profile.name, studentNo: profile.account });
            window.location.href = 'student.html?id=' + encodeURIComponent(profile.id);
          }).catch(function (err) {
            showError(['field-s-account', 'field-s-password'], err && err.message);
          });
        } else {
          var student = null;
          var list = Store.load();
          for (var j = 0; j < list.length; j++) {
            if (list[j].studentNo === no) { student = list[j]; break; }
          }
          if (student && spwd === creds.studentPassword) {
            Auth.set({ role: 'student', id: student.id, name: student.name, studentNo: student.studentNo });
            window.location.href = 'student.html?id=' + encodeURIComponent(student.id);
          } else {
            showError(['field-s-account', 'field-s-password']);
          }
        }
      } else if (role === 'parent') {
        var pAcc = pAccount.value.trim();
        var pPwd = pPassword.value;
        if (window.ZHXX_Data.mode === 'server') {
          window.ZHXX_Data.login(pAcc, pPwd).then(function (profile) {
            if (profile.role !== 'parent') { showError(['field-p-account', 'field-p-password']); return; }
            Auth.set({ role: 'parent', id: profile.id, name: profile.name, account: profile.account });
            window.location.href = 'parent.html';
          }).catch(function (err) {
            showError(['field-p-account', 'field-p-password'], err && err.message);
          });
        } else {
          S.toast('演示模式（无后端）暂不支持家长入口，请启动 backend/app.py', 'warn');
        }
      }
    });

    // 服务端模式更新演示提示文案
    var note = document.getElementById('demo-note');
    if (note && window.ZHXX_Data.mode === 'server') {
      note.innerHTML = '已连接后端服务（数据持久化保存）：老师 <b>teacher</b>，学员为本人学号，家长账号为 <b>P+学号数字</b>，初始密码均为 <b>zx123456</b>。';
    }
  }

  /* ---------------------- 修改密码弹窗（老师端/学员端共用） ---------------------- */

  function initPasswordModal() {
    var S = window.ZHXX;
    var link = document.getElementById('pwd-link');
    var mask = document.getElementById('pwd-mask');
    if (!link || !mask) { return; }

    var form = document.getElementById('pwd-form');

    function close() {
      mask.classList.remove('open');
      document.body.style.overflow = '';
      form.reset();
    }

    link.addEventListener('click', function (ev) {
      ev.preventDefault();
      mask.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { document.getElementById('pw-old').focus(); }, 60);
    });
    document.getElementById('pwd-close').addEventListener('click', close);
    document.getElementById('pw-cancel').addEventListener('click', close);
    mask.addEventListener('click', function (ev) {
      if (ev.target === mask) { close(); }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && mask.classList.contains('open')) { close(); }
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var oldPw = document.getElementById('pw-old').value;
      var newPw = document.getElementById('pw-new').value;
      var newPw2 = document.getElementById('pw-new2').value;
      if (newPw.length < 6) { S.toast('新密码至少 6 位', 'warn'); return; }
      if (newPw !== newPw2) { S.toast('两次输入的新密码不一致', 'warn'); return; }
      window.ZHXX_Data.changePassword(oldPw, newPw).then(function () {
        S.toast('密码已修改，下次登录请使用新密码');
        close();
      }).catch(function (err) {
        S.toast(err.message || '修改密码失败，请重试', 'warn');
      });
    });
  }

  window.ZHXX = {
    esc: esc,
    subjectOptions: subjectOptions,
    subjectGroups: subjectGroups,
    setSubjectGroups: setSubjectGroups,
    knownSubject: knownSubject,
    SUBJECT_CATALOG: SUBJECT_CATALOG,
    getCustomSubjects: getCustomSubjects,
    addCustomSubject: addCustomSubject,
    daysFromToday: daysFromToday,
    fmtDateCN: fmtDateCN,
    lastActiveLabel: lastActiveLabel,
    totalWeeklyHours: totalWeeklyHours,
    pendingCount: pendingCount,
    stageClass: stageClass,
    firstChar: firstChar,
    avatarColor: avatarColor,
    toast: toast,
    weekDayLabels: weekDayLabels,
    todayStr: todayStr
  };

  /** 全站水印：左下角署名（所有页面可见，不影响交互） */
  function initWatermark() {
    if (document.getElementById('zhxx-wm')) { return; }
    var el = document.createElement('div');
    el.id = 'zhxx-wm';
    el.className = 'wm-credit';
    el.textContent = 'made by Jessie';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }

  window.ZHXX_READY.then(function () {
    initLoginPage();
    initPasswordModal();
    initWatermark();
  });
})();
