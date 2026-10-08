# 圣诞／冬日 H06/C06｜内部试玩包 v0.1

依据 `content/theme-design/christmas.md` 先定故事与五关因果链，再从 `content/theme-design/christmas-content-source-v0.1.md` 制作内部草稿。H06 是 Christmas 家庭故事；C06 当前只有**中性 Winter 课堂文案与视觉**。如教师明确选择 Christmas 课堂措辞，须派生并重验，不能自动根据地区或语言判断。

| 场景 | 玩家/组包 | 成人指南 |
| --- | --- | --- |
| 家庭 H06 A4 | [Player Pack](christmas-H06-player-v0.1-A4.pdf) | [Host Guide](christmas-H06-host-v0.1-A4.pdf) |
| 家庭 H06 US Letter | [Player Pack](christmas-H06-player-v0.1-Letter.pdf) | [Host Guide](christmas-H06-host-v0.1-Letter.pdf) |
| 课堂 C06 A4 | [Group Player Pack](christmas-C06-player-v0.1-A4.pdf) | [Teacher Guide](christmas-C06-teacher-v0.1-A4.pdf) |
| 课堂 C06 US Letter | [Group Player Pack](christmas-C06-player-v0.1-Letter.pdf) | [Teacher Guide](christmas-C06-teacher-v0.1-Letter.pdf) |

玩家包各 6 页，指南各 3 页。`scripts/generate_christmas_samples.py` 为本批 PDF 卡片和答案的生成真源，`content/christmas-pdf-manifest.v0.1.json` 标记 `public: false`。`scripts/check_theme_samples.py christmas` 核对哈希、纸张、页数、答案隔离并渲染全页到 `tmp/pdfs/christmas-qa/`。

第二关 H06/C06 各有四张带文字与线条图形的礼物/物品卡、三张目的地卡。成人/教师可裁开配对，也可保持整页画线；H06 用圆/方/三角，C06 用书/星/铃，批次过滤仍须先做。成人/教师指南第 2 页各有独立纸质回信，最终答案确认后分享；玩家包不印回信。课堂 Christmas 措辞版尚未制作。

游戏中的礼物、地点和路线都是纸上虚构内容；不要求学生讲述其宗教、家庭消费或节日习惯。**仍不能发布：**代表性真人试玩、彩色/灰度 A4/Letter 实物打印、素材权利、英文文案、商品许可及法律/税务审核未通过，年龄/人数/时长也未实测。
