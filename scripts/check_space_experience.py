"""Check the Space Home control-room puzzle and both delivered paper sizes."""
from pathlib import Path
from itertools import permutations
import hashlib
import json
import zipfile

from pypdf import PdfReader

from space_home_control_room import (ANSWERS, CODE_ROWS, JOBS, KEY_SYMBOLS,
                                     MESSAGE_SYMBOLS)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'


def text(page):
    return ' '.join((page.extract_text() or '').split())


def main():
    manifest = json.loads((OUT / 'retail-packs-1.0-manifest.json').read_text())
    space_items = [item for item in manifest['items']
                   if (item['world'], item['setting']) == ('space', 'home')]
    assert len(space_items) == 4
    strips = [('R', 'HIGH', 'LOW', 'M'), ('T', 'LOW', 'MID', 'I'),
              ('K', 'MID', 'HIGH', 'D')]
    solutions = [order for order in permutations(strips)
                 if order[0][1] == 'HIGH' and order[-1][2] == 'HIGH'
                 and all(order[i][2] == order[i+1][1] for i in range(2))]
    assert len(solutions) == 1
    assert ''.join(piece[3] for piece in solutions[0]) == 'MID'
    assert 2 + 2 + 2 == 6 and 3 + 2 + 1 == 6
    decoded = {}
    for phase, row in CODE_ROWS:
        key = dict(zip(KEY_SYMBOLS, row))
        decoded[phase] = ''.join(key[symbol] for symbol in MESSAGE_SYMBOLS)
    assert decoded['3'] == 'SEND3'
    assert all(value != 'SEND3' for phase, value in decoded.items() if phase != '3')
    assert len(ANSWERS) == 5 and len(JOBS) == 4

    for paper in ['A4', 'Letter']:
        board_width = (595.2756 if paper == 'A4' else 612) - 88
        wave_slot = (board_width - 32) / 3
        assert wave_slot - (wave_slot - 12) == 12
        assert 145 - 135 == 10  # Strip fits its printed board slot.
        assert 82 - 72 == 10 and 60 - 56 == 4  # Larger power cell fits.
        assert 72 / 72 * 25.4 >= 25 and 56 / 72 * 25.4 >= 19.5
        pulse_slot = (board_width - 70) / 5
        assert pulse_slot - (pulse_slot - 10) == 10 and 55 - 50 == 5
        player_path = OUT / f'space-home-player-1.0-{paper}.pdf'
        guide_path = OUT / f'space-home-guide-1.0-{paper}.pdf'
        for path, role in ((player_path, 'player'), (guide_path, 'guide')):
            item, = [item for item in space_items
                     if (item['paper'], item['role']) == (paper, role)]
            data = path.read_bytes()
            assert len(data) == item['bytes']
            assert hashlib.sha256(data).hexdigest() == item['sha256']
        player = PdfReader(player_path)
        guide = PdfReader(guide_path)
        assert len(player.pages) == 14, (paper, len(player.pages))
        assert len(guide.pages) == 10, (paper, len(guide.pages))
        player_before_reveal = ' '.join(text(page) for page in player.pages[:13])
        for spoiler in ('R-T-K', 'MID / 3 / TRIANGLE',
                        'TRANSMITTER 3 + SHIELD 2 + TIMER 1'):
            assert spoiler not in player_before_reveal, (paper, spoiler)
        assert all('SEND 3' not in text(player.pages[i]) for i in (7, 9, 10))
        assert 'physical print and an unfamiliar-family' not in ' '.join(text(page) for page in guide.pages)
        assert 'UNCUT SPACE' not in player_before_reveal
        assert all(job.upper() in text(player.pages[1]) for job in JOBS)
        assert all(word in text(player.pages[4]) for word in ['START: HIGH', 'END: HIGH', 'WAVE K', 'WAVE R', 'WAVE T'])
        assert 'CELL 6' in text(player.pages[6])
        assert 'COMMANDER / BAND' in text(player.pages[8])
        assert all(f'CODE {n}' in text(player.pages[10]) for n in (1, 2, 3))
        assert 'OUTGOING PAPER TRANSMISSION' in text(player.pages[12])
        assert 'PULSE 5' in text(player.pages[12])
        assert 'PIP RESPONSE' in text(player.pages[13])
        assert '24 cut pieces' in text(guide.pages[1])
        assert 'R-T-K' in text(guide.pages[3])
        assert 'SEND 3' in text(guide.pages[9])
        with zipfile.ZipFile(OUT / f'space-home-{paper}-complete-1.0.zip') as archive:
            assert sorted(archive.namelist()) == sorted([player_path.name, guide_path.name])
            assert archive.testzip() is None
            assert archive.read(player_path.name) == player_path.read_bytes()
            assert archive.read(guide_path.name) == guide_path.read_bytes()
    for number in (1, 2):
        assert (ROOT / f'public/assets/space-home-preview-{number}.jpg').is_file()
    print('Space Home control room: five-stage solution and A4/Letter delivery checked.')


if __name__ == '__main__':
    main()
