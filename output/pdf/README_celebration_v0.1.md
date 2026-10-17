# Celebration Quest｜H01 / C01 PDF 初稿交接

**状态：**内容与排版初稿，未经过真实家庭或课堂试玩；未通过正式上架验收。文件只供内部审阅、打印测试和代表性试玩。网站 `freeSampleThemeId` 仍为空，购买与下载按钮仍关闭。

| 场景 | A4 | US Letter | 页数与用途 |
|---|---|---|---|
| Home 玩家包 H01 | [PDF](celebration-H01-player-v0.1-A4.pdf) | [PDF](celebration-H01-player-v0.1-Letter.pdf) | 6 页；封面记录表 + 5 个相连关卡。 |
| Home 主持指南 H01 | [PDF](celebration-H01-host-v0.1-A4.pdf) | [PDF](celebration-H01-host-v0.1-Letter.pdf) | 3 页；准备、答案、分层提示、安全、验收与可打印结局信。 |
| Classroom 学生包 C01 | [PDF](celebration-C01-player-v0.1-A4.pdf) | [PDF](celebration-C01-player-v0.1-Letter.pdf) | 6 页；分组记录表 + 5 个独立组内关卡。 |
| Classroom 教师指南 C01 | [PDF](celebration-C01-teacher-v0.1-A4.pdf) | [PDF](celebration-C01-teacher-v0.1-Letter.pdf) | 3 页；每组打印份数、角色、答案、提示与课堂收尾。 |

**剧情和答案合同：**Home 的 5 个结果依次为 `Letter A / SUN → RED FLAG → Label A / 4 → TABLE → Parcel A`，成人确认后交付主持指南末页的可打印结局信；无需自备信封。Classroom 依次为 `Invitation B / GATE → WORKSHOP → Equipment A / 2-4-1-3 → COMPASS / BOOK / STAR / HANDS → Badge Plan A`。两版使用不同的组织方式，课堂版不要求学生姓名或生日，也不需要组间等待。

**已经完成的技术检查：**脚本检查候选答案唯一性；8 个 PDF 均有预期页面、草稿标识、无空白页、无文字越界；A4 与 US Letter 各自排版并渲染检查。生成脚本为 `scripts/generate_celebration_samples.py`，结构检查为 `scripts/check_celebration_samples.py`。

第二关 H01/C01 各有六个未连线地点的纸路线图；玩家要把首关起点带入，在混序纸条指示下画线，并填写纸条顺序和终点。节点交错放置，不能靠地图排布猜正确支线。当前仅通过屏幕和结构检查，实体书写空间待测试。

首关 H01/C01 各有三张图文候选卡；图形轮廓、点/星数量与文字重复编码。成人可裁开，也可让玩家在整页比较。打印试玩需核对裁开后每卡仍含路线起点，且不靠颜色辨别。

第三关 H01 有四张各带旗帜色字样、星数轮廓、编号和不同代码标记的投递标签卡；第四关按所选标签的标记查一行字典。C01 有四张各带颜色字样、圆点、形状轮廓和**不同徽章代码**的装备卡；课堂玩家先合并三张角色线索选卡，再把所选卡的代码抄到第四关，不预印正确代码。卡片可由成人/教师裁开，也可留在原页比较。屏幕渲染和静态几何核查已完成，实际剪裁及灰度纸张体验仍待测试。五关数据与交接见[内容源](../../content/theme-design/celebration-content-source-v0.1.md)。

供未来 R2 入库核对的机器可读文件清单和 SHA-256 在 [`content/celebration-pdf-manifest.v0.1.json`](../../content/celebration-pdf-manifest.v0.1.json)。所有条目的 `status` 为 `draft`、`public` 为 `false`。

**开放网站下载前仍需：**至少一次真实 Home/课堂代表性试玩，记录年龄与阅读适配、时长、模糊题目、提示使用、组内参与；按实测修订谜题；实际纸张和灰度打印；成人/教师指南与学生材料逐条复核；图片与素材许可、网站条款和目标市场隐私/消费者权利审查。完成这些验收后才能从“候选”变成“免费发布样例”。

试玩记录模板见[庆祝主题试玩与发布验收表](../../content/庆祝主题_H01_C01_试玩与发布验收表_v0.1.md)。
