"""Focused C09 file, story and delivery checks for both paper sizes."""
import hashlib
import json
import zipfile
from pathlib import Path

from pypdf import PdfReader

from audit_pdf_layout import audit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
manifest = json.loads((OUT / 'retail-packs-1.0-manifest.json').read_text())
items = [item for item in manifest['items']
         if item['world'] == 'library' and item['setting'] == 'classroom']
assert len(items) == 4
assert {(item['paper'], item['role']) for item in items} == {
    ('A4', 'player'), ('A4', 'guide'), ('Letter', 'player'), ('Letter', 'guide')}

for item in items:
    path = ROOT / item['path']
    data = path.read_bytes()
    assert item['bytes'] == len(data)
    assert item['sha256'] == hashlib.sha256(data).hexdigest()
    pages = PdfReader(path).pages
    assert len(pages) == item['pages'] == (11 if item['role'] == 'player' else 10)
    assert not audit(path)['failures'], path
    text = [page.extract_text() or '' for page in pages]
    if item['role'] == 'player':
        # Page order and handouts must agree with the adult guide.
        assert 'RETURN SLIP' in text[2] and 'L-24' in text[2]
        assert all(title in text[2] for title in (
            'The Moonlit Atlas', 'The Paper Clock', 'The Lantern Path', 'The Garden Gate'))
        assert 'OPENING LEAF' in text[3]
        assert 'THE BORROWED MAP' in text[3]
        assert all(stop in text[3] for stop in ('GARDEN TABLE', 'GARDEN GATE', 'RIVER BRIDGE', "KIT'S HOME"))
        assert 'BESIDE this sheet' in text[4]
        assert all('LEAF ' in text[index] for index in (5, 6))
        assert all('Default: keep these sheets whole' in text[index] for index in (5, 6))
        assert all(f'NOTE {index}' in text[8] for index in (1, 2, 3))
        assert all(phrase in text[9] for phrase in ("KIT'S ROUTE COPY", 'STOP 1', 'STOP 4', 'OUR RESTORED MIDDLE', 'SURVIVING LAST LINE'))
        assert 'VISITOR’S SUMMARY' in text[10] and 'Our corrected visitor sentence' in text[10]
        assert 'If pages 6' in text[10] and 'remain' in text[10] and 'whole' in text[10]
        # The solution is constructed during play, not printed on early handouts.
        assert 'Copy the route onto' not in ' '.join(text[:8])
        assert 'B → D → C → A' not in ' '.join(text)
        assert len(pages[0].images) == 1
        assert all(len(page.images) == 0 for page in pages[1:])
    else:
        assert all('Read this scene aloud' in text[index] for index in range(3, 8))
        assert all('Hints / stop after each' in text[index] for index in range(3, 8))
        assert all('Handover' in text[index] for index in range(3, 8))
        assert 'B → D → C → A' in text[8]
        assert 'When an answer nearly fits' in text[8]
        assert 'Short labels' in text[6]
        assert 'THREE private witness notes' in text[0]
        assert all(len(page.images) == 0 for page in pages)

for paper in ('A4', 'Letter'):
    with zipfile.ZipFile(OUT / f'library-classroom-{paper}-complete-1.0.zip') as bundle:
        assert bundle.testzip() is None and len(bundle.namelist()) == 2
        for item in items:
            if item['paper'] == paper:
                assert hashlib.sha256(bundle.read(Path(item['path']).name)).hexdigest() == item['sha256']

# The two paper formats must contain the same story, handouts and adult answers.
for role in ('player', 'guide'):
    a4 = PdfReader(OUT / f'library-classroom-{role}-1.0-A4.pdf').pages
    letter = PdfReader(OUT / f'library-classroom-{role}-1.0-Letter.pdf').pages
    for first, second in zip(a4, letter, strict=True):
        normalize = lambda page: ' '.join((page.extract_text() or '').replace('US Letter', 'PAPER').replace('A4', 'PAPER').split())
        assert normalize(first) == normalize(second), f'{role} content differs by paper size'

for page in (1, 2):
    preview = ROOT / 'output' / 'previews' / f'library-classroom-v1.0-p{page}.jpg'
    assert preview.stat().st_size > 10_000

print('Library Classroom C09: 4 PDFs, 2 ZIPs, story handouts and previews passed.')
