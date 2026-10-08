# 素材来源与发布边界

日期：2026-10-08。这里只记录当前可核查的来源，不将设计原型素材自动视为已通过商业发布审核。

| 素材 | 当前来源/版本 | 用途与限制 |
| --- | --- | --- |
| `../public/icon.svg` 与 favicon/触屏图 | 项目内手写 SVG，`../scripts/generate-brand-assets.py` 导出 PNG/ICO | 品牌标识。需在 16/32 px 和实际浏览器标签页复核。 |
| `../public/brand-wordmark.svg`, `brand-horizontal.svg`, `brand-stacked.svg` | 项目内 SVG，与图标同一几何形 | 交接用组合 Logo；网页导航仍用真实文本加图标，避免标题烘焙。 |
| `../public/og-image.jpg` | 项目内脚本将现有 Hero 图、品牌图标和文字排成 1200×630 | 分享预览；正式发布前检查社交平台抓取和缓存。 |
| `../public/assets/hero-workshop.png` | 前期 Codex 原型阶段生成的纸艺 Hero 图；原始生成提示词未保存 | 情绪/品牌图，不代表实际 PDF 成品。商业发布前复核生成来源、角色原创性和图中细节。 |
| `../public/assets/{celebration,dinosaur,space,forest,halloween,christmas}.png` | 前期 Codex 原型阶段生成的六张世界封面；原始提示词未保存 | 世界灵感图；不是已售内容截图。六图仍需统一裁切、尺寸/加载性能和使用权复核。 |
| `../public/assets/halloween-friendly-v0.1.jpg` | 2026-10-08 使用 Codex 内置 imagegen 以原 `halloween.png` 为编辑目标生成，项目本地保留高分辨率 PNG；提示与边界见 `THEME_VISUAL_VARIANTS.md` | 新的友好纸艺世界封面候选，网页使用压缩 JPEG；仍非可售 PDF 预览，正式发布前复核权利及儿童感受。 |
| `../public/assets/winter-classroom-v0.1.jpg` | 2026-10-08 使用 Codex 内置 imagegen 以原 `christmas.png` 为编辑目标生成，项目本地保留高分辨率 PNG；提示与边界见 `THEME_VISUAL_VARIANTS.md` | C06 非特定节庆 Winter 视觉候选；网页课堂故事卡展示压缩 JPEG，对应资料包已有未验收的内部 PDF 草稿。 |
| `../public/assets/autumn-classroom-v0.1.jpg` | 2026-10-08 使用 Codex 内置 imagegen 以友好万圣节变体为编辑目标生成，项目本地保留高分辨率 PNG；提示与边界见 `THEME_VISUAL_VARIANTS.md` | C05 非特定节庆 Autumn 视觉候选；网页课堂故事卡展示压缩 JPEG，对应资料包已有未验收的内部 PDF 草稿。 |
| `../public/assets/celebration-classroom-v0.1.jpg` | 2026-10-08 使用 Codex 内置 imagegen 以原 `celebration.png` 为编辑目标生成；项目内保留优化 PNG，原始高分辨率图在 CodexHome 生成目录；来源见 `THEME_VISUAL_VARIANTS.md` | C01 探险俱乐部概念图，用于网页课堂故事卡和内部 PDF 封面，替代不相符的生日礼物封面；仍需正式素材及儿童感受审查。 |
| `material-previews/celebration-home-draft.jpg` | 从未公开的 `output/pdf/celebration-H01-player-v0.1-A4.pdf` 第 2 页渲染；详情见 `../content/celebration-pdf-manifest.v0.1.json` | 仅私有设计审阅，已加 DRAFT 标记；不得当作可下载成品在站点公开。 |
| `material-previews/celebration-classroom-draft.jpg` | 从未公开的 `output/pdf/celebration-C01-player-v0.1-A4.pdf` 第 2 页渲染；同上 | 同上。 |
| `../qa-*.png` | 前期 Codex 右侧浏览器原型 QA 截图 | 设计比较证据，不是用户评价或商品材料。 |
| Nunito Sans / Bree Serif / Phosphor | 安装包的 `LICENSE` 与 `package.json` 已核对：两款字体为 OFL-1.1，图标包为 MIT；原文复制到 `../public/licenses/` | 构建随字体和图标分发许可证声明；正式发布仍需复核使用方式、字体保留名称和全站第三方依赖清单。 |

当前缺少完整的原始图像提示词、生成模型版本和逐图权利记录。可用 [`PAGE_AND_ASSET_PROMPTS.md`](PAGE_AND_ASSET_PROMPTS.md) 作为**补写的再生成说明**，但不得把它当作原始生成日志。
