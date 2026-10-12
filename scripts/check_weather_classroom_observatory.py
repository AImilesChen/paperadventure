"""Focused C10 story, printed-tool and delivery integrity checks."""
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
         if (item['world'], item['setting']) == ('weather', 'classroom')]
assert len(items) == 4
assert {(item['paper'], item['role']) for item in items} == {
    ('A4', 'player'), ('A4', 'guide'), ('Letter', 'player'), ('Letter', 'guide')}

for item in items:
    path = ROOT / item['path']
    data = path.read_bytes()
    assert len(data) == item['bytes']
    assert hashlib.sha256(data).hexdigest() == item['sha256']
    pages = PdfReader(path).pages
    assert len(pages) == item['pages'] == (12 if item['role'] == 'player' else 10)
    assert not audit(path)['failures'], path
    words = [page.extract_text() or '' for page in pages]
    if item['role'] == 'player':
        assert all(role in words[1] for role in (
            'SCENE READER', 'TOOL OPERATOR', 'DATA READER',
            'RECORDER', 'CHECKER', 'REPORTER'))
        assert 'after EACH mission' in words[1]
        assert 'The final Checker must be a different pupil' in ' '.join(words[1].split())
        assert all(word in words[2] for word in ('9:00', '10:00', '11:00', 'WIND FROM', 'CLOUD PANES', 'RAIN / mm'))
        assert all(f'RECORD {number}' in words[3] for number in range(1, 6))
        assert 'circle above TWO short bars' in words[3]
        assert all(f'WIND / {hour}' in words[5] for hour in ('9:00', '10:00', '11:00'))
        assert 'thick pointer' in words[4] and 'TURN THE WHOLE SQUARE' in words[5]
        assert 'NORTH triangle' not in words[4]
        assert 'PRACTICE ONLY / DO NOT CUT' in words[5]
        assert 'N first; thick tip then points E.' in words[5]
        assert all(f'SKY VIEW / {hour}' in words[7] for hour in ('9:00', '10:00', '11:00'))
        assert all(f'RAIN / {hour}' in words[9] for hour in ('9:00', '10:00', '11:00'))
        assert '11:00 / 1 mm' in words[9] and 'Circle any wrong number' in words[9]
        assert 'PRACTICE ONLY / DO NOT CUT / NOT A GAME READING' in words[9]
        assert 'This practice drawing reads 2 mm.' in words[9]
        assert 'We corrected this copied detail' in words[10]
        assert all(f'CHECK {number}' in words[11] for number in range(1, 6))
        assert words[11].count('Evidence page(s):') == 5
        assert '11:00 / 3 mm' not in ' '.join(words)
        assert len(pages[0].images) == 1
        assert all(len(page.images) == 0 for page in pages[1:])
    else:
        assert all('Read this scene aloud' in words[index] for index in range(3, 8))
        assert all('Hints / stop after each' in words[index] for index in range(3, 8))
        assert all('Handover' in words[index] for index in range(3, 8))
        assert all(v in words[8] for v in (
            '9:00 / W / 1 of 4 cloud panes / 0 mm',
            '10:00 / W / 2 of 4 cloud panes / 1 mm',
            '11:00 / N / 3 of 4 cloud panes / 3 mm'))
        assert '14 large pieces per crew' in words[1]
        assert 'After EACH mission' in words[2]
        assert 'Read the closing' in words[9]
        assert 'Optional challenge for older pupils' in words[9]
        assert all(len(page.images) == 0 for page in pages)

for paper in ('A4', 'Letter'):
    with zipfile.ZipFile(OUT / f'weather-classroom-{paper}-complete-1.0.zip') as bundle:
        assert bundle.testzip() is None and len(bundle.namelist()) == 2
        for item in items:
            if item['paper'] == paper:
                assert hashlib.sha256(bundle.read(Path(item['path']).name)).hexdigest() == item['sha256']

for role in ('player', 'guide'):
    a4 = PdfReader(OUT / f'weather-classroom-{role}-1.0-A4.pdf').pages
    letter = PdfReader(OUT / f'weather-classroom-{role}-1.0-Letter.pdf').pages
    for first, second in zip(a4, letter, strict=True):
        normalise = lambda page: ' '.join((page.extract_text() or '')
                                          .replace('US Letter', 'PAPER').replace('A4', 'PAPER').split())
        assert normalise(first) == normalise(second), f'{role} content differs by paper size'

for number in (1, 2):
    preview = ROOT / 'output' / 'previews' / f'weather-classroom-v1.0-p{number}.jpg'
    assert preview.stat().st_size > 10_000

print('Weather Classroom C10: 4 PDFs, 2 ZIPs, five missions and two previews passed.')

