"""Build only the Forest Home edition and preserve all other pack slots."""
import json
import sys
import zipfile
from pathlib import Path

import pypdfium2 as pdfium

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_retail_packs as retail


root = retail.ROOT
catalog = json.loads((root / 'content/theme-design/retail-games-v1.json').read_text())
story = next(x for x in catalog if x['id'] == 'forest' and x['setting'] == 'home')
retail.normalise(story)
items = []
for paper, size in [('A4', retail.g.A4), ('Letter', retail.g.letter)]:
    items.extend(retail.build(story, paper, size))

manifest_path = root / 'output/pdf/retail-packs-1.0-manifest.json'
manifest = json.loads(manifest_path.read_text())
old = [x for x in manifest['items'] if (x['world'], x['setting']) != ('forest', 'home')]
manifest['items'] = old + items
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')

for paper in ('A4', 'Letter'):
    target = root / f'output/pdf/forest-home-{paper}-complete-1.0.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for item in items:
            if item['paper'] == paper:
                source = root / item['path']
                bundle.write(source, source.name)
    with zipfile.ZipFile(target) as bundle:
        assert len(bundle.namelist()) == 2 and bundle.testzip() is None

preview_dir = root / 'output/previews'
preview_dir.mkdir(parents=True, exist_ok=True)
source = root / 'output/pdf/forest-home-player-1.0-A4.pdf'
pdf = pdfium.PdfDocument(str(source))
try:
    for public_number, source_page in ((1, 6), (2, 11)):
        image = pdf[source_page - 1].render(scale=110 / 72).to_pil().convert('RGB')
        target = preview_dir / f'forest-home-v1.0-p{public_number}.jpg'
        image.save(target, format='JPEG', quality=84)
        assert target.stat().st_size > 10000
finally:
    pdf.close()

print('Forest Home: four PDFs, two ZIPs, two spoiler-safe previews and manifest updated.')
