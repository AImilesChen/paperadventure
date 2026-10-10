import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'output/previews';out.mkdir(parents=True,exist_ok=True)
m=json.loads((ROOT/'output/pdf/retail-packs-1.0-manifest.json').read_text())
for f in m['items']:
 if f['role']!='player' or f['paper']!='A4' or f['world']=='celebration':continue
 for n in [1,2]:
  prefix=out/f"{f['world']}-{f['setting']}-v1.0-p{n}"
  subprocess.run(['pdftoppm','-f',str(n),'-l',str(n),'-singlefile','-r','110','-jpeg','-jpegopt','quality=84',str(ROOT/f['path']),str(prefix)],check=True)
  assert Path(str(prefix)+'.jpg').stat().st_size>10000
