"""Only neutral or unfilled actual revised pages; never the completed route or welcome."""
from pathlib import Path
import json,hashlib,shutil
import pypdfium2 as pdfium
R=Path.cwd();geometry=json.loads((R/'tmp/pdfs/dinosaur-home/geometry.json').read_text(encoding='utf-8'));result={}
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
    m=json.loads((R/f'output/pdf/dinosaur-home-{locale}-{version}/manifest.json').read_text(encoding='utf-8'));f=next(x for x in m['items'] if x['paper']=='A4' and x['role']=='player');doc=pdfium.PdfDocument(str(R/f['path']));rows=[g for g in geometry if g['locale']==locale and g['paper']=='A4' and g['role']=='player'];items={}
    def gs(kind,page):return [g for g in rows if g['kind']==kind and g['page']==page]
    def bounds(xs,pad=5):return [min(g['x'] for g in xs)-pad,min(g['y'] for g in xs)-pad,max(g['x']+g['width'] for g in xs)+pad,max(g['y']+g['height'] for g in xs)+pad]
    board=bounds(gs('slot',8)+gs('camp',8),8);board[0]-=15;board[3]+=32;board[1]-=5
    bag=bounds(gs('backpack-slot',11),8);bag[3]+=24
    supply=bounds(gs('supply',12),6)
    bridge=bounds([g for g in gs('tile',9) if g['tileId']=='bridge'],4)
    block=bounds([g for g in gs('marker',15) if g['marker']=='block'],4);milo=bounds([g for g in gs('marker',15) if g['marker']=='milo'],4)
    demo=[g for g in gs('frame',7) if g['width']<120 and g['height']<100];assert len(demo)==4
    right=demo[0];left=demo[1]
    jr=[right['x']+right['width']-35,right['y']+10,right['x']+right['width'],right['y']+right['height']-30]
    jl=[left['x'],left['y']+10,left['x']+35,left['y']+left['height']-30]
    drawing=next(g for g in gs('frame',17) if g['height']==310)
    configs={'map':(8,board,'Blank six-slot expedition map','空白六格探险地图'),'backpack':(11,bag,'Empty two-slot backpack','空白两格背包'),'choices':(12,supply,'Four unselected supply tokens','四件未选择的补给纸卡'),'bridge':(9,bridge,'One upright bridge tile','一张正向木桥地形卡'),'block':(15,block,'Closed-place marker','封路标记'),'milo':(15,milo,'Milo movement marker','米洛移动标记'),'join-right':(7,jr,'Neutral right-edge path detail','中性示例的右侧路口'),'join-left':(7,jl,'Neutral left-edge path detail','中性示例的左侧路口'),'record':(3,[40,65,555,doc[2].get_height()-35],'Blank expedition record','空白探险记录'),'keepsake':(17,bounds([drawing],3),'Blank keepsake drawing area','空白纪念绘画区')}
    for key,(page,b,en,zh) in configs.items():
        scale=2;im=doc[page-1].render(scale=scale).to_pil().convert('RGB');height=doc[page-1].get_height();crop=im.crop(tuple(round(x*scale) for x in [b[0],height-b[3],b[2],height-b[1]]));p=R/f'public/assets/dinosaur-home-{locale}-{key}.jpg';crop.save(p,quality=88)
        items[key]={'path':p.relative_to(R).as_posix(),'page':page,'width':crop.width,'height':crop.height,'caption':zh if locale=='zh' else en,'excerpt':True,'sourceSha256':f['sha256'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
        if locale=='en':shutil.copyfile(p,R/f'public/assets/dinosaur-home-detail-{key}.jpg')
    result[locale]=items;doc.close()
for p in ['content/dinosaur-home-edition-previews.json','src/dinosaurHomeEditionPreviewAssets.json']:(R/p).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'src/dinosaurPreviewAssets.json').write_text(json.dumps(result['en'],indent=2),encoding='utf-8')
print('Generated20 bilingual neutral actual-page excerpts and10 English URL aliases; no completed map or private welcome.')
