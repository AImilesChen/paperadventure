"""Check C08's printable, role-separated handoff and page geometry."""
from __future__ import annotations

import hashlib
import json
import re
import zipfile
from pathlib import Path

from pypdf import PdfReader

from audit_pdf_layout import audit
from museum_classroom_exhibition import CASE_TAG_INSET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
manifest = json.loads((OUT / 'retail-packs-1.0-manifest.json').read_text(encoding='utf-8'))
items = [x for x in manifest['items'] if (x['world'], x['setting']) == ('museum', 'classroom')]
assert {(x['paper'], x['role']) for x in items} == {(p, r) for p in ('A4', 'Letter') for r in ('player', 'guide')}

for paper in ('A4', 'Letter'):
    docs = {}
    for role, expected in (('player', 11), ('guide', 10)):
        item = next(x for x in items if (x['paper'], x['role']) == (paper, role))
        path = ROOT / item['path']
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == item['sha256']
        assert len(data) == item['bytes']
        reader = PdfReader(path)
        assert len(reader.pages) == item['pages'] == expected
        assert not audit(path)['failures']
        docs[role] = reader
    player, guide = docs['player'], docs['guide']
    p = [x.extract_text() or '' for x in player.pages]
    g = [x.extract_text() or '' for x in guide.pages]
    flat_p = [re.sub(r'\s+', ' ', text) for text in p]
    flat_g = [re.sub(r'\s+', ' ', text) for text in g]
    assert [i + 1 for i, page in enumerate(player.pages) if page.images] == [1]
    assert not any(page.images for page in guide.pages)
    assert all(re.search(r'Mission [1-5]', g[i]) for i in range(3, 8))
    assert all('Read this scene aloud' in g[i] and 'Hints / stop after each' in g[i] for i in range(3, 8))
    assert all('Crescent' not in p[i] and 'Double-ring' not in p[i] and 'Three-dot' not in p[i] for i in (3, 4))
    assert all(term in p[5] for term in ('Crescent top', 'Triangle top', 'Double-ring dial', 'Single-ring dial', 'Three-dot base', 'Striped base'))
    assert p[6].count('SLIP ') == 3
    assert 'adult reads the third clue aloud to both pupils' in flat_p[6]
    assert all(term in p[7] for term in ('M-27', 'M-72', 'Wind Listener'))
    assert all(term in p[8] for term in ('OBJECT NAME', 'WHAT YOU CAN SEE', 'IN OUR STORY'))
    assert 'trusted archive note A' not in p[8]
    assert all(term in p[9] for term in ('ACCESSION ID', 'CASE NUMBER', 'TOP', 'DIAL', 'BASE', 'VISITOR LABEL'))
    assert 'Copy your verified accession ID' in flat_p[9]
    assert 'Ask one evidence question' in p[10]
    assert 'pre-cut case tags' in flat_p[3] and 'Cut the three case tags' not in flat_p[3]
    assert 'read its clue aloud to both pupils' in flat_g[5]
    assert 'every task page and piece already issued' in flat_g[9]
    assert all(term in g[8] for term in ('M-27', 'Case 4', 'CRESCENT', 'DOUBLE RING', 'THREE DOTS'))
    for role in ('player', 'guide'):
        text = ' '.join((x.extract_text() or '') for x in docs[role].pages)
        assert not re.search(r'internal|draft|not play.tested|do not sell|unpublished', text, re.I)
    with zipfile.ZipFile(OUT / f'museum-classroom-{paper}-complete-1.0.zip') as bundle:
        assert len(bundle.namelist()) == 2 and bundle.testzip() is None
        for role in ('player', 'guide'):
            item = next(x for x in items if (x['paper'], x['role']) == (paper, role))
            assert hashlib.sha256(bundle.read(Path(item['path']).name)).hexdigest() == item['sha256']

for role in ('player', 'guide'):
    a = PdfReader(OUT / f'museum-classroom-{role}-1.0-A4.pdf')
    b = PdfReader(OUT / f'museum-classroom-{role}-1.0-Letter.pdf')
    for number, (ap, bp) in enumerate(zip(a.pages, b.pages), 1):
        normalize = lambda text: re.sub(r'\s+', '', text.replace('US Letter', '').replace('A4', ''))
        assert normalize(ap.extract_text()) == normalize(bp.extract_text()), (role, number)

assert CASE_TAG_INSET >= 8  # A cut tag must fit inside its printed placement slot.

print('C08 A4 and Letter: 4 PDFs, 2 ZIPs, content parity, props, private slips, scenes, answers and geometry passed.')
