"""Acceptance checks for the distinct Christmas Home gift workshop PDFs."""

import hashlib
import json
import zipfile
from itertools import permutations
from pathlib import Path

from pypdf import PdfReader

from audit_pdf_layout import audit


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'output' / 'pdf'
source = next(item for item in json.loads(
    (ROOT / 'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8'))
    if item['id'] == 'christmas' and item['setting'] == 'home')
assert source['mechanic'] == 'folded paper gift workshop with split-information drawing and physical quality check'
assert len(source['stages']) == 5
assert [stage['title'] for stage in source['stages']] == [
    'Open the star press', 'Make three paper gifts', 'Share the wrapping plan',
    'Check and repair', 'Build the village display',
]

# The split cards must yield one pattern, without relying on the host answer.
solutions = []
for friends in permutations(('OWL', 'FOX', 'RABBIT')):
    if friends[0] != 'OWL' or friends[2] != 'RABBIT':
        continue
    for ribbons in permutations(('VERTICAL', 'HORIZONTAL', 'DIAGONAL')):
        by_friend = dict(zip(friends, ribbons))
        if by_friend['FOX'] != 'HORIZONTAL' or by_friend['OWL'] == 'DIAGONAL':
            continue
        for seals in permutations(('LOWER LEFT', 'UPPER RIGHT', 'LOWER CENTRE')):
            if seals[1] == 'UPPER RIGHT' and seals[2] == 'LOWER CENTRE':
                solutions.append((friends, ribbons, seals))
assert solutions == [(('OWL', 'FOX', 'RABBIT'),
                      ('VERTICAL', 'HORIZONTAL', 'DIAGONAL'),
                      ('LOWER LEFT', 'UPPER RIGHT', 'LOWER CENTRE'))]

manifest = json.loads((PDF / 'retail-packs-1.0-manifest.json').read_text(encoding='utf-8'))
for paper in ('A4', 'Letter'):
    player_path = PDF / f'christmas-home-player-1.0-{paper}.pdf'
    guide_path = PDF / f'christmas-home-guide-1.0-{paper}.pdf'
    player, guide = PdfReader(player_path), PdfReader(guide_path)
    assert len(player.pages) == 14 and len(guide.pages) == 8
    pt = [' '.join((page.extract_text() or '').split()) for page in player.pages]
    gt = [' '.join((page.extract_text() or '').split()) for page in guide.pages]

    for mission, page in enumerate((4, 6, 8, 10, 12), 1):
        text = pt[page - 1]
        assert f'MISSION {mission} / STORY AND ACTIONS' in text
        assert 'Messenger:' in text and 'Put on the table:' in text
        assert 'Jobs this time:' in text
        assert all(f'{number}.' in text for number in range(1, 5))
        host = gt[mission + 1]
        assert f'HOST / MISSION {mission} / READ, MAKE, CHECK' in host
        assert all(field in host for field in ('Accept when:', 'Hint 1:', 'Hint 2:', 'Then read:'))

    assert all(token in pt[4] for token in ('STAR PRESS', 'ADULT CUT', 'CHILD FOLD'))
    assert all(token in pt[6] for token in ('GIFT A', 'GIFT B', 'GIFT C', 'FRONT', 'BACK'))
    assert 'FRONT is BELOW the fold' in pt[6]
    assert 'RIBBON TRACK' not in pt[6]
    assert all(token in pt[8] for token in ('CLUE 1 / WHO', 'CLUE 2 / RIBBON',
                                            'CLUE 3 / SEAL', 'STAR LAMP', 'SCARF', 'BELL'))
    assert all(token in pt[10] for token in ('QUALITY FRAME', 'PASS / REPAIR / RECHECK'))
    assert 'both DASHED rectangles' in pt[10]
    assert 'ICON > RIBBON > SEAL' in pt[10]
    assert all(token in pt[12] for token in ('OWL WINDOW', 'FOX DEN', 'RABBIT GATE'))
    assert 'A / OWL' not in pt[12] and 'B / FOX' not in pt[12]
    assert 'A REPLY FROM THE WINTER VILLAGE' in pt[13]
    assert 'A REPLY FROM THE WINTER VILLAGE' not in ' '.join(pt[:13])
    assert '12 loose pieces' in gt[0]
    assert 'A / Owl' in gt[4] and 'B / Fox' in gt[4] and 'C / Rabbit' in gt[4]
    assert 'Print Player pages 1-14' in gt[0]
    assert 'Before play, cut only the four page-2 job cards' in gt[0]
    joined = ' '.join(pt + gt)
    assert not any(old in joined for old in ('six routes', 'Office Copy', 'dispatch form',
                                            'secret slip', 'symbol dictionary'))
    for role, path in (('player', player_path), ('guide', guide_path)):
        entry = next(item for item in manifest['items'] if
                     (item['world'], item['setting'], item['paper'], item['role'])
                     == ('christmas', 'home', paper, role))
        assert entry['pages'] == (14 if role == 'player' else 8)
        assert entry['sha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
        report = audit(path)
        assert not report['failures'], report
        assert report['smallest_body_font_pt'] >= 8, report
    with zipfile.ZipFile(PDF / f'christmas-home-{paper}-complete-1.0.zip') as archive:
        assert sorted(archive.namelist()) == sorted([player_path.name, guide_path.name])
        assert archive.testzip() is None
        assert hashlib.sha256(archive.read(player_path.name)).hexdigest() == hashlib.sha256(player_path.read_bytes()).hexdigest()
        assert hashlib.sha256(archive.read(guide_path.name)).hexdigest() == hashlib.sha256(guide_path.read_bytes()).hexdigest()

for name in ('gifts', 'quality'):
    assert (ROOT / 'public/assets' / f'christmas-home-preview-{name}.jpg').stat().st_size > 20000

print('Christmas Home workshop: five distinct missions, 14/8 A4 and Letter pages, 12 props, quality checks, manifest, ZIP and previews passed.')

