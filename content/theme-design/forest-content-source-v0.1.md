# Forest H04/C04｜谜题内容源 v0.1

**状态：**内部数据/英文文案与 PDF 排版初稿，尚未真人试玩。依据 [Forest 蓝图](forest.md)制作；`scripts/generate_forest_samples.py` 是本批 PDF 卡片/答案生成真源，修改本稿须同步修改脚本并重生校验。所有角色和地址均为虚构，不涉及真实投递或失窃。两版分别求出不同成果，网站保持 `not_published`。

## H04：The Forest Post Office Mystery

开场：“A rain shower has blurred one paper parcel label. Help Nori the forest post carrier use the postmark and route records to deliver it to the right story character.” 玩家记录批次、路线区域、包裹、收件标记、最终收件人。

| 关 | 玩家卡片与规则 | 唯一结果及用途 |
|---|---|---|
| 1 邮戳 | 任务邮戳为树叶边框、两颗星、星期符号 TUE。包裹批次 A=leaf/one star/TUE/M1；B=**leaf/two stars/TUE/M2**；C=moon/two stars/TUE/M3；D=leaf/two stars/FRI/M4。 | B，`batch=M2`，定位对应路线记录。 |
| 2 记录排序 | M2 纸条 A=`POST OFFICE→BRIDGE`、B=`BRIDGE→MOSS LANE`、C=`MOSS LANE→BLUE TREE`；M1 干扰纸条 D=`POST OFFICE→POND`、E=`POND→NO MAILBOX`。只用上关批次 M2，从邮局出发到有颜色**与文字标签**的树；玩家页打乱为 D/B/E/C/A。 | A-B-C，`district=BLUE TREE`。 |
| 3 分工认包裹 | Carrier 说“用上关地区”；Sorter 说“标签有 **two leaf marks**”；Keeper 说“纸包裹是 **round**”。候选 A=BLUE TREE/one leaf/round/fragment N；B=BLUE TREE/two leaves/square/P；C=**BLUE TREE/two leaves/round/W4**；D=POND/two leaves/round/Q。 | C，获得 `address_fragment=W4`。初稿同页分角色朗读；正式可排独立可裁条。 |
| 4 修地址 | 虚构地图登记：BLUE TREE + W2=FOX DEN；BLUE TREE + **W4=OWL HOUSE**；POND + W4=BEAVER HUT；MOSS LANE + W4=RABBIT GATE。用地区及地址碎片求唯一收件标记。 | `recipient_marker=OWL HOUSE`；为最后投递提供证据。 |
| 5 完成投递 | 候选 A=M2/BLUE TREE/W4/OWL HOUSE；B=M2/BLUE TREE/W4/FOX DEN；C=M2/POND/W4/OWL HOUSE；D=M1/BLUE TREE/W4/OWL HOUSE；E=M2/BLUE TREE/W2/OWL HOUSE。 | A。成人出示 Nori 的回信：“The label is clear again. Your careful record helped this parcel reach the right story home.” |

三级提示（观察→推理→完整）：1 看边框、星数、日符→三项同真→B/M2；2 从 POST OFFICE 首尾接→找真正邮箱终点→A-B-C/BLUE TREE；3 每人读一个条件→求地区/叶数/外形交集→C/W4；4 地图同时查地区与碎片→只有一行满足→OWL HOUSE；5 查四项记录→逐一排错→投递卡 A。跳关补发 M2、BLUE TREE、W4、OWL HOUSE、回信。成人指南规定全部在纸上完成，不需要真实邮件、地址或户外地点。

H04 制品：玩家记录页、邮戳/批次卡、混序路线条、分工包裹线索、虚构地址地图、投递候选与回信；Host Guide 含五关答案、三层提示、跳关、准备与收尾。黑白打印必须能凭邮戳形状、星数和文字区分。

## C04：The Forest Postal Investigators

开场：“Your group is the postal investigation team. One parcel was filed under the wrong label. Make a paper evidence record so it can be delivered kindly.” 每组独立文件袋；Recorder 记录证据来自哪张卡，其他角色分读批次、路线和包裹属性。

| 关 | 小组卡片与规则 | 唯一结果及用途 |
|---|---|---|
| 1 批次范围 | 本组任务为圆形邮戳、三颗点、周三 WED。档案 A=round/three/WED/R7；B=square/three/WED/R8；C=round/two/WED/R9；D=round/three/FRI/R6。 | A，`batch=R7`，过滤记录条。 |
| 2 投递记录 | R7 条 L1=`POST OFFICE→STONE PATH`、L2=`STONE PATH→TREEHOUSE ROW`；R8 干扰条 L3=`POST OFFICE→POND`、L4=`POND→NO ROUTE`。玩家页混序，只使用上关得出的 R7 批次。 | L1-L2，`area=TREEHOUSE ROW`。 |
| 3 组内交换 | Route 角色给上关区域；Label 角色给“两条横纹”；Shape 角色给“圆角”。候选 A=TREEHOUSE ROW/one stripe/round/P1；B=TREEHOUSE ROW/two stripes/square/P2；C=**TREEHOUSE ROW/two stripes/round/P3**；D=POND/two stripes/round/P4。 | 包裹 C，`parcel=P3`；不得让单张角色线索直接给出答案。 |
| 4 地址证据 | 虚构地图：TREEHOUSE ROW+P1=FOX WINDOW；TREEHOUSE ROW+P3=**OWL WINDOW**；POND+P3=OTTER DOOR；STONE PATH+P3=BEAR GATE。 | `recipient=OWL WINDOW`，填证据单。 |
| 5 结论卡 | A=R7/TREEHOUSE ROW/P3/OWL WINDOW；B=R7/TREEHOUSE ROW/P3/FOX WINDOW；C=R7/POND/P3/OWL WINDOW；D=R8/TREEHOUSE ROW/P3/OWL WINDOW；E=R7/TREEHOUSE ROW/P2/OWL WINDOW。 | A。教师用本组记录确认“包裹—收件人—证据”，可请小组解释两个不同来源的条件。 |

三级提示：1 比邮戳三项→只一档全合→A/R7；2 串联 R7 记录→终点有 Row→L1-L2/TREEHOUSE ROW；3 每人读条件→区域/条纹/角形求交→C/P3；4 用 P3 和 Row 同时查表→OWL WINDOW；5 查四格记录→逐项排除→结论 A。跳关补发 R7、TREEHOUSE ROW、P3、OWL WINDOW、教师收尾卡。缺席成员的线索交给现有组员；任何组不需要另一组先完成。

C04 制品：每组邮戳、混序记录、三角色属性、地图、证据单与结论；Teacher Guide 含每组份数、角色合并、答案、三级提示、跳关和复盘。人物、地点不对应任何真实住址或儿童信息。

## 制作和发布门槛

排版时分别输出 Home/Group Player Pack 与 Host/Teacher Guide，均有 A4、US Letter。先自动验唯一答案、线索因果与跳关补件；再做真人试玩、彩色/灰度实物打印和素材/文案/许可复核。任何版本未通过时继续为 `draft`，不推断另一版本也已通过。
