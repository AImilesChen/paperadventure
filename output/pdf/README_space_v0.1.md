# 太空 H03/C03｜内部试玩包 v0.1

设计依据为 `content/theme-design/space.md`，谜题规则、唯一答案与成人提示见 `content/theme-design/space-content-source-v0.1.md`。`scripts/generate_space_samples.py` 是本批 PDF 中卡片及答案的实际生成真源；如修改内容稿，须同步修改脚本、重生 PDF 与哈希，并再做试玩。

| 场景 | 玩家/组包 | 成人指南 |
| --- | --- | --- |
| 家庭 H03 A4 | [Player Pack](space-H03-player-v0.1-A4.pdf) | [Host Guide](space-H03-host-v0.1-A4.pdf) |
| 家庭 H03 US Letter | [Player Pack](space-H03-player-v0.1-Letter.pdf) | [Host Guide](space-H03-host-v0.1-Letter.pdf) |
| 课堂 C03 A4 | [Group Player Pack](space-C03-player-v0.1-A4.pdf) | [Teacher Guide](space-C03-teacher-v0.1-A4.pdf) |
| 课堂 C03 US Letter | [Group Player Pack](space-C03-player-v0.1-Letter.pdf) | [Teacher Guide](space-C03-teacher-v0.1-Letter.pdf) |

玩家包各 6 页（记录封面加五关），指南各 3 页（准备、答案与结局、三级提示与跳关）。首关四张信号卡现有图形与重复文字标签，家庭版比较圆/方边框、波纹和方缺口，课堂版比较边框、三角峰和圆点；可原页操作或由成人裁开。`content/space-pdf-manifest.v0.1.json` 记录各文件哈希、页数、纸张和 `public: false`。`scripts/check_space_samples.py` 核对哈希、纸张尺寸、草稿标记、答案隔离、信号卡标签并渲染全部页面；渲染样张在 `tmp/pdfs/space-qa/`。

**不能发布：**仍缺家庭及课堂真人试玩、A4/Letter 彩色与灰度实物打印、无障碍/可读性、视觉素材权利、文案与销售/许可审核。年龄、人数、时长和打印成本尚无实测值，不应写在对外商品卡上。所有文件只供内部评审，网站不可开放下载或付款。
