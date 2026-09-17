/* ============================================================
   76-skills-data.js —— 技能库种子数据
   · SKILL_CATS  技能分类（9 类，每类一个配色）
   · SKILL_SEED  已开发 / 已安装的技能目录（36 个）
   · CONN_SEED   已连接的连接器（3 个，来自 WorkBuddy connector-states）
   数据来源：~/.workbuddy/skills 下各技能目录的 SKILL.md frontmatter
             （name / description / version / agent_created）
             ~/.workbuddy/connectors 下 connector-states.json（bound / enabled）
   更新方式：改本文件后把 SKILL_SEED_VERSION +1，再 node build.mjs。

   dup 字段（优化技能库用）：标注「疑似重复 / 功能重叠」的技能。
     dup: [{ with:'目标sid', note:'重叠说明', suggest:'可删|二选一|可合并|可保留' }]
   前端会在卡片上显示「⚠ 疑似重复」警告与优化建议，并提供「仅看重复」筛选。
   ============================================================ */
var SKILL_SEED_VERSION = 2;

/* 技能分类：tone 对应 styles.css 里 .sk-badge.c-* 的配色 */
var SKILL_CATS = [
  { id: 'write', name: '写作与发布', tone: 'c-write', note: '公众号写作、配图排版、发布到草稿箱' },
  { id: 'visual', name: '排版与视觉', tone: 'c-visual', note: '格式转换、封面、插图、信息图、图表、漫画' },
  { id: 'media', name: '图像与视频', tone: 'c-media', note: '文生图 / 图生图、文生视频、图片压缩' },
  { id: 'data', name: '数据与表格', tone: 'c-data', note: 'Excel / CSV 处理，本地数据库' },
  { id: 'knowledge', name: '知识与笔记', tone: 'c-know', note: 'Obsidian / ima 知识库、业务梳理、学习笔记' },
  { id: 'eng', name: '工程与部署', tone: 'c-eng', note: '部署上线、前端界面、抓取转换、文件整理' },
  { id: 'info', name: '资讯与发现', tone: 'c-info', note: 'AI 资讯、Skill 推荐、事实核验' },
  { id: 'collab', name: '协作与通知', tone: 'c-collab', note: '会议、邮件、微信推送' },
  { id: 'system', name: '本机与个性化', tone: 'c-sys', note: '本机环境与外观定制' }
];

/* 连接器分类 */
var CONN_CATS = [
  { id: 'kb', name: '知识库' },
  { id: 'mail', name: '邮箱' },
  { id: 'meeting', name: '会议' }
];

/* origin：self = 我开发 / skillhub = 装自 SkillHub / builtin = 内置 */
var ORIGIN_LABEL = { self: '自研', skillhub: 'SkillHub', builtin: '内置' };

/* 优化建议 → 配色 class（styles.css 里 .sk-dup-sug.*） */
var DUP_SUG_CLASS = { '可删': 'd', '二选一': 'c', '可合并': 'm', '可保留': 'k' };

