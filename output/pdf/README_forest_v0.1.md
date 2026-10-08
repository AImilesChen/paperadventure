# 森林 H04/C04｜内部试玩包 v0.1

设计依据 `content/theme-design/forest.md`；谜题的故事目的、唯一答案、提示与跳关成果参见 `content/theme-design/forest-content-source-v0.1.md`。`scripts/generate_forest_samples.py` 是本批 PDF 卡片与答案的实际生成真源。更改内容稿必须同步修改脚本、重生 PDF/哈希并重做试玩。

| 场景 | 玩家/组包 | 成人指南 |
| --- | --- | --- |
| 家庭 H04 A4 | [Player Pack](forest-H04-player-v0.1-A4.pdf) | [Host Guide](forest-H04-host-v0.1-A4.pdf) |
| 家庭 H04 US Letter | [Player Pack](forest-H04-player-v0.1-Letter.pdf) | [Host Guide](forest-H04-host-v0.1-Letter.pdf) |
| 课堂 C04 A4 | [Group Player Pack](forest-C04-player-v0.1-A4.pdf) | [Teacher Guide](forest-C04-teacher-v0.1-A4.pdf) |
| 课堂 C04 US Letter | [Group Player Pack](forest-C04-player-v0.1-Letter.pdf) | [Teacher Guide](forest-C04-teacher-v0.1-Letter.pdf) |

玩家包各 6 页，指南各 3 页。`content/forest-pdf-manifest.v0.1.json` 写明纸张、角色、页数、哈希及 `public: false`。`scripts/check_theme_samples.py forest` 自动核对并渲染全部页面，检查用样张在 `tmp/pdfs/forest-qa/`。这些文件没有发布到公开下载目录。

第一关的四张邮戳候选卡同时印轮廓、可数的星/点、日期、批次和文字标签：H04 的唯一匹配为 B/M2，C04 为 A/R7。第二关含独立路线条与纸上邮路工作区：H04 三格整理 M2 邮路，C04 两格整理 R7 调查路线。成人可裁条，也可让玩家在原页排序或抄写。第四关改为四格虚构地址地图，每格同时列出地区、碎片和收件标志，玩家在完整页核对两个字段。指南第 2 页各有独立纸质回信，只在最终答案确认后分享；玩家包不印回信。档案袋仍待制作。

**未通过发布门槛：**家庭及课堂真人试玩、彩色/灰度 A4 与 US Letter 实物打印、素材许可、英文文案、许可与法律/税务复核仍未完成。所有年龄、人数、时长与打印成本需实测后才能对外承诺。森林地址都是虚构标签，不应要求玩家提供真实地址。
