"""Private paired C10 wording. No browser imports; diagram facts live in one model."""
from pathlib import Path
import json
from free_game_zh_content import P,text,box,grid,cards,lines,special
E=json.loads((Path(__file__).resolve().parents[1]/'shared/weather-edition.json').read_text(encoding='utf-8'))

def jobs(n,m):
 bundles={2:['R/W/P','O/D/C'],3:['R/P','O/C','D/W'],4:['R/P','O/D','W','C'],5:['R/P','O','D','W','C'],6:['R','O','D','W','C','P']}[n]
 return [bundles[(i-(m-1))%n] for i in range(n)]

def content(locale):
 zh=locale=='zh';T=lambda en,cn:cn if zh else en
 def steps(*v):return text('<br/>'.join(f'{i}. {s}' for i,s in enumerate(v,1)))
 keep=box(T('Before the next handout','领取下一关前'),T('Explain your result using the original tool. Ask the teacher to check it, retain all issued materials and change seat tasks. Later pages stay with the teacher.','用原工具说明结果，请教师核准。保留本组已发材料，再轮换任务；后续页由教师保管。'))
 player=[
 P(E['titles'][locale],T('Weather Observatory / Classroom C10 / teacher-led','气象观测站／课堂版 C10／教师带领'),special('cover'),
  box(T('The display opens at noon','中午展板要开放了'),T('Records from two stations have been mixed up. Three morning instrument readings are missing from the display, and a copied notice needs checking. Sort this station’s records, operate the paper tools and publish a bulletin your crew can support with evidence.','两个观测站的记录混在了一起。展板缺少三个时刻的工具读数，一份抄录公告也需要核对。请筛出本站记录、操作纸上工具，再发布一份有证据的晨间简报。')),
  box(T('Start together','一起开始'),T('2–6 pupils per crew; up to 35 in independent crews. Start with pages 1–3 only. Choose tasks on page 2; keep page 3 on the table. The teacher gives each mission after checking the last one.','每组2至6名学生，最多35人分独立小组。开始只领第1至3页，按第2页分工，第3页留在桌面。每关核准后，教师再发下一关。')),
  text(T('Use ordinary paper, pencil and adult-handled scissors. All data are invented paper observations. Read these records; they do not establish a real forecast. You may point, speak, draw, pause and revise.','只需普通纸、铅笔和由成人操作的剪刀。所有数据都是纸上模拟观测，用来读取和核查，不作为真实天气预报。可以指认、口述、绘图、暂停和修改。'))),
 P(T('Your observatory crew','观测小组与任务轮换'),T('Keep this page whole. The teacher announces each seat’s tasks before each mission.','本页整页保留。每关开始前，教师告知每个座位的任务。'),
  cards([(T('R / SCENE READER','读／场景朗读员'),T('Read the scene and one step. Invite a partner to explain it.','读场景和一个步骤，请伙伴说说要做什么。')),(T('O / TOOL OPERATOR','操／工具操作员'),T('Move, turn or align a tool; let a partner repeat.','移动、旋转或对齐工具，请伙伴再操作一次。')),(T('D / DATA READER','数／读数员'),T('Point to a mark, pattern or top edge and say what it shows.','指向标记、图纹或阴影上沿，说明读到了什么。')),(T('W / RECORDER','记／记录员'),T('Write the agreed result on page 3; record another pupil’s dictation if needed.','在第3页记录商定结果，需要时照伙伴的口述代写。')),(T('C / CHECKER','核／核查员'),T('Repeat the action against the original source before accepting a result.','对照原材料再操作一次，确认结果后再通过。')),(T('P / REPORTER','报／汇报员'),T('Point to evidence during play; share a checked result at the end.','游戏中帮助指出证据，最后汇报核查通过的结果。'))],2,88,cut=False),
  box(T('Combine and rotate','合并分工与轮换'),T('2 pupils: R/W/P and O/D/C. 3: R/P, O/C, D/W. 4: R/P, O/D, W, C. 5: R/P, O, D, W, C. 6: one job each. After missions 1–4, pass each bundle clockwise. The teacher has a seat table. In mission 5, Checker and Recorder must be different pupils.','2人：读/记/报，操/数/核。3人：读/报，操/核，数/记。4人：读/报，操/数，记，核。5人：读/报，操，数，记，核。6人：每人一项。第1至4关后顺时针传递整组任务；教师有座位表。第5关核查员与记录员必须是不同学生。'))),
 P(T('One shared observation board','全程观测记录板'),T('Keep this page whole. Record each original result here once. Retain the source cards.','本页整页保留，每项原始结果只记一次，原卡也保留。'),special('observation-board'),
  box(T('Record in stages','逐关记录'),T('Mission 1: enter source record IDs and times from earliest to latest. Missions 2–4: fill the matching time row. For clouds, shade boxes OR write a fraction out of four. Wind may use N/E/S/W or the matching direction words. Rain is the indicated gauge reading at that time; do not add rows or subtract earlier readings.','第1关：从早到晚填原记录编号和时刻。第2至4关：按时刻填同一行。云覆盖可涂小格或写几/4，任选一种。风向可写东南西北或对应字母。雨量是该时刻示意雨量计的读数，不把各行相加，也不与前一行相减。')),
  text(T('Page 14 keeps the correction evidence. Page 15 is the final bulletin for display; its entries must still trace back to the original tools.','第14页保留纠错依据，第15页是最终展示简报；上面的结果仍须能指回原工具。'))),
 P(T('Mission 1 / sort this station’s records','第1关／整理本站记录'),T('Keep these instructions whole; source records are on page 5.','本页说明不剪；原记录在第5页。'),
  box(T('Read the scene','读场景'),T('Two stations sent notes to the same desk. Our seal has a circle above TWO short bars. Identify our three notes and put them in morning time order. A time label alone does not identify a station.','两个观测站把记录送到同一张桌上。本站印记是圆形下方有两条短横线。请找出本站三张记录，按上午时间先后排列。只看时刻还不能确定属于哪个站。')),
  special('seal-rule'),
  steps(T('Check the seal on every page-5 record. Set the other station’s records aside.','逐张核第5页印记，把其他站的记录放旁边。'),T('Full-cut: arrange the three selected pieces earliest to latest. Low-cut: point to the selected records in that order on the whole sheet.','全剪玩法把选出的三张卡从早到晚摆好；少剪玩法在整页上按先后指认。'),T('Enter each selected record ID and time on page 3. A partner checks the seal, ID and order.','在第3页填所选记录编号与时刻，请伙伴再核印记、编号和先后。')),
  keep),
 P(T('Mission 1 / five original records','第1关／五张原始记录'),T('Full-cut: adult cuts the FIVE outer dashed cards. Low-cut: keep this sheet whole and point. Keep every ID, time and seal intact.','全剪玩法由成人剪五张外框虚线卡；少剪玩法整页指认。每张编号、时刻和印记都要保留。'),special('time-cards'),
  text(T('Keep the selected and rejected records for the final source check. Page 4 holds the instructions.','选中和排除的记录都保留，最后可再次核对。玩法说明保留在第4页。'))),
 P(T('Mission 2 / align, then read wind','第2关／先定位，再读风向'),T('Keep this practice and instruction page whole. This example is separate from the three game cards.','本页练习与说明不剪。示范与三张正式卡分开。'),
  box(T('Read the scene','读场景'),T('The morning times are restored. Each wind card has its own N alignment mark. Turn the WHOLE square on the base so N faces north, then read where the thick pointer tip lies. That is where this pretend wind came FROM.','上午时刻整理好了。每张风向卡都有自己的N定位标记。把整张方卡放到底板上旋转，N对准北，再看粗指针末端所指方向。这表示模拟风从哪里吹来。')),
  steps(T('Match the card centre to the centre of the page-7 base.','把卡中心对准第7页底板中心。'),T('Turn the whole card until its small N faces the base’s north N.','转整张卡，让小N朝向底板的北N。'),T('Follow the thick pointer to a base direction and read the card’s time. Record it in that page-3 row.','沿粗指针找底板方向，再核卡上时刻，记入第3页对应行。')),
  special('wind-practice'),
  text(T('The practice reads E / east: wind came from the east. Its result is not a game-card answer. A partner repeats the alignment before you keep a result.','练习读作东E：风从东边吹来。它不代表正式卡的答案。保留读数前请伙伴重做一次定位。'))),
 P(T('Mission 2 / compass base','第2关／罗盘底板'),T('Do not cut this base or make holes. All four direction labels must remain visible around the card.','底板不剪、不打孔。放卡后，周围四个方向标记应保持可见。'),special('compass-base'),
  box(T('Two marks, two jobs','两种标记，各有用途'),T('The small N is the alignment mark. The thick pointer tip gives the reading after alignment. Keep the card time label visible even if it turns sideways. No pin, glue or transparent overlay is needed.','小N负责定位，对准后再用粗指针末端读数。卡上时刻转成侧向也要保持可见。不需图钉、胶水或透明片。')),
  keep),
 P(T('Mission 2 / three wind cards','第2关／三张风向卡'),T('Adult cuts THREE outer squares in both modes. Keep the printed centre, N mark, time and thick pointer; do not cut out their inner parts.','两种玩法都由成人剪三张外框方卡，保留中心、小N、时刻和粗指针，不剪内部。'),special('wind-cards')),
 P(T('Mission 3 / count covered sky panes','第3关／数清云覆盖格'),T('Keep this task page whole. Original sky views arrive on page 10.','本页任务不剪，原天空图在第10页。'),
  box(T('Read the scene','读场景'),T('Three roof views arrived out of order. Each is divided into FOUR equal panes. Hatching marks cloud-covered panes. Find the time, count the marked panes and record what this paper view shows.','三张屋顶天空图乱序送来了。每张分成四个等大的格子，斜线表示被云覆盖。请核时刻、数覆盖格，再记录纸上看到的结果。')),
  steps(T('Read one card’s time and touch all four panes.','先读一张图的时刻，再依次指四格。'),T('Count hatch-patterned panes, using the pattern on a black-and-white print too.','按斜线图纹数覆盖格，黑白打印也按图纹分辨。'),T('Say how many of four are covered. Shade OR write the count directly on page 3.','说出四格里有几格覆盖，直接在第3页涂格或写几/4，任选一种。'),T('Ask another pupil to recount the same original before the next handout.','下一关前请另一名学生对同一张原图重数。')),
  box(T('What the grid means','四格图表示什么'),T('This records covered panes in an invented paper sky. A shaded pane is not a separate cloud and does not name a real cloud type. Preserve all three original cards for the final check.','这里只记录模拟天空中覆盖了几格。一个斜线格不代表一朵独立的云，也不要求判断真实云的类型。三张原图都保留到最后。')),
  keep),
 P(T('Mission 3 / three original sky views','第3关／三张原始天空图'),T('Full-cut: adult may cut THREE outer cards. Low-cut: keep this sheet whole. Keep each time label and all four panes together.','全剪玩法由成人剪三张外框卡；少剪玩法整页保留。每张的时刻与四个格子不能分开。'),special('sky-cards')),
 P(T('Mission 4 / read original rain strips','第4关／读取原始水位条'),T('Keep this practice page whole. Receive the gauge on page 12 and three strips on page 13. The copied notice stays with the teacher for now.','本页练习不剪。领取第12页纸尺和第13页三条水位条，待核公告暂由教师保管。'),
  box(T('Read the scene','读场景'),T('The display desk has copied the morning readings, but an entry may be wrong. First read ALL THREE original strips yourselves, before seeing that copy. These are gauge readings at the printed times, not hourly increases.','展板抄录过上午数据，但其中可能有错。先在看抄录公告之前，自己读完三张原条。这是标注时刻的示意雨量计读数，不是每小时新增雨量。')),
  steps(T('Keep the strip upright beside the page-12 scale; match BASELINE to 0 mm.','把水位条竖直放在第12页纸尺旁，基准线对准0毫米。'),T('Read the shaded TOP edge across to the printed scale. A strip without shading reads zero.','沿阴影上沿横向找印刷刻度，没有阴影的条读作0。'),T('Record every time’s reading on page 3. A partner realigns each strip and checks.','把每个时刻的读数记入第3页，请伙伴逐条重新对齐核查。'),T('Only after the original readings are checked, ask for page 14 to compare the copied notice.','原始读数核准后，再领取第14页比较抄录公告。')),
  special('rain-practice')),
 P(T('Mission 4 / paper rain gauge','第4关／纸上雨量计'),T('Keep this page whole. The solid placement outline is NOT a cutting line.','本页整页保留，实线摆放框不是裁剪线。'),special('rain-base'),
  box(T('Read the printed scale','按印刷刻度读数'),T('Align the horizontal baseline, then read the shaded top. Do not count decorative lines or measure the paper height with a real millimetre ruler. The printed gauge and strips use the same enlarged scale. Print at 100% Actual size in the same paper size.','先对齐水平基准线，再读阴影上沿。不数装饰线，也不用真实毫米尺量纸面高度。纸尺与水位条使用同一套放大示意刻度，选同一纸型、100%实际大小打印。')),
  text(T('The three readings describe their printed moments. Keep each row separate; the game does not ask for a sum or a difference between times.','三个读数分别描述标注时刻。本游戏不要求把它们相加，也不要求求相邻时刻的差。'))),
 P(T('Mission 4 / three original strips','第4关／三张原始水位条'),T('Adult must cut THREE equal outer cards in BOTH modes. Keep time and baseline. Do not trim the shaded top or change the outer card size.','两种玩法均由成人剪三张等大外框卡，保留时刻与基准线，不沿阴影上沿剪，也不改外框大小。'),special('rain-cards'),
  text(T('Read these originals before the teacher gives page 14. A second pupil repeats all three alignments.','教师发第14页之前，先读这些原条，并由另一名学生重做三次对齐。'))),
 P(T('Mission 4 / check the copied notice','第4关／核对抄录公告'),T('Teacher: give only AFTER all three original readings on page 3 have been checked. Keep this page whole.','教师：第3页三项原始雨量读数全部核准后才发，本页不剪。'),
  box(T('A copy to check','需要核对的抄录件'),T('This is a copied notice, not the original instrument. Compare every row with your recorded original reading; return to the aligned strip if anything disagrees.','这是抄录公告，不是原仪器。把每一行与已记录的原始读数比较，有不一致就回到对齐后的原条核查。')),
  special('copied-notice'),
  steps(T('Circle the incorrect entry on this copy and leave it visible.','在抄录件上圈出错误，保留原来的抄录痕迹。'),T('Record the repair below once. Point to the original strip and scale as support.','在下方记录一次修正，并指出原条及纸尺作为依据。')),
  special('correction'),
  text(T('Keep this correction beside page 3. If your shared board needs repair, check the original first and correct it too. Ask for the next pile after the teacher checks.','本页纠错记录留在第3页旁。总表若需改动，也要先核原条再修正。教师核准后领取下一堆。'))),
 P(T('Mission 5 / author the morning bulletin','第5关／制作晨间观测简报'),T('Use page 3 and the original tools. This is the display version; page 14 already holds the correction record.','根据第3页和原工具填写展示版，第14页已保留纠错记录。'),special('bulletin'),
  lines([T('Our paper observations show','本组纸上观测显示')]),
  box(T('Prepare for another pupil’s check','准备交给另一名学生核查'),T('Write or dictate one statement supported by these observations. Keep it about the recorded morning. Show the page-14 correction, then receive page 16 for the original-source check.','写或口述一句由这些观测支持的总结，内容围绕已记录的上午。展示第14页纠错，再领取第16页核原来源。'))),
 P(T('Mission 5 / check, repair and share','第5关／核查、修正与汇报'),T('The Checker must be a different pupil from the Recorder. Use original tools, not memory. Keep this page whole.','核查员与记录员必须是不同学生。对照原工具核查，不靠记忆，本页不剪。'),special('audit'),
  box(T('If something disagrees','发现不一致时'),T('Leave the box unticked. Both pupils return to the original, repeat the action and repair the recorded result or bulletin. Check again before ticking.','暂不打勾，两人回到原材料重做操作，再修正记录或简报；重新核对后才勾选。')),
  lines([T('Checker seat / Recorder seat','核查员座位号／记录员座位号')]),
  text(T('Show the teacher your bulletin, correction and original evidence. Each pupil reads a row, explains the correction or points to one action they helped with. The teacher reads the closing only after acceptance. Keep the checked bulletin.','把简报、纠错和原证据交教师核准。每人读一行、解释纠错或指出一次自己参与的操作，通过后由教师读结尾，并保留核查后的简报。')))
 ]
 return player,guide(locale)

