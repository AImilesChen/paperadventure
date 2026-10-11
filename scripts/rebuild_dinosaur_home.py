"""Rebuild the four Dinosaur Home PDFs, both ZIPs, manifest rows and real previews."""
import json
import zipfile
from pathlib import Path

import pypdfium2 as pdfium

import generate_retail_packs as retail


def main():
    root = retail.ROOT
    source = next(item for item in json.loads((root / 'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8'))
                  if (item['id'], item['setting']) == ('dinosaur', 'home'))
    retail.normalise(source)
    items = []
    for paper, size in [('A4', retail.g.A4), ('Letter', retail.g.letter)]:
        paper_items = retail.build(source, paper, size)
        items += paper_items
        with zipfile.ZipFile(retail.OUT / f'dinosaur-home-{paper}-complete-1.0.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
            for item in paper_items:
                archive.write(root / item['path'], Path(item['path']).name)
    manifest_path = retail.OUT / 'retail-packs-1.0-manifest.json'
    manifest = (json.loads(manifest_path.read_text(encoding='utf-8'))
                if manifest_path.exists() else {'items': []})
    manifest['items'] = [item for item in manifest['items']
                         if (item['world'], item['setting']) != ('dinosaur', 'home')] + items
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

    pdf = pdfium.PdfDocument(str(retail.OUT / 'dinosaur-home-player-1.0-A4.pdf'))
    try:
        for number, source_page in [(1, 8), (2, 10)]:
            image = pdf[source_page - 1].render(scale=120 / 72).to_pil().convert('RGB')
            image.save(root / 'public/assets' / f'dinosaur-home-preview-{number}.jpg', quality=86)
    finally:
        pdf.close()
    print('Dinosaur Home rebuilt:', [(item['paper'], item['role'], item['pages']) for item in items])


if __name__ == '__main__':
    main()

