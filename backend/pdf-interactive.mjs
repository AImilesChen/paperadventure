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
  commands.push(`0.88 0.95 0.98 rg 0 ${height-42} ${width} 42 re f`);
  text('PAPER ADVENTURE / CUSTOM PAPER GAME',48,height-25,9,true);
  rule(48,45,width-48,45);
  text(label,48,30,8);
  return {commands,text,block,box,rule,width,height};
}

function heading(page,kicker,title){
  const top=page.height-77;
  page.text(kicker.toUpperCase(),48,top,9,true,'0.77 0.19 0.13');
  return page.block(title,48,top-33,42,22,29,true)-10;
}

const kindLabel={evidence_cards:'Evidence cards',order_tiles:'Order tiles',symbol_key:'Symbol key',route_board:'Route board',decision_record:'Decision record'};

function cover(story,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,'Player Pack / Start');
  let y=heading(page,'A game to print and play',story.title);
  y=page.block(story.introduction,48,y,75,11,18)-20;
  page.text('YOUR MISSION',48,y,12,true);y-=23;
  y=page.block(spec.plan.goal,48,y,75,11,18)-15;
  page.text('PLAY AS A TEAM',48,y,12,true);y-=23;
  y=page.block(spec.plan.roles,48,y,75,11,18)-20;
  page.text('FIVE PAPER CHECKPOINTS',48,y,12,true);y-=22;
  for(const stage of story.stages){
    page.text(`${stage.number}. ${stage.title} - ${kindLabel[stage.material.type]}`,56,y,10,true);y-=28;
  }
  page.box(48,65,page.width-96,60,'0.93 0.97 0.99');
  page.block('Print single-sided. Use pencils. An adult holds the guide and releases one checkpoint at a time. Cards and tiles may be cut by an adult, or used whole by pointing and writing.',60,105,77,9,14);
  return page;
}

