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
    assert len(reader.pages) == (4 if guide else 6), file.name
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
        for page, puzzle in zip(reader.pages, PUZZLES):
            assert puzzle['title'] in page.extract_text()
            assert len(page.images) == 1
            assert 'Working notes / explain your thinking:' in page.extract_text()
    report.append({'file': file.name, 'pages': len(reader.pages), 'width': expected[0], 'height': expected[1], 'answer_separation': True})
assert len(report) == 4
out = ROOT / 'tmp/free-puzzles-qa'
out.mkdir(parents=True, exist_ok=True)
(out / 'pdf-audit.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
