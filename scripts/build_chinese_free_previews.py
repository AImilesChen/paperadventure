"""Publish spoiler-safe preview images from the exact generated Chinese PDFs."""
import argparse
import hashlib
import json
from pathlib import Path
import pypdfium2 as pdfium
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/free-games/zh'
EDITION=json.loads((ROOT/'shared/free-games/zh-classroom-edition.json').read_text(encoding='utf-8'))
SOURCES=[('home','player',5,'map'),('home','player',3,'record'),('home','guide',4,'handout-cut')]+[('classroom','player',page,name) for name,page in EDITION['previews'].items()]

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--setting',choices=['all','classroom'],default='all');args=parser.parse_args()
 OUT.mkdir(parents=True,exist_ok=True)
 prior=ROOT/'content/free-games/zh-preview-manifest.json'
 items=[i for i in json.loads(prior.read_text(encoding='utf-8'))['items'] if 'celebration-home-' in i['source']] if args.setting=='classroom' and prior.exists() else []
 manifest=json.loads((ROOT/'output/pdf/zh-free-games/manifest.json').read_text(encoding='utf-8'))
 for setting,role,page,name in SOURCES:
  if args.setting=='classroom' and setting!='classroom':continue
  entry=next(i for i in manifest['items'] if i['setting']==setting and i['role']==role and i['paper']=='A4')
  source=ROOT/entry['path']
  doc=pdfium.PdfDocument(str(source));image=doc[page-1].render(scale=1.6).to_pil().convert('RGB')
  path=OUT/f'{setting}-{name}.jpg';image.save(path,quality=90,optimize=True)
  items.append(dict(path=path.relative_to(ROOT).as_posix(),source=source.relative_to(ROOT).as_posix(),sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),page=page,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
 (ROOT/'content/free-games/zh-preview-manifest.json').write_text(json.dumps({'locale':'zh','packVersions':manifest['packVersions'],'items':items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Generated Chinese previews from their exact versioned PDFs')

if __name__=='__main__':main()