function challenge(stage,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Player Pack / Checkpoint ${stage.number} / Challenge`);
  let y=heading(page,`Checkpoint ${stage.number} of 5`,stage.title);
  const gap=10,col=(page.width-96-gap)/2;
  page.box(48,y-117,col,117,'0.93 0.97 0.99');
  page.box(48+col+gap,y-117,col,117,'0.93 0.97 0.99');
  page.text('YOUR TASK',60,y-20,10,true);
  page.block(stage.task,60,y-39,33,10,13);
  page.text('WORK TOGETHER',60+col+gap,y-20,10,true);
  page.block(stage.teamwork,60+col+gap,y-39,33,10,13);
  y-=137;
  page.text('READ THE CLUE AND USE THE NEXT MATERIAL SHEET',48,y,11,true);y-=24;
  y=page.block(stage.clue,48,y,78,11,18)-17;
  for(let i=0;i<stage.options.length;i++){
    const option=stage.options[i],lines=wrap(option,70),height=Math.max(42,lines.length*16+17);
    page.box(48,y-height,page.width-96,height,'0.97 0.99 1');
    page.block(`${String.fromCharCode(65+i)}. ${option}`,60,y-17,74,10,16);
    y-=height+9;
  }
  if(y<120)throw new Error(`Checkpoint ${stage.number} challenge exceeds the printable page`);
  page.text('OUR CHOICE AND EVIDENCE:',48,y-25,10,true);
  page.rule(48,y-48,page.width-48,y-48);
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
  if(material.type==='route_board'){
    for(const [index,item] of items.entries()){
      const h=Math.min(105,Math.floor((y-170)/items.length)-8);
      page.box(48,y-h,page.width-96,h,'0.97 0.99 1');
      page.text('START',60,y-23,8,true);
      page.text(item.label,130,y-23,11,true);
      page.text('END',page.width-82,y-23,8,true);
      page.rule(60,y-38,page.width-60,y-38,'0.77 0.19 0.13');
      page.block(item.detail,60,y-56,75,9,13);
      y-=h+8;
    }
  } else if(material.type==='symbol_key' || material.type==='decision_record'){
    for(const item of items){
      const h=Math.min(135,Math.max(54,Math.floor((y-170)/items.length)-7));
      page.box(48,y-h,page.width-96,h,'0.97 0.99 1');
      if(material.type==='decision_record')page.box(60,y-28,13,13);
      page.text(item.label,material.type==='decision_record'?83:61,y-24,11,true);
      page.block(item.detail,material.type==='decision_record'?83:61,y-42,69,9,13);
      y-=h+7;
    }
  } else {
    const gap=10,col=(page.width-96-gap)/2;
    const rows=Math.ceil(items.length/2),h=Math.min(170,Math.floor((y-165-(rows-1)*gap)/rows));
    items.forEach((item,index)=>{
      const x=48+(index%2)*(col+gap),top=y-Math.floor(index/2)*(h+gap);
      page.box(x,top-h,col,h,'0.97 0.99 1');
      page.text(item.label,x+12,top-22,11,true);
      page.rule(x+12,top-30,x+col-12,top-30);
      page.block(item.detail,x+12,top-47,32,9,14);
    });
  }
  page.box(48,58,page.width-96,78,'0.93 0.97 0.99');
  page.text('RECORD YOUR RESULT',60,112,10,true);
  page.block(material.recordPrompt,60,93,75,9,13);
  page.rule(60,70,page.width-60,70);
  return page;
}

function guideStart(story,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,'Adult guide / Preparation');
  let y=heading(page,'Keep this guide with the adult',story.title);
  y=page.block(spec.plan.preparation,48,y,78,11,18)-22;
  page.text('BEFORE PLAY',48,y,12,true);y-=24;
  y=page.block(`Print one Player Pack for your ${spec.players} players. Paper size: ${spec.paper}. Use pencils. An adult may cut cards or tiles before play, or leave every sheet whole and let children point and write. Release each challenge and its material sheet only after checking the previous result.`,48,y,77,11,18)-22;
  page.text('HOW TO GUIDE',48,y,12,true);y-=24;
  page.block('The five checkpoint sheets contain the players\' clues and paper pieces. Keep the answers below private. Read one unlock aloud after the team proves its choice. If the team is stuck, use the gentle hint before revealing the answer.',48,y,77,11,18);
  return page;
}

function guideStage(stage,spec){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`Adult guide / Checkpoint ${stage.number}`);
  let y=heading(page,`Guide / checkpoint ${stage.number}`,stage.title);
  const sections=[['HAND OUT',`Player checkpoint ${stage.number} challenge and ${kindLabel[stage.material.type].toLowerCase()} sheet: ${stage.material.title}.`],
    ['PLAYER ACTION',`${stage.task} ${stage.material.instruction}`],
    ['GENTLE HINT',stage.hint],
    ['ANSWER',`${String.fromCharCode(65+stage.answerIndex)}. ${stage.options[stage.answerIndex]}`],
    ['WHY IT FOLLOWS',stage.explanation],
    ['NEXT UNLOCK',stage.unlock]];
  for(const [label,value] of sections){
    page.text(label,48,y,10,true,'0.77 0.19 0.13');y-=20;
    y=page.block(value,48,y,77,11,18)-17;
  }
  return page;
}

function finish(story,spec,role){
  const page=makePage(spec.paper==='A4'?595:612,spec.paper==='A4'?842:792,`${role==='player'?'Player Pack':'Adult guide'} / Ending`);
  let y=heading(page,'The adventure concludes','The ending');
  y=page.block(story.ending,48,y,77,11,18)-28;
  if(role==='player'){
    page.text('WHAT DID YOUR TEAM DISCOVER?',48,y,12,true);y-=26;
    for(let i=0;i<5;i++){page.text(`${i+1}.`,48,y,10,true);page.rule(70,y-2,page.width-48,y-2);y-=50;}
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
    : [guideStart(story,spec),...story.stages.map(stage=>guideStage(stage,spec)),finish(story,spec,role)];
  return serialize(pages);
}
