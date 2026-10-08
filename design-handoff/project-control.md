# 06-design 项目控制板

更新：2026-10-08。此文件是本阶段的本地事实源；状态只依据已保存文件和可复核结果。

| 任务 | 状态 | 证据 / 下一步 |
| --- | --- | --- |
| 三个视觉方向与选择依据 | DONE | `concepts/` 和 `VISUAL_STYLE_RATIONALE.md`；第 3 方向获用户选择。 |
| 竞品页面结构研究 | DONE | `COMPETITOR_VISUAL_REVIEW.md`，官方网页链接。 |
| 竞品实际色彩/字体/手机截图 | NEEDS_REVIEW | Codex 右侧浏览器控制不可用；恢复后现场截图与测量。 |
| 反模板约束与设计变量 | DONE | `VISUAL_STYLE_RATIONALE.md`, `tokens.json`。 |
| 页面与素材再生成 Prompt | DONE | `PAGE_AND_ASSET_PROMPTS.md`；明确不是原始生成日志。 |
| 全站页面源、关键状态与路由说明 | DONE | `../src/`, `../shared/page-manifest.mjs`, `ROUTE_STATE_MATRIX.md`。 |
| 原型的现有桌面/手机截图与行为 QA | DONE | `../qa-*.png`, `../design-qa.md`。 |
| 全 30 路由及缺失状态的新一轮现场截图 | NEEDS_REVIEW | 按 `ROUTE_STATE_MATRIX.md` 补图，覆盖 1440/390 和关键错误/空/禁用态。 |
| Logo、favicon、OG 与素材来源表 | DONE | `../public/`, `ASSET_PROVENANCE.md`。 |
| 两张实际材料预览 | DONE（内部草稿） | `material-previews/`，来自未公开 PDF；不发布到站点。 |
| 完整资产权利/生成日志与字体许可 | NEEDS_REVIEW | 原始图像提示词未保存，需正式发布前审核。 |
| Cloudflare 图标部署与线上验收 | BLOCKED | 当前线上 `/favicon.ico`、`/icon.svg` 为 404；新版 ZIP 在 `../output/`。仅使用 Codex 右侧浏览器部署，或待安全授权恢复。 |
| 正式文案、商品样例与法律发布闸门 | NEEDS_REVIEW | 不属于 UI 设计完成即自动放行；保持 noindex 和交易关闭。 |

阶段结论：`[NEEDS_REVIEW]`。设计真源和可交前端资料已成包；现场截图补全、视觉竞品细节与线上图标验收仍未通过。
