"""Public excerpts use final unfilled pages and neutral teaching details only."""
from pathlib import Path
import json,hashlib
import pypdfium2 as pdfium
R=Path(__file__).resolve().parents[1]
geometry=json.loads((R/'tmp/pdfs/space-home/geometry.json').read_text(encoding='utf-8'));result={}
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 m=json.loads((R/f'output/pdf/space-home-{locale}-{version}/manifest.json').read_text(encoding='utf-8'));f=next(f for f in m['items'] if f['paper']=='A4' and f['role']=='player');doc=pdfium.PdfDocument(str(R/f['path']));rows=[g for g in geometry if g['locale']==locale and g['paper']=='A4' and g['role']=='player']
 def gs(kind,page):return [g for g in rows if g['kind']==kind and g['page']==page]
 def bounds(items,pad=5):return [min(g['x'] for g in items)-pad,min(g['y'] for g in items)-pad,max(g['x']+g['width'] for g in items)+pad,max(g['y']+g['height'] for g in items)+pad]
 example=[g for g in gs('frame',4) if abs(g['width']-140)<.1 and abs(g['height']-38)<.1];assert len(example)==2
 def pagebody(page):return [40,65,doc[page-1].get_width()-40,doc[page-1].get_height()-35]
 onecell=gs('cell',9)[0];oneslot=gs('cell-slot',8)[0]
 # Slot-only crop hides all named device/cost/allocation context.
 configs={
 'receiver-board':(5,bounds(gs('wave-slot',5),8),'Empty signal receiver board','空白信号接收底板'),
 'power-board':(8,bounds(gs('device',8),5),'Five devices with empty energy slots','五种设备与空白能源格'),
 'cells':(9,bounds(gs('cell',9),5),'Six reusable paper energy cells','六块可重复使用的纸能源'),
 'decoder':(14,bounds(gs('received-slot',14)+gs('key-slot',14)+gs('code-alignment-slot',14),6),'Unfilled icon lookup board without a code strip','未填写且未放译码条的图标对照板'),
 'wave-out':(4,bounds([example[0]],2),'Neutral output-level example','中性示例的输出档位'),
 'wave-in':(4,bounds([example[1]],2),'Neutral input-level example','中性示例的输入档位'),
 'slot':(8,bounds([oneslot],2),'One anonymous empty cell slot','一个未标设备名称的空能源格'),
 'cell':(9,bounds([onecell],2),'One reusable energy cell','一块可重复使用的能源'),
 'message-icon':(14,bounds([gs('received-slot',14)[0]],2),'One received icon, without its character','一个未填写字符的收到图标'),
 'key-icon':(14,bounds([next(g for g in gs('key-slot',14) if g['symbol']==gs('received-slot',14)[0]['symbol'])],2),'The matching fixed-key icon, without a code character','固定对照表中相同的图标，不含译码字符'),
 'record':(3,pagebody(3),'Blank shared mission record','空白共同任务记录'),
 'transmission':(17,pagebody(17),'Blank outgoing checks and five empty pulse slots','空白回复核验与五个未填写信号格')}
 items={}
 for key,(page,b,en,zh) in configs.items():
  scale=2;im=doc[page-1].render(scale=scale).to_pil().convert('RGB');height=doc[page-1].get_height();crop=im.crop(tuple(round(v*scale) for v in [b[0],height-b[3],b[2],height-b[1]]));path=R/f'public/assets/space-home-{locale}-{key}.jpg';crop.save(path,quality=88)
  items[key]=dict(path=path.relative_to(R).as_posix(),page=page,width=crop.width,height=crop.height,caption=zh if locale=='zh' else en,excerpt=True,sourceSha256=f['sha256'],sha256=hashlib.sha256(path.read_bytes()).hexdigest())
 result[locale]=items;doc.close()
for name in ['content/space-home-edition-previews.json','src/spaceHomeEditionPreviewAssets.json']:(R/name).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Generated24 bilingual final-source public excerpts; no complete wave order, code values, allocations or ending.')
