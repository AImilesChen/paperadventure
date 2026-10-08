# C05/C06 课堂节庆措辞变体｜内容与测试对照 v0.1

**状态：**仅内部试玩稿。C05 的 Autumn 与 Halloween、C06 的 Winter 与 Christmas 由组织活动的成人主动选择。每一对是同一个课堂场景的表达选择，不新增主题世界、独立 SKU 或额外费用；网站目前也未开放这些 PDF 下载。

| 场景 | 中性课堂稿 | 节庆课堂稿 | 保持不变的谜题合同 |
| --- | --- | --- | --- |
| C05 | The Autumn Festival Crew | The Pumpkin Festival Crew | CREW B/GATE → ORANGE BOOTH → Decor C/LEAF MARK → P-Q-R-S/WELCOME → Plan A |
| C06 | The Winter Gift Sorting Station | The Christmas Gift Sorting Station | T2 → BOOK/LIBRARY、STAR/SKY、BELL/MUSIC → STAR-BELL-BOOK → R1/READY → Manifest A |

节庆稿独立更换封面概念图、标题、开场叙事、教师准备说明、末关过渡与仅供教师交付的纸质回信。全部五关候选数据、正确答案、前后关成果、三级提示、角色线索与纸卡结构保持相同；生成器 `validate_logic()` 和 `scripts/check_classroom_variants.py` 同时核对。教师指南第 2 页的五关答案段落与对应中性版 PDF 提取文本完全一致，节庆回信不会印在玩家包里。

| 节庆稿 | 私有玩家包＋教师指南 | 清单与校验 | 独立试玩 ZIP |
| --- | --- | --- | --- |
| C05 Halloween | `output/pdf/variants/halloween-C05-halloween-*.pdf`，A4/Letter 各一对 | `content/halloween-classroom-halloween-pdf-manifest.v0.1.json` | `output/pdf/pilot-halloween-classroom-halloween-v0.1.zip` |
| C06 Christmas | `output/pdf/variants/christmas-C06-christmas-*.pdf`，A4/Letter 各一对 | `content/christmas-classroom-christmas-pdf-manifest.v0.1.json` | `output/pdf/pilot-christmas-classroom-christmas-v0.1.zip` |

## 教师试用与发布闸门

1. 选择措辞时以教师或家庭的明确选择为准，不根据国家、语言、学校或学生身份自动推断宗教与节庆习惯；不给学生询问家庭庆祝、宗教或消费经历的任务。
2. 中性版和节庆版分别找代表性教师与小组试玩。除五关唯一解外，记录标题、封面、来信、回信是否让参与者理解并感到合适；儿童不需带来真实礼物、糖果、服装或使用明火。
3. 两种措辞各按 A4/US Letter、彩色/灰度实际打印，检查长标题、图形与文字、裁切和指南结局卡。中性版通过不自动证明节庆版通过。
4. 任何文案改动须更新对应 `scripts/generate_halloween_samples.py` 或 `scripts/generate_christmas_samples.py`，重生两种表达的文件和哈希、复跑全部对应校验，再重测受影响页。
5. 素材来源、儿童感受、英文文案和正式使用许可仍需审查；上架/下载开关保持关闭。两张节庆封面是已有概念图的内部使用，不宣称为最终成品图。
