# Paper Adventure｜UI 功能流程与关键页面设计 v1.4

日期：2026-10-09。设计基线：用户已选的 03 Paper Adventure Workshop 纸艺方向；沿用 `tokens.json` 的蓝底、深蓝文字、朱红主按钮、Nunito Sans/Bree Serif、纸张卡片和现有六主题插画。本文件补齐**前端之前就应存在**的登录、免费试玩下载、现成/定制商品、订单和失败状态设计。它是页面/交互交接，不把现有设计预览截图说成真实用户流程已完成。英文文字以 `../content/英文网站文案_v1.4.md` 为准。

## 1. 信息架构与视觉规则

桌面 1440 px：左侧品牌标，中央 `Story worlds / How it works / Free sample / Pricing / Help`，右侧次要 `Sign in`、唯一朱红主 CTA `Create an adventure`。登录后改 `My adventures`，账户菜单有 `Sign out`。手机 390 px：品牌＋菜单；菜单展开后上述导航和 `Sign in` 都可见，操作区可点击范围至少 44×44 CSS px。页脚始终含 Help、客服邮箱、Privacy、Terms、Cookies、Refunds；法律稿未正式发布时标识 `Draft for review`。

页面最大宽 1480 px；移动端 360/390/430 均不得水平溢出。H1 仅一个；标题不烘焙到图片；红色只给当前页一个主要动作，危险/退款/删除使用单独视觉层级。插画是 `story-world illustration`；真实 PDF 预览必须来自同版文件并标版本号。样例未放行时，不显示“Download”假按钮；可下载试玩稿时用明确的 `Trial v0.1` 标签，不声称完成真人验证。

## 2. 关键屏幕蓝图（按实际动作顺序）

| 屏幕 | 桌面布局 | 手机布局 | 主动作 | 数据/权限条件 |
| --- | --- | --- | --- | --- |
| 首页/长廊 | 左文案右纸艺 Hero，下方横向六主题卡；可见四卡和下一卡一部分 | 文案、主 CTA、插画顺序堆叠；长廊露出下一卡 | `Explore story worlds` | 主题状态从目录 API；未发布不可显示购买 |
| 世界目录/详情 | 左筛选与卡片；详情 Home/Classroom 并排，固定/定制分区 | 筛选折叠但可见已选状态；详情纵向分卡 | `View story` / `Plan custom`；仅可下载主题给 `Get free pack` | setting、版本、free/ready 状态分别判断 |
| 免费样例 | 顶部标记 `Free Celebration trial v0.1`；Home/Classroom 标签与纸张选择；玩家/成人文件并列 | 先 setting、再纸张、再两张独立下载卡 | `Download Player Pack` + `Download Host/Teacher Guide` | 每版同版本配套两文件均存在；匿名可取；失败保留重试 |
| 创建器 | 四步侧/顶步进；世界、设置、方向、复核 | 单列，底部固定上一步/继续；错误靠近字段 | `Preview two ideas`，最后 `Review price` | 提案关时显示请求中、超限、超时、服务不可用；完整内容不得免费曝光 |
| 登录 | 左侧价值与隐私提示、右侧邮箱卡；无“创建学生账户” | 单列邮箱卡，焦点先到标题再到输入 | `Send sign-in link` | 预览状态明确不可用；真实启用后显示送达中、已发、失败、过期/已使用 |
| 我的冒险 | 草稿区、订单卡、筛选；每卡显示类型、版本、下载期限和状态 | 卡片单列，订单状态高于次要操作 | `Open order`、`Continue draft`、`Sign out` | 游客先登录；空态不展示假订单 |
| 现成/定制结账 | 左商品和许可摘要、右价格及条款；下方外部 Stripe 入口 | 单列，价格/税提示在按钮上方，条款可展开 | `Continue to secure payment` | 只有售卖、法律、税务和服务端价格同时有效才可出现 |
| 订单/下载 | 顶部状态轨迹，主体文件卡和授权期限，底部修订/问题报告 | 状态、文件、客服依次堆叠 | `Download` / `Report a problem` | 付款返回不等于成功；文件就绪且邮箱已验证才出现私有链接 |
| 帮助/法律 | 文章目录与内容，两级标题，客服入口 | 锚点目录折叠，长文可读 | `Contact support` | 草稿法律页与生效页视觉标记必须不同 |

### 免费样例关键版式

`Title → Trial label/version → “Home / Classroom” segmented control → “A4 / US Letter” control → two equal-status file cards → adult-guide privacy note → print help → feedback link`。手机两张文件卡纵向排列；每张写 PDF、页数/大小（从清单生成，缺失时不猜）、版本。免费用户不见登录拦截。老师版只显示 Teacher Guide，不混入家庭版答案；每次切换 setting 或 paper 重算链接与清单哈希。