var SKILL_SEED = [
  /* ---------------- 写作与发布 ---------------- */
  {
    sid: 'gzh-copywriter', kind: 'skill', name: 'wechat-write（目录 gzh-copywriter）', label: '公众号爆款写作',
    cat: 'write', origin: 'skillhub', ver: '',
    desc: '基于红狐数据公众号爆款雷达每日收录的热门文章，按关键词检索爆款、分析流量规律，再生成可直接发布的完整文章。慢在选题、卡在开头的时候用它。',
    usage: ['给一个选题方向或关键词（越具体越好，带上目标读者）', '它会先检索同类爆款、拆解标题与结构规律', '确认方向后生成完整正文，可直接粘到公众号编辑器'],
    prompts: ['用公众号文案，写一篇关于「AI 帮职场人省时间」的推文，读者是 30 岁左右的上班族', '查一下最近一周职场类爆款文章，帮我总结标题写法规律', '把这个选题扩写成一篇 1500 字的公众号文章，开头要有钩子'],
    tags: ['公众号', '文案', '爆款']
  },
  {
    sid: 'wechat-article-visual-story', kind: 'skill', name: 'wechat-article-visual-story', label: '图文全案（文案+配图）',
    cat: 'write', origin: 'skillhub', ver: '',
    desc: '一条指令把「文案 + 配图」一次做完：给出为信息流写的候选标题、一句话摘要、按手机阅读节奏组织的完整正文，再渲染 2.35:1 封面与一整组内文配图，整组保持同一套视觉。适合品牌软文、长图文种草、客户案例。',
    usage: ['说明三件事：选题、要推的东西、写给谁', '先出候选标题与摘要给你挑', '确认后产正文 + 封面 + 一组风格统一的内文配图'],
    prompts: ['给「用 WorkBuddy 把周报从 1 小时压到 10 分钟」做一篇公众号图文，读者是职场中层', '出一版科技冷色调的长图文，配图 6 张左右，保持同一套视觉', '这个客户案例要发公众号，帮我先给 5 个候选标题和一句话摘要'],
    tags: ['公众号', '图文', '封面', '疑似重复'],
    dup: [{ with: 'baoyu-cover-image', note: '图文全案自带配图，与单独的封面图 / 文章配图技能在配图维度重叠（本技能优势是文案+配图一次成稿）', suggest: '可保留' }]
  },
  {
    sid: 'baoyu-post-to-wechat', kind: 'skill', name: 'baoyu-post-to-wechat', label: '发布到公众号',
    cat: 'write', origin: 'skillhub', ver: '1.118.2',
    desc: '把内容发到微信公众号，支持文章（HTML / Markdown / 纯文本）与贴图（多张图片）。走 API 或 Chrome CDP 两条路径，Markdown 工作流默认把普通外链转成文末引用。',
    usage: ['准备好文章内容或图片', '说清是发「文章」还是发「贴图」，以及是否只存草稿', '确认后它会推到公众号后台草稿箱，你再去排版微调'],
    prompts: ['把这篇 markdown 发到公众号，先存草稿', '把这三张图做成贴图发到公众号', '这篇 HTML 直接发文章，外链统一转文末引用'],
    tags: ['公众号', '发布', '草稿箱']
  },
  {
    sid: 'mp-draft-push', kind: 'skill', name: 'mp-draft-push', label: '推送草稿箱',
    cat: 'write', origin: 'skillhub', ver: '',
    desc: '轻量版发布技能：把现成的文章内容推进微信公众号草稿箱，不做改写、不加配图，就是纯粹的「搬运」。',
    usage: ['内容已经定稿（HTML / Markdown / 文本）', '说「发布到草稿箱」', '去公众号后台确认并群发'],
    prompts: ['发布文章到草稿箱', '把这段内容推到公众号草稿', '这篇文章直接 push 草稿箱'],
    tags: ['公众号', '草稿箱', '疑似重复'],
    dup: [{ with: 'baoyu-post-to-wechat', note: '轻量版发布技能，把现成内容推进公众号草稿箱，功能被 baoyu-post-to-wechat（发布到公众号）完全覆盖', suggest: '可删' }]
  },
  {
    sid: 'baoyu-wechat-summary', kind: 'skill', name: 'baoyu-wechat-summary', label: '群聊精华日报',
    cat: 'write', origin: 'skillhub', ver: '1.119.0',
    desc: '把微信群聊的高价值内容整理成结构化日报（默认正经版，可要「毒舌版」）。基于本地 wx-cli，会维护每个群的历史记录与成员画像，所以越用越懂这个群。',
    usage: ['指定群名与时间范围', '生成结构化日报：话题、结论、待办、金句', '需要的话再要一版毒舌风格'],
    prompts: ['把「AI 学习群」今天的聊天总结成日报', '出一版毒舌总结，风格可以狠一点', '汇总本周群里的干货，按主题分类'],
    tags: ['微信', '群聊', '日报']
  },
  {
    sid: 'wechat-mp-reader', kind: 'skill', name: 'wechat-mp-reader', label: '读公众号正文',
    cat: 'write', origin: 'skillhub', ver: '',
    desc: '读取微信公众号文章的正文。用内置浏览器打开页面并抽取正文，URL 需要带 ?scene=1。注意：无头环境常被反爬拦成「环境异常」，真机浏览器里正常。',
    usage: ['把公众号文章链接丢过来（要能在浏览器打开）', '它打开页面抽取正文', '再让我总结要点、提取数据或改写'],
    prompts: ['读一下这篇公众号文章，帮我总结三条要点', '把这篇文章里的关键数据整理成表格'],
    tags: ['公众号', '抓取', '正文', '疑似重复'],
    dup: [{ with: 'baoyu-url-to-markdown', note: '读取网页正文，与「网页转 Markdown」在抓取维度重叠（本技能专攻公众号文章场景）', suggest: '可保留' }]
  },

  /* ---------------- 排版与视觉 ---------------- */
  {
    sid: 'baoyu-format-markdown', kind: 'skill', name: 'baoyu-format-markdown', label: 'Markdown 排版',
    cat: 'visual', origin: 'skillhub', ver: '1.57.0',
    desc: '把纯文本或粗糙的 markdown 整理成规范文档：补 frontmatter、标题、摘要、加粗重点、列表与代码块。输出到 {文件名}-formatted.md。',
    usage: ['把草稿文本或文件给我', '说明目标（公众号 / 文档 / 笔记）', '生成 -formatted.md，原文件不动'],
    prompts: ['把这份草稿排版成规范的 markdown', '给这篇笔记补上 frontmatter、摘要和目录', '把这段随手记整理成分级标题 + 要点的结构'],
    tags: ['Markdown', '排版']
  },
  {
    sid: 'baoyu-markdown-to-html', kind: 'skill', name: 'baoyu-markdown-to-html', label: 'Markdown 转 HTML',
    cat: 'visual', origin: 'skillhub', ver: '1.117.3',
    desc: 'Markdown 转成带样式的 HTML，内置公众号兼容主题。支持代码高亮、数学公式、Mermaid（无头 Chrome 渲成 PNG）、PlantUML、脚注、提示块、信息图，可选把外链收成文末引用。',
    usage: ['给出 md 文件或直接粘内容', '选主题与是否需要底部引用', '产出可直接粘进公众号编辑器或做网页的 HTML'],
    prompts: ['把这篇 md 转成公众号可粘贴的 html', '带代码高亮和 Mermaid 图，外链放文末', '换成深色主题的 HTML'],
    tags: ['Markdown', 'HTML', '公众号']
  },
  {
    sid: 'baoyu-translate', kind: 'skill', name: 'baoyu-translate', label: '高质量翻译',
    cat: 'visual', origin: 'skillhub', ver: '1.117.3',
    desc: '文档与文章翻译，保留原有格式与结构（标题层级、列表、代码块）。适合把英文技术博客、官方文档变成可读的中文长文。',
    usage: ['给出待翻译内容与目标语言', '可指定风格（信达雅 / 直译 / 口语化）', '产出保留 markdown 结构的译文'],
    prompts: ['把这篇英文博客翻译成中文，保留 markdown 结构', '翻译这份文档，技术名词保留英文原词', '给我原文-直译-意译三版对照'],
    tags: ['翻译', '文档']
  },
  {
    sid: 'baoyu-cover-image', kind: 'skill', name: 'baoyu-cover-image', label: '封面图生成',
    cat: 'visual', origin: 'skillhub', ver: '1.117.5',
    desc: '生成文章封面图，用「类型 × 配色 × 渲染 × 文字 × 情绪」五个维度组合，内置 11 套配色与 7 种渲染风格。支持 2.35:1（公众号头图）、16:9、1:1 三种比例。',
    usage: ['给文章主题或标题', '选比例（公众号头图用 2.35:1）与想要的调性', '出图后可直接用，也可让它换个风格重来'],
    prompts: ['给这篇讲 AI Agent 的文章生成 2.35:1 封面', '封面要电影感、暖色调，标题文字放右下角', '同一个主题出 3 张不同配色让我挑'],
    tags: ['封面', '配图']
  },
  {
    sid: 'baoyu-article-illustrator', kind: 'skill', name: 'baoyu-article-illustrator', label: '文章配图',
    cat: 'visual', origin: 'skillhub', ver: '1.117.4',
    desc: '先分析文章结构、找出真正需要图的位置，再用「类型 × 风格 × 配色」三维方案生成插图。比无脑按段配图克制，出来的图更贴内容。',
    usage: ['给文章全文或文件', '它先给出配图位置与方案建议', '确认后批量生成，风格保持统一'],
    prompts: ['给这篇长文配图，大概 5 张，插图风格统一', '这篇 RAG 教程的架构部分需要示意图', '配图走扁平插画风，配色跟文章主题色一致'],
    tags: ['配图', '插图']
  },
  {
    sid: 'baoyu-infographic', kind: 'skill', name: 'baoyu-infographic', label: '信息图',
    cat: 'visual', origin: 'skillhub', ver: '1.117.4',
    desc: '把内容做成专业信息图（长图/大图），内置 21 种版式与 22 种视觉风格。它会先分析内容、推荐版式×风格组合，再产出成品。',
    usage: ['给文章、报告或一堆要点', '它推荐版式与风格，你挑一个', '产出高密度信息大图，适合公众号与分享'],
    prompts: ['把这篇文章做成一张高密度信息图', '把这份季度总结做成竖版长图', '用榜单版式做「2026 AI 工具 Top 10」信息图'],
    tags: ['信息图', '长图']
  },
  {
    sid: 'baoyu-comic', kind: 'skill', name: 'baoyu-comic', label: '知识漫画',
    cat: 'visual', origin: 'skillhub', ver: '1.117.4',
    desc: '把知识点画成原创教育漫画：多种画风与基调、详细的分镜版式、可批量出图。适合把抽象概念讲给不懂技术的人听。',
    usage: ['给一个要讲清楚的概念，或一段现成内容', '选画风与基调（正经科普 / 轻松吐槽 / 传记叙事）', '它出分镜再批量渲染每一格'],
    prompts: ['把「什么是 RAG」画成 6 格知识漫画', '用 Logicomix 那种风格讲一下图灵测试', '做一篇讲 AI Agent 是什么的科普漫画，轻松一点'],
    tags: ['漫画', '分镜', '科普']
  },
  {
    sid: 'baoyu-diagram', kind: 'skill', name: 'baoyu-diagram', label: '专业图表 / 架构图',
    cat: 'visual', origin: 'skillhub', ver: '1.117.3',
    desc: '生成深色主题的专业 SVG 图：架构图、流程图、时序图、结构图、思维导图、时间线、概念示意图。矢量输出，放大不糊，适合放进文档与 PPT。',
    usage: ['描述要画的系统或流程', '指定图类型（架构 / 时序 / 流程…）', '产出 SVG，可直接插入文档或转 PNG'],
    prompts: ['画一张 AI Agent 系统的架构图，含工具层和记忆层', '把这套审批流程画成流程图', '用时间线图排一下这 12 周的里程碑'],
    tags: ['架构图', '流程图', 'SVG']
  },

  /* ---------------- 图像与视频 ---------------- */
  {
    sid: 'jimeng-image-gen', kind: 'skill', name: 'jimeng-image-gen', label: '即梦出图（自研）',
    cat: 'media', origin: 'self', ver: '',
    desc: '用即梦（Seedream）同源模型出图，走火山引擎视觉智能 API。支持文生图与图生图，可指定宽高比、分辨率档位、随机种子复现，也支持批量。默认保存到 D:/workBuddy_place/Img_Place/即梦4。',
    usage: ['说清画面内容 + 宽高比 + 风格', '默认用 t2i-4.0（图片生成 4.0），需要改图就用图生图', '出图落到即梦4 目录，给回文件路径'],
    prompts: ['用即梦 4.0 生成一张 3:4 的国潮风插画，主角是一只云朵做的小精灵', '把这张图改成水墨风格，保留原构图', '批量出 4 张，同一个种子，只要换配色'],
    tags: ['即梦', '生图', '火山引擎', '疑似重复'],
    dup: [{ with: 'baoyu-image-gen', note: 'baoyu-image-gen 多后端生图已包含即梦 / Seedream 后端，主力生图能力重叠（本技能优势是默认输出目录与自研定制）', suggest: '可保留' }]
  },
  {
    sid: 'seedance-video-gen', kind: 'skill', name: 'seedance-video-gen', label: 'Seedance 视频（自研）',
    cat: 'media', origin: 'self', ver: '',
    desc: '通过火山引擎方舟（Ark）调用 Seedance 1.0 Pro 生成视频，支持文生视频与图生视频（首帧或首尾帧）。可自定义比例、分辨率、时长、随机种子，还能控水印与回调。',
    usage: ['描述镜头内容，或给一张/两张图当首尾帧', '指定比例（16:9 / 9:16）、时长与分辨率', '生成后给回 MP4 文件路径'],
    prompts: ['用 Seedance 生成一段 5 秒的城市夜景延时，16:9，1080p', '拿这张产品图当首帧，做个缓慢推近的镜头', '图生视频，首尾帧都用这张，做成一镜到底的转场'],
    tags: ['Seedance', '视频', '火山方舟']
  },
  {
    sid: 'baoyu-image-gen', kind: 'skill', name: 'baoyu-image-gen', label: '多后端生图',
    cat: 'media', origin: 'skillhub', ver: '2.1.0',
    desc: '一个技能对接多家生图后端：OpenAI GPT Image 2 / Azure / Google / OpenRouter / DashScope / Z.AI GLM-Image / MiniMax / 即梦 / Seedream / Replicate / Agnes。支持文生图、参考图、宽高比，也可从提示词文件批量跑。',
    usage: ['说明用哪家后端（不确定就让它推荐）', '给提示词与比例，需要风格一致就给参考图', '同一批默认顺序跑，想快可以开并行'],
    prompts: ['用 GPT Image 2 生成一张扁平风格的插画', '这批 12 张按同一个提示词模板跑，文件名按序号', '用参考图保持角色一致，只换场景'],
    tags: ['生图', '多后端', '批量']
  },
  {
    sid: 'baoyu-compress-image', kind: 'skill', name: 'baoyu-compress-image', label: '图片压缩',
    cat: 'media', origin: 'skillhub', ver: '1.56.1',
    desc: '把图片压缩成 WebP（默认）或 PNG，自动挑选合适的工具。适合公众号配图、网页素材、邮件附件瘦身。',
    usage: ['给图片文件或目录', '说明目标（WebP/PNG、要不要限体积）', '批量处理后给回新文件与体积对比'],
    prompts: ['把这几张图压到 200KB 以内，转 webp', '把封面图压一下，画质别掉太多', '整个目录的 png 都转成 webp，保留原图'],
    tags: ['压缩', 'webp']
  },

  /* ---------------- 数据与表格 ---------------- */
  {
    sid: 'excel-processing', kind: 'skill', name: 'excel-processing', label: 'Excel / CSV 处理',
    cat: 'data', origin: 'skillhub', ver: '2.1.0',
    desc: '本地表格的通用处理工具，覆盖十一类能力：探查、清洗、数据质量、统计分析、透视、合并、多表一致性校验、格式化、图表、HTML 报告、批量处理。支持 .xlsx / .xls / .csv / .txt。',
    usage: ['把表格文件路径给我（或直接拖进对话）', '说清要做什么：清洗 / 按列分组汇总 / 多表校验 / 出图', '产出结果表、图表或 HTML 报告'],
    prompts: ['分析这份销售表，按大区做透视并出柱状图', '清洗这份表：去重、统一日期格式，再给我数据质量报告', '把这两个月的表合并，校验一下有没有对不上的行'],
    tags: ['Excel', 'CSV', '透视', '图表']
  },
  {
    sid: 'mysql-local', kind: 'skill', name: 'mysql-local', label: '本地 MySQL（自研）',
    cat: 'data', origin: 'self', ver: '',
    desc: '在 Windows 上管理本地 MySQL 8.0（无包管理器场景）：安装初始化、启停服务、连接测试、建库建表、重置 root 密码。Windows 服务 MySQL80 已注册为开机自启，凭据见车厘子记事本 §4。',
    usage: ['说清要做什么：启动 / 停止 / 连接 / 建库 / 改密码', '技能会调 mysql_ctl.ps1 执行，并返回连接串', '需要凭据时去车厘子记事本 §4 取，不要写进网页'],
    prompts: ['启动本地 MySQL', '本地建一个库 workbench_demo，再建一张 tasks 表', '连不上了，帮我看看 MySQL 服务状态'],
    tags: ['MySQL', '数据库', 'Windows']
  },

  /* ---------------- 知识与笔记 ---------------- */
  {
    sid: 'ima-kb', kind: 'skill', name: 'ima-kb', label: 'ima 知识库（自研）',
    cat: 'knowledge', origin: 'self', ver: '1.0.0',
    desc: '把本地文件、网页与公众号链接导入腾讯 ima 个人知识库，并做分库路由、检索与解析状态核验。底层工具由 ima-mcp 连接器提供（9 个工具，暂无文件夹管理接口）。',
    usage: ['给文件路径或链接列表，并说明进哪个库（个人库 / 团队库）', '它会选对库并提交导入，然后核验解析状态', '检索时直接说「查我 ima 里的 XX」'],
    prompts: ['把这些链接存进 ima 的个人知识库', '把这份 xlsx 导入「基协表结构」团队库', '查我 ima 里关于 OB-HIVE 表结构的资料'],
    tags: ['IMA', '知识库', '导入', '疑似重复'],
    dup: [{ with: 'conn-ima-mcp', note: '底层即 ima-mcp 连接器，封装其 9 个工具，能力重叠（连接器是授权入口，技能是封装层）', suggest: '二选一' }]
  },
  {
    sid: 'business-knowledge-graph-generator', kind: 'skill', name: 'business-knowledge-graph-generator', label: '业务知识图谱（自研）',
    cat: 'knowledge', origin: 'self', ver: '2.2.0',
    desc: '按「领域 → 模块 → 功能 → 子功能」四层，从项目代码、PRD、接口文档、数据库设计里梳理业务知识，产出结构化的 Obsidian Markdown 知识库：每个节点独立成文件、标注代码位置，支持双链导航与 Mermaid 关系图。适合新项目启动、接手遗留系统、模块重构前。',
    usage: ['给出项目目录或文档（代码 / PRD / 接口 / 表设计）', '确认领域与模块划分的粒度', '生成知识库目录，可导入 Obsidian 直接浏览'],
    prompts: ['用这个项目的代码生成业务知识图谱', '接手了个老系统，先帮我梳理出领域和模块', '把这份 PRD 和表设计梳理成功能卡片'],
    tags: ['知识图谱', '业务梳理', 'Obsidian']
  },
  {
    sid: 'obsidian', kind: 'skill', name: 'obsidian', label: 'Obsidian 笔记库',
    cat: 'knowledge', origin: 'skillhub', ver: '1.0.0',
    desc: '读写 Obsidian 纯 Markdown 笔记库，可配合 obsidian-cli 做自动化（新建、检索、批量整理）。',
    usage: ['先确认库路径（文档库里可配置）', '说清是新建、检索还是批量改', '改动前后会给出文件清单'],
    prompts: ['在库里新建一篇笔记：Agent 记忆机制要点', '查我库里所有跟 RAG 有关的笔记并汇总', '把这批笔记的标签统一成规定的几类'],
    tags: ['Obsidian', 'Markdown']
  },
  {
    sid: 'obsidian-term-unify', kind: 'skill', name: 'obsidian-term-unify', label: '笔记术语统一（自研）',
    cat: 'knowledge', origin: 'self', ver: '1.0.0',
    desc: '扫描 Obsidian 笔记库里的术语写法，找出同一概念的不同表述（中英混用、大小写、别名），统一成规范写法并回写。',
    usage: ['指定库路径与要统一的术语范围', '先出差异清单给你确认', '确认后再批量替换，并给出改动文件列表'],
    prompts: ['统一我笔记库里的术语写法', '把库里的「大模型 / LLM / 语言模型」统一成 LLM', '检查一下笔记里的中英混用，给我一份建议清单'],
    tags: ['Obsidian', '术语', '批量', '疑似重复'],
    dup: [{ with: 'obsidian', note: 'Obsidian 术语统一是其子能力，依赖同一个笔记库（可合并进 obsidian 作为批量整理的一个场景）', suggest: '可合并' }]
  },
  {
    sid: 'tutor-skills', kind: 'skill', name: 'tutor-skills', label: '文档变学习库',
    cat: 'knowledge', origin: 'skillhub', ver: '1.0.0',
    desc: '把 PDF、文档、代码库变成 Obsidian StudyVault：结构化笔记 + 概念级测验 + 掌握度追踪。适合系统啃一份资料并检验自己到底学会了没有。',
    usage: ['给资料文件（PDF / 文档 / 代码目录）', '生成学习库与分节笔记', '用配套测验自测，掌握度按概念记录'],
    prompts: ['把这份 PDF 变成学习笔记并出练习题', '给这个代码库建一个学习库，按模块分节', '用测验模式考我，只看没掌握的概念'],
    tags: ['学习', 'Obsidian', '测验', '疑似重复'],
    dup: [{ with: 'obsidian', note: '产出落地到 Obsidian StudyVault，与 obsidian 笔记库重叠（本技能偏学习 / 测验向，可保留）', suggest: '可保留' }]
  },

  /* ---------------- 工程与部署 ---------------- */
  {
    sid: 'cloudstudio-deploy', kind: 'skill', name: 'cloudstudio-deploy', label: '一键部署上线',
    cat: 'eng', origin: 'skillhub', ver: '',
    desc: '把静态站点发布成公网可分享的链接（底层是 CloudStudio 云沙箱）。只部署纯静态目录，例如 dist-site/。工具报 not available 时，重启 WorkBuddy 通常就能恢复。',
    usage: ['准备好纯静态目录（只放 index.html 之类，别带 node_modules）', '说「部署上线」', '拿到链接后自己先打开验证一次'],
    prompts: ['把这个页面部署上线，给我链接', '把 dist-site 发布成公网可访问的页面', '更新一下线上页面，重新部署一版'],
    tags: ['部署', 'CloudStudio', '静态站']
  },
  {
    sid: 'frontend-design', kind: 'skill', name: 'frontend-design', label: '前端界面设计',
    cat: 'eng', origin: 'skillhub', ver: '1.1.0',
    desc: '生成有设计感、可直接上线的前端界面 —— 组件、页面或完整应用。重点是避开「一眼 AI 味」的通用审美，做出有辨识度的版式与配色。',
    usage: ['说明界面类型与目标用户', '给参考风格或明确排除的风格', '产出组件/页面代码'],
    prompts: ['帮我设计一个落地页，要有质感，别太模板化', '做一个数据看板的界面，深色、克制', '这个表单页面重做一下，提升可用性和视觉层次'],
    tags: ['前端', 'UI', '设计']
  },
  {
    sid: 'baoyu-url-to-markdown', kind: 'skill', name: 'baoyu-url-to-markdown', label: '网页转 Markdown',
    cat: 'eng', origin: 'skillhub', ver: '1.61.0',
    desc: '抓取任意 URL 并转成 Markdown（Chrome CDP + 站点适配器）。内置 X/Twitter、YouTube 字幕、Hacker News 的专用适配器，其他页面走通用解析；遇到登录或验证码可以等待人工交互。',
    usage: ['给链接（可一次给多个）', '需要登录的页面，它会停下来让你点一下', '产出 md 文件，图片可另存'],
    prompts: ['把这个网页存成 markdown', '抓一下这篇 YouTube 视频的字幕，整理成文字稿', '这几条推文分别存成 markdown，按序号命名'],
    tags: ['抓取', 'Markdown', '网页']
  },
  {
    sid: 'baoyu-electron-extract', kind: 'skill', name: 'baoyu-electron-extract', label: 'Electron 源码提取',
    cat: 'eng', origin: 'skillhub', ver: '1.119.0',
    desc: '从任意已安装的 Electron 应用里提取资源与 JavaScript —— 解开 .asar 包，有 sourcemap 就还原成原始源码，没有就用 Prettier 格式化压缩代码。',
    usage: ['给出应用安装路径或 asar 文件', '它解包并尽量还原源码结构', '产出目录可直接阅读、检索'],
    prompts: ['把 WorkBuddy 这个 Electron 应用的资源提取出来', '解开这个 asar，有 sourcemap 的话还原源码', '帮我看下这个桌面应用里用了哪些第三方库'],
    tags: ['Electron', 'asar', '逆向']
  },
  {
    sid: 'downloads-organizer', kind: 'skill', name: 'downloads-organizer', label: '文件夹整理（自研）',
    cat: 'eng', origin: 'self', ver: '',
    desc: '按文件类型分类整理一个目录（通常是下载 / 文档 / 桌面）。默认只读扫描，先给出清单与整理方案，只有你明确确认后才移动文件 —— 不会偷偷动你的数据。',
    usage: ['说清要整理的目录与范围', '它只读扫描，出一份分类清单与建议', '你确认具体哪些（建议小批量，≤10 个/批）才动手'],
    prompts: ['扫描一下我的下载文件夹，给我整理建议', '把这个目录的文件按类型分好，先只给我方案别动', '看看下载夹里有哪些重复的大文件'],
    tags: ['文件整理', '只读扫描']
  },

  /* ---------------- 资讯与发现 ---------------- */
  {
    sid: 'aihot', kind: 'skill', name: 'aihot', label: 'AI HOT 资讯',
    cat: 'info', origin: 'skillhub', ver: '',
    desc: '中文 AI 资讯查询。覆盖每日精选条目、分类（模型发布 / 产品发布 / 行业动态 / 论文研究 / 技巧观点）、日报存档与历史列表。工作台的「每日 AI 资讯」用的就是同一个数据源。',
    usage: ['直接问「今天 AI 圈有什么」这类问题', '可以指定条数、分类或时间范围', '要更细就让它拉日报存档里的原文摘要'],
    prompts: ['今天 AI 圈有什么', '最近一周的 AI 论文挑 5 篇讲讲', '昨天有没有大模型发布，给我精选条目'],
    tags: ['AI资讯', '日报', 'AI HOT']
  },
  {
    sid: 'skillhub-daily', kind: 'skill', name: 'skillhub-daily', label: 'SkillHub 每日推荐',
    cat: 'info', origin: 'skillhub', ver: '6.2.0',
    desc: '扫描 skillhub.cn 全站 Top100 加 7 大分类各 Top20（合计约 240 个 Skill），给出当日推荐与分类榜。想知道「最近有什么值得装的技能」就看它。',
    usage: ['说「今天 SkillHub 有什么」', '需要某个分类就指定分类', '挑中后直接说「装这个」即可安装'],
    prompts: ['今天 SkillHub 有什么值得装的', '看看效率工具分类这周的排行', '帮我找一个能自动处理 PDF 的技能'],
    tags: ['SkillHub', '技能推荐']
  },
  {
    sid: 'tencent-rumor-refuter', kind: 'skill', name: 'tencent-rumor-refuter', label: '腾讯辟谣助手（小P）',
    cat: 'info', origin: 'skillhub', ver: '1.0.1',
    desc: '腾讯官方辟谣辅助技能「小P」。呼叫「小P」或提到腾讯、鹅厂、微信、QQ 等关键词时自动触发，用来核实与腾讯相关的信息真假。',
    usage: ['直接呼叫「小P」或把待核实的消息发过来', '它会比对公开信息给出判断', '看结论与依据，别只看一句话'],
    prompts: ['小P，帮我核实一下这条关于腾讯的消息', '这个说微信要收费的传言是真的吗'],
    tags: ['辟谣', '核验', '腾讯']
  },

  /* ---------------- 协作与通知 ---------------- */
  {
    sid: 'tencent-meeting-skill', kind: 'skill', name: 'tencent-meeting-mcp（腾讯会议 CLI）', label: '腾讯会议',
    cat: 'collab', origin: 'skillhub', ver: '',
    desc: '腾讯会议的完整操作能力：预约/修改/取消会议、查询会议与参会成员、管理等候室、录制列表与播放地址、转写全文与 AI 智能纪要、录制权限申请、通讯录查询、批量呼叫与移出成员。',
    usage: ['先确认已授权登录（状态查询）', '说清要做什么：约会议 / 查会议 / 要纪要 / 导参会名单', '需要播放链接或转写时指定具体那场会'],
    prompts: ['帮我约一个明天下午 3 点的会，一小时，叫上老王', '查一下我今天有哪些会', '把昨天那场会的智能纪要和转写全文给我'],
    tags: ['会议', '纪要', '录制', '疑似重复'],
    dup: [{ with: 'conn-tmeet', note: '与已连接连接器 conn-tmeet 是同一套腾讯会议能力，一个走 Skill、一个走连接器（建议保留连接器作授权入口）', suggest: '二选一' }]
  },
  {
    sid: 'pushplus-wechat', kind: 'skill', name: 'pushplus-wechat', label: '微信推送（自研）',
    cat: 'collab', origin: 'self', ver: '',
    desc: '把任务执行结果、摘要或提醒经 pushplus 推送到微信。全局约定：后续任务结果默认都推一份到微信；后台自动化则由常驻轮询器统一汇总推送。',
    usage: ['说「推送到微信」即可，标题与内容自动带上', '可选模板样式', '后台自动化无需配置，轮询器每小时内自动汇总发送'],
    prompts: ['把结果推送到微信', '用 pushplus 推送这次的分析结论', '任务完成后微信通知我'],
    tags: ['微信', '通知', 'pushplus']
  },

  /* ---------------- 本机与个性化 ---------------- */
  {
    sid: 'pink-crystal-workbuddy-skin', kind: 'skill', name: 'pink-crystal-workbuddy-skin', label: 'WorkBuddy 换肤（自研）',
    cat: 'system', origin: 'self', ver: '3.1.2',
    desc: 'WorkBuddy 桌面端（Electron）主题定制：通过 asar 内联 CSS 注入提供「毛玻璃套装」皮肤，支持动态（animated WebP 背景）与静态（单帧 JPEG）两种产物，覆盖 macOS / Windows 一键安装与回滚。必须用 WorkBuddy 原生 --cb-* 变量体系，否则面板会灰蒙蒙。',
    usage: ['准备背景素材（图片或视频）', '说清要动态还是静态、以及配色倾向', '一键安装到 WorkBuddy，不满意可一键回滚'],
    prompts: ['给 WorkBuddy 换个粉色毛玻璃皮肤', '用我这张图做背景，静态版，先给我看效果', '把皮肤回滚到默认'],
    tags: ['换肤', '毛玻璃', 'Electron']
  }
];

