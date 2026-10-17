# Dinosaur Adventure｜H02 / C02 PDF 初稿交接

**状态：**八份英文文件供内部审阅与试玩，均未发布或上架。网页目录仍显示 `not_published`，不提供下载和收款。设计蓝图见 [Dinosaur](../../content/theme-design/dinosaur.md)，具体谜题内容源见 [v0.1](../../content/theme-design/dinosaur-content-source-v0.1.md)。

| 场景 | A4 | US Letter | 内容 |
|---|---|---|---|
| Home 玩家包 H02 | [PDF](dinosaur-H02-player-v0.1-A4.pdf) | [PDF](dinosaur-H02-player-v0.1-Letter.pdf) | 6 页；记录页与五个相连关卡 |
| Home 主持指南 H02 | [PDF](dinosaur-H02-host-v0.1-A4.pdf) | [PDF](dinosaur-H02-host-v0.1-Letter.pdf) | 3 页；准备、答案、三级提示、跳关和安全 |
| Classroom 学生包 C02 | [PDF](dinosaur-C02-player-v0.1-A4.pdf) | [PDF](dinosaur-C02-player-v0.1-Letter.pdf) | 6 页；每组独立档案和五关记录 |
| Classroom 教师指南 C02 | [PDF](dinosaur-C02-teacher-v0.1-A4.pdf) | [PDF](dinosaur-C02-teacher-v0.1-Letter.pdf) | 3 页；分组、答案、三级提示、跳关和收尾 |

H02 答案链：`Print A / SUN → strips A-B-C / PINE SIGN → supply B / code 4 → EAST / ROUND GATE → Camp A`。C02 答案链：`Batch B / R2 → Print C / RIDGE → Zone C → P-Q-R-S / 09:45 → Report A`。两套故事和结局不同，不以改人数复用同一题。

生成脚本为 `scripts/generate_dinosaur_samples.py`；结构/校验和检查为 `scripts/check_dinosaur_samples.py`；[机器可读清单](../../content/dinosaur-pdf-manifest.v0.1.json)中八项均为 `draft`、`public: false`。已核对 6/3 页数、五关存在、草稿标识、SHA-256，并渲染 A4/Letter 每页做版式检查。C02 第一关有四张图文批次档案卡，第二关必须按第一关所得 R2 选观察笔记，再与四张足迹卡比对；H02 第一关也有四张图文足迹卡，第二关另有三格路线板。第三关为三张可分发或遮盖的角色线索卡。成人/教师指南第 2 页各有仅在确认结局后分享的纸质欢迎/研究站回信卡，玩家包中没有。尚未进行纸张实物打印、灰度打印或真实家庭/课堂试玩。

发布前须填写[试玩与发布验收表](../../content/恐龙主题_H02_C02_试玩与发布验收表_v0.1.md)，复核图像权利、文案、许可、隐私与商品条件。任何答案歧义、漏线索、裁切或安全问题都回改内容源、重新导出与复测。
