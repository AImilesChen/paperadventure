# Celebration H01/C01｜谜题内容源 v0.1

**状态：**内部内容和 PDF 草稿，未经真人试玩、实物打印或发布审查。设计先于制品，见 [Celebration 蓝图](celebration.md)。生成真源为 `scripts/generate_celebration_samples.py`；本文解释玩家必须怎样从上一关取得下一关线索，改动时须同步脚本、指南、清单和试玩记录。两版都只需纸和笔。

## H01｜The Missing Birthday Chest

小狐狸 Fenn 保管着纸质庆祝信，不要求购买礼物或准备宝箱。成人持有指南中的结局信，按关卡逐页交付。

| 关 | 玩家必须看见与完成 | 唯一结果及后续用途 |
| --- | --- | --- |
| 1 来信 | 三张来信卡。狐狸、两只尖耳、三点印章同时成立的仅 A；A 印有起点 SUN。 | `Letter A / SUN`，SUN 是第二关路线起点。 |
| 2 路线 | 混序 A–E 路线条与六地点未连线纸地图；从 SUN 出发，仅按纸条首尾相同处画线，A–B–C 到达有旗帜的终点，D–E 是到 CLOUD 的干扰支线。地图不得预印答案连线。 | `A-B-C / RED FLAG`，RED 是第三关颜色条件。 |
| 3 标签 | 三张角色线索分别要求上关旗帜色、恰好两星、编号 4。四张独立卡为 A=`RED / 2 / 4 / FOX`、B=`RED / 1 / 4 / BELL`、C=`BLUE / 2 / 4 / KITE`、D=`RED / 2 / 5 / LEAF`，末项是代码标记。文字、星形轮廓和色块重复编码。 | 只有 `Label A / number 4 / code mark FOX` 同时满足；FOX 指向第四关字典行。 |
| 4 密讯 | 字典列顺序为 SUN、CLOUD、FLAG、MOON、PATH。FOX 行 `T A B L E`；BELL 行 `S H E L F`；KITE 行 `C H A I R`；LEAF 行 `F L O O R`。玩家只用所选标签上的代码标记查行，不提前高亮正确行。 | `TABLE`，成为第五关地点条件。 |
| 5 投递 | A=`RED / 4 / TABLE`；B=`RED / 4 / SHELF`；C=`BLUE / 4 / TABLE`；D=`RED / 5 / TABLE`。结合旗帜、标签号与地点，解释为何只有一张卡满足。 | `Parcel A`；成人确认后交出指南中的 Fenn 纸质结局信。 |

成人若要跳关，只把该关标准结果交给玩家：SUN → RED FLAG → Label A / 4 / FOX → TABLE → 纸质结局信。不要把完整答案指南印入玩家包。第四关其他字典行有可读的不同词，错误标签可能导向不同结局卡，因此角色条件必须实际使用；成人试玩时观察玩家是否跳过了这些线索。

## C01｜The Adventure Club's First Badge

每组有完整、相同的五关材料。故事是集体入会，不索取生日或学生身份；教师可合并/轮换角色。

| 关 | 小组必须看见与完成 | 唯一结果及后续用途 |
| --- | --- | --- |
| 1 邀请 | 三张邀请卡；只有 B 同时有 COMPASS 印章和两颗星，印有起点 GATE。 | `Invitation B / GATE`。 |
| 2 路线 | A–E 混序路线条与六地点未连线纸地图；从 GATE 出发，仅按纸条画线，经 LIBRARY、TABLE 到 WORKSHOP；D–E 到 SHED 是干扰支线。地图不得预印答案连线。 | `A-B-C / WORKSHOP`，为装备场景。 |
| 3 装备 | Reader 要 BLUE，Spotter 要两点，Checker 要 TRIANGLE。四张独立卡：A=`BLUE / 2 / TRIANGLE / 2-4-1-3`；B=`BLUE / 1 / TRIANGLE / 1-4-2-3`；C=`RED / 2 / TRIANGLE / 2-3-1-4`；D=`BLUE / 2 / CIRCLE / 4-2-1-3`。色块、圆点、轮廓均有文字复述。 | 只有 `Equipment A / 2-4-1-3` 同时满足；从所选卡抄代码，不在第四关预印答案。 |
| 4 徽章顺序 | 图例 1=STAR、2=COMPASS、3=HANDS、4=BOOK；按所选卡顺序填 TOP/RIGHT/BOTTOM/LEFT。 | `COMPASS / BOOK / STAR / HANDS`。 |
| 5 徽章 | 用 WORKSHOP、装备 A、上述顺序比较 A–D 四种方案。可在纸徽章上写/画四符号；团队名可留空。 | `Plan A`；教师按指南确认并做团队收尾。 |

跳关补发：GATE → WORKSHOP → Equipment A / 2-4-1-3 → 四符号顺序 → 教师收尾。每组无需另一组信息、真实设备或联网。学生玩家页不能出现教师答案键。

## 验收边界

两版分别导出 A4 和 US Letter 的 Player Pack 与 Host/Teacher Guide。脚本检查唯一答案、页面、卡片字段、代码交接与越界；人工还需分别完成代表性 Home/Classroom 试玩、两种纸张彩色及灰度实物打印、剪卡后信息完整性、低阅读能力支持、素材来源、正式文案许可及法律税费审查。任何一项未通过时都维持 `draft`，不开放收费或免费样例下载。
