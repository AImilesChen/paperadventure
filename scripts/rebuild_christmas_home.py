"""Rebuild only the Christmas Home PDF slots and their two-size ZIPs."""
import json
import zipfile
from pathlib import Path
import pypdfium2 as pdfium

import generate_retail_packs as retail


def main():
    root = retail.ROOT
    source = next(item for item in json.loads((root / 'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8'))
                  if item['id'] == 'christmas' and item['setting'] == 'home')
    retail.normalise(source)
    items = []
    for paper, size in [('A4', retail.g.A4), ('Letter', retail.g.letter)]:
        items.extend(retail.build(source, paper, size))
        with zipfile.ZipFile(retail.OUT / f'christmas-home-{paper}-complete-1.0.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
            for item in items:
                if item['paper'] == paper:
                    archive.write(root / item['path'], Path(item['path']).name)
    manifest_path = retail.OUT / 'retail-packs-1.0-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest['items'] = [item for item in manifest['items']
                         if (item['world'], item['setting']) != ('christmas', 'home')] + items
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    pdf = pdfium.PdfDocument(str(retail.OUT / 'christmas-home-player-1.0-A4.pdf'))
    try:
        for name, page_number in [('gifts', 7), ('quality', 11)]:
            image = pdf[page_number - 1].render(scale=120 / 72).to_pil().convert('RGB')
            image.save(root / 'public/assets' / f'christmas-home-preview-{name}.jpg', quality=86)
    finally:
        pdf.close()
    print('Christmas Home rebuilt:', [(item['paper'], item['role'], item['pages']) for item in items])


if __name__ == '__main__':
    main()

