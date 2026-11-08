"""Structural PDF verification. Physical printing/playtesting is separate."""
import json
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PUZZLES = json.loads((ROOT / 'tmp/free-puzzles-build/puzzles.json').read_text(encoding='utf-8'))
report = []
for file in sorted((ROOT / 'public/assets/free-puzzles').glob('*.pdf')):
    reader = PdfReader(file)
    guide = file.stem.endswith('guide')
    letter = '-Letter-' in file.name
    expected = (612, 792) if letter else (595.28, 841.89)
    assert len(reader.pages) == (6 if guide else 8), file.name
    for page in reader.pages:
        assert abs(float(page.mediabox.width) - expected[0]) < .02
        assert abs(float(page.mediabox.height) - expected[1]) < .02
        assert len(page.extract_text()) > 200
    text = '\n'.join(page.extract_text() for page in reader.pages)
    if guide:
        for puzzle in PUZZLES:
            assert 'Answer: ' + puzzle['answer'] in text, puzzle['id']
            assert puzzle['title'] in text, puzzle['title']
    else:
        assert 'Answer:' not in text
        assert 'Hint 1:' not in text
        for page, puzzle in zip([reader.pages[i] for i in [0,2,3,5,6,7]], PUZZLES):
            assert puzzle['title'] in page.extract_text()
            if puzzle['id'] == 'parcel-queue':
                assert len(page.images) == 0
                assert 'player page 5' in page.extract_text()
                assert 'No turning, overlap or jumping' in page.extract_text()
                cut = reader.pages[4].extract_text()
                assert 'Eleven sliding crates' in cut and '100%' in cut and '23 mm' in cut
            else:
                assert len(page.images) == 1
                assert 'Working notes / explain your thinking:' in page.extract_text()
    report.append({'file': file.name, 'pages': len(reader.pages), 'width': expected[0], 'height': expected[1], 'answer_separation': True})
assert len(report) == 4
for file in sorted((ROOT / 'public/assets/free-puzzles').glob('*players.pdf')):
    route = PdfReader(file).pages[1]
    assert 'The missing delivery route' in route.extract_text()
    assert len(route.images) == 1
    assert 'Answer:' not in route.extract_text()
out = ROOT / 'tmp/free-puzzles-qa'
out.mkdir(parents=True, exist_ok=True)
(out / 'pdf-audit.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
