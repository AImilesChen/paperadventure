// Worker-compatible vector PDF renderer for the second custom pack format.
// All shapes are generated from checked data; model output is never PDF syntax.
const encoder=new TextEncoder();
const clean=value=>String(value??'').normalize('NFKD').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')
  .replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7e]/g,' ').replace(/\s+/g,' ').trim();
const escape=value=>clean(value).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
const wrap=(value,max=72)=>{
  const lines=[];let line='';
  for(const word of clean(value).split(' ')){
    if(line && `${line} ${word}`.length>max){lines.push(line);line=word;}
    else line=line?`${line} ${word}`:word;
  }
  if(line) lines.push(line);
  return lines;
};

function makePage(width,height,label){
  const commands=['1 1 1 rg 0 0 '+width+' '+height+' re f'];
  const text=(value,x,y,size=11,bold=false,color='0.08 0.19 0.31')=>{
    commands.push(`${color} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escape(value)}) Tj ET`);
  };
  const block=(value,x,y,max=72,size=11,leading=17,bold=false)=>{
    for(const line of wrap(value,max)){text(line,x,y,size,bold);y-=leading;}
    return y;
  };
  const box=(x,y,w,h,fill='1 1 1',stroke='0.64 0.76 0.82')=>{
    commands.push(`${fill} rg ${x} ${y} ${w} ${h} re f ${stroke} RG 1 w ${x} ${y} ${w} ${h} re S`);
  };
  const rule=(x1,y1,x2,y2,color='0.64 0.76 0.82')=>commands.push(`${color} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const circle=(x,y,r,fill='1 1 1',stroke='0.08 0.19 0.31')=>{
    const c=.55228475*r;
    commands.push(`${fill} rg ${stroke} RG 1.4 w ${x+r} ${y} m ${x+r} ${y+c} ${x+c} ${y+r} ${x} ${y+r} c ${x-c} ${y+r} ${x-r} ${y+c} ${x-r} ${y} c ${x-r} ${y-c} ${x-c} ${y-r} ${x} ${y-r} c ${x+c} ${y-r} ${x+r} ${y-c} ${x+r} ${y} c B`);
  };
  const star=(x,y,r)=>{
    const points=Array.from({length:10},(_,index)=>{const angle=-Math.PI/2+index*Math.PI/5,rad=index%2?r*.44:r;return [x+Math.cos(angle)*rad,y+Math.sin(angle)*rad];});
    commands.push(`0.08 0.19 0.31 RG 1.6 w ${points.map(([px,py],index)=>`${px.toFixed(1)} ${py.toFixed(1)} ${index?'l':'m'}`).join(' ')} h S`);
  };
  commands.push(`0.88 0.95 0.98 rg 0 ${height-42} ${width} 42 re f`);
  text('PAPER ADVENTURE / CUSTOM PAPER GAME',48,height-25,9,true);
  rule(48,45,width-48,45);
  text(label,48,30,8);
  return {commands,text,block,box,rule,circle,star,width,height};
}

function heading(page,kicker,title){
  const top=page.height-77;
  page.text(kicker.toUpperCase(),48,top,9,true,'0.77 0.19 0.13');
  return page.block(title,48,top-33,42,22,29,true)-10;
}

const kindLabel={evidence_cards:'Evidence cards',order_tiles:'Order tiles',symbol_key:'Symbol key',route_board:'Route board',decision_record:'Decision record'};

function cover(story,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,'Player Pack / Start');
  const compact=spec.paper==='Letter';
  let y=heading(page,'A game to print and play',story.title);
  y=page.block(story.introduction,48,y,75,11,18)-(compact?13:20);
  page.text('YOUR MISSION',48,y,12,true);y-=compact?20:23;
  y=page.block(spec.plan.goal,48,y,75,11,18)-(compact?12:15);
  if(spec.packContractVersion===1)y=page.block('Collect one result digit at each of the first four checkpoints. Keep your sheets: all four digits are needed to choose the final story action.',48,y,75,11,18)-(compact?12:15);
  page.text('PLAY AS A TEAM',48,y,12,true);y-=compact?20:23;
  y=page.block(spec.plan.roles,48,y,75,11,18)-(compact?14:20);
  page.text('FIVE PAPER CHECKPOINTS',48,y,12,true);y-=compact?19:22;
  const checkpointLines=story.stages.map(stage=>`${stage.number}. ${stage.title} - ${kindLabel[stage.material.type]}`);
  const minY=compact?128:145;
  const oneColumnBottom=y-checkpointLines.reduce((height,label)=>height+wrap(label,70).length*16+(compact?9:12),0);
  if(spec.packExperienceVersion>=2&&oneColumnBottom<minY){
    const columnX=[56,Math.round(page.width/2)+5],columnBottom=[y,y];
    checkpointLines.forEach((label,index)=>{
      const column=index<3?0:1;
      columnBottom[column]=page.block(label,columnX[column],columnBottom[column],38,10,14,true)-11;
    });
    y=Math.min(...columnBottom);
  }else for(const label of checkpointLines)y=page.block(label,56,y,70,11,16,true)-(compact?9:12);
  if(y<minY)throw new Error('The opening, roles and checkpoint list do not fit the cover.');
  page.box(48,compact?55:65,page.width-96,60,'0.93 0.97 0.99');
  page.block('Print single-sided. Use pencils. An adult holds the guide and releases one checkpoint at a time. Cards and tiles may be cut by an adult, or used whole by pointing and writing.',60,compact?95:105,77,9,14);
  return page;
}

function challenge(stage,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Player Pack / Checkpoint ${stage.number} / Challenge`);
  let y=heading(page,`Checkpoint ${stage.number} of 5`,stage.title);
  if(stage.storyContext)y=page.block(stage.storyContext,48,y,75,11,16)-14;
  const gap=10,col=(page.width-96-gap)/2;
  const panelHeight=Math.max(117,Math.max(wrap(stage.task,33).length,wrap(stage.teamwork,33).length)*16+53);
  page.box(48,y-panelHeight,col,panelHeight,'0.93 0.97 0.99');
  page.box(48+col+gap,y-panelHeight,col,panelHeight,'0.93 0.97 0.99');
  page.text('YOUR TASK',60,y-20,10,true);
  page.block(stage.task,60,y-39,33,11,16);
  page.text('WORK TOGETHER',60+col+gap,y-20,10,true);
  page.block(stage.teamwork,60+col+gap,y-39,33,11,16);
  y-=panelHeight+20;
  page.text('READ THE CLUE AND USE THE NEXT MATERIAL SHEET',48,y,11,true);y-=24;
  y=page.block(stage.clue,48,y,78,11,18)-17;
  for(let i=0;i<stage.options.length;i++){
    const option=stage.options[i],display=`${String.fromCharCode(65+i)}. ${option}`,lines=wrap(display,70),height=Math.max(42,lines.length*16+17);
    page.box(48,y-height,page.width-96,height,'0.97 0.99 1');
    page.block(display,60,y-17,70,11,16);
    y-=height+9;
  }
  if(y<120)throw new Error(`Checkpoint ${stage.number} challenge exceeds the printable page`);
  page.text('OUR CHOICE AND EVIDENCE:',48,y-25,10,true);
  page.rule(48,y-48,page.width-48,y-48);
  if(y>=205){
    const proofLabel=stage.number===5?'THE FOUR SAVED RESULTS THAT SUPPORT OUR CHOICE:':stage.material?.type==='order_tiles'?'THE PRINTED ORDER RULES THAT SUPPORT OUR CHOICE:':stage.material?.type==='symbol_key'?'THE KEY ROWS THAT SUPPORT OUR CHOICE:':stage.material?.type==='route_board'?'THE TWO ROUTE LINKS THAT SUPPORT OUR CHOICE:':stage.material?.type==='decision_record'?'THE WITNESS FACTS THAT SUPPORT OUR CHOICE:':'TWO PRINTED FACTS THAT SUPPORT OUR CHOICE:';
    page.text(proofLabel,48,y-82,10,true);
    page.rule(48,y-111,page.width-48,y-111);
    page.rule(48,y-143,page.width-48,y-143);
  }
  return page;
}

