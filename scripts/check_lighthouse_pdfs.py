import json
import re
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import ContentStream
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/lighthouse-qa'
OUT.mkdir(parents=True, exist_ok=True)
report = []
format_text = {}
for file in sorted((ROOT / 'public/assets/lighthouse').glob('*.pdf')):
    reader = PdfReader(file)
    is_guide = file.stem.endswith('guide')
    expected = (612, 792) if '-Letter-' in file.name else (595.28, 841.89)
    assert len(reader.pages) == (4 if is_guide else 7)
    for page in reader.pages:
        assert abs(float(page.mediabox.width) - expected[0]) < .02
        assert abs(float(page.mediabox.height) - expected[1]) < .02
        assert len(page.extract_text()) > 100
    text = '\n'.join(page.extract_text() for page in reader.pages)
    # Compare the shipped formats, not just the content-generation inputs.
    normalized = re.sub(r'\s+', ' ', text.replace('US Letter', 'PAPER').replace('Letter', 'PAPER').replace('A4', 'PAPER')).strip()
    role = 'guide' if is_guide else 'players'
    if role in format_text:
        assert normalized == format_text[role], 'A4 and Letter must contain the same game and instructions'
    format_text[role] = normalized
    with pdfplumber.open(file) as visual:
        for index, page in enumerate(visual.pages):
            for char in page.chars:
                assert char['x0'] >= 20 and char['x1'] <= page.width - 20, f'{file.name} p{index+1}: text outside safe horizontal margins'
                assert char['top'] >= 15 and char['bottom'] <= page.height - 10, f'{file.name} p{index+1}: text clipped at page edge'
    if is_guide:
        for instruction in ['You will need', 'scissors', 'After the lens direction is checked', 'do not require online entry']:
            assert instruction in text
        for answer in ['TMRK', '427', 'EAST', 'BEACON KEEPERS']:
            assert answer in text, answer
    else:
        assert 'Answer:' not in text and 'TMRK' not in text and '427' not in text
        # A playable cut-and-place game needs real physical fit, not just
        # matching illustrations. Check actual PDF image transforms.
        def image_sizes(page):
            operations = ContentStream(page.get_contents(), reader).operations
            return [(float(v[0]), float(v[3])) for v, op in operations
                    if op == b'cm' and float(v[0]) > 50 and float(v[3]) > 50]
        board_w, board_h = image_sizes(reader.pages[2])[0]
        cards = image_sizes(reader.pages[3])
        assert len(cards) == 6
        slot_w, slot_h = board_w * 120 / 540, board_h * 143 / 360
        assert all(cw + 5 < slot_w and ch + 5 < slot_h for cw, ch in cards), 'Cut cards must fit the printed slots'
        lens_sizes = []
        for index in [4, 5]:
            page = reader.pages[index]
            matrices = [tuple(float(x) for x in operands) for operands, operator in ContentStream(page.get_contents(), reader).operations if operator == b'cm']
            assert any(abs(m[0] - 420) < .01 and abs(m[3] - 420) < .01 for m in matrices)
            lens_sizes.append([420, 420])
            assert '30 mm' in page.extract_text()
        assert lens_sizes[0] == lens_sizes[1]
    report.append({'file': file.name, 'pages': len(reader.pages), 'paper': expected, 'answer_separation': True, 'lens_board_and_mask_420pt': True if not is_guide else None, 'module_cards_fit_slots': True if not is_guide else None})
assert len(report) == 4
(OUT / 'pdf-audit.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
from PIL import Image, ImageOps
for group in ['A4-players', 'Letter-players', 'A4-guide', 'Letter-guide']:
    files = sorted(OUT.glob('sleeping-lighthouse-' + group + '-*.png'))
    if not files:
        continue
    contact = Image.new('RGB', (1290, 610 * ((len(files) + 2) // 3)), '#dce9ed')
    for index, file in enumerate(files):
        thumbnail = ImageOps.contain(Image.open(file).convert('RGB'), (410, 580))
        contact.paste(thumbnail, ((index % 3) * 430 + 10, (index // 3) * 610 + 15))
    contact.save(OUT / (group + '-contact.png'))