### 登录与权限关键版式

页头可发现的 `Sign in` 是真实入口。邮箱页只有一个字段与发送按钮；提供“成人邮箱，不需要儿童账号”说明。提交后不暴露“该邮箱有无订单”。验证成功返回原目标页（若有效）或 My adventures。登录过期显示重发；已登录页头是 My adventures 和退出。登录失败/邮件不可达给人工客服与重试；不得悄悄落到虚构 Demo 订单。服务未部署时清晰写 `Account sign-in is not available yet`，按钮禁用而非假成功。

## 3. 状态设计合同

| 对象 | 必备状态 | 视觉与文案要求 |
| --- | --- | --- |
| 免费文件 | 准备中、可下载试玩、下载失败、版本更新 | 无文件时只展示预览；下载失败保留选定 setting/paper 和重试 |
| 固定包 | 未发布、已发布可买、售罄/暂停、已购、文件损坏 | 未发布不进入 Checkout；已购优先进入订单 |
| 提案/生成 | 空、输入错误、加载、两条提案、限流、质量失败、队列中、交付 | 队列中可离开后返回；质量失败不出现无效 PDF |
| 登录 | 游客、发送中、已发、邮箱错误、链接过期/复用、已登录、退出 | 表单错误靠近字段并朗读；不暴露账户枚举信息 |
| 支付/订单 | 未开始、Stripe 跳转、待确认、已付生成中、文件就绪、失败、退款 | 只有服务端已确认付款才“已付”；退款关闭在线权限 |
| 分析同意 | 未选择、拒绝、允许、撤回 | 等权按钮；拒绝不妨碍免费样例或购买 |

## 4. 交互、可访问性与运动

所有按钮/链接键盘可达，焦点轮廓至少采用现有 3 px 高对比规则；菜单、对话框及主题长廊有可见焦点、合理 Tab 顺序和 Esc 退出。错误使用文字＋图标，不靠颜色；动态状态用 `role=status`/`role=alert` 区分。下载链接名包含 setting、paper、role，避免一页四个相同“Download”。图片 alt 区分装饰与传达信息；屏幕阅读器不重复读标题。长廊支持按钮、触摸与键盘，尊重 `prefers-reduced-motion`。移动端不靠 hover 显示重要信息。PDF 预览图的正文不作为唯一信息来源。

## 5. 截图与交接验收清单

现有 03 概念图、品牌素材、设计变量和部分首页/价格/账号截图可复用；[现有交付审计](DELIVERY_AUDIT.md) 与 [路由矩阵](ROUTE_STATE_MATRIX.md) 的缺图不能标为已完成。前端接手时按以下**同一状态版本**验收，不要求在免费试玩下载之前先进行真人游玩：

1. 1440 px 与 390 px：首页、目录、主题详情（Celebration 与一款付费主题）、免费样例、创建四步、登录、书架、价格、订单、法律长页。再核 360/430 px 无溢出。
2. 对每个动态流补空态、加载、错误、禁用、成功、过期/权限不足的截图或可运行录屏；尤其补登录入口、两份 PDF 并列、服务不可用、付款待确认。
3. 将截图版本、视口、路由、数据状态、发现的问题、修复提交和复验结论记录到 `../design-qa.md`。自动 CI 的 37 次路由检查和 axe 扫描可证明基础健康，不能替代本清单的人工视觉判断。
4. 素材使用仍按 `ASSET_PROVENANCE.md`；图像原始生成记录不全要如实登记，不能把已记录 SHA-256 等同于商业许可。浏览器标签图标和 OG 仍需现场复核。

**设计交付结论：**这份 v1.4 使产品路径、状态、导航、文案和前端验收有明确设计合同；未补齐的现场截图/版权核验继续标 `NEEDS_REVIEW`，不虚称完成视觉签收。

## 6. 已查看的本地视觉证据与修订要求

本轮逐张打开 `qa-comparison.png`、`qa-impl-mobile.png`、`qa-impl-mobile-gallery.png`、`qa-pricing-v13.png`、`qa-extended-account-mobile.png`、`qa-extended-checkout-mobile.png`、`qa-extended-order-desktop.png`、`qa-extended-legal-desktop.png`。可确认纸艺方向、移动端长廊露卡、价格层次及现有预览账号/结账/订单/法律布局；这些均是**早期设计截图**。账号截图仍写“Preview email verification”，订单截图为 Demo 状态，法律截图含“Final reviewed wording goes here”，页头只显示 `My adventures` 而没有清晰 `Sign in`。因此需要按本文件重新出真实状态的登录、试玩下载、订单与法律页设计图，不能以旧截图签收新增流程。
