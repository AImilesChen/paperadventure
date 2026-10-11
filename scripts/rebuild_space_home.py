"""Rebuild only the Space Home PDFs, ZIPs and retail manifest entries."""
import json
import zipfile
from pathlib import Path

import pypdfium2 as pdfium

import generate_retail_packs as retail


def main():
    root = retail.ROOT
    source = next(item for item in json.loads(
        (root / 'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8'))
        if (item['id'], item['setting']) == ('space', 'home'))
    retail.normalise(source)
    items = []
    for paper, size in [('A4', retail.g.A4), ('Letter', retail.g.letter)]:
        built = retail.build(source, paper, size)
        items.extend(built)
        with zipfile.ZipFile(retail.OUT / f'space-home-{paper}-complete-1.0.zip',
                             'w', zipfile.ZIP_DEFLATED) as archive:
            for item in built:
                archive.write(root / item['path'], Path(item['path']).name)
    manifest_path = retail.OUT / 'retail-packs-1.0-manifest.json'
    manifest = (json.loads(manifest_path.read_text(encoding='utf-8'))
                if manifest_path.exists() else {'items': []})
    manifest['items'] = [item for item in manifest['items']
                         if (item['world'], item['setting']) != ('space', 'home')] + items
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    preview_root = root / 'output/previews'
    preview_root.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(retail.OUT / 'space-home-player-1.0-A4.pdf'))
    try:
        for number, page in [(1, 5), (2, 11)]:
            image = pdf[page - 1].render(scale=110 / 72).to_pil().convert('RGB')
            image.save(preview_root / f'space-home-v1.0-p{number}.jpg',
                       format='JPEG', quality=84)
            image.save(root / 'public/assets' / f'space-home-preview-{number}.jpg',
                       format='JPEG', quality=84)
    finally:
        pdf.close()
    print('Space Home rebuilt:', [(item['paper'], item['role'], item['pages'])
                                  for item in items])


if __name__ == '__main__':
    main()