function materialSheet(stage,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Player Pack / Checkpoint ${stage.number} / Paper material`);
  const material=stage.material;
  let y=heading(page,`${kindLabel[material.type]} / checkpoint ${stage.number}`,material.title);
  y=page.block(material.instruction,48,y,77,11,18)-18;
  if(['evidence_cards','order_tiles'].includes(material.type)){
    page.text('ADULT-CUT OPTION: CUT THE OUTER BOXES, OR KEEP THIS PAGE WHOLE.',48,y,8,true);
    y-=22;
  }
  page.text('PRINTED PIECES',48,y,11,true);y-=20;
  const items=material.items;
  if(material.type==='route_board'&&material.logic?.experienceVersion>=2){
    const top=y,graphBottom=top-330;
    if(graphBottom<180)throw new Error(`Checkpoint ${stage.number} route map does not fit.`);
    page.box(48,graphBottom,page.width-96,330,'0.97 0.99 1');
    const startX=89,midX=Math.round(page.width/2),endX=page.width-89,center=top-165;
    page.circle(startX,center,18);page.circle(endX,center,18);
    page.text('START',startX-19,center-32,8,true);page.text('END',endX-10,center-32,8,true);
    for(const [index,item] of items.slice(0,3).entries()){
      const pointY=top-61-index*103;
      const match=item.detail.match(/First link: (OPEN|CLOSED)\. Second link: (OPEN|CLOSED)\. Digit: ([1-3])\./);
      if(!match)throw new Error(`Checkpoint ${stage.number} route links are incomplete.`);
      page.rule(startX+18,center,midX-22,pointY,match[1]==='OPEN'?'0.08 0.39 0.57':'0.77 0.19 0.13');
      page.rule(midX+22,pointY,endX-18,center,match[2]==='OPEN'?'0.08 0.39 0.57':'0.77 0.19 0.13');
      page.circle(midX,pointY,19);
      page.text(item.label,midX-44,pointY+26,9,true);
      page.text(`LINK 1 ${match[1]}`,startX+35,pointY+12,8,true);
      page.text(`LINK 2 ${match[2]}`,endX-98,pointY+12,8,true);
      page.text(`DIGIT ${match[3]}`,midX-20,pointY-36,8,true);
      if(match[1]==='CLOSED')page.text('X',Math.round((startX+midX)/2),Math.round((center+pointY)/2),18,true,'0.77 0.19 0.13');
      if(match[2]==='CLOSED')page.text('X',Math.round((endX+midX)/2),Math.round((center+pointY)/2),18,true,'0.77 0.19 0.13');
    }
    y=page.block(items[3].detail,48,graphBottom-24,76,10,15)-14;
  }else if(material.type==='route_board'){
    const routeCount=material.logic?.contractVersion===1?3:items.length;
    const routeHeight=Math.min(110,Math.floor((y-178-(material.logic?.contractVersion?73:0))/routeCount)-8);
    if(routeHeight<80)throw new Error(`Checkpoint ${stage.number} route rows do not fit.`);
    for(const [index,item] of items.entries()){
      if(material.logic?.contractVersion===1&&index===3){
        page.box(48,y-65,page.width-96,65,'0.93 0.97 0.99');
        page.text(item.label,60,y-19,11,true);page.block(item.detail,60,y-38,70,11,16);y-=73;continue;
      }
      const h=routeHeight;
      page.box(48,y-h,page.width-96,h,'0.97 0.99 1');
      page.text('START',60,y-23,8,true);
      page.text(item.label,130,y-23,11,true);
      page.text('END',page.width-82,y-23,8,true);
      page.rule(60,y-38,page.width-60,y-38,'0.77 0.19 0.13');
      page.block(item.detail,60,y-52,70,11,15);
      y-=h+8;
    }
  } else if(material.type==='symbol_key' || material.type==='decision_record'){
    const rowHeight=Math.min(110,Math.floor((y-178)/items.length)-7);
    if(rowHeight<65)throw new Error(`Checkpoint ${stage.number} record rows do not fit.`);
    for(const [index,item] of items.entries()){
      const h=rowHeight;
      page.box(48,y-h,page.width-96,h,'0.97 0.99 1');
      if(material.type==='decision_record'&&(!material.logic?.contractVersion||index<3))page.box(60,y-28,13,13);
      page.text(item.label,material.type==='decision_record'?83:61,y-24,11,true);
      page.block(item.detail,material.type==='decision_record'?83:61,y-39,63,11,15);
      y-=h+7;
    }
  } else {
    const gap=10,col=(page.width-96-gap)/2;
    const rows=Math.ceil(items.length/2),h=Math.min(170,Math.floor((y-165-(rows-1)*gap)/rows));
    items.forEach((item,index)=>{
      const x=48+(index%2)*(col+gap),top=y-Math.floor(index/2)*(h+gap);
      page.box(x,top-h,col,h,'0.97 0.99 1');
      const labelBottom=page.block(item.label,x+12,top-22,30,11,16,true);
      page.rule(x+12,labelBottom+8,x+col-12,labelBottom+8);
      if(material.type==='evidence_cards'&&index<3&&material.logic?.version===1&&!material.logic?.contractVersion){
        page.circle(x+31,top-76,14,index===2?'0.85 0.24 0.17':'0.20 0.48 0.70');
        if(index===0)page.circle(x+93,top-76,14,'1 1 1');
        else page.star(x+93,top-76,15);
        page.text('MARK',x+12,top-108,7,true);page.text('SEAL',x+73,top-108,7,true);
        page.block(item.detail,x+12,top-128,32,9,14);
      } else if(material.type==='order_tiles'&&material.logic?.version===1){
        page.circle(x+25,top-94,15);
        page.text('?',x+21,top-99,13,true);
        page.block(item.detail,x+52,top-82,24,11,16);
      } else page.block(item.detail,x+12,labelBottom-9,29,11,16);
    });
  }
  page.box(48,58,page.width-96,108,'0.93 0.97 0.99');
  page.text('RECORD YOUR RESULT',60,143,10,true);
  page.block(material.recordPrompt,60,125,70,11,16);
  page.rule(60,98,page.width-60,98);
  page.rule(60,72,page.width-60,72);
  return page;
}

function guideStart(story,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,'Adult guide / Preparation');
  let y=heading(page,'Keep this guide with the adult',story.title);
  if(spec.packExperienceVersion>=2){
    // US Letter gives this page 50 fewer points than A4. Keep the full host
    // instructions and tighten only their spacing on the shorter sheet.
    const compact=spec.paper==='Letter';
    const sections=[
      ['THE MISSION',spec.plan.goal],
      ...(story.spine?[['THE PROBLEM TO SOLVE',story.spine.problem]]:[]),
      ['PRINT AND PREPARE',`${spec.setting==='classroom'?`Print ${spec.groups} complete Player sets, one per crew.`:`Print one complete Player Pack for ${spec.players} players.`} Use ${spec.paper} paper and pencils. Keep this guide and the ending page private. Cutting cards or tiles is optional; pointing and writing always work.`],
      ['RELEASE THE PAGES','Start with Player pages 2-3. After each correct result, release only the next challenge and material pair: 4-5, 6-7, 8-9, then 10-11. Give out Player page 12 only after the final answer is checked.'],
      ['FOUR JOBS','Reader reads the clue aloud. Paper Handler points to or arranges pieces. Checker tests the printed rule and explains why another choice fails. Recorder writes the choice and its result digit. Rotate jobs after each checkpoint.'],
      ['IF THE TEAM GETS STUCK','Ask them to show which printed fact supports their choice. Use Hint 1, then Hint 2 on the checkpoint guide page. Let them change their answer. Give the adult answer only after they have tried the materials.'],
      ['SUCCESS CHECK','The first four checkpoint digits must be recorded in order. Check each answer and digit before moving on. The fifth checkpoint combines all four digits; it does not give a new digit.'],
    ];
    for(const [label,value] of sections){
      page.text(label,48,y,compact?9:10,true,'0.77 0.19 0.13');y-=compact?15:18;
      y=page.block(value,48,y,compact?84:77,compact?9:10,compact?13:16)-(compact?8:14);
    }
    const quickChecks=story.stages.map(stage=>`Checkpoint ${stage.number}: answer ${String.fromCharCode(65+stage.answerIndex)}${stage.number<5?`; save digit ${stage.material.logic.resultDigit}`:'; combine the four saved digits'}`);
    const quickHeight=20+quickChecks.reduce((height,line)=>height+wrap(line,77).length*12+2,0);
    if(y-quickHeight>=68){
      page.text('HOST CHECKLIST - KEEP PRIVATE',48,y,10,true,'0.77 0.19 0.13');y-=18;
      for(const line of quickChecks)y=page.block(line,48,y,77,10,12)-2;
    }
    if(y<68)throw new Error('Adult preparation guide does not fit.');
    return page;
  }
  y=page.block(spec.plan.preparation,48,y,78,11,18)-22;
  page.text('BEFORE PLAY',48,y,12,true);y-=24;
  y=page.block(`${spec.setting==='classroom'?`Print ${spec.groups} complete Player sets, one per crew.`:`Print one Player Pack for your ${spec.players} players.`} Paper size: ${spec.paper}. Use pencils. An adult may cut cards or tiles before play, or leave every sheet whole and let children point and write. Release each challenge and its material sheet only after checking the previous result.`,48,y,77,11,18)-22;
  page.text('HOW TO GUIDE',48,y,12,true);y-=24;
  y=page.block('The five checkpoint sheets contain the players\' clues and paper pieces. Keep the answers and Player page 12 private until the ending. Hand out the first challenge and material on Player pages 2-3. Check the choice and saved result digit before handing out the next pair. If the team is stuck, use the gentle hint before revealing the answer.',48,y,77,11,18)-20;
  if(spec.setting==='classroom')page.block(`Prepare ${spec.groups} complete Player sets, one per crew. ${story.groupInstructions||''} Each crew keeps its own four result digits.`,48,y,77,11,18);
  return page;
}

function wrongChoiceNotes(stage){
  const correct=stage.options[stage.answerIndex];
  const type=stage.material.type;
  const items=stage.material.items;
  const notes=[];
  for(const [index,option] of stage.options.entries()){
    if(index===stage.answerIndex)continue;
    const marker=String.fromCharCode(65+index);
    let reason='Compare this choice against every printed rule.';
    if(stage.number===5){
      const expected=correct.match(/\/ ([1-3]{4})$/)?.[1],found=option.match(/\/ ([1-3]{4})$/)?.[1];
      const at=expected&&found?[...expected].findIndex((digit,i)=>digit!==found[i]):-1;
      if(at>=0)reason=`Its code differs from saved checkpoint ${at+1}.`;
    }else if(type==='route_board'){
      const item=items.find(piece=>piece.label===option);
      const closed=item?.detail.match(/(First|Second) link: CLOSED/);
      if(closed)reason=`The ${closed[1].toLowerCase()} link is CLOSED, so the path cannot reach END.`;
    }else if(type==='evidence_cards'||type==='decision_record'){
      const item=items.find(piece=>piece.label===option);
      const missing=item?.detail.match(/([A-Za-z][A-Za-z ]+): NO\./);
      if(missing)reason=`The printed ${missing[1].trim()} property is NO, but the rule requires YES.`;
    }else if(type==='symbol_key'){
      const expected=correct.replace(/ \/ digit [1-3]$/,''),found=option.replace(/ \/ digit [1-3]$/,'');
      const at=[...expected].findIndex((letter,i)=>letter!==found[i]);
      if(at>=0)reason=`Letter ${at+1} disagrees with key row ${at+1}.`;
    }else if(type==='order_tiles'){
      const expected=correct.replace(/ \/ digit [1-3]$/,'').split(' > '),found=option.replace(/ \/ digit [1-3]$/,'').split(' > ');
      const at=expected.findIndex((label,i)=>label!==found[i]);
      if(at>=0)reason=`The step at position ${at+1} disagrees with the printed order rules.`;
    }
    notes.push(`${marker}: ${reason}`);
  }
  return `Let the team compare and correct its answer. ${notes.join(' ')}`;
}

function guideStage(stage,spec,story){
  let page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Adult guide / Checkpoint ${stage.number}`);
  const pages=[page];
  let y=heading(page,`Guide / checkpoint ${stage.number}`,stage.title);
  if(spec.packExperienceVersion>=2){
    const option=stage.options[stage.answerIndex];
    const prompt=stage.number===5?'Do all four saved digits match this action in order?':stage.material.type==='order_tiles'?'Which printed before/after rule fixes the first and last step?':stage.material.type==='symbol_key'?'What letter does each row of the key give?':stage.material.type==='route_board'?'Can you trace both links without crossing a CLOSED mark?':stage.material.type==='decision_record'?'Which candidate satisfies both witness properties?':'Which piece satisfies both parts of the printed rule?';
    const sections=[
      ['STORY BEFORE THIS CHECK',stage.storyContext||`The team reaches checkpoint ${stage.number}. The mission is still open.`],
      ['HAND OUT',`Player pages ${stage.number*2}-${stage.number*2+1}: the challenge and ${kindLabel[stage.material.type].toLowerCase()} sheet. Keep all later pages and this answer private.`],
      ['RUN THE PAPER ACTION',`${stage.material.instruction} Ask each player to explain one printed fact before the team records a choice.`],
      ['HINT 1 - REDIRECT',prompt],
      ['HINT 2 - NARROW THE CHECK',stage.hint],
      ['CHECK THE ANSWER',`Correct choice: ${String.fromCharCode(65+stage.answerIndex)}. ${option}. ${stage.explanation}`],
      ...(stage.material.logic?.resultDigit?[['RECORD BEFORE CONTINUING',`The team must save result digit ${stage.material.logic.resultDigit} on its material sheet. Keep that sheet for checkpoint 5.`]]:[]),
      ...(story.spine&&stage.number<5?[['WHY THIS FINDING MATTERS',`After checking the answer, share this story link: ${story.spine.links[stage.number-1].reason}`]]:[]),
      ['IF THEY CHOSE DIFFERENTLY',wrongChoiceNotes(stage)],
      ...(story.spine&&stage.number===5?[['CONNECT THE FOUR DISCOVERIES','Review each checked discovery aloud before the team names the final action.'],...story.spine.links.map((link,index)=>[`DISCOVERY ${index+1}`,link.reason]),['WHY THIS ACTION',`These discoveries support ${story.spine.resolution}. The four recorded digits identify its printed code; read the ending only after the team checks both the story reason and the code.`]]:[]),
      ['STORY AND NEXT PAGE',stage.number===5?'The four earlier results identify the final action. After the team explains the code, release Player page 12 and read the ending.':`This check gives the next discovery, but the mission is not finished yet. Release checkpoint ${stage.number+1}, Player pages ${stage.number*2+2}-${stage.number*2+3}.`],
    ];
    const sectionHeight=([,value])=>wrap(value,77).length*14+26;
    const pageStart=y,capacity=pageStart-67;
    const groups=[[]];
    let used=0;
    for(const section of sections){
      const height=sectionHeight(section);
      if(groups.at(-1).length&&used+height>capacity){groups.push([]);used=0;}
      groups.at(-1).push(section);used+=height;
    }
    // Avoid a paid guide ending with one orphaned paragraph on an otherwise
    // empty continuation page. Move related preceding sections with it until
    // the continuation has enough useful content to scan and print cleanly.
    if(groups.length>1){
      const last=groups.at(-1),previous=groups.at(-2);
      let lastHeight=last.reduce((total,section)=>total+sectionHeight(section),0);
      let previousHeight=previous.reduce((total,section)=>total+sectionHeight(section),0);
      if(stage.number===5&&story.spine){
        while(previous.length>1&&!last.some(([label])=>label==='CONNECT THE FOUR DISCOVERIES')){
          const moved=previous.pop(),movedHeight=sectionHeight(moved);
          if(lastHeight+movedHeight>capacity)break;
          last.unshift(moved);lastHeight+=movedHeight;previousHeight-=movedHeight;
        }
      }
      const minimumContinuation=Math.min(220,Math.floor(capacity*.36));
      while(lastHeight<minimumContinuation&&previous.length>1){
        const moved=previous.pop();
        const movedHeight=sectionHeight(moved);
        last.unshift(moved);lastHeight+=movedHeight;previousHeight-=movedHeight;
      }
      // A continuation should read as the second half of the checkpoint, not a
      // nearly empty spill page. Rebalance whole sections while keeping both
      // pages within the printable area.
      while(previous.length>1&&previousHeight-lastHeight>120){
        const moved=previous.at(-1),movedHeight=sectionHeight(moved);
        if(lastHeight+movedHeight>capacity)break;
        previous.pop();last.unshift(moved);
        lastHeight+=movedHeight;previousHeight-=movedHeight;
      }
    }
    groups.forEach((group,index)=>{
      if(index){
        page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Adult guide / Checkpoint ${stage.number} / Continued`);
        pages.push(page);y=heading(page,`Guide / checkpoint ${stage.number} continued`,stage.title);
      }
      for(const [label,value] of group){
        page.text(label,48,y,9,true,'0.77 0.19 0.13');y-=16;
        y=page.block(value,48,y,77,10,14)-10;
      }
      if((spec.packLayoutVersion||0)>=4&&stage.number===5&&y>205){
        page.text('HOST NOTES',48,y-2,9,true,'0.77 0.19 0.13');
        y-=18;
        const bottom=67,height=y-bottom;
        page.box(48,bottom,page.width-96,height,'0.97 0.99 1');
        page.text(index?'Record how the four discoveries supported the final action.':'Record hints used, team reasoning or a point to revisit.',60,y-20,9,false,'0.27 0.39 0.49');
        for(let line=y-48;line>bottom+18;line-=28)page.rule(60,line,page.width-60,line,'0.78 0.86 0.90');
        y=bottom;
      }
    });
    if(stage.number===5&&!story.spine){
      const findings=story.stages.slice(0,4).map(item=>`Checkpoint ${item.number}: ${item.material.type==='order_tiles'?item.material.logic.context.labels.at(-1):item.options[item.answerIndex].replace(/ \/ digit [1-3]$/,'')}`);
      const needed=26+findings.reduce((height,line)=>height+wrap(line,77).length*14+3,0)+42;
      if(y-needed>=67){
        page.text('CONNECT THE STORY',48,y,9,true,'0.77 0.19 0.13');y-=16;
        for(const line of findings)y=page.block(line,48,y,77,10,14)-3;
        page.block(`Ask how these four discoveries make ${stage.material.logic.context.labels[0]} a sensible final action. The code proves which printed option to choose; the team should also be able to explain the story link.`,48,y-7,77,10,14);
      }
    }
    return pages;
  }
  const sections=[['HAND OUT',`Player pages ${stage.number*2}-${stage.number*2+1}: checkpoint ${stage.number} challenge and ${kindLabel[stage.material.type].toLowerCase()} sheet: ${stage.material.title}.`],
    ['PLAYER ACTION',`${stage.task} ${stage.material.instruction}`],
    ['GENTLE HINT',stage.hint],
    ['ANSWER',`${String.fromCharCode(65+stage.answerIndex)}. ${stage.options[stage.answerIndex]}`],
    ['WHY IT FOLLOWS',stage.explanation],
    ...(stage.material.logic?.resultDigit?[['RECORD CHECK',`Check that the team recorded digit ${stage.material.logic.resultDigit}. Keep their sheet for the final combined record.`]]:[]),
    ['NEXT STEP',stage.number===5?'After checking all four earlier results and the chosen final action, hand out Player page 12 and read the ending.':`After checking this result, hand out checkpoint ${stage.number+1}, Player pages ${stage.number*2+2}-${stage.number*2+3}.`],
    ...(stage.material.logic?.contractVersion===1?[]:[['STORY TRANSITION',stage.unlock]])];
  for(const [label,value] of sections){
    const height=wrap(value,77).length*18+37;
    if(y-height<70){
      page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Adult guide / Checkpoint ${stage.number} / Continued`);
      pages.push(page);y=heading(page,`Guide / checkpoint ${stage.number} continued`,stage.title);
    }
    page.text(label,48,y,10,true,'0.77 0.19 0.13');y-=20;
    y=page.block(value,48,y,77,11,18)-17;
  }
  if(y<65)throw new Error(`Checkpoint ${stage.number} adult guide does not fit.`);
  return pages;
}