/* 已连接的连接器（来源：connector-states.json，bound + enabled） */
var CONN_SEED = [
  {
    sid: 'conn-ima-mcp', kind: 'connector', name: 'ima-mcp', label: '腾讯 ima 个人知识库',
    cat: 'kb', status: 'connected', ver: '',
    desc: '腾讯 AI 知识管家个人版：搜索、读取与写入个人知识库，也支持搜索与订阅教育、法律、财经、科技等 20+ 行业专业知识。当前共 9 个工具，已确认没有文件夹级管理接口，所以分库要按现有能力设计。',
    usage: ['授权状态：已绑定并启用（重启后可能需重新授权）', '说「存进 ima / 导入知识库 / 查我的 ima」触发', '导入后可用解析状态核验确认是否吃进去了'],
    prompts: ['把这些链接存进 ima 的个人知识库', '问我的知识库：基协表结构里有哪些字段', '查一下 ima 里关于 RAG 的资料'],
    tags: ['知识库', 'IMA', '9 个工具']
  },
  {
    sid: 'conn-qq-mail', kind: 'connector', name: 'qq-mail', label: 'QQ 邮箱',
    cat: 'mail', status: 'connected', ver: '',
    desc: 'QQ 邮箱全功能：看收件箱、查未读、读邮件正文、发信/回复/转发、删除、搜邮件、下载附件。全局自动化任务的执行结果邮件回报就走它，收件地址 15757101418@163.com。',
    usage: ['授权状态：已绑定并启用', '说「看看邮箱 / 有没有新邮件 / 发一封邮件」触发', '要附件就直接说下载哪个邮件的附件'],
    prompts: ['看看我邮箱有没有新邮件', '把这份分析报告发到 15757101418@163.com', '搜一下发票相关的邮件，把附件下载下来'],
    tags: ['邮箱', 'QQ Mail', '附件']
  },
  {
    sid: 'conn-tmeet', kind: 'connector', name: 'tmeet', label: '腾讯会议 CLI',
    cat: 'meeting', status: 'connected', ver: '',
    desc: '腾讯会议命令行接口：OAuth 授权登录/登出/状态、会议管理、录制与转写、智能纪要、参会报告与导出、通讯录（严格限定为会议邀请/呼叫入会的前置步骤）。',
    usage: ['授权状态：已绑定并启用', '先用状态查询确认登录是否有效', '会议 ID 或时间范围说清楚，避免误操作到别的会'],
    prompts: ['查一下当前 tmeet 的授权状态', '列出我接下来的会议', '导出上周那场会的参会成员明细'],
    tags: ['会议', 'OAuth', '录制']
  }
];
