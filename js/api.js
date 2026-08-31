/* =========================================================
 * 成都智慧象留学 - 数据访问层（双模式）
 *
 * 服务端模式：检测到后端（python backend/app.py）时，所有读写走 REST API，
 *             数据落库持久保存，老师端写入 → 学员端刷新即可见（跨浏览器成立）。
 * 演示模式：  仅用 server.py 打开（无后端）时，退回 sessionStorage 本地演示，
 *             行为与交接前的纯演示版一致（审计/家长入口在演示模式不可用）。
 *
 * 两种模式对外提供同一套方法（返回值结构相同），页面逻辑无需区分。
 * ========================================================= */
(function () {
  'use strict';

  var TOKEN_KEY = 'zhxx_api_token_v1';
  var MODE_KEY = 'zhxx_api_mode_v1';
  var DEMO_CLASSES_KEY = 'zhxx_demo_classes_v1';
  var DEMO_STAGES_KEY = 'zhxx_demo_stages_v1';

  var API = {
    mode: 'demo', // 'server' | 'demo'
    token: null,

    /** 读取保存的登录令牌 */
    loadToken: function () {
      try { API.token = sessionStorage.getItem(TOKEN_KEY) || null; } catch (e) { API.token = null; }
      return API.token;
    },
    saveToken: function (token) {
      API.token = token;
      try {
        if (token) { sessionStorage.setItem(TOKEN_KEY, token); } else { sessionStorage.removeItem(TOKEN_KEY); }
      } catch (e) { /* 忽略 */ }
    },

    /** 探测后端是否可用（页面加载时调用一次） */
    detect: function () {
      return fetch('/api/ping', { method: 'POST', cache: 'no-store' })
        .then(function (res) { return res.ok; })
        .then(function (ok) {
          API.mode = ok ? 'server' : 'demo';
          try { sessionStorage.setItem(MODE_KEY, API.mode); } catch (e) { /* 忽略 */ }
          API.loadToken();
          return API.mode;
        })
        .catch(function () {
          API.mode = 'demo';
          try { sessionStorage.setItem(MODE_KEY, API.mode); } catch (e) { /* 忽略 */ }
          API.loadToken();
          return API.mode;
        });
    },

    /** 基础请求：非 2xx 抛出 Error（message 取后端 error 字段） */
    req: function (method, path, body) {
      var headers = { 'Content-Type': 'application/json' };
      if (API.token) { headers['Authorization'] = 'Bearer ' + API.token; }
      return fetch(path, {
        method: method,
        headers: headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store'
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) {
            var err = new Error(data.error || ('请求失败（' + res.status + '）'));
            err.status = res.status;
            throw err;
          }
          return data;
        });
      });
    },

    /** 登录：服务端模式走 API，成功后保存令牌与身份 */
    login: function (account, password) {
      return API.req('POST', '/api/auth/login', { account: account, password: password })
        .then(function (data) {
          API.saveToken(data.token);
          return data.profile;
        });
    },

    logout: function () {
      if (API.mode === 'server' && API.token) {
        API.req('POST', '/api/auth/logout').catch(function () { /* 忽略 */ });
      }
      API.saveToken(null);
    },

    /** 首屏数据：学员列表 + 科目库。服务端模式拉取 API；演示模式返回 null（由调用方走 Store） */
    bootstrap: function () {
      if (API.mode !== 'server' || !API.token) { return Promise.resolve(null); }
      return API.req('GET', '/api/bootstrap');
    },

    addRecord: function (studentId, record) {
      return API.req('POST', '/api/students/' + encodeURIComponent(studentId) + '/records', record)
        .then(function (d) { return d.student; });
    },

    reviewRecord: function (recordId, comment) {
      return API.req('PUT', '/api/records/' + encodeURIComponent(recordId) + '/review', { comment: comment })
        .then(function (d) { return d.student; });
    },

    addExam: function (studentId, exam) {
      return API.req('POST', '/api/students/' + encodeURIComponent(studentId) + '/scores', exam)
        .then(function (d) { return d.student; });
    },

    updateProfile: function (studentId, fields) {
      return API.req('PUT', '/api/students/' + encodeURIComponent(studentId), fields)
        .then(function (d) { return d.student; });
    },

    addSubject: function (name) {
      return API.req('POST', '/api/subjects', { name: name }).then(function (d) { return d.groups; });
    },

    changePassword: function (oldPassword, newPassword) {
      return API.req('PUT', '/api/me/password', { oldPassword: oldPassword, newPassword: newPassword });
    },

    /** 导出 Excel（服务端模式）：拉取 xlsx 二进制并触发下载 */
    exportExcel: function (semester) {
      var headers = {};
      if (API.token) { headers['Authorization'] = 'Bearer ' + API.token; }
      var qs = semester && semester !== '全部学期' ? ('?semester=' + encodeURIComponent(semester)) : '';
      return fetch('/api/export/students.xlsx' + qs, { headers: headers, cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) { throw new Error('导出失败（' + res.status + '）'); }
          return res.blob();
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = semester && semester !== '全部学期' ? '学员进度总览_' + semester + '.xlsx' : '学员进度总览.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        });
    },

    createStudent: function (fields) {
      return API.req('POST', '/api/students', fields).then(function (d) { return d.student; });
    },

    setStudentStatus: function (studentId, status, reason) {
      return API.req('PUT', '/api/students/' + encodeURIComponent(studentId) + '/status', { status: status, reason: reason || '' })
        .then(function (d) { return d.student; });
    },

    getConfig: function () {
      return API.req('GET', '/api/config');
    },
    addClass: function (name) {
      return API.req('POST', '/api/classes', { name: name }).then(function (d) { return d.classes; });
    },
    setClassStatus: function (name, active) {
      return API.req('PUT', '/api/classes/' + encodeURIComponent(name) + '/status', { active: active })
        .then(function (d) { return d.classes; });
    },
    updateStageStandard: function (name, description) {
      return API.req('PUT', '/api/stage-standards/' + encodeURIComponent(name), { description: description })
        .then(function (d) { return d.stageStandards; });
    },

    auditList: function (action) {
      var qs = action && action !== '全部' ? ('?action=' + encodeURIComponent(action)) : '?limit=200';
      return API.req('GET', '/api/audit' + qs).then(function (d) { return d.logs; });
    },

    parentLogin: function (studentNo, authCode) {
      return API.req('POST', '/api/parent/login', { studentNo: studentNo, authCode: authCode })
        .then(function (data) {
          API.saveToken(data.token);
          return data.profile;
        });
    },
    parentSummary: function () {
      return API.req('GET', '/api/parent/summary');
    },

    /** 六期：教师账号管理（admin） */
    teachers: function () {
      return API.req('GET', '/api/teachers').then(function (d) { return d.teachers; });
    },
    createTeacher: function (fields) {
      return API.req('POST', '/api/teachers', fields);
    },
    setTeacherStatus: function (account, status) {
      return API.req('PUT', '/api/teachers/' + encodeURIComponent(account) + '/status', { status: status });
    },
    resetTeacherPassword: function (account, password) {
      return API.req('PUT', '/api/teachers/' + encodeURIComponent(account) + '/password', { password: password || '' });
    },

    /** 六期：课程进度「学到哪里」（按科目 upsert） */
    updateCourseProgress: function (studentId, payload) {
      return API.req('PUT', '/api/students/' + encodeURIComponent(studentId) + '/course-progress', payload)
        .then(function (d) { return d.student; });
    }
  };

  /* ---------------------- 演示模式的本地业务逻辑 ---------------------- */
  /* 注意：本文件在 common.js 之前加载，Store/ZHXX 在调用时再取 */

  /** 在本地列表中取出学员（并回写到列表，保持引用语义与原 admin.js 一致） */
  function findStudent(studentId) {
    var list = window.ZHXX_Store.load();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === studentId) { return { student: list[i], list: list }; }
    }
    return { student: null, list: list };
  }

  /** 按入学日期归入学期（与后端 semester_of 规则一致） */
  function semesterOf(dateStr) {
    var parts = String(dateStr || '').split('-');
    if (parts.length < 2) { return '未知'; }
    var y = Number(parts[0]), m = Number(parts[1]);
    if (m >= 2 && m <= 7) { return y + ' 春季学期'; }
    return (m >= 8 ? y : y - 1) + ' 秋季学期';
  }

  function ssGet(key, fallback) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function ssSet(key, val) {
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略 */ }
  }

  var Demo = {
    bootstrap: function () { return Promise.resolve(null); },

    addRecord: function (studentId, record) {
      var S = window.ZHXX;
      var Store = window.ZHXX_Store;
      var found = findStudent(studentId);
      var target = found.student;
      if (!target) { return Promise.reject(new Error('未找到学员数据')); }
      target.records.unshift(JSON.parse(JSON.stringify(record)));
      var diff = S.daysFromToday(record.date);
      if (diff >= 0 && diff < 7) {
        var todayIdx = (new Date().getDay() + 6) % 7;
        var idx = todayIdx - diff;
        if (idx >= 0 && idx < 7) {
          target.weeklyHours[idx] = Math.round((Number(target.weeklyHours[idx]) + record.duration) * 10) / 10;
        }
      }
      if (target.progress < 99) {
        target.progress = Math.min(99, Math.round((target.progress + 1) * 10) / 10);
        target.trend[target.trend.length - 1] = target.progress;
      }
      Store.save(found.list);
      return Promise.resolve(target);
    },

    reviewRecord: function (studentId, recordId, comment) {
      var Store = window.ZHXX_Store;
      var found = findStudent(studentId);
      var target = found.student;
      var rec = null;
      if (target) {
        for (var i = 0; i < target.records.length; i++) {
          var recId = target.records[i].id === undefined ? i : target.records[i].id;
          if (String(recId) === String(recordId)) { rec = target.records[i]; break; }
        }
      }
      if (!target || !rec) { return Promise.reject(new Error('未找到对应记录')); }
      rec.comment = comment;
      rec.status = '已完成';
      Store.save(found.list);
      return Promise.resolve(target);
    },

    addExam: function (studentId, exam) {
      var Store = window.ZHXX_Store;
      var found = findStudent(studentId);
      var target = found.student;
      if (!target) { return Promise.reject(new Error('未找到学员数据')); }
      target.exams.unshift(JSON.parse(JSON.stringify(exam)));
      if (target.progress < 99) {
        target.progress = Math.min(99, Math.round((target.progress + 2) * 10) / 10);
        target.trend[target.trend.length - 1] = target.progress;
      }
      Store.save(found.list);
      return Promise.resolve(target);
    },

    updateProfile: function (studentId, fields) {
      var Store = window.ZHXX_Store;
      var found = findStudent(studentId);
      var target = found.student;
      if (!target) { return Promise.reject(new Error('未找到学员数据')); }
      for (var k in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, k) && fields[k] !== undefined) { target[k] = fields[k]; }
      }
      Store.save(found.list);
      return Promise.resolve(target);
    },

    createStudent: function (fields) {
      var Store = window.ZHXX_Store;
      var list = Store.load();
      var maxNum = 0;
      for (var i = 0; i < list.length; i++) {
        var n = Number(String(list[i].studentNo || '').slice(1));
        if (n > maxNum) { maxNum = n; }
      }
      var no = 'S' + (maxNum + 1);
      var student = {
        id: no, studentNo: no,
        name: fields.name, grade: fields.grade || '高一', className: fields.className || '',
        subjects: fields.subjects || [], enrollDate: fields.enrollDate || window.ZHXX.todayStr(),
        stage: fields.stage || '基础期', goal: fields.goal || '',
        progress: 0, trend: [0, 0, 0, 0, 0, 0], weeklyHours: [0, 0, 0, 0, 0, 0, 0],
        records: [], exams: [], status: '在读', authCode: 'P' + no.slice(1)
      };
      list.push(student);
      Store.save(list);
      return Promise.resolve(student);
    },

    setStudentStatus: function (studentId, status) {
      var Store = window.ZHXX_Store;
      var found = findStudent(studentId);
      if (!found.student) { return Promise.reject(new Error('未找到学员数据')); }
      found.student.status = status;
      Store.save(found.list);
      return Promise.resolve(found.student);
    },

    addSubject: function (name) {
      window.ZHXX.addCustomSubject(name);
      return Promise.resolve(null);
    },

    getConfig: function () {
      var S = window.ZHXX;
      var classSet = {};
      var list = window.ZHXX_Store.load();
      for (var i = 0; i < list.length; i++) { if (list[i].className) { classSet[list[i].className] = true; } }
      var savedClasses = ssGet(DEMO_CLASSES_KEY, null);
      var classes;
      if (savedClasses) {
        classes = savedClasses;
      } else {
        classes = Object.keys(classSet).sort().map(function (n) { return { name: n, active: 1 }; });
      }
      var stages = ssGet(DEMO_STAGES_KEY, null);
      if (!stages) {
        stages = (window.STAGE_LIST || ['基础期', '强化期', '冲刺期']).map(function (n) { return { name: n, description: '' }; });
      }
      return Promise.resolve({ classes: classes, stageStandards: stages });
    },

    addClass: function (name) {
      return Demo.getConfig().then(function (cfg) {
        for (var i = 0; i < cfg.classes.length; i++) {
          if (cfg.classes[i].name === name) { throw new Error('该班级已存在'); }
        }
        cfg.classes.push({ name: name, active: 1 });
        ssSet(DEMO_CLASSES_KEY, cfg.classes);
        return cfg.classes;
      });
    },

    setClassStatus: function (name, active) {
      return Demo.getConfig().then(function (cfg) {
        for (var i = 0; i < cfg.classes.length; i++) {
          if (cfg.classes[i].name === name) { cfg.classes[i].active = active ? 1 : 0; }
        }
        ssSet(DEMO_CLASSES_KEY, cfg.classes);
        return cfg.classes;
      });
    },

    updateStageStandard: function (name, description) {
      return Demo.getConfig().then(function (cfg) {
        for (var i = 0; i < cfg.stageStandards.length; i++) {
          if (cfg.stageStandards[i].name === name) { cfg.stageStandards[i].description = description; }
        }
        ssSet(DEMO_STAGES_KEY, cfg.stageStandards);
        return cfg.stageStandards;
      });
    },

    auditList: function () {
      return Promise.reject(new Error('演示模式（无后端）不记录审计日志，请启动 backend/app.py'));
    },

    changePassword: function () {
      return Promise.reject(new Error('演示模式（无后端）不支持修改密码，请启动 backend/app.py'));
    },

    exportExcel: function (semester) {
      // 演示模式：客户端生成 CSV（Excel 可直接打开），支持学期筛选
      var S = window.ZHXX;
      var list = window.ZHXX_Store.load();
      var head = ['学号', '姓名', '年级', '班级', '当前阶段', '备考课程', '入学学期', '备考进度(%)', '本周时长(小时)', '学习记录(条)', '待评阅(条)', '入学日期', '状态', '阶段目标'];
      var lines = [head.join(',')];
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var sem = semesterOf(s.enrollDate);
        if (semester && semester !== '全部学期' && sem !== semester) { continue; }
        var pending = S.pendingCount(s);
        var row = [s.studentNo, s.name, s.grade, s.className, s.stage,
          '"' + s.subjects.join('、') + '"', '"' + sem + '"', s.progress, S.totalWeeklyHours(s),
          (s.records || []).length, pending, s.enrollDate, s.status || '在读', '"' + (s.goal || '') + '"'];
        lines.push(row.join(','));
      }
      var csv = '\uFEFF' + lines.join('\r\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = semester && semester !== '全部学期' ? '学员进度总览_' + semester + '.csv' : '学员进度总览.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return Promise.resolve();
    },

    parentLogin: function (account, password) {
      // 演示模式家长账号：P+学号数字（如 P2026001 → 学员 S2026001），密码同学生
      var creds = window.DEMO_CREDENTIALS || { studentPassword: 'zx123456' };
      var acc = String(account || '').trim().toUpperCase();
      var studentNo = acc.charAt(0) === 'P' ? ('S' + acc.slice(1)) : acc;
      var list = window.ZHXX_Store.load();
      var student = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].studentNo === studentNo) { student = list[i]; break; }
      }
      if (!student || password !== creds.studentPassword) {
        return Promise.reject(new Error('账号或密码不正确'));
      }
      if (student.status === '停用') {
        return Promise.reject(new Error('该学员账号已停用，请联系老师'));
      }
      return Promise.resolve({
        role: 'parent', name: student.name, id: student.id, account: acc, studentNo: student.studentNo
      });
    },
    parentSummary: function () {
      var Auth = window.ZHXX_Auth;
      var S = window.ZHXX;
      var auth = Auth.get();
      var s = window.ZHXX_Store.getById(auth && auth.id);
      if (!s) { return Promise.reject(new Error('未找到学员数据')); }
      var comments = [];
      var records = s.records || [];
      for (var i = 0; i < records.length && comments.length < 3; i++) {
        if (records[i].comment) {
          comments.push({ date: records[i].date, subject: records[i].subject, comment: records[i].comment });
        }
      }
      return Promise.resolve({
        student: {
          name: s.name, studentNo: s.studentNo, grade: s.grade,
          className: s.className, stage: s.stage, goal: s.goal,
          progress: s.progress, weeklyHours: s.weeklyHours, subjects: s.subjects,
          progressDetail: s.progressDetail || null,
          courseProgress: s.courseProgress || [],
          teacherName: s.teacherName || ''
        },
        recentComments: comments,
        latestExams: (s.exams || []).slice(0, 3)
      });
    },

    /** 六期演示模式：教师管理不可用（无后端） */
    teachers: function () {
      return Promise.reject(new Error('演示模式（无后端）不支持教师管理，请启动 backend/app.py'));
    },
    createTeacher: function () {
      return Promise.reject(new Error('演示模式（无后端）不支持教师管理，请启动 backend/app.py'));
    },
    setTeacherStatus: function () {
      return Promise.reject(new Error('演示模式（无后端）不支持教师管理，请启动 backend/app.py'));
    },
    resetTeacherPassword: function () {
      return Promise.reject(new Error('演示模式（无后端）不支持教师管理，请启动 backend/app.py'));
    },

    /** 六期演示模式：课程进度写本地 sessionStorage（与记录同库） */
    updateCourseProgress: function (studentId, payload) {
      var found = findStudent(studentId);
      var target = found.student;
      if (!target) { return Promise.reject(new Error('未找到学员数据')); }
      if (!target.courseProgress || Object.prototype.toString.call(target.courseProgress) !== '[object Array]') {
        target.courseProgress = [];
      }
      var hit = null;
      for (var i = 0; i < target.courseProgress.length; i++) {
        if (target.courseProgress[i].subject === payload.subject) { hit = target.courseProgress[i]; break; }
      }
      if (hit) {
        hit.mark = payload.mark;
        hit.updatedAt = new Date().toISOString().slice(0, 19);
      } else {
        target.courseProgress.push({
          subject: payload.subject, mark: payload.mark,
          updatedAt: new Date().toISOString().slice(0, 19)
        });
      }
      window.ZHXX_Store.save(found.list);
      return Promise.resolve(target);
    }
  };

  /** 统一入口：页面只调用 ZHXX_Data.xxx，模式差异在内部消化 */
  window.ZHXX_Data = {
    get mode() { return API.mode; },

    detect: function () { return API.detect(); },
    login: function (account, password) {
      if (API.mode === 'server') { return API.login(account, password); }
      return Promise.reject(new Error('demo'));
    },
    logout: function () { API.logout(); },

    bootstrap: function () {
      return API.mode === 'server' ? API.bootstrap() : Demo.bootstrap();
    },
    addRecord: function (studentId, record) {
      return API.mode === 'server' ? API.addRecord(studentId, record) : Demo.addRecord(studentId, record);
    },
    reviewRecord: function (studentId, recordId, comment) {
      return API.mode === 'server' ? API.reviewRecord(recordId, comment) : Demo.reviewRecord(studentId, recordId, comment);
    },
    addExam: function (studentId, exam) {
      return API.mode === 'server' ? API.addExam(studentId, exam) : Demo.addExam(studentId, exam);
    },
    updateProfile: function (studentId, fields) {
      return API.mode === 'server' ? API.updateProfile(studentId, fields) : Demo.updateProfile(studentId, fields);
    },
    createStudent: function (fields) {
      return API.mode === 'server' ? API.createStudent(fields) : Demo.createStudent(fields);
    },
    setStudentStatus: function (studentId, status) {
      return API.mode === 'server' ? API.setStudentStatus(studentId, status, arguments[2]) : Demo.setStudentStatus(studentId, status);
    },
    addSubject: function (name) {
      return API.mode === 'server' ? API.addSubject(name) : Demo.addSubject(name);
    },
    changePassword: function (oldPw, newPw) {
      return API.mode === 'server' ? API.changePassword(oldPw, newPw) : Demo.changePassword(oldPw, newPw);
    },
    exportExcel: function (semester) {
      return API.mode === 'server' ? API.exportExcel(semester) : Demo.exportExcel(semester);
    },
    getConfig: function () {
      return API.mode === 'server' ? API.getConfig() : Demo.getConfig();
    },
    addClass: function (name) {
      return API.mode === 'server' ? API.addClass(name) : Demo.addClass(name);
    },
    setClassStatus: function (name, active) {
      return API.mode === 'server' ? API.setClassStatus(name, active) : Demo.setClassStatus(name, active);
    },
    updateStageStandard: function (name, description) {
      return API.mode === 'server' ? API.updateStageStandard(name, description) : Demo.updateStageStandard(name, description);
    },
    auditList: function (action) {
      return API.mode === 'server' ? API.auditList(action) : Demo.auditList(action);
    },
    parentLogin: function (account, password) {
      // 服务端：家长账号在 users 表中，走统一登录；演示模式：本地校验
      return API.mode === 'server' ? API.login(account, password) : Demo.parentLogin(account, password);
    },
    parentSummary: function () {
      return API.mode === 'server' ? API.parentSummary() : Demo.parentSummary();
    },
    /** 服务端模式返回后端科目库分组；演示模式返回 null（页面走内置目录 + sessionStorage 自定义） */
    subjects: function () {
      return API.mode === 'server' ? API.req('GET', '/api/subjects').then(function (d) { return d.groups; }) : Promise.resolve(null);
    },

    /** 六期：教师账号管理（admin 专属，服务端模式） */
    teachers: function () {
      return API.mode === 'server' ? API.teachers() : Demo.teachers();
    },
    createTeacher: function (fields) {
      return API.mode === 'server' ? API.createTeacher(fields) : Demo.createTeacher(fields);
    },
    setTeacherStatus: function (account, status) {
      return API.mode === 'server' ? API.setTeacherStatus(account, status) : Demo.setTeacherStatus(account, status);
    },
    resetTeacherPassword: function (account, password) {
      return API.mode === 'server' ? API.resetTeacherPassword(account, password) : Demo.resetTeacherPassword(account, password);
    },

    /** 六期：课程进度「学到哪里」 */
    updateCourseProgress: function (studentId, payload) {
      return API.mode === 'server' ? API.updateCourseProgress(studentId, payload) : Demo.updateCourseProgress(studentId, payload);
    }
  };

  /** 模式探测完成即视为公共层就绪（common.js / admin.js / student.js / parent.js 均等待它） */
  window.ZHXX_READY = API.detect();
})();
