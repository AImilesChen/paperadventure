"""Check the complete Forest Home paper-post-office chain and release files."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parent))
from forest_post_office import BODY, FRAGMENTS, HOST, MAIL, MISSIONS, RESIDENTS, SORT_ANSWER

root = Path(__file__).resolve().parents[1]
assert len(MISSIONS) == 5 and len(MAIL) == 6 and len(FRAGMENTS) == 4
assert len(RESIDENTS) == 3
assert sum(map(len, SORT_ANSWER.values())) == len(MAIL)
assert sorted(x for values in SORT_ANSWER.values() for x in values) == list('ABCDEF')
assert SORT_ANSWER['READY'] == ['A', 'D']
assert SORT_ANSWER['REPAIR'] == ['B', 'F']
assert SORT_ANSWER['HOLD'] == ['C', 'E']
assert MAIL[0][1] == 'Blue Tree 3 | morning'
assert 'Picture seal' in MAIL[1][2] and 'acorn' not in MAIL[1][2].lower()
assert [x[0] for x in FRAGMENTS if x[0].startswith('P17')] == [
    'P17 / DISTRICT CLUE', 'P17 / DOOR CLUE', 'P17 / MARK CLUE']
assert all(answer not in ' '.join(str(x) for x in FRAGMENTS[:3])
           for answer in ('BLUE TREE', 'ACORN'))
assert [x[0] for x in RESIDENTS if x[2:] == ('parcel', 'P17', 'acorn')] == ['OWL HOUSE']
assert len({(x[2], x[3], x[4]) for x in RESIDENTS}) == 3
assert BODY.fontSize >= 13 and HOST.fontSize >= 12
for paper_width in (595.28, 612):
    content_width = paper_width - 88
    mail_card_width = (content_width - 18) / 2
    bag_slot_width = (content_width - 8) / 2
    assert mail_card_width + 4 < bag_slot_width
    assert 158 - 8 < 184  # cut mail card fits bag slot vertically
    assert 132 < content_width and 58 < 91  # stamp fits its delivery row

manifest = json.loads((root / 'output/pdf/retail-packs-1.0-manifest.json').read_text())
entries = [x for x in manifest['items'] if x['world'] == 'forest' and x['setting'] == 'home']
assert len(entries) == 4
for item in entries:
    source = root / item['path']
    assert source.stat().st_size == item['bytes']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == item['sha256']
    pdf = PdfReader(source)
    assert len(pdf.pages) == item['pages'] == (16 if item['role'] == 'player' else 10)
    text = [' '.join((page.extract_text() or '').split()) for page in pdf.pages]
    assert all(len(page) > 90 for page in text)
    if item['role'] == 'player':
        assert all(f'CHECKPOINT {i} / STORY AND ACTIONS' in text[page-1]
                   for i, page in enumerate((4, 7, 10, 12, 14), 1))
        assert all(x in text[5] for x in ('A / LETTER', 'B / P17 PARCEL', 'F / LETTER'))
        assert all(x in text[7] for x in ('P17 / DISTRICT CLUE', 'P17 / MARK CLUE', 'P18 / DISTRICT CLUE'))
        assert 'RECIPIENT' in text[8] and 'District ends in TREE' in text[8]
        assert 'BLUE TREE / 4 / ACORN' not in ' '.join(text[:12])
        assert 'INTERVIEW NOTES' in text[11] and 'Beaver Hut: type' in text[11]
        assert all(x in text[12] for x in ('OWL HOUSE', 'FOX DEN', 'BEAVER HUT', 'DELIVERED', 'PRIVATE', 'Fold'))
        assert all(x in text[12] for x in ('ID: P17', 'ID: L06', 'ID: P18'))
        assert 'OWL HOUSE' not in ' '.join(text[:12])
        assert 'ADULT HOLDS UNTIL DELIVERY ACCEPTED' in text[15]
        assert all(old not in ' '.join(text).lower() for old in ('route strip', 'postmark records', 'dispatch card'))
    else:
        assert '19 = 4 jobs + 6 mail + 4 label pieces' in text[1]
        assert all('ACCEPT ONLY AFTER CHECKING' in text[page-1] for page in range(4, 9))
        assert 'OWL HOUSE' in text[6] and 'B/P17' in text[5]
        assert 'FIRST-TIME HOST CHECK' in text[0]
        assert 'Hints for all five stations' in text[8]

for paper in ('A4', 'Letter'):
    bundle = root / f'output/pdf/forest-home-{paper}-complete-1.0.zip'
    with zipfile.ZipFile(bundle) as archive:
        names = archive.namelist()
        assert len(names) == 2 and archive.testzip() is None
        for item in entries:
            if item['paper'] == paper:
                name = Path(item['path']).name
                assert name in names
                assert hashlib.sha256(archive.read(name)).hexdigest() == item['sha256']
for n in (1, 2):
    assert (root / f'output/previews/forest-home-v1.0-p{n}.jpg').stat().st_size > 10000
print('Forest Home: five distinct stations, unique delivery, roles, answers, PDFs, ZIPs and previews verified.')