function finish(story,spec,role){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`${role==='player'?'Player Pack':'Adult guide'} / Ending`);
  let y=heading(page,'The adventure concludes','The ending');
  y=page.block(story.ending,48,y,77,11,18)-28;
  if(role==='player'){
    if(story.spine){
      page.text('THE FOUR DISCOVERIES',48,y,12,true);y-=24;
      for(const [index,link] of story.spine.links.entries()){
        y=page.block(`${index+1}. ${link.reason}`,52,y,74,11,17)-13;
      }
      page.text('THE FINAL ACTION',48,y,12,true);y-=24;
      y=page.block(story.spine.resolution,52,y,74,12,18,true)-28;
      if(y<110)throw new Error('The linked ending does not fit the player page.');
      page.text('WHICH DISCOVERY HELPED YOUR TEAM MOST?',48,y,10,true);
      page.rule(48,y-25,page.width-48,y-25);
    }else{
      page.text('WHAT DID YOUR TEAM DISCOVER?',48,y,12,true);y-=26;
      for(let i=0;i<5;i++){page.text(`${i+1}.`,48,y,10,true);page.rule(70,y-2,page.width-48,y-2);y-=50;}
    }
  } else if(spec.packExperienceVersion>=2){
    page.text('FINAL HOST CHECK',48,y,12,true);y-=26;
    const hostChecks=(spec.packQualityVersion||0)>=7?[
      ['1. Four recorded results','Check the result digit from each of checkpoints 1-4 in order. Keep the adult answers private.'],
      ['2. Matching action','Compare those four digits with the three printed final actions. Ask the team to explain the matching choice using its paper discoveries.'],
      ['3. Close the game','Read the ending after the final choice. Invite each player to share a discovery. If a rule is unclear, check its adult checkpoint page before adding any explanation.'],
    ]:[
      ['1. Four recorded results','Each of checkpoints 1-4 has one checked digit. Read them in checkpoint order; do not reorder them.'],
      ['2. Matching action','The final action is the only one whose printed code matches all four digits. Ask the team to name the matching action and show its record.'],
      ['3. Story ending','Read the ending after the final choice. Invite each player to share one discovery or paper action that helped the team.'],
      ['4. If a rule seems unclear','Use the corresponding adult checkpoint page to compare the printed clue, answer and explanation. Do not invent an extra clue or require outside knowledge.'],
      ['5. Keep answers private','Keep this guide separate from the Player Pack if the group wants to play again. The Player Pack can be printed again within your purchase rights.'],
    ];
    for(const [label,value] of hostChecks){
      page.text(label.toUpperCase(),48,y,10,true,'0.77 0.19 0.13');y-=20;
      y=page.block(value,48,y,77,11,18)-22;
    }
    if((spec.packLayoutVersion||0)>=4&&y>220){
      page.text('AFTER-PLAY NOTES',48,y,10,true,'0.77 0.19 0.13');y-=22;
      const bottom=72;
      page.box(48,bottom,page.width-96,y-bottom,'0.97 0.99 1');
      page.text('What puzzled the team? What should you clarify next time?',60,y-22,9,false,'0.27 0.39 0.49');
      for(let line=y-54;line>bottom+16;line-=28)page.rule(60,line,page.width-60,line,'0.78 0.86 0.90');
      y=bottom;
    }
    if(y<65)throw new Error('Adult ending guide does not fit.');
  } else page.block('Check all five results against the printed materials before sharing the ending. Keep this guide separate from the children\'s pages.',48,y,77,11,18);
  return page;
}

function serialize(pages){
  const objects=[];const add=value=>{objects.push(value);return objects.length;};
  const catalogId=add(''),pagesId=add('');
  const regularId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds=[];
  for(const page of pages){
    const stream=page.commands.join('\n');
    const streamId=add(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${streamId} 0 R >>`));
  }
  objects[catalogId-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(const [index,object] of objects.entries()){offsets.push(encoder.encode(pdf).length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;}
  const xref=encoder.encode(pdf).length;
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1))pdf+=`${String(offset).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(pdf);
}

export function buildInteractiveGamePdf(story,spec,role){
  if(!['player','guide'].includes(role))throw new Error('Unknown PDF role');
  if(!story.stages?.every(stage=>stage.material))throw new Error('The paper materials are incomplete');
  const pages=role==='player'
    ? [cover(story,spec),...story.stages.flatMap(stage=>[challenge(stage,spec),materialSheet(stage,spec)]),finish(story,spec,role)]
    : [guideStart(story,spec),...story.stages.flatMap(stage=>guideStage(stage,spec,story)),finish(story,spec,role)];
  pages.forEach((page,index)=>page.text(`Page ${index+1} of ${pages.length}`,page.width-126,30,9));
  return serialize(pages);
}

