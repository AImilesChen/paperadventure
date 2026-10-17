"""Check Halloween paper theatre content, inventory and print geometry."""
import re
import zipfile
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

import halloween_paper_theatre as theatre


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
assert len(theatre.MISSIONS) == 5

for paper, dimensions in [('A4', (595.28, 841.89)), ('Letter', (612, 792))]:
    player_path = OUT / f'halloween-home-player-1.0-{paper}.pdf'
    guide_path = OUT / f'halloween-home-guide-1.0-{paper}.pdf'
    player = PdfReader(player_path)
    guide = PdfReader(guide_path)
    assert len(player.pages) == 15 and len(guide.pages) == 10
    text = [re.sub(r'\s+', ' ', page.extract_text() or '') for page in player.pages]
    private = re.sub(r'\s+', ' ', ' '.join(page.extract_text() or '' for page in guide.pages))
    assert all(f'PLAYER / MISSION {i} / STORY AND ACTIONS' in text[n - 1]
               for i, n in enumerate([4, 6, 8, 11, 14], 1))
    for page in [4, 6, 8, 11, 14]:
        assert 'Story to read:' in text[page - 1]
        assert 'Now do these actions:' in text[page - 1]
        assert 'Finished when:' in text[page - 1]
    for label, page in [('BAT', 7), ('OWL', 7), ('PUMPKIN', 7), ('STAR', 7),
                        ('WINDOW 1', 12), ('WINDOW 4', 12), ('NIGHT SKY', 13)]:
        assert label in text[page - 1]
    assert 'ADULT HOLDS UNTIL MISSION 5' in text[14]
    assert 'THREE zigzag tears' in text[4]
    assert 'THREE-TEAR EXAMPLE' in text[4]
    assert 'Recorder writes' not in ' '.join(text)
    assert 'Stage Checker writes or dictates' in text[3]
    assert 'Stage Checker writes or dictates' in text[7]
    assert 'two players hold two each' in text[10]
    assert 'Players return only after the art is hidden' in text[13]
    assert 'Adult only: while players look away' in text[14]
    assert 'Which part of our shared show did you help make?' in text[13]
    assert 'four outer template cards' in text[5]
    assert all(name not in text[12] for name in ['BAT', 'OWL', 'PUMPKIN', 'STAR'])
    assert all(name not in text[11] for name in ['BAT', 'OWL', 'STAR'])
    assert 'PAPER LANTERN IS LIT' in text[14]
    assert '17 loose pieces' in private
    assert all(part in private for part in ['OWL top left', 'BAT top right',
                                           'PUMPKIN bottom left', 'STAR bottom right'])
    assert 'No real candle' in private
    assert 'leave the silhouettes uncut for mission 2' in private
    assert 'DURING mission 2' in private
    assert 'HOST / MISSION 4 / EXACT SCRIPT' in private
    assert 'with three, deal 2/1/1' in private
    assert 'Only now invite children to look again' in private
    assert all(line in private for line in ['NIGHT SKY', 'OLD TREE', 'WARM PORCH',
                                             'FINAL SPARK', 'New finale order'])
    assert all('5723' not in page and 'seal' not in page.lower() for page in text)
    assert all('route strip' not in page.lower() and 'parcel' not in page.lower() for page in text)
    with pdfplumber.open(player_path) as pdf:
        for page in pdf.pages:
            assert abs(page.width - dimensions[0]) < 1
            assert abs(page.height - dimensions[1]) < 1
            assert all(ch['x0'] >= 0 and ch['x1'] <= page.width and
                       ch['top'] >= 0 and ch['bottom'] <= page.height for ch in page.chars)
        # Matching title, fixed-height instructions and identical flowable height
        # place all three printable theatre sheets at the same page position.
        def first_top(page_no, label):
            return next(word['top'] for word in pdf.pages[page_no - 1].extract_words()
                        if word['text'] == label)
        stage_top = first_top(10, 'TOP')
        finale_top = first_top(15, 'OWL')
        facade_top = first_top(12, "PIP'S")
        assert abs(stage_top - finale_top) < 2
        assert 20 < stage_top - facade_top < 35
    with zipfile.ZipFile(OUT / f'halloween-home-{paper}-complete-1.0.zip') as bundle:
        assert len(bundle.namelist()) == 2 and bundle.testzip() is None

print('Halloween theatre: 15/10 pages per paper size, five missions, scripts, printed props, private answers and ZIPs passed.')

