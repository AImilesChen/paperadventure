# Space H03/C03｜谜题内容源 v0.1

**状态：**内部文字/数据与 PDF 排版草稿，尚未真人试玩。依照 [Space 蓝图](space.md)锁定两条独立五关因果链；首关四张图文信号卡已制作，其余纸艺仍需补足。`scripts/generate_space_samples.py` 为本批 PDF 卡片/答案生成真源；修改本稿时须同步修改脚本并重生校验。所有“信号、设备、频率”只存在于纸上故事，不是电子实验。网页继续标记 `not_published`。

## H03：The Lost Space Signal

开场：“Pip the little robot probe has sent a paper signal from somewhere in the story sky. Your team can find the right message, follow the star map and send a pretend reply.” 记录页依次写 signal/sector、map/station、paper device/code、decoded word、probe/evidence。

| 关 | 玩家看到的规则与候选 | 唯一成果及下一关用途 |
|---|---|---|
| 1 有效信号 | 任务卡说“圆形边框、三道波纹、右下角一个方形缺口”。信号 A=圆/两波纹/方缺口/sector VEGA；B=方/三波纹/方缺口/ALTAIR；C=圆/三波纹/方缺口/**ORION**；D=圆/三波纹/无缺口/NOVA。 | 选 C，得到 `sector=ORION`；只检查对应星图区。 |
| 2 星图 | 混序纸条 A=`ORION→BLUE STAR`、B=`BLUE STAR→CRESCENT`、C=`CRESCENT→STATION 7`、D=`ORION→RED STAR`、E=`RED STAR→EMPTY FIELD`。从上关 sector 出发，首尾连接，目标是有编号的 STATION；玩家页以 D/B/E/C/A 排列。 | A-B-C 到 `STATION 7`；成为设备选择的约束。 |
| 3 纸质校准 | Guide 线索：设备必须对应上关站号；Robot 线索：有 **two rings**；Scout 线索：带 **triangle badge**。候选 A=Station 7/one ring/triangle/code 2；B=**Station 7/two rings/triangle/code 6**；C=Station 7/two rings/circle/code 4；D=Station 5/two rings/triangle/code 3。角色可分工朗读，人数不足合并。 | 唯一 B，得到 `code=6` 与解码表入口；不能靠故事插画猜设备。 |
| 4 解读短讯 | 设备编号决定使用哪一行字典。Code 2：SUN=B/MOON=E/STAR=A/PATH=C/RING=H；Code 4：L/I/G/H/T；Code 6：C/O/M/E/T。纸上消息顺序为 SUN/MOON/STAR/PATH/RING；必须使用上关取得的 Code 6 行。 | 得 `word=COMET`；这是确认探测器的字面标记，非现实天文学事实。 |
| 5 恢复联络 | 探测器 A=ORION/Station 7/Code 6/COMET；B=ORION/Station 7/Code 6/MOON；C=ORION/Station 5/Code 6/COMET；D=VEGA/Station 7/Code 6/COMET；E=ORION/Station 7/Code 4/COMET。 | 唯一 A。成人按纸上回传卡回应：“Pip received your message. The team found the true signal by sharing every clue.” |

三级提示（观察→推理→完整解法）：1 看边框/波纹/缺口→三项都要合→C/ORION；2 对齐纸条端点→找带站号的路径→A-B-C/Station 7；3 每个角色读一条件→求 7/two/triangle 交集→B/Code 6；4 按字典逐个替换→保留原顺序→COMET；5 查四个记录→每个候选各有一处差异→A。跳关依次补发 `ORION`、`STATION 7`、`Code 6`、`COMET`、成人结局卡；任何一步失败后续仍可玩。H03 玩家页不得出现最后探测器的成人答案提示。

H03 资料包：封面记录页、五关候选卡/纸星图/角色线索/字典/探测器卡、成人主持指南的准备、答案、提示、跳关与回传。首关四张信号卡同时以圆/方轮廓、可数波纹、右下角方形缺口及印刷文字表示条件，卡 C 唯一满足三项；缺口标志不计作波纹。第三关四张纸设备卡印出站号、可数圆环、徽记轮廓和代码，只有 B 满足三角色联合条件。A4 与 US Letter 独立导出；彩色星图仍必须靠文字、坐标和形状解题。只用纸与笔，不使用真实电器、拆机或上网。

## C03：Restart the Star Station

开场：“Each group is a paper communication crew. Sort a signal, locate your station, choose a pretend device set and submit a clear restart record.” 每组独立完整材料。组内 Reader、Mapper、Decoder、Recorder 可合并或轮换。记录页依次为 signal/station、map/port、device/key、message、report/evidence。

| 关 | 学生看到的规则与候选 | 唯一成果及下一关用途 |
|---|---|---|
| 1 信号/噪声 | 有效信号须是方形边框、两座波峰、一个圆点。A=方/一峰/一点/VEGA；B=圆/两峰/一点/NOVA；C=方/两峰/零点/ORION；D=**方/两峰/一点/LYRA**。 | D，得到 `station=LYRA`。 |
| 2 星图关系 | 纸条 A=`LYRA→NODE B`、B=`NODE B→PORT 4`、C=`LYRA→NODE A`、D=`NODE A→BLANK`，玩家页混序。只能从 LYRA 接到有编号的 PORT。 | A-B，得到 `port=4`，用于设备条件。 |
| 3 合作选设备 | Mapper 持“从星图得到的端口”，Reader 持“two rings”，Checker 持“arrow badge”。候选 A=Port 4/one ring/arrow/key 2-1-4；B=Port 4/two rings/circle/key 4-1-3；C=**Port 4/two rings/arrow/key 3-1-4**；D=Port 2/two rings/arrow/key 3-1-2。 | C，得到 `key=3-1-4`，按此顺序读字母表。 |
| 4 转换消息 | 字典 1=E、2=A、3=S、4=T；按上关设备 key 顺序读取，不能把数字自然排序。 | `message=SET`；组员在回传栏抄写 SET。 |
| 5 记录恢复 | 结论 A=LYRA/Port 4/Kit B/SET；B=**LYRA/Port 4/Kit C/SET**；C=LYRA/Port 2/Kit C/SET；D=VEGA/Port 4/Kit C/SET；E=LYRA/Port 4/Kit C/SAT。 | 唯一 B。填本组纸质恢复记录，教师按指南出示“通信站已恢复”的收尾卡。 |

三级提示（观察→推理→完整解法）：1 比较三个图形属性→三项同真才有效→D/LYRA；2 从 LYRA 首尾接到有号 PORT→NODE A 无端口→A-B/Port 4；3 请三个角色念约束→同时比对 4/two/arrow→Kit C/3-1-4；4 照 key 顺序查表→不要按 1-3-4 排→SET；5 用全部记录排除错误项→特别核对设备 C 与消息 SET→Report B。跳关依次补发 `LYRA`、`Port 4`、`Kit C / 3-1-4`、`SET`、教师收尾卡。组员缺席时教师将角色线索交给现有成员，不让小组等待外组。

C03 资料包：每组一套信号、星图条、三条角色约束、纸质设备/字典、结果单；首关四张信号卡以圆/方轮廓、可数三角峰、独立圆点及文字同时表达条件，卡 D 唯一满足三项。第三关四张纸套件卡以圆环、箭头/圆徽记与文字重复表达端口、环数、徽记和密钥，只有套件 C 满足联合条件。教师指南有按组份数、五关答案、提示/跳关、角色合并、收尾与复盘。不存在真实维修、电子元件、学生账号、成绩采集或跨组同步机制。

## 排版与试玩门槛

先以本内容源生成玩家/组包与单独成人/教师答案包，A4/US Letter 的星图标签、数字与字典需实物可读。自动检查每关唯一答案、后续引用和跳关成果；再让代表性家庭、教师/小组试玩并记录歧义、时长、参与和提示使用。图像权利、灰度打印、文案及商品/许可审核完成前仍是 `draft`。