def guide(locale):
 zh=locale=='zh';T=lambda en,cn:cn if zh else en
 def table(n):
  def convert(x):
   if not zh:return x
   for a,b in [('R','读'),('O','操'),('D','数'),('W','记'),('C','核'),('P','报')]:x=x.replace(a,b)
   return x
  return grid([T('Seat','座位')]+[T(f'M{i}',f'第{i}关') for i in range(1,6)],[[str(i+1)]+[convert(jobs(n,m)[i]) for m in range(1,6)] for i in range(n)],row_height=30)
 stages=[
 (T('Sort this station’s records','整理本站记录'),'4–5',
  T('Two stations sent notes to the same desk. Our seal has a circle above TWO bars. Find our notes and put them in time order.','两个站把记录送到了同一张桌。本站印记是圆形下面两条短横线，请找到本站记录并按时间排序。'),
  T('Keep page 4 whole. Full-cut uses the five page-5 cards; low-cut points to the intact sheet. Have pupils check each seal, arrange or point in order, then record IDs and times once on page 3. Check the rejected records too.','第4页不剪。全剪用第5页五卡，少剪在整页上指认。逐张核印记，排列或按先后指认，再在第3页记一次编号与时刻，排除的卡也要说明。'),
  T('Record IDs 4, 3, 1 at 9:00, 10:00, 11:00. Each chosen seal has two bars. IDs 2 and 5 have one bar. Time alone cannot distinguish the duplicate-time records. Circle shape is common to all cards, so bar count carries the station distinction.','从早到晚为编号4、3、1，对应9:00、10:00、11:00，所选印记均为两条横线。2、5只有一条。重复时刻不能单独区分站点。圆形各卡都有，站点区别来自横线数量。'),
  [T('Which seal is ours?','本站印记是什么？'),T('Compare the seals on records with the same time.','比较同一时刻卡片的印记。'),T('Choose 4, 3, 1 in time order; point to each two-bar seal.','按先后选4、3、1，并逐一指出双横线。')],
  T('Keep every original record. Release 6–8 only after checking page 3.','保留全部原卡，第3页核准后发第6至8页。')),
 (T('Align and read wind','定位并读取风向'),'6–8',
  T('The times are restored. Each snapshot’s N starts in a different direction. Align it before reading the thick pointer.','时刻整理好了。各风向卡的小N起初朝向不同，请先定位，再读粗指针。'),
  T('Use neutral E practice on page 6. Keep base 7 whole and cut only the three outer page-8 squares. Align centres, rotate the WHOLE card so N faces base north, then read the thick tip against a base direction. A second pupil repeats each alignment; record by time on page 3.','先用第6页东E练习。第7页底板不剪，只剪第8页三张外框卡。中心对齐、整卡旋转让N朝北，再按粗指针末端读底板方向；另一名学生重做定位，按时刻记第3页。'),
  T('9:00 W; 10:00 W; 11:00 N. Applying rotation 90° minus original N angle gives pointer angles 180°, 180°, 90°. Accept W/west/westerly and N/north/northerly as came-from directions. The neutral E practice is not one of the game answers.','9:00西W，10:00西W，11:00北N。按90°减原N角度旋转后，指针为180°、180°、90°。西/W/西风、北/N/北风均可，含义是风从该方向吹来。练习东E不属于正式答案。'),
  [T('Which mark must face north first?','先让哪个标记朝北？'),T('Point to both centres and follow the thick tip after rotating.','指出两处中心，转好再沿粗指针读。'),T('By time the readings are W, W, N. Repeat the operation to show why.','按时刻为西、西、北，请重做操作说明。')],
  T('Retain the base and all snapshots. Release 9–10.','保留底板和全部风向卡，发第9至10页。')),
 (T('Count covered sky panes','数清云覆盖格'),'9–10',
  T('Three roof views arrived out of order. Each has four panes. Match times and record the covered panes.','三张屋顶图乱序送来了，每张四格，请核时刻并记录覆盖格。'),
  T('Full-cut uses three page-10 cards; low-cut keeps the sheet whole. Pupils touch all four panes and count hatching, then shade OR write the count directly on page 3. Do not require a duplicate intermediate table. Have a second pupil recount the original.','全剪用第10页三卡，少剪整页保留。逐格指认、数斜线，直接在第3页涂格或写几/4，不再加一张中间抄写表；请另一名学生对原图重数。'),
  T('9:00 1/4; 10:00 2/4; 11:00 3/4. Cards print 10:00, 11:00, 9:00, so match the time labels. Accept equivalent shaded grids or fractions. This counts covered panes, not individual clouds or cloud types.','9:00为1/4，10:00为2/4，11:00为3/4。卡片按10、11、9时印刷，须核时间标签。等价涂格或分数均可；这是覆盖格数，不是独立云朵数量或云型。'),
  [T('How many equal panes does each card have?','每张图有几个等大的格？'),T('Use the hatch pattern and check the time before counting.','按斜线图纹数，先核时刻。'),T('The chronological counts are one, two, three out of four; point to each original.','按先后为四格中的一、二、三格，请指回每张原图。')],
  T('Retain all sky views. Release 11–13; HOLD page 14.','保留天空图，发第11至13页，第14页暂不发。')),
 (T('Read rain, then check the copy','先读雨量，再核抄录'),'11–13, then 14',
  T('The display desk made a copy, but an entry may be wrong. Read all three originals first; only then compare the copied notice.','展板有一份抄录，但可能有错。先读完三张原条，再比较抄录件。'),
  T('Use neutral 2 mm practice on page 11; keep base 12 whole. Both modes cut the three equal outer page-13 cards. Align each baseline horizontally at zero, read shaded TOP and record all three times on page 3. Check those originals BEFORE giving page 14. Then compare every copied row, circle the wrong entry and record one correction with strip and scale evidence.','先用第11页2毫米练习，第12页底板不剪。两种玩法都剪第13页三张等外框卡。基准线水平对零，读阴影上沿，在第3页记完三时刻。原始读数核准后才发第14页，逐行比较、圈出错误，以原条和纸尺作依据记一次修正。'),
  T('Originals by time: 0, 1, 3 mm. The copied 11:00 entry says 1 mm and must become 3 mm. Leave the original wrong entry visible. The blank strip is 0. These are momentary illustrative gauge readings, not hourly additions or a request for arithmetic differences. Do not measure paper heights with a real mm ruler.','按时刻原读数为0、1、3毫米；抄录11:00的1毫米应改为3毫米，保留原错痕。无阴影条为0。这是标注时刻的示意读数，不是每小时增量，不做相邻差值。不要拿真实毫米尺量纸面高度。'),
  [T('Which two lines should be level?','哪两条线应在同一高度？'),T('Read the shaded TOP after matching baseline to zero.','基准线对零后，读阴影上沿。'),T('The originals are 0, 1, 3; repair the copied 11:00 value to 3 mm and show its source.','原读数为0、1、3；把抄录11:00改为3毫米，并指出来源。')],
  T('Keep the originals and page-14 repair. Release page 15 only.','保留原条及第14页纠错，先只发第15页。')),
 (T('Publish a checked bulletin','发布核查后的简报'),'15, then 16',
  T('The display needs a report another person can check. Write it from the original records, then ask a different pupil to audit the sources.','展板需要一份别人能核查的报告。请根据原记录写简报，再由另一名学生核原来源。'),
  T('Page 15 is the publication, so transferring checked results serves the display. After its first draft, release 16. Checker and Recorder must differ; use seat numbers. Each check points to the original marks/tool and relevant time; repairs are rechecked. Existing page-14 evidence supports the correction without copying the repair into another form.','第15页用于正式展示，把核准结果整理成简报有明确用途。初稿完成后再发16页。核查员与记录员须不同，可用座位号；逐项指原图案或工具并核时刻，修正后重查。纠错直接用已有第14页依据，不另抄一遍。'),
  T('All three rows match the original tools: 9:00 W,1/4,0 mm; 10:00 W,2/4,1 mm; 11:00 N,3/4,3 mm. Page 14 supports 11:00 1→3 mm. Accept a factual pupil-authored observation, comparison, dictation or labelled drawing. No fixed sentence or word count; a later real forecast is unsupported. Every pupil contributes once.','三行应与原工具一致：9:00西、1/4、0毫米；10:00西、2/4、1毫米；11:00北、3/4、3毫米。第14页支持11:00由1改3。接受有事实依据的自写观察、比较、口述或标注绘图，不限句式字数。不能据此推断真实的后续天气，每人至少贡献一次。'),
  [T('Which original supports this cell?','这格由哪份原材料支持？'),T('Repeat the tool action if the shared board and bulletin disagree.','总表与简报不一致时，回原工具重做。'),T('Use the adult answer atlas to locate a mismatch, then let the pupils repeat and repair it.','成人用答案表定位差异，再让学生重做并修正。')],
  T('After every source check and any repair pass, read the closing on Guide 19.','所有来源核查和修正通过后，读教师第19页结尾。'))
 ]
 g=[
 P(T('Teacher Guide / start here','教师指南／从这里开始'),T('Adults only. Player 16 pages, Guide 19 pages in either paper size. Keep the answer pages private.','仅供成人。两种纸型均为玩家16页、教师19页，答案页保密。'),
  box(T('The crew’s work','小组会完成什么'),T('Sort source records, align three wind snapshots, count cloud-covered panes, read three paper rain strips, repair a copied entry and publish a peer-checked bulletin. This is an observation-and-evidence activity with fixed printed data.','筛选原记录、定位三张风向卡、数云覆盖格、读三张水位条、修正抄录错误，再发布同伴核查过的简报。这是固定纸上数据的观测与证据活动。')),
  box(T('Prepare before pupils arrive','开始前准备'),T('Choose full-cut or low-cut, stage pages using Guide 3 and prepare the seat tasks on Guide 4–5. Give Player 1–3 only. Read only marked scenes aloud. Operation pages lead to separate adult answer pages; do not display those answers.','先选全剪或少剪，按教师第3页分堆，按第4至5页准备座位任务。开始只发玩家1至3页，只朗读标注的场景。各关操作后另有成人答案页，不展示给学生。')),
  text(T('Plain paper, pencil/eraser and adult-handled scissors suffice. All pieces are included. The invented readings do not establish real weather or a measured classroom duration.','只需普通纸、铅笔橡皮和由成人操作的剪刀，道具都在包内。模拟读数不作为真实天气判断，也不宣称统一实测课堂时长。'))),
 P(T('Print and cutting inventory','打印与裁剪清单'),T('Use one paper size per crew. Single-sided, 100% Actual size, no fit-to-page scaling.','每组选同一纸型，单面、100%实际大小打印，不缩放适应页面。'),
  grid([T('Crews','组数'),T('Player sheets','玩家纸张'),T('With one guide','另印一份指南')],[[T('1 crew','1组'),'16','16+19=35'],[T('6 crews /35 pupils','6组／35人'),'6×16=96','96+19=115'],[T('7 crews /35 pupils','7组／35人'),'7×16=112','112+19=131']],ratios=[.26,.32,.42],row_height=38),
  box(T('Low-cut / SIX pieces per crew','少剪／每组6件'),T('The three wind squares on Player 8 and three rain cards on Player 13 MUST be cut separately by an adult in both modes. Time sheet 5 and sky sheet 10 stay whole for pointing. Six crews need 36 pieces; seven crews 42.','两种玩法均须由成人分别剪玩家第8页三张风向卡及第13页三张水位卡。少剪时第5页记录卡和第10页天空图整页指认。6组需36件，7组42件。')),
  box(T('Full-cut / FOURTEEN pieces per crew','全剪／每组14件'),T('Also cut the five page-5 time records and three page-10 sky cards: 5+3+3+3=14. Six crews need 84 pieces; seven crews 98. Only outer card borders are cut; keep IDs, times, N marks and baselines inside.','另剪第5页五张记录卡、第10页三张天空卡：5+3+3+3=14。6组需84件，7组98件。只剪卡外框，编号、时刻、小N和基准线均留在卡内。')),
  text(T('Roles, shared board, instructions, demos, compass, gauge, copied notice, bulletin and audit remain whole. Solid placement outlines are not cut lines. The guide may be read on screen.','角色、总表、说明、示范、罗盘、纸尺、抄录件、简报与核查页保持整页。实线摆放框不是裁剪线；教师指南也可在屏幕阅读。'))),
 P(T('Stage and retain the evidence','分堆发放与保留证据'),T('Keep later piles and this guide with the teacher. Each crew has its own complete materials.','后续堆与本指南由教师保管，每组独立一整套材料。'),
  grid([T('Stage','阶段'),T('Give Player','发玩家'),T('Retain / condition','保留／条件')],[[T('Start','开始'),'1–3',T('Roles and shared board whole','角色和总表整页')],['1','4–5',T('Instructions and all five source records','说明及全部五张原记录')],['2','6–8',T('Practice, whole base, three wind cards','练习、整页底板、三张风向卡')],['3','9–10',T('Instructions and three sky views','说明和三张天空图')],['4a','11–13',T('Read/check all three originals before 14','三项原始雨量读完核准才发14')],['4b','14',T('Original mistake plus evidenced repair','原错痕及有依据的修正')],['5a','15',T('Write the first bulletin draft','先完成简报初稿')],['5b','16',T('Distinct checker, source audit, recheck','另一学生核来源，修正后重查')]],ratios=[.16,.23,.61],row_height=39),
  text(T('Accept evidence before the next pile and announce the next seat tasks. All issued originals stay accessible, including rejected records. No crew waits for a clue held by another crew.','核准证据后再发下一堆，并告知新座位任务。已发原材料始终可查，包括被排除的记录。无需等待其他组持有的线索。'))),
 P(T('Seat tasks /2–4 pupils','座位任务／2至4人'),T('R/O/D/W/C/P = Reader/Operator/Data reader/Writer/Checker/Reporter. Announce full job names to pupils.','读/操/数/记/核/报对应玩家第2页六种角色，教师向学生说明全称。'),
  text(T('2 pupils: swap the two bundles after each of missions 1–4.','2人：第1至4关后交换两组任务。')),table(2),text(T('3 pupils: pass bundles clockwise.','3人：整组任务顺时针传递。')),table(3),text(T('4 pupils: pass bundles clockwise.','4人：整组任务顺时针传递。')),table(4)),
 P(T('Seat tasks /5–6 pupils','座位任务／5至6人'),T('Pass each entire bundle clockwise after missions 1–4. Checker and Recorder differ in the final mission.','第1至4关后整组任务顺时针传递，最终核查员与记录员须不同。'),
  text(T('5 pupils: one combined Reader/Reporter bundle.','5人：一组兼任朗读与汇报。')),table(5),text(T('6 pupils: one job per pupil.','6人：每人一项任务。')),table(6),
  box(T('35 pupils','35人整班'),T('Use five crews of six plus one of five, or seven crews of five. Each has a complete Player Pack. Give the current scene to all, let crews work independently and check their evidence before their next pile.','可分五个6人组加一个5人组，或七个5人组。每组独立一套玩家材料。共同听当前场景，之后独立操作；各组证据核准后再发其下一堆。'))),
 P(T('Opening and teaching rhythm','开场与主持节奏'),T('Read scenes aloud; adult answers and answer atlas stay private.','可照读场景，成人答案和答案总表保密。'),
  box(T('Opening / read aloud','开场／可照读'),T('The school display opens at noon. Our paper observatory has mixed station records and missing morning readings. You will sort, turn, count and align the original paper tools, check a copied notice, and publish a report someone else can verify. Ask, pause and repair as needed.','中午学校展板要开放了。纸上观测站的记录混在一起，上午读数还没整理好。请用原材料筛选、旋转、数格和对齐，再核一份抄录件，发布别人能复核的报告。可以提问、暂停和修正。')),
  box(T('One accepted mission at a time','逐关核准'),T('Read the scene, give only that pile, allow an attempt and ask for original evidence. Give one hint then allow a retry. Level 3 gives explicit help; acknowledge assistance without elimination. A correct number without the required source action needs a demonstration before handover.','读场景、发当前堆、让学生尝试，再请其指原依据。每次只给一条提示并允许重试。第三级提供明确帮助，如实标记协助，不淘汰学生。即使数字正确，也要演示所需来源操作后再交接。')),
  box(T('Use the words consistently','统一术语'),T('Wind FROM is the came-from direction; N aligns the card. Clouds count covered panes out of four. Rain is the illustrative gauge reading at the labelled moment, not an hourly increment. Reporting those observations does not establish a real future forecast.','风的来向指从哪里吹来，小N用于定位。云按四格里的覆盖格计数。雨量是标注时刻的示意计读数，不是每小时增量。报告这些观测不等于预测真实后续天气。')))
 ]
 for n,(title,give,scene,action,answer,hints,handover) in enumerate(stages,1):
  g.append(P(T(f'Mission {n} / teacher actions',f'第{n}关／教师操作'),title,
   box(T('Prepare and give','准备与发放'),T('Player pages '+give+'. Keep later pages private.','玩家第'+give.replace(', then ','页，再发第')+'页，后续页保密。')),
   box(T('Read this scene aloud','场景／可照读'),scene),box(T('Guide the action','引导操作'),action),
   box(T('Everyone contributes','每人有贡献'),T('Invite reading, pointing, moving, aligning, explaining or dictation. The next page is adult acceptance and graduated help; do not show it to pupils.','邀请朗读、指认、移动、对齐、解释或口述。下一页是成人核对与分级帮助，不展示给学生。'))))
  g.append(P(T(f'Mission {n} / adult reference',f'第{n}关／成人核对'),T('Use after the crew attempts the task. Keep answers private.','小组先尝试，成人再使用本页；答案保密。'),
   box(T('Acceptance and explanation','通过标准与说明'),answer),
   box(T('Graduated hints /3 is explicit help','分级提示／第三级为明确帮助'),'<br/>'.join(f'{i}. {v}' for i,v in enumerate(hints,1))),
   box(T('Keep and hand over','保留与交接'),handover)))
 g += [
 P(T('Host quick reference /no answers','主持速查／不含答案'),T('Use after preparation. Keep result values on the original tools and private answer pages.','完成准备后使用，具体数值留在原工具和成人答案页。'),
  *[box(T(f'{i} / ','第'+str(i)+'关／')+title,T('Give Player '+give+'. Check the action against original evidence; private acceptance: Guide '+str(6+i*2)+'. Follow its handover.','发玩家第'+give.replace(', then ','页，再发第')+'页，按原证据核查操作。成人通过标准见教师第'+str(6+i*2)+'页，再按该页要求交接。')) for i,(title,give,*_) in enumerate(stages,1)]),
 P(T('Support, pause and recheck','帮助、暂停与重查'),T('Keep the same evidence requirements in both cutting modes.','两种裁剪玩法使用相同证据标准。'),
  box(T('Reading and tool support','朗读与工具支持'),T('Read one instruction at a time. Pupils may point or dictate while a partner records. For wind, hold a finger at the centre while rotating the card; use no pin. For rain, align baselines and trace horizontally from the shaded top. For sky, point to each of four panes. The checker may repeat the action.','一次读一个步骤，可由伙伴照学生意思代写。风向可用手指按中心旋转，不需图钉；雨量先对基准线，再从阴影上沿横向指刻度；天空图逐一点四格。核查员可重做操作。')),
  box(T('If a piece is missing or time runs out','丢件或暂停时'),T('Store issued originals and page 3 by crew; keep unopened piles with the adult. Reprint the labelled page for a missing piece, not a new clue. Resume the current unfinished action. Do not give the copied notice before all three original rain readings are checked.','按组保存已发原材料与第3页，未发堆留成人处。丢件补印对应标注页，不新编线索。从未完成操作继续；三项原始雨量未核准前仍不发抄录公告。')),
  box(T('Repair, then check again','修正后再核准'),T('Return to the original source when values disagree. Repeat the alignment/count, correct the student record and bulletin as needed, and recheck before ticking. Keep the copied error and repair on page 14. Older pupils may explain why a duplicate-time slip or N marker alone is insufficient.','有差异就回原来源，重做定位或计数，按需要修正学生记录及简报，重查后才打勾。第14页保留抄录错痕和修正。高年级可解释重复时刻或小N本身为什么不能单独作答案。'))),
 P(T('Closing and reset','结尾与重置'),T('Read the closing only after the original-source audit passes.','原来源核查通过后才读结尾。'),
  box(T('Closing / read aloud','结尾／可照读'),T('The observatory display can open. You restored the station records, aligned a direction tool, counted covered sky panes, read a paper gauge and repaired a copied entry. Your bulletin can be trusted because another person checked its original evidence. Thank you for observing and helping one another.','观测站展板可以开放了。你们整理本站记录、定位风向工具、数天空覆盖格、读纸上雨量计，还修正了抄录错误。简报能接受核查，因为另一位伙伴查过原始依据。谢谢大家认真观察、互相帮助。')),
  box(T('One contribution from each pupil','每人指出一次贡献'),T('Each pupil reads a checked row, demonstrates a tool action, points to a source, explains a correction or states an observation. Accept dictation and labelled drawings; do not rank by spelling, handwriting or speed.','每人读一行、演示一次工具操作、指出一个来源、解释纠错或说一句观察。接受口述与标注绘图，不按拼写、字迹或速度排名。')),
  box(T('Retain and replay','保留与重玩'),T('Display the checked bulletin if desired. Count 6 loose pieces in low-cut or 14 in full-cut mode. Keep every instruction, role page, board and base whole. Reprint blank task pages for another session and swap jobs. The readings stay fixed; it is a new attempt, not a newly generated mystery.','可展示核准后的简报。少剪核6件，全剪核14件；说明、角色、总表与底板保持完整。再次使用时补印空白任务页并换工，读数固定，重玩是换角色尝试，不是新生成谜题。')))
 ]
 assert len(g)==19
 return g

