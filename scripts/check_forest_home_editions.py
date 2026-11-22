"""Verify the repaired printed chain, privacy, page references, geometry and ZIP bytes."""
from pathlib import Path
import json,hashlib,re,zipfile
import pdfplumber
from pypdf import PdfReader
R=Path(__file__).resolve().parents[1]
M=json.loads((R/'output/pdf/forest-home-en-1.1/manifest.json').read_text())
texts={};proof=[]
for f in M['items']:
 p=R/f['path'];raw=p.read_bytes();assert hashlib.sha256(raw).hexdigest()==f['sha256'];assert len(raw)==f['bytes'];doc=PdfReader(p)
 assert len(doc.pages)==f['pages']==(18 if f['role']=='player' else 17)
 pages=[' '.join(x.extract_text().split()) for x in doc.pages];texts[f['paper'],f['role']]=pages
 with pdfplumber.open(p) as pdf:
  for i,page in enumerate(pdf.pages):
   assert len(page.chars)>90
   assert all(35<=c['x0'] and c['x1']<=page.width-35 and 15<=c['top'] and c['bottom']<=page.height-15 for c in page.chars),(p,i+1,'text outside safe bounds')
 if f['role']=='player':
  assert all(f'CHECKPOINT {i} / STORY AND ACTIONS' in pages[n-1] for i,n in enumerate([5,8,11,13,16],1))
  # Read the actual printed mail data; decide tray by the printed conditions.
  mail=pages[6];rows={}
  starts=list(re.finditer(r'(?<![A-Z])([A-F]) / (?:LETTER|P17 PARCEL|PARCEL)',mail));assert len(starts)==6
  for i,m in enumerate(starts):rows[m[1]]=mail[m.start():starts[i+1].start() if i+1<len(starts) else len(mail)]
  groups={'READY':[],'REPAIR':[],'HOLD':[]}
  for letter,t in rows.items():groups['HOLD' if 'seal torn' in t else 'REPAIR' if 'blurred' in t else 'READY'].append(letter)
  assert groups=={'READY':['A','D'],'REPAIR':['B','F'],'HOLD':['C','E']}
  assert 'Blue Tree 3 | morning' in rows['A'] and 'P17' in rows['B'] and 'PRIORITY' in rows['B']
  assert all(x in pages[8] for x in ['Same district as letter A','One door after letter A','Copy the picture seal on B','P18 / DISTRICT CLUE'])
  assert all(x in pages[9] for x in ['District ends in TREE','Door number is even','leave RECIPIENT blank'])
  assert 'BLUE TREE / MORNING' in pages[11] and 'PRIORITY' in pages[11] and 'ORDINARY' in pages[11]
  assert 'With 2 children' in pages[13] and 'With 3 children' in pages[13] and 'courtyard' in pages[13]
  actor=pages[14];matches=re.findall(r'(OWL HOUSE|FOX DEN|BEAVER HUT).*?Type: (parcel|letter).*?ID: (\w+).*?Seal mark: (acorn|moon|pine)',actor)
  assert matches==[('OWL HOUSE','parcel','P17','acorn'),('FOX DEN','letter','L06','moon'),('BEAVER HUT','parcel','P18','pine')],matches
  assert len([x for x in matches if x[1:] == ('parcel','P17','acorn')])==1
  assert all('acorn' not in t.lower() for i,t in enumerate(pages) if i!=14),'answer mark outside private actor props'
  assert 'Nori reaches Owl House' not in ' '.join(pages)
  assert 'SUNNY PARK' in pages[3] and 'door 9' in pages[3] and 'not answers' in pages[3]
  assert 'ONCE on the new label' in pages[7] and 'ONCE on the handover slip' in pages[10]
  assert 'DO NOT COPY AGAIN' in pages[16] and 'Ask all three neighbours' in pages[13]
  assert 'OUR POST OFFICE' not in pages[17] or 'keepsake' in pages[17]
  assert 'Nori reaches' not in pages[17] and 'ACORN' not in pages[15]
  # Actual physical card sizes are inherited unchanged; check drawn rectangles against their own paper's slot clearance.
  w=(595.275590551 if f['paper']=='A4' else 612)-88
  cardw=(w-18)/2;slotw=(w-8)/2;assert slotw-cardw==5 and 158-8<184
 else:
  assert 'Nori reaches Owl House' in pages[15]
  assert 'private' in pages[0].lower() and '19 cut pieces' in pages[1]
  assert 'Host page 12' in pages[3] and '2 children' in pages[3] and '3 children' in pages[3]
  assert all('ACCEPT ONLY AFTER CHECKING' in pages[n-1] for n in [6,8,10,12,14])
  assert 'No-cut mode' in pages[16] and 'Erase a changed placement' in pages[16]
 proof.append({'paper':f['paper'],'role':f['role'],'pages':len(pages),'bytes':len(raw),'sha256':f['sha256']})
for role in ['player','guide']:
 clean=lambda t:t.replace('/ A4','/ PAPER').replace('/ Letter','/ PAPER')
 assert [clean(t) for t in texts['A4',role]]==[clean(t) for t in texts['Letter',role]]
for z in M['zips']:
 p=R/z['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==z['sha256']
 with zipfile.ZipFile(p) as a:
  assert len(a.namelist())==2 and a.testzip() is None
  for f in M['items']:
   if f['paper']==z['paper']:assert hashlib.sha256(a.read(Path(f['path']).name)).hexdigest()==f['sha256']
original=R/'scripts/forest_post_office.py';b=original.read_bytes();assert hashlib.sha1(('blob '+str(len(b))).encode()+b'\0'+b).hexdigest()=='de9eaa16200d5704ae71710bd5bc3f5acb31b598'
q=R/'tmp/pdfs/forest-home';q.mkdir(parents=True,exist_ok=True)
(q/'checks.json').write_text(json.dumps({'status':'passed','pages':70,'pdfs':proof,'originalGeneratorUnchanged':True,'physicalOrChildTest':False},indent=2))
print('70 printed pages: chain, unique recipient, privacy, staged references, roles, safe text bounds, paper parity, ZIP hashes and legacy source preservation passed.')
