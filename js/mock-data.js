/* =========================================================
 * 成都智慧象留学 - 模拟数据（留学教培场景）
 * 说明：所有日期均基于"今天"动态生成，保证演示时数据始终新鲜。
 * ========================================================= */
(function () {
  'use strict';

  /** 生成 n 天前的日期字符串（YYYY-MM-DD） */
  function d(n) {
    var t = new Date();
    t.setDate(t.getDate() - n);
    var m = t.getMonth() + 1;
    var day = t.getDate();
    return t.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  /* ---------------------------------------------------------
   * 学员数据结构说明：
   * id          学员唯一标识（与学号一致，如 S2026001）
   * name        姓名
   * studentNo   学号（登录账号）
   * grade       年级
   * className   班级
   * subjects    备考课程：雅思听力 / 雅思写作 / 托福听力 / 托福阅读 /
   *             SAT数学 / A-Level物理 / 留学申请规划
   * enrollDate  入学日期
   * stage       当前阶段：基础期 / 强化期 / 冲刺期
   * goal        阶段目标
   * progress    总体备考进度百分比（0-100）
   * trend       近 6 次进度快照（用于趋势图，末位与 progress 一致）
   * weeklyHours 本周每日学习时长（周一至周日，单位：小时）
   * records     学习记录数组：{date, subject, content, duration, status, comment}
   *             status 取值：已完成 / 待评阅
   * exams       阶段测评成绩：{stage, subject, score, date}
   *             （雅思为 10 分制小数，其余为百分制 / 满分制原始分）
   * --------------------------------------------------------- */
  window.MOCK_STUDENTS = [
    {
      id: 'S2026001',
      name: '陈思远',
      studentNo: 'S2026001',
      grade: '高二',
      className: '雅思精品班',
      subjects: ['雅思听力', '雅思写作'],
      enrollDate: '2026-03-02',
      stage: '强化期',
      goal: '10 月首考雅思总分 6.5，听力单项不低于 6.0',
      progress: 72,
      trend: [38, 46, 53, 60, 66, 72],
      weeklyHours: [2.5, 3.0, 1.5, 3.5, 2.0, 4.0, 2.5],
      records: [
        { date: d(0), subject: '雅思听力', content: '完成 Section 2 独白精听练习，逐句听写并订正连读与弱读问题', duration: 1.5, status: '待评阅', comment: '' },
        { date: d(1), subject: '雅思写作', content: '大作文练习：教育类话题，完成审题提纲与 320 词正文', duration: 2.0, status: '已完成', comment: '论证结构清晰，注意让步段的逻辑衔接，继续保持。' },
        { date: d(3), subject: '雅思听力', content: '精听 Part 1 高频场景对话 20 篇，整理场景词汇本', duration: 1.0, status: '已完成', comment: '听写准确率比上月明显提升，注意单复数等细节。' },
        { date: d(5), subject: '雅思写作', content: '剑桥范文精读 3 篇，摘抄高分句型并完成仿写练习', duration: 2.5, status: '已完成', comment: '仿写句型运用得当，建议整理成个人句型库。' },
        { date: d(7), subject: '雅思听力', content: '听力全真模考一次，完成 Section 1–4 全流程演练', duration: 1.5, status: '已完成', comment: '正确率达标，Section 3 学术讨论需加强多说话人辨音。' },
        { date: d(10), subject: '雅思写作', content: '小作文线图专项练习，完成 2 篇数据描述段落', duration: 2.0, status: '已完成', comment: '数据概括准确，注意趋势词汇的多样性。' }
      ],
      exams: [
        { stage: '强化期', subject: '雅思听力', score: 5.5, date: d(14) },
        { stage: '强化期', subject: '雅思写作', score: 5.5, date: d(14) },
        { stage: '基础期', subject: '雅思听力', score: 5.0, date: d(60) },
        { stage: '基础期', subject: '雅思写作', score: 4.5, date: d(62) }
      ]
    },
    {
      id: 'S2026002',
      name: '林雨桐',
      studentNo: 'S2026002',
      grade: '高三',
      className: '雅思精品班',
      subjects: ['雅思听力', '雅思写作'],
      enrollDate: '2025-11-15',
      stage: '冲刺期',
      goal: '11 月考试冲刺总分 7.0，写作单项 6.5',
      progress: 88,
      trend: [62, 70, 75, 80, 84, 88],
      weeklyHours: [3.5, 3.0, 3.5, 2.5, 3.0, 4.5, 3.0],
      records: [
        { date: d(0), subject: '雅思写作', content: '考前套卷写作：大作文 + 小作文限时 60 分钟完成', duration: 2.5, status: '待评阅', comment: '' },
        { date: d(1), subject: '雅思听力', content: '听力模考 2 轮，重点演练 Section 3 学术讨论', duration: 2.0, status: '已完成', comment: '审题预判准，注意考试节奏中保持稳定跟读速度。' },
        { date: d(2), subject: '雅思写作', content: '复盘近 5 篇作文的批改意见，整理易错点清单', duration: 1.5, status: '已完成', comment: '复盘很到位，易错点清单建议考前每天过一遍。' },
        { date: d(4), subject: '雅思听力', content: '高频场景词串讲练习，将 15 组场景词汇串联成听写网络', duration: 2.0, status: '已完成', comment: '素材网络方法很好，考场可灵活迁移。' },
        { date: d(6), subject: '雅思写作', content: '小作文流程图与地图题专项突破，完成 3 篇练习', duration: 2.5, status: '已完成', comment: '流程图表述规范，地图题方位词需再熟练。' },
        { date: d(9), subject: '雅思听力', content: '完成听力题库新一季题目梳理与错题归纳', duration: 3.0, status: '已完成', comment: '题库覆盖完整，错题归纳细致。' }
      ],
      exams: [
        { stage: '冲刺期', subject: '雅思听力', score: 6.5, date: d(7) },
        { stage: '冲刺期', subject: '雅思写作', score: 6.0, date: d(7) },
        { stage: '强化期', subject: '雅思听力', score: 6.0, date: d(45) },
        { stage: '强化期', subject: '雅思写作', score: 5.5, date: d(45) }
      ]
    },
    {
      id: 'S2026003',
      name: '周子昂',
      studentNo: 'S2026003',
      grade: '高二',
      className: '托福直达班',
      subjects: ['托福听力', '托福阅读'],
      enrollDate: '2026-04-10',
      stage: '强化期',
      goal: '12 月托福首考 90 分，听力单项 25+',
      progress: 65,
      trend: [36, 43, 50, 55, 60, 65],
      weeklyHours: [2.0, 2.5, 1.5, 2.5, 2.0, 3.5, 2.0],
      records: [
        { date: d(0), subject: '托福听力', content: 'TPO 42 听力套题精练， lecture 部分逐句精听并跟读', duration: 2.0, status: '待评阅', comment: '' },
        { date: d(2), subject: '托福阅读', content: '生物类篇章限时训练 2 篇，整理学术词汇 40 个', duration: 1.5, status: '已完成', comment: '定位速度提升明显，插入句子题仍需专项练习。' },
        { date: d(3), subject: '托福听力', content: '天文主题 lecture 泛听 3 篇，完成结构笔记复述', duration: 1.5, status: '已完成', comment: '笔记层次感变好，注意抓住 professor 的转折语气。' },
        { date: d(5), subject: '托福阅读', content: '长难句拆解专项：完成 60 句主干提取练习', duration: 2.0, status: '已完成', comment: '拆句方法掌握扎实，阅读速度可再上台阶。' },
        { date: d(8), subject: '托福听力', content: '对话类 conversation 专项：校园场景 8 篇限时练', duration: 1.5, status: '已完成', comment: '正确率 85%，细节题的排除法运用越来越熟练。' }
      ],
      exams: [
        { stage: '强化期', subject: '托福听力', score: 23, date: d(12) },
        { stage: '强化期', subject: '托福阅读', score: 21, date: d(12) },
        { stage: '基础期', subject: '托福听力', score: 18, date: d(55) },
        { stage: '基础期', subject: '托福阅读', score: 17, date: d(55) }
      ]
    },
    {
      id: 'S2026004',
      name: '吴佳琪',
      studentNo: 'S2026004',
      grade: '高一',
      className: 'SAT冲刺班',
      subjects: ['SAT数学'],
      enrollDate: '2026-05-06',
      stage: '强化期',
      goal: 'SAT 数学冲 780，代数核心保持满分正确率',
      progress: 68,
      trend: [40, 47, 53, 59, 64, 68],
      weeklyHours: [1.5, 2.0, 1.5, 2.0, 1.5, 3.0, 2.0],
      records: [
        { date: d(0), subject: 'SAT数学', content: '代数核心限时训练：linear equations 25 题，正确率统计', duration: 1.5, status: '待评阅', comment: '' },
        { date: d(1), subject: 'SAT数学', content: '错题重做：上周模考失分题 12 道全部重做并写错因', duration: 1.5, status: '已完成', comment: '重做正确率 92%，计算粗心仍是最大扣分点。' },
        { date: d(3), subject: 'SAT数学', content: 'Problem Solving & Data Analysis 专项：图表分析题 20 题', duration: 2.0, status: '已完成', comment: '读图能力进步快，注意单位换算的陷阱题。' },
        { date: d(6), subject: 'SAT数学', content: '英文题干审题训练：圈画关键词练习，限时完成 15 题', duration: 1.0, status: '已完成', comment: '审题习惯养成后正确率明显稳定，继续坚持。' },
        { date: d(9), subject: 'SAT数学', content: 'Passport to Advanced Math 专项：函数图像变换 18 题', duration: 2.0, status: '已完成', comment: '函数变换规律掌握牢，复杂分式方程可再提速。' }
      ],
      exams: [
        { stage: '强化期', subject: 'SAT数学', score: 720, date: d(10) },
        { stage: '基础期', subject: 'SAT数学', score: 660, date: d(38) }
      ]
    },
    {
      id: 'S2026005',
      name: '郑好',
      studentNo: 'S2026005',
      grade: '高二',
      className: 'A-Level班',
      subjects: ['A-Level物理'],
      enrollDate: '2026-06-20',
      stage: '基础期',
      goal: '完成力学模块基础梳理，单元测试稳定达到 A',
      progress: 42,
      trend: [18, 24, 30, 35, 39, 42],
      weeklyHours: [1.5, 1.0, 1.5, 1.0, 1.5, 2.5, 1.0],
      records: [
        { date: d(1), subject: 'A-Level物理', content: 'Kinematics 运动学公式应用练习，完成 past paper 基础题 12 道', duration: 1.5, status: '待评阅', comment: '' },
        { date: d(2), subject: 'A-Level物理', content: 'Projectile motion 抛体运动专题：分解思路梳理 + 8 题训练', duration: 1.5, status: '已完成', comment: '正交分解思路清晰，注意 air resistance 的假设条件。' },
        { date: d(4), subject: 'A-Level物理', content: '英文术语整理：力学章节 definition 列表背诵与默写', duration: 1.0, status: '已完成', comment: '定义表述规范了，mark scheme 关键词抓得准。' },
        { date: d(7), subject: 'A-Level物理', content: 'Newton 定律应用题专练：连接体与斜面模型各 5 题', duration: 2.0, status: '已完成', comment: '受力分析图作图规范，整体法隔离法切换灵活。' }
      ],
      exams: [
        { stage: '基础期', subject: 'A-Level物理', score: 76, date: d(15) }
      ]
    },
    {
      id: 'S2026006',
      name: '许静怡',
      studentNo: 'S2026006',
      grade: '高三',
      className: '申请规划组',
      subjects: ['留学申请规划'],
      enrollDate: '2025-12-01',
      stage: '冲刺期',
      goal: '11 月前完成英本五所院校文书定稿与网申提交',
      progress: 85,
      trend: [64, 71, 76, 80, 83, 85],
      weeklyHours: [2.0, 2.5, 2.0, 2.5, 2.0, 3.5, 2.5],
      records: [
        { date: d(0), subject: '留学申请规划', content: 'UCL 个人陈述第三稿修改：突出科研经历与专业匹配度', duration: 2.0, status: '待评阅', comment: '' },
        { date: d(1), subject: '留学申请规划', content: '院校清单终审：确认五所目标校的专业的录取要求与截止日期', duration: 1.5, status: '已完成', comment: '选校梯度合理，冲刺与保底搭配科学。' },
        { date: d(3), subject: '留学申请规划', content: '推荐信沟通：整理与两位推荐老师的沟通要点与时间表', duration: 1.0, status: '已完成', comment: '材料推进有条理，记得提前两周再次确认老师档期。' },
        { date: d(5), subject: '留学申请规划', content: '网申系统填写练习：UCAS 表单逐项核对个人信息与成绩', duration: 1.5, status: '已完成', comment: '信息填写准确，荣誉奖项的英文表述需再润色。' },
        { date: d(8), subject: '留学申请规划', content: '模拟面试一轮：为什么选择该专业的英文问答演练', duration: 2.0, status: '已完成', comment: '表达真诚自然，学术热情的故事化呈现很打动人。' }
      ],
      exams: [
        { stage: '冲刺期', subject: '留学申请规划', score: 92, date: d(8) },
        { stage: '强化期', subject: '留学申请规划', score: 86, date: d(42) }
      ]
    },
    {
      id: 'S2026007',
      name: '罗一鸣',
      studentNo: 'S2026007',
      grade: '高一',
      className: '雅思基础班',
      subjects: ['雅思听力'],
      enrollDate: '2026-05-18',
      stage: '基础期',
      goal: 'Part 1 话题自然应答 30 秒以上，完成基础语料积累',
      progress: 50,
      trend: [22, 30, 36, 42, 47, 50],
      weeklyHours: [2.0, 1.5, 2.0, 1.5, 2.0, 2.5, 2.0],
      records: [
        { date: d(1), subject: '雅思听力', content: 'Section 1"住房租赁"场景练习，精听并自查拼写', duration: 1.5, status: '待评阅', comment: '' },
        { date: d(2), subject: '雅思听力', content: '跟读模仿练习 3 期，注意数字与地名的连读辨音', duration: 1.0, status: '已完成', comment: '听辨能力强，注意 13 与 30 等数字的区分。' },
        { date: d(4), subject: '雅思听力', content: '积累租房场景核心词汇 40 个，完成听写练习', duration: 1.5, status: '已完成', comment: '词汇听写正确率高，注意在填空中主动拼写验证。' },
        { date: d(7), subject: '雅思听力', content: '完成 Section 1 题库 12 组对话的精听练习', duration: 2.0, status: '已完成', comment: '正确率比上月提升，审题建议"预读+定位+核对"三步。' }
      ],
      exams: [
        { stage: '基础期', subject: '雅思听力', score: 4.5, date: d(25) }
      ]
    },
    {
      id: 'S2026008',
      name: '韩雨薇',
      studentNo: 'S2026008',
      grade: '高二',
      className: '托福直达班',
      subjects: ['托福听力'],
      enrollDate: '2025-09-01',
      stage: '强化期',
      goal: '精听正确率稳定在 85%，听力单项冲 26+',
      progress: 74,
      trend: [50, 56, 61, 66, 70, 74],
      weeklyHours: [2.0, 2.5, 2.0, 3.0, 2.0, 3.0, 2.5],
      records: [
        { date: d(0), subject: '托福听力', content: 'TPO 45 lecture 精听：艺术史主题，完成逐句听写', duration: 2.0, status: '待评阅', comment: '' },
        { date: d(2), subject: '托福听力', content: '错题复盘：上周套题失分题重听，分析出题点规律', duration: 1.5, status: '已完成', comment: '出题点预判意识增强，注意例子后的考点。' },
        { date: d(3), subject: '托福听力', content: '影子跟读训练 30 分钟：学术场景语速适应练习', duration: 1.0, status: '已完成', comment: '跟读流畅度提升，长难句的抓主干能力还需加强。' },
        { date: d(6), subject: '托福听力', content: '笔记符号体系优化：整理 20 个高频缩写符号并实操', duration: 1.5, status: '已完成', comment: '笔记速度上来了，符号体系个性化程度高。' },
        { date: d(9), subject: '托福听力', content: '听力模考一套（含 conversation + 2 lecture），限时完成', duration: 2.5, status: '已完成', comment: '26 分水平，稳定发挥，细节题保持警惕即可。' }
      ],
      exams: [
        { stage: '强化期', subject: '托福听力', score: 26, date: d(9) },
        { stage: '强化期', subject: '托福听力', score: 23, date: d(35) },
        { stage: '基础期', subject: '托福听力', score: 20, date: d(72) }
      ]
    },
    {
      id: 'S2026009',
      name: '沈亦辰',
      studentNo: 'S2026009',
      grade: '高三',
      className: 'SAT冲刺班',
      subjects: ['SAT数学'],
      enrollDate: '2026-03-08',
      stage: '基础期',
      goal: '完成数学知识点全扫描，模考稳定 700 分以上',
      progress: 40,
      trend: [16, 22, 27, 32, 36, 40],
      weeklyHours: [1.5, 1.0, 1.5, 1.0, 1.5, 2.0, 1.0],
      records: [
        { date: d(1), subject: 'SAT数学', content: 'Heart of Algebra 知识点梳理：不等式与绝对值专项 20 题', duration: 1.5, status: '待评阅', comment: '' },
        { date: d(2), subject: 'SAT数学', content: '数学英文术语整理：易混词汇对照表背诵 30 组', duration: 1.0, status: '已完成', comment: '术语关基本过了，题干理解偏差明显减少。' },
        { date: d(4), subject: 'SAT数学', content: '计算器使用规范练习：graphing calculator 高效操作', duration: 1.0, status: '已完成', comment: '计算器运用熟练，非计算器部分的估算技巧再练。' },
        { date: d(7), subject: 'SAT数学', content: '基础模考半套（Section 3），限时 25 分钟完成', duration: 1.5, status: '已完成', comment: '得分率 76%，倒数第二题的审题失误很可惜。' }
      ],
      exams: [
        { stage: '基础期', subject: 'SAT数学', score: 690, date: d(18) }
      ]
    },
    {
      id: 'S2026010',
      name: '苏晚晴',
      studentNo: 'S2026010',
      grade: '高三',
      className: '申请规划组',
      subjects: ['留学申请规划', '雅思写作'],
      enrollDate: '2025-01-10',
      stage: '冲刺期',
      goal: '香港方向申请：11 月前文书定稿，雅思写作达标 6.5',
      progress: 82,
      trend: [58, 65, 70, 75, 79, 82],
      weeklyHours: [3.0, 2.5, 2.5, 3.0, 2.5, 4.0, 3.0],
      records: [
        { date: d(0), subject: '留学申请规划', content: '港大面试工作坊：小组讨论环节模拟与个人陈述问答演练', duration: 2.0, status: '待评阅', comment: '' },
        { date: d(2), subject: '雅思写作', content: '大作文同意与否类练习：科技与人际关系话题', duration: 2.0, status: '已完成', comment: '立场明确，让步段处理得当，注意控制篇幅。' },
        { date: d(3), subject: '留学申请规划', content: '文书素材整理：社会实践活动经历的时间线梳理', duration: 1.5, status: '已完成', comment: '素材复用率高，细节描写生动，建议量化成果。' },
        { date: d(5), subject: '雅思写作', content: '批改复盘：逐句修改上次作文的语法错误', duration: 1.5, status: '已完成', comment: '主谓一致问题基本解决，冠词用法仍需留意。' },
        { date: d(7), subject: '雅思写作', content: '小作文动态图专练：完成 3 篇趋势描述段落写作', duration: 2.0, status: '已完成', comment: '趋势词汇丰富，段落衔接自然流畅。' },
        { date: d(10), subject: '留学申请规划', content: '奖学金申请材料准备：整理获奖证明与翻译件清单', duration: 1.5, status: '已完成', comment: '材料齐全度很高，翻译件的格式需与模板统一。' }
      ],
      exams: [
        { stage: '冲刺期', subject: '留学申请规划', score: 88, date: d(10) },
        { stage: '冲刺期', subject: '雅思写作', score: 6.0, date: d(10) },
        { stage: '强化期', subject: '雅思写作', score: 5.5, date: d(50) }
      ]
    }
  ];

  /** 阶段中文文案映射 */
  window.STAGE_LIST = ['基础期', '强化期', '冲刺期'];

  /** 演示登录凭据 */
  window.DEMO_CREDENTIALS = {
    teacher: { account: 'teacher', password: 'zx123456', name: '王雅文', title: '教学总监' },
    studentPassword: 'zx123456'
  };
})();
