# Paper Adventure｜当前前端交接

更新：2026-10-08。本文只记当前可核查状态；早期部署与迭代记录保存在 [历史交接](FRONTEND_HANDOFF_HISTORY_2026-10-08.md)。私有源码审阅入口为 [draft PR #1](https://github.com/AImilesChen/paperadventure/pull/1)，以 PR 的最新提交和 Actions 为准。

## 当前交付

- `paperadventure.app` 的 Cloudflare Worker 运行的是**禁止搜索引擎收录的技术预览**。`/` 转到 `/en/`；本地 `npm run build` 生成 31 个英文预渲染页面，包含首页、六主题故事、Home/Classroom 创建、价格、帮助、订单演示和四类法律说明。预览可浏览，不能收款、生成正式游戏或下载内部 PDF。
- 首页沿用已选第 3 纸艺方向，Hero 下接水平主题长廊。六个世界均在详情页说明不同的 Home/Classroom 故事和五步流程；目录按 Home/Classroom 筛选时显示对应的故事概念图，包括 H01 狐狸送信和 C01 探险俱乐部、C05 秋日与 C06 冬日课堂图。
- `shared/catalog.mjs` 是价格和产品权益的实现真源：现成 Home US$9.99、Classroom US$14.99；定制 Home US$14.99、Classroom US$19.99；Celebration 仅是免费固定样例候选。用户确认的家庭/教师使用范围、12 个月在线重新下载与已下载文件继续按许可使用，都在界面及后端开发模型中体现。全部销售与公开下载开关仍关闭。
- 六个主题各有先行蓝图和独立的 Home/Classroom 五关内容。12 个场景有 48 份 A4/Letter 基础 PDF；C05/C06 各增加 4 份由成人主动选择的 Halloween/Christmas 课堂措辞稿，合计 **56 份内部 PDF、八个私有试玩 ZIP**，均位于本地 `output/pdf/`，**不在** `public/`、`dist/client/` 或线上。变体与中性版共用五关答案，不新增 SKU。当前版本具备可选裁开的路线/配对条、分角色线索卡、绝大多数结局候选卡，以及 H01/C01 首关图文来信/邀请卡与第三关图文标签/装备卡（H01 所选标签标记决定第四关字典行，C01 所选装备代码决定徽章顺序）、H02/C02 第三关图文补给/区域卡、H03/C03 首关图文信号卡与第三关图文纸设备卡、H04/C04 首关图文邮戳卡及第三关图文包裹卡、H05/C05 首关图文邀请卡与第三关图文包裹/装饰候选卡、H06/C06 首关图文批次标签卡与第三关图文顺序卡，庆祝、恐龙 Home、太空、森林和秋日第二关拼接板，森林第四关四格虚构地址地图、恐龙 H02/C02 足迹卡及 C02 首关批次卡与第二关观察笔记、圣诞/冬日物品与目的地配对卡、各主题指南内可打印结局信、C01 纸质徽章、H05 四枚纸质印记等模板，但仍是未验收草稿。
- GA4、Clarity、Ahrefs Web Analytics 和 Plausible 的代码与公开 ID 已暂存，发布开关关闭。只有在完成隐私告知、供应商设置和同意/拒绝/撤回测试后才能启用。`support@paperadventure.app` 的发信、收信和回复已经验证。

## 复现与证据

在项目目录运行 `npm run build`、`npm run test:static`、`npm run test:sites`、`npm run test:backend`。本轮四项在 2026-10-08 通过；构建输出包含 `dist/client/index.html`、`dist/server/index.js` 和 `dist/.openai/hosting.json`。静态测试检查 31 路由、站内链接、图片、预览标记与 noindex；后端测试模拟付款授权，但不代表真实 Stripe 已连接。

PDF 方面，分别运行 `scripts/check_celebration_samples.py`、`scripts/check_dinosaur_samples.py`、`scripts/check_space_samples.py`、`scripts/check_theme_samples.py <forest|halloween|christmas>`、`scripts/check_classroom_variants.py`、`scripts/check_role_cards.py`、`scripts/audit_pdf_layout.py` 和 `scripts/check_theme_pilot_zips.py`。最后一次静态版式核查覆盖 56 份、252 页，未见空页、出界字形或页边文字；两套节庆措辞稿的教师答案段落与中性稿完全一致。八个私有试玩包的 PDF 字节、清单和校验值相符。恐龙检查器从当前 PDF 重新渲染联系图，避免复用旧 PNG。检查细节见[版式记录](content/六主题_PDF版式静态核查_v0.1.md)。

设计真源与待补图见 [UI 交接](design-handoff/HANDOFF.md)、[路由/状态矩阵](design-handoff/ROUTE_STATE_MATRIX.md)、[素材来源表](design-handoff/ASSET_PROVENANCE.md)、[六主题体验说明](content/theme-design/六主题体验与制品差距_v0.1.md)及[14 套表达的试玩执行索引](content/theme-design/PILOT_EXECUTION_INDEX.md)。旧的设计截图不能证明新增课堂图及所有状态已在浏览器验收。

## 尚未放行

1. **内容：**每个 Home/Classroom 版本仍需代表性家长/教师试玩、A4/Letter 彩色和灰度实物打印、唯一答案与纸卡操作的现场记录，再按发现修订；C05/C06 的课堂节庆措辞草稿还需单独试玩与打印验收。
2. **设计：**Codex 右侧内置浏览器控制组件仍无法启动，新增页面的桌面/移动、键盘、错误态、图标与 OG 现场核验没有完成。遵守用户要求，不操作电脑上的浏览器。
3. **法律与商业：**正式消费者条款、税费适用地区、商户主体、素材权利、Stripe 实站配置和真实订单/文件权限测试尚待审查。四个分析平台仍关闭。不能把技术预览称为正式发布。

线上部署是否成功，以 draft PR 最新 head 的 `Deploy noindex Cloudflare preview` 工作流结果为准；本地构建或 ZIP 生成本身不代表已部署。只有完成对应放行证据后，才能逐一改变 `not_published`、结账或公开下载状态。
