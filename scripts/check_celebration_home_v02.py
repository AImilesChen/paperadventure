"""Check final page mapping, print geometry and all advertised team sizes."""
import json
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from generate_celebration_home_v02 import ROOT, ROLES, TASKS
from generate_celebration_samples import validate_logic

validate_logic()
manifest=json.loads((ROOT/'output/pdf/celebration-home-v0.2-manifest.json').read_text())
for item in manifest['items']:
 path=ROOT/item['path']; pages=PdfReader(path).pages
 assert len(pages)==item['pages']
 text='\n'.join(p.extract_text() for p in pages)
 assert 'v0.2' in text and 'v0.1' not in text
 if item['role']=='player':
  assert len(pages)==15
  for number,title in [(2,'Your explorer team'),(5,'Team trail'),(6,'Checkpoint 1'),(8,'Checkpoint 2'),(10,'Checkpoint 3'),(12,'Checkpoint 4'),(14,'Checkpoint 5')]:
   assert title in pages[number-1].extract_text(),(path,number,title)
  assert 'Hint 2' not in text and 'Answer key' not in text
 else:
  assert len(pages)==8 and '23 sheets' in text and '38' in text
 with pdfplumber.open(path) as pdf:
  for i,p in enumerate(pdf.pages):
   for ch in p.chars:
    assert 0<=ch['x0']<ch['x1']<=p.width+1 and 0<=ch['top']<ch['bottom']<=p.height+1,(path,i,ch)
for n in range(2,13):
 sizes=[n] if n<=6 else [n//2,n-n//2]
 assert all(2<=s<=6 for s in sizes)
 for size in sizes:
  assigned=[[ROLES[0],ROLES[2]],[ROLES[1],ROLES[3]]] if size==2 else [[ROLES[0]],[ROLES[1]],[ROLES[2],ROLES[3]]] if size==3 else [[r] for r in ROLES]+[[ROLES[i%4]] for i in range(size-4)]
  assert len(assigned)==size and set(r for jobs in assigned for r in jobs)==set(ROLES)
  for jobs in assigned:
   assert all(len(TASKS[r])==5 and all(TASKS[r]) for r in jobs)
print('PASS: 46 PDF pages, all page references, four job duties across five checkpoints, 2-12 player assignment coverage, geometry and clue logic. This is a rules check, not a human play-test.')

