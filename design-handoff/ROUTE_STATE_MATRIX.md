# 页面、状态与截图交接矩阵

日期：2026-10-08。路由真源：`../shared/page-manifest.mjs`（30 条）。下表按可复用页面家族组织，不用一张首页截图代替内页验收。“已有截图”指项目内可打开的文件；没有列出的状态表示实现/文案可能存在，但**尚无本轮截图证据**。

| 页面家族与路由 | 必备状态/动作 | 现有设计证据 | 待补图或复验 |
| --- | --- | --- | --- |
| 首页 `/en/` | Hero 主动作、长廊左右、首端/末端、手机露卡与滑动 | `../qa-comparison.png`, `../qa-cards-comparison.png`, `../qa-impl-mobile.png`, `../qa-impl-mobile-gallery.png` | 长廊末端、键盘焦点、360/430 px、缩减动态效果。 |
| 世界目录 `/en/themes/`, `/en/for-classroom/`, `/en/occasions/halloween/` | 搜索命中/无结果、清除、Home/Classroom 筛选、自定义入口 | `../design-qa.md` 有交互检查记录 | 每个家族的 1440/390 px 截图，空态与筛选态截图。 |
| 六个主题详情 `/en/themes/{id}/` | 现成/定制两种权益、候选免费样例、未发布按钮禁用、未知主题回退 | 已有实现，`../design-qa.md` 记录一般路由检查 | Celebration + 一款付费候选的桌面/手机截图；未知主题与禁用态。 |
| 流程 `/en/how-it-works/` | 四步介绍和创建入口 | 已有实现 | 桌面/手机截图。 |
| 创建器 `/en/create/` | 空字段报错、Home/Classroom 分歧、提案选择、Review、草稿覆盖确认 | `../design-qa.md` 有行为检查 | 关键四步及错误/冲突弹层的手机和桌面截图。 |
| 样例 `/en/samples/`, `/en/samples/home/`, `/en/samples/classroom/` | 未发布样例说明、Home/课堂切换、真实草稿材料与封面区分 | `material-previews/` 中两张**内部草稿**材料截图 | 公开样例 PDF 未通过试玩/发布闸门，站点不得显示为可下载成品。 |
| 价格 `/en/pricing/` | 固定包/定制包、Home/Classroom、候选免费包、税/许可待确认 | `../qa-pricing-v13.png` | 手机截图；价格与权益最终复核。 |
| 帮助 `/en/help/`, `/en/help/print/`, `/en/help/recover/`, `/en/help/report/` | FAQ、打印说明、找回订单、问题反馈和不可用提示 | 已有实现 | 各家族桌面/手机和错误态截图。 |
| 结账 `/en/checkout/`, `/en/checkout/demo/` | 不可付款、费用摘要、条款与税待确认 | `../qa-extended-checkout-mobile.png` | 桌面和禁用按钮焦点截图；真实收款不在设计预览内。 |
| 订单 `/en/orders/`, `/en/orders/demo/` | 核对、准备、就绪、问题/退款，文件未就绪时无下载 | `../qa-extended-order-desktop.png` | 手机、错误和权限态截图。 |
| 冒险书架与账号 `/en/my-adventures/`, `/en/account/` | 空书架、草稿、游客、成人邮箱验证预览 | `../qa-extended-account-mobile.png` | 书架桌面/手机截图；未验证邮箱无私有订单。 |
| 法律 `/en/privacy/`, `/en/terms/`, `/en/cookies/`, `/en/refunds/` | 审阅中提示、长文目录、移动端可读性 | `../qa-extended-legal-desktop.png` | 手机长文、焦点与跳转；正式文案仍需法律审核。 |

设计签收门槛：用 Codex 右侧浏览器为缺失状态补图并确认无溢出、断图、不可读文案或误导性可购买状态；随后更新 `../design-qa.md`。当前浏览器控制服务不可用，本表标记的截图空白不能视为已通过。
