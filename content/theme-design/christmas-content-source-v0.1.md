# Christmas/Winter H06/C06｜谜题内容源 v0.1

**状态：**内部谜题/英文文案与 PDF 排版初稿，尚无真人试玩或发布。依据 [Christmas/Winter 蓝图](christmas.md)制作；`scripts/generate_christmas_samples.py` 为本批 PDF 卡片/答案生成真源。所有礼物是纸质图卡；真实礼物、交换、购买和家庭节庆习惯均不属于过关条件。C06 当前采用中性 Winter 表达，Christmas 课堂措辞仍待成人选择后派生复核。

## H06：The Christmas Delivery Office

开场：“The story delivery office has mixed up its last paper list. Help the messenger match picture gifts with story destinations and find the final thank-you note.” 玩家记录批次、配对、路线顺序、最后一站、结局卡。

| 关 | 玩家页规则与候选 | 唯一成果及下一关用途 |
|---|---|---|
| 1 标签批次 | 待找清单有雪花框、两枚圆点、纸星印。A=snow/two/star/**B3**；B=snow/one/star/B2；C=leaf/two/star/B4；D=snow/two/moon/B5。 | A，得 `batch=B3`，只处理 B3 订单。 |
| 2 纸礼物配对 | B3 订单：Owl 角色喜爱圆形图画，Fox 喜爱方形图画，Rabbit 喜爱三角图画；礼物卡 A=circle、B=square、C=triangle，目的地卡分别 OWL WINDOW、FOX DEN、RABBIT GATE。卡片只用于故事，不收集孩子喜好。 | 唯一配对 A→OWL、B→FOX、C→RABBIT；三站进入路线排序。 |
| 3 分工排路线 | 使用第二关配对：礼物 A=Owl、B=Fox、C=Rabbit。Guide 卡：“FOX DEN 在 OWL WINDOW 之前”；Clock 卡：“RABBIT GATE 最后”；Map 卡：“三站不重复”。候选**礼物字母**顺序 A=A-B-C；B=**B-A-C**；C=B-C-A；D=C-B-A。必须先把礼物字母译为地点才能应用条件。 | 候选 B，得 `route=FOX→OWL→RABBIT`；最后一站用于读留言。 |
| 4 解留言 | 只有 RABBIT GATE 的纸信封印有编码 `TREE / STAR / MOON`；完整字典 TREE=G、STAR=O、MOON=!，按原顺序读。其它站只有空白故事纸卡，不作为额外答案。 | `message=GO!`，确认最后一站 `RABBIT GATE`；标点是回信标记的一部分，不需真正出发。 |
| 5 最终投递 | 回信候选 A=B3/FOX-OWL-RABBIT/RABBIT GATE/GO!；B=B3/OWL-FOX-RABBIT/RABBIT GATE/GO!；C=B2/FOX-OWL-RABBIT/RABBIT GATE/GO!；D=B3/FOX-OWL-RABBIT/FOX DEN/GO!；E=B3/FOX-OWL-RABBIT/RABBIT GATE/NO!。 | A。成人出示纸质感谢信；可选奖励由成人另行决定，不写进商品必需材料。 |

三级提示：1 比标签三属性→批次须全合→A/B3；2 按图形偏好配→一图只配一角色→A/Owl、B/Fox、C/Rabbit；3 读三位角色条件→Rabbit 必为尾，Fox 在 Owl 前→B/FOX-OWL-RABBIT；4 查最后一站纸信→逐词替换保留顺序→GO!；5 查批次/顺序/终点/留言→每张错卡恰有一项错误→A。跳关依次补发 B3、完整配对、路线 B、RABBIT GATE/GO!、感谢信。H06 不要求真实地址或亲友身份资料。

H06 制品：封面记录、批次标签、四张图文礼物卡与三张目的地卡、三张分工路线条件、字典与编码信、候选回信；Host Guide 含准备、答案、三级提示、跳关与安全。圆/方/三角图形同时有文字标签；灰度实物效果仍待打印验收。

## C06：The Winter Gift Sorting Station

开场：“Your group is a paper sorting crew. Use the order sheets, clear size grades and route rules to prepare a pretend departure list.” 每组独立材料；教师为所有组选择 Winter 或 Christmas 文案。故事物品只有图卡，不要求学生透露自己的节日、宗教或家庭购物情况。

| 关 | 小组页规则与候选 | 唯一成果及下一关用途 |
|---|---|---|
| 1 当班批次 | 任务章为方框、两道横线、SNOW 字样。A=square/one/SNOW/T1；B=**square/two/SNOW/T2**；C=circle/two/SNOW/T3；D=square/two/LEAF/T4。 | B，`batch=T2`。 |
| 2 订单配对 | T2 表：Book 图卡去 LIBRARY DESK；Star 图卡去 SKY SHELF；Bell 图卡去 MUSIC NOOK。目的地卡同时印图与文字，混排后由组员配对。 | Book→LIBRARY，Star→SKY，Bell→MUSIC；用于装载条件。 |
| 3 合作装载 | Size 角色持等级：Book=3、Star=1、Bell=2；Time 角色持规则“从小等级到大等级”；Destination 角色负责核对每件仍保留第二关目的地。候选 A=Book-Bell-Star；B=**Star-Bell-Book**；C=Bell-Star-Book；D=Star-Book-Bell。 | B，`load_order=Star→Bell→Book`。数值只是故事等级，不做物理重量或单位换算。 |
| 4 纸路线表 | 路线表 R1=SKY→MUSIC→LIBRARY；R2=LIBRARY→MUSIC→SKY；R3=SKY→LIBRARY→MUSIC；R4=MUSIC→SKY→LIBRARY。规则：按装载顺序访问对应目的地，无真实行车。 | R1，得 `route=SKY→MUSIC→LIBRARY` 和站点印记 `READY`。 |
| 5 分拣清单 | 候选 A=T2/Star-Bell-Book/R1/READY；B=T1/Star-Bell-Book/R1/READY；C=T2/Book-Bell-Star/R1/READY；D=T2/Star-Bell-Book/R3/READY；E=T2/Star-Bell-Book/R1/WAIT。 | A。每组填写“物品→目的地→顺序”的纸质发车确认，教师按指南收尾。 |

三级提示：1 核对章形/横线/词→三项同真→B/T2；2 图标和文字一一配→每件一站→Book/LIBRARY、Star/SKY、Bell/MUSIC；3 分享等级与排序规则→按 1、2、3 排→Star-Bell-Book；4 将装载顺序转换为目的地顺序→查同序路线→R1/READY；5 用四项记录排除不同项→仅 A 全合→A。跳关依次补发 T2、三件配对、装载顺序、R1/READY、教师收尾卡。人数不整除时角色合并或轮换，不丢必需线索。

C06 制品：每组批次卡、订单图/目的地、等级与时间角色卡、纸路线表、分拣单；Teacher Guide 给出组数复制、角色分配、答案、提示、跳关、两种文案封面与收尾对应表。Winter/Christmas 是同一游戏的成人选择表达，不能额外计数或自动推断学生偏好。

## 导出与验证

Home/Group Player Pack 与 Host/Teacher Guide 已有 A4/US Letter 内部初稿；第二关图形卡与目的地卡已排版并自动检查，五关唯一答案与跳关成果仍按内容源核对。C06 仍只有中性 Winter 课堂版本；Christmas 课堂措辞未出片。真实家庭/课堂试玩、实物彩色/灰度打印、素材许可和正式文案/法律审核完成之前，状态保持 `draft`。
