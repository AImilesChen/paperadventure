"""Render the published C10 source in isolation, for public detail-page assets."""
from pathlib import Path
import importlib.util,sys,json
import pypdfium2 as pdfium
import pdfplumber
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parents[1]
TEMP=ROOT/'tmp/weather-detail'

def render_source():
    # Use the same renderer as the released pack. Its build() would write PDF
    # slots/manifests, so call player() directly with an isolated temporary file.
    source=ROOT/'scripts/weather_classroom_observatory.py'
    published=TEMP/'published-source.py'
    if published.exists():
        normalize=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n').strip()
        assert normalize(source)==normalize(published),'Check publication source before extracting previews.'
    spec=importlib.util.spec_from_file_location('weather_preview_source',source)
    module=importlib.util.module_from_spec(spec);sys.modules[spec.name]=module;spec.loader.exec_module(module)
    TEMP.mkdir(parents=True,exist_ok=True)
    target=TEMP/'published-player-render.pdf'
    canvas=Canvas(str(target),pagesize=A4)
    module.player(canvas,A4);canvas.save()
    return target

def main():
    source=render_source()
    items=[
        ('record',3,None,'Blank morning observation board'),
        ('wind-base',5,None,'Compass base and wind instructions'),
        ('wind-practice',6,(274,491,496,715),'Neutral wind-turn practice example'),
        ('wind-before',6,(285,529,373,642),'Practice card before turning'),
        ('wind-after',6,(394,529,483,642),'Practice card with N aligned'),
        ('cloud-board',7,None,'Blank four-pane cloud recording board'),
        ('rain-base',9,None,'Paper rain gauge and reading instructions'),
        ('rain-practice',10,(42,585,554,723),'Neutral 2 mm rain-alignment example'),
        ('rain-baseline',10,(60,672,278,711),'Practice zero and strip baseline detail'),
        ('bulletin',11,None,'Blank morning bulletin'),
        ('audit',12,None,'Five-point original-evidence check'),
    ]
    rendered=pdfium.PdfDocument(str(source));manifest={}
    with pdfplumber.open(source) as pdf:
        assert len(pdf.pages)==12
        for name,number,box,caption in items:
            page=rendered[number-1];w,h=page.get_size()
            crop=(box[0],h-box[3],w-box[2],box[1]) if box else (0,0,0,0)
            image=page.render(scale=(220 if name.startswith('wind-') and box else 110)/72,crop=crop).to_pil().convert('RGB')
            if name in ('wind-practice','rain-practice'):
                text=pdf.pages[number-1].crop(box).extract_text()
                assert 'PRACTICE ONLY' in text and '9:00' not in text and '11:00' not in text
            target=ROOT/'public/assets'/f'weather-classroom-preview-{name}.jpg'
            image.save(target,quality=88)
            manifest[name]={'page':number,'caption':caption,'width':image.width,'height':image.height,'excerpt':bool(box)}
            print(target.name,image.size)
    rendered.close()
    (ROOT/'src/weatherPreviewAssets.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
