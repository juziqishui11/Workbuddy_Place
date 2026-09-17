/* ============================================================
   08-ai-news-data.js —— WB案例资讯（快照，构建期烘焙）
   !!! 本文件由 tools/wb-cases-fetch.mjs 生成，请勿手改 !!!
   字段：sid / scene（场景，用于去重）/ srcType（wechat|community）
        / source（来源渠道）/ title / skills / howto（可落地做法）/ url
   收录标准：小而明确可落地，同种场景只收一条，优先公众号来源
   ============================================================ */
var ARTICLES_SEED_VERSION = 6;
var ARTICLES_FETCHED_AT = "2026-09-12";

var ARTICLES_SEED = [
  {
    sid: "gz-pipeline-6skill",
    scene: "公众号流水线",
    srcType: "wechat",
    source: "公众号「老万AI日记」",
    title: "电脑小白用 WorkBuddy 串一条公众号流水线：一篇成文 4 小时 → 30 分钟",
    skills: ["选题", "写稿", "审稿", "配图", "排版", "草稿箱"],
    howto: "把 6 个现成的公众号 Skill 按「选题 → 写稿 → 审稿 → 配图 → 排版 → 进草稿箱」顺序串成流水线，每个 Skill 顶在一道工序前面，干完把结果交给下一个。关键不是写得快，而是不用反复进入写作状态。",
    url: "https://ima.qq.com/wiki/?shareId=0b5419ed1026cb41a7aa4b11d912e2584a56f8f27afefb8663e09970bd91046e&mediaId=wechatarticle_0fb1c5e4a784b25e78e78177303d8c3e_9d380e5ddade9aa5df48af2fa6436ce37376490597480789"
  },
  {
    sid: "gz-gzh-ops",
    scene: "公众号全流程托管",
    srcType: "wechat",
    source: "公众号「启明AI电商学堂」",
    title: "把整件事丢给它自己拆：找信源 → 选题 → 初稿 → 质检",
    skills: ["公众号运营专家"],
    howto: "只说「按咱们号的调性把最近这类工具捋一捋」，它自己做找信源、选题分析、正文创作、质检，中间只在两个关键点找你确认：一次定方向、一次看初稿风格。踩坑提醒：复杂活先切 Plan 模式让它列分步计划，别一次塞太多。",
    url: "https://ima.qq.com/wiki/?shareId=9dbaae5438a69d0e3b6087b9b50970e34d7b7a0d64090dbcec7a298c91934952&mediaId=wechatarticle_b5b60f85520e0aff17150c02071d0882_c987f1207311ce2f3738d62046d69c4d7368813364406244"
  },
  {
    sid: "gz-notes-to-article",
    scene: "笔记转公众号长文",
    srcType: "wechat",
    source: "公众号「WorkBuddy 实战库」",
    title: "Obsidian 笔记路径一丢，扩写成 1500 字公众号文章",
    skills: ["Obsidian 连接器"],
    howto: "把笔记文件的路径丢给 WorkBuddy，说「帮我把这篇笔记扩写成 1500 字左右的公众号文章，面向普通读者，语气温暖但不鸡汤」。初稿约 70 分（结构完整但缺人味），花 20-30 分钟加入自己的观点和故事，成稿能到 85 分以上。",
    url: "https://ima.qq.com/wiki/?shareId=f2e2f0e15d24002c6738e12281e98e7b2dc345eb899346a2d5800c068745e5f9&mediaId=weburl_9e040177fc69ebc03cf8b46aa447a4c7_842c4dc9f655b57fb51b7fb2cf931a427483379356290784"
  },
  {
    sid: "gz-workreport-dump",
    scene: "把碎片整理成报告提纲",
    srcType: "wechat",
    source: "公众号「WorkBuddy 实战库」",
    title: "语音/打字把想法全倒进去，30 秒出季度工作总结提纲",
    skills: ["写作"],
    howto: "不用管逻辑和顺序，先把想到的点全部 dump 进去，再说「帮我把这些零散内容整理成一份季度工作总结的提纲，分三个板块：主要工作、存在问题、下一步计划，每个板块列 3-5 个要点」。省掉约 40% 对着空白文档发愁的时间。",
    url: "https://ima.qq.com/wiki/?shareId=f2e2f0e15d24002c6738e12281e98e7b2dc345eb899346a2d5800c068745e5f9&mediaId=weburl_9e040177fc69ebc03cf8b46aa447a4c7_842c4dc9f655b57fb51b7fb2cf931a427483379356290784"
  },
  {
    sid: "gz-factpack",
    scene: "一套素材做多平台内容",
    srcType: "wechat",
    source: "公众号「hunkcai」",
    title: "一套素材做一周内容：先做「事实包」，再生成 9 种形态",
    skills: ["内容矩阵生产链路"],
    howto: "核心是在素材和成品之间插一个中间层「事实包」：让 AI 先只做识别和记录、不写任何文案，每张图记录「能确认的 / 待确认的 / 可用事实 / 适合做封面」，禁止臆测。然后所有平台版本都从这份事实包生成，天然不互相矛盾。",
    url: "https://blog.csdn.net/hunkcai/article/details/163815844"
  },
  {
    sid: "gz-gzh-all-in-one",
    scene: "写文到排版一句话搞定",
    srcType: "wechat",
    source: "公众号「点晴永久免费OA」",
    title: "写公众号从写文到排版，一句话全搞定：一周稳定更 5 篇",
    skills: ["写作"],
    howto: "踩坑清单可直接抄：① 指令别笼统——「帮我写篇公众号文章」出来的全是套话，要把主题/人群/风格/格式说清；② 写文一定要切 Craft 模式，Ask 只给建议不生成文件；③ 先用 Ask 理清思路再切 Craft 一次到位，省积分。",
    url: "https://clicksun.com.cn/bbs.asp?id=40242"
  },
  {
    sid: "gz-wechat-api-push",
    scene: "程序化推送到草稿箱",
    srcType: "wechat",
    source: "公众号「开发者的AI学习笔记」",
    title: "三天从 0 到 2 篇：调微信 API 推送草稿箱，踩了 10 个坑",
    skills: ["Node 脚本", "公众号 API"],
    howto: "完整链路：获取 access_token → 上传封面图 → 创建草稿。必踩的坑：① 标题 64 字节限制（中文算 2 字节，控制在 31 字内）；② IP 白名单要先在公众平台后台加出口 IP；③ POST 要设 Content-Length，中文用 Buffer.from(str,\"utf8\") 算字节数；④ 别设 author 字段，否则标题下会多出英文名。",
    url: "https://ima.qq.com/wiki/?shareId=0b5419ed1026cb41a7aa4b11d912e2584a56f8f27afefb8663e09970bd91046e"
  },
  {
    sid: "gz-wechat-html-format",
    scene: "公众号 HTML 排版适配",
    srcType: "wechat",
    source: "公众号「开发者的AI学习笔记」",
    title: "公众号编辑器只认这几个标签：排版反复改 5 版才通",
    skills: ["公众号排版"],
    howto: "稳定的只有基本标签 p / h2 / h3 / table / img / strong。踩坑：① section 标签会被过滤、hr 渲染异常、外部 a 链接可能触发 45166 校验 → 全换成 div / 文字分隔线 / 绿色文字；② tree 目录树在手机端必折行 → 用 Pillow 生成一张图片插入最保险；③ 表头别用白字配绿底，背景色会被吞掉。",
    url: "https://ima.qq.com/wiki/?shareId=0b5419ed1026cb41a7aa4b11d912e2584a56f8f27afefb8663e09970bd91046e"
  },
  {
    sid: "gz-competitor-research",
    scene: "选题调研",
    srcType: "wechat",
    source: "公众号「开发者的AI学习笔记」",
    title: "用 Skill 批量搜 32 篇竞品文章，几分钟摸出高传播规律",
    skills: ["检索"],
    howto: "把关键词（如 Cursor、AI 编程工具、程序员踩坑）一起给它，让它批量搜索并归纳规律。实测结论：高传播文章有三个共同点——有实操数据和计时对比、有真实场景和踩坑细节；纯理论分析和新闻搬运阅读量都很低。",
    url: "https://ima.qq.com/wiki/?shareId=0b5419ed1026cb41a7aa4b11d912e2584a56f8f27afefb8663e09970bd91046e"
  },
  {
    sid: "gz-4pitfalls",
    scene: "避坑：AI 运营公众号的坑",
    srcType: "wechat",
    source: "公众号「中场变量」",
    title: "别盲目信 AI 运营公众号：我踩的 4 个坑",
    skills: [],
    howto: "① 情绪价值拉满、输出价值为零——它会把你个人故事删到只剩 15%，理由「没法核实」；② 让你在文末设「转化钩子」引导关注 → 属诱导关注，轻则限流重则封号；③ 生图「一眼 AI」，慎用；④ 所谓定时自动发布依赖电脑开机 + 软件挂着，关机就断。她最终跑通的用法：AI 只做三件事——筛选题、纠事实、盘数据。",
    url: "https://ima.qq.com/wiki/?shareId=f2e2f0e15d24002c6738e12281e98e7b2dc345eb899346a2d5800c068745e5f9"
  },
  {
    sid: "cc-pdf-contract",
    scene: "文档处理",
    srcType: "community",
    source: "腾讯云开发者社区",
    title: "把 50 页扫描版合同丢进 WorkBuddy，转成可编辑 Word 并提取付款条款",
    skills: ["PDF 处理"],
    howto: "直接说「提取这份合同的付款条款和违约责任」，或「把这份扫描 PDF 转成可编辑 Word」。安装量最高的技能之一，50 页扫描件 1 小时 → 2 分钟。",
    url: "https://cloud.tencent.com/developer/article/2697257"
  },
  {
    sid: "cc-excel-merge",
    scene: "表格合并",
    srcType: "community",
    source: "腾讯云开发者社区",
    title: "多张 Excel 表合并 + 按维度算环比：3 小时 → 10 分钟",
    skills: ["Excel 文件处理"],
    howto: "把表一起丢进去，说「按校区合并这三张表并算出环比」；不需要写公式，它会自己识别表头、对齐维度再出结果表。",
    url: "https://cloud.tencent.com/developer/article/2697257"
  },
  {
    sid: "cc-doc-renamer",
    scene: "文件批量重命名",
    srcType: "community",
    source: "腾讯云开发者社区",
    title: "文件批量重命名归档：一堆乱名文件一次收拾干净",
    skills: ["文件批量重命名归档"],
    howto: "指定命名规则（如「日期_客户_类型」）让它批量改名并归档到子目录，比手点几十次快得多。",
    url: "https://developer.cloud.tencent.com/article/2725474"
  },
  {
    sid: "cc-web-scrape",
    scene: "浏览器抓数据",
    srcType: "community",
    source: "腾讯云开发者社区",
    title: "让 WorkBuddy 自己去逛网站抓数据：浏览器自动化技能",
    skills: ["Web Access"],
    howto: "说清目标网址 + 要抓的字段（如「把这三页的招标金额、中标单位抓成对比表」），它用浏览器自动化打开页面再整理。",
    url: "https://cloud.tencent.com/developer/article/2697257"
  },
  {
    sid: "cc-ppt-quick",
    scene: "做 PPT",
    srcType: "community",
    source: "腾讯云开发者社区",
    title: "15 页成品 PPT 10 分钟出：PPT Workflow 技能",
    skills: ["PPT Workflow"],
    howto: "给一份大纲或直接说主题，让它按固定版式出 15 页成品；风格要统一就先丢一份满意的参考 PPT 让它归纳版式规范。",
    url: "https://cloud.tencent.com/developer/article/2697257"
  }
];
