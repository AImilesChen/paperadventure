"""Check Dinosaur Home's route logic, printed pieces, handover and two paper sizes."""
import hashlib
import json
import zipfile
from itertools import permutations
from pathlib import Path

from pypdf import PdfReader

from audit_pdf_layout import audit


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'output/pdf'
source = next(game for game in json.loads((ROOT / 'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8'))
              if (game['id'], game['setting']) == ('dinosaur', 'home'))
assert len(source['stages']) == 5
assert [row[0] for row in source['stages'][0]['rows']
        if row[1:] == ['3', 'ROUND', 'RIGHT']] == ['1/S', '3/U', '5/N']
assert dict(source['stages'][1]['rows']) == {
    'A1': 'SUN', 'B1': 'FERN', 'C1': 'BRIDGE',
    'A2': 'HOLLOW', 'B2': 'FORD', 'C2': 'TUNNEL',
}
assert set(row[0] for row in source['stages'][2]['rows']) == {
    'BOOTS', 'LANTERN', 'ROPE', 'SNACK'}

# Edges are formed by the six printed tiles, with CAMP east of TUNNEL.
graph = {'SUN': {'FERN'}, 'FERN': {'SUN', 'BRIDGE', 'FORD'},
         'BRIDGE': {'FERN', 'TUNNEL'}, 'HOLLOW': set(),
         'FORD': {'FERN', 'TUNNEL'},
         'TUNNEL': {'BRIDGE', 'FORD', 'CAMP'}, 'CAMP': {'TUNNEL'}}


def paths(start, end, blocked, seen=()):
    if start == end:
        return [seen + (start,)]
    return [path for next_stop in graph[start] - set(seen) - {blocked}
            for path in paths(next_stop, end, blocked, seen + (start,))]


assert paths('SUN', 'CAMP', 'BRIDGE') == [('SUN', 'FERN', 'FORD', 'TUNNEL', 'CAMP')]
ports = {'SUN': {'E'}, 'FERN': {'W', 'E', 'S'}, 'BRIDGE': {'W', 'S'},
         'HOLLOW': set(), 'FORD': {'N', 'E'}, 'TUNNEL': {'W', 'N', 'E'}}
touches = [(0, 1, 'E', 'W'), (1, 2, 'E', 'W'), (3, 4, 'E', 'W'),
           (4, 5, 'E', 'W'), (0, 3, 'S', 'N'), (1, 4, 'S', 'N'), (2, 5, 'S', 'N')]
map_solutions = []
for rest in permutations([name for name in ports if name != 'SUN']):
    tiles = ('SUN',) + rest
    if tiles[5] != 'TUNNEL':
        continue  # CAMP is beyond the east exit of the lower-right TUNNEL tile.
    if all((first_port in ports[tiles[first]]) == (second_port in ports[tiles[second]])
           for first, second, first_port, second_port in touches):
        map_solutions.append(tiles)
assert map_solutions == [('SUN', 'FERN', 'BRIDGE', 'HOLLOW', 'FORD', 'TUNNEL')]
assert {'FORD': 'BOOTS', 'TUNNEL': 'LANTERN'} == {
    row[1]: row[0] for row in source['stages'][2]['rows'] if row[0] in {'BOOTS', 'LANTERN'}}

manifest = json.loads((PDF / 'retail-packs-1.0-manifest.json').read_text(encoding='utf-8'))
for paper, expected_width in [('A4', 595.2756), ('Letter', 612)]:
    player_path = PDF / f'dinosaur-home-player-1.0-{paper}.pdf'
    guide_path = PDF / f'dinosaur-home-guide-1.0-{paper}.pdf'
    player, guide = PdfReader(player_path), PdfReader(guide_path)
    assert len(player.pages) == 15 and len(guide.pages) == 10
    pt = [' '.join((page.extract_text() or '').split()) for page in player.pages]
    gt = [' '.join((page.extract_text() or '').split()) for page in guide.pages]
    for number, page_no in enumerate([4, 6, 9, 11, 13], 1):
        assert f'CHECKPOINT {number} / READ THE STORY, THEN PLAY' in pt[page_no - 1]
        assert all(f'{step}.' in pt[page_no - 1] for step in range(1, 5))
        assert f'HOST / CHECKPOINT {number} / READ, PLAY, VERIFY' in gt[number + 2]
        assert 'Accept only after checking' in gt[number + 2]
    assert 'cut exactly 16 pieces per team' in ' '.join(gt).lower()
    assert all(f'{number} / {letter}' in pt[4] for number, letter in [(1, 'S'), (3, 'U'), (5, 'N')])
    assert all('SUN' not in pt[index] for index in (0, 1, 3))
    assert all(f'{slot} / TILE SLOT' in pt[6] for slot in ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'])
    assert all(name in pt[7] for name in ['SUN', 'FERN', 'BRIDGE', 'HOLLOW', 'FORD', 'TUNNEL'])
    printed = ['HOLLOW', 'BRIDGE', 'FORD', 'FERN', 'SUN', 'TUNNEL']
    assert [pt[7].index(name) for name in printed] == sorted(pt[7].index(name) for name in printed)
    assert 'BOOTS' not in pt[7] and 'LANTERN' not in pt[7]
    assert 'PATH ENDS: 3' in pt[7] and 'PATH ENDS: 0' in pt[7]
    assert 'BACKPACK / TWO SLOTS ONLY' in pt[9]
    assert all(name in pt[9] for name in ['BOOTS', 'LANTERN', 'ROPE', 'SNACK'])
    assert 'The BRIDGE is CLOSED' in pt[11]
    assert all(answer not in pt[10] for answer in ('FORD', 'TUNNEL', 'BOOTS', 'LANTERN'))
    assert 'cut BLOCK and MILO before play' in pt[11]
    assert 'USED SUPPLIES / SHOW THE ADULT' in pt[11]
    assert '1 / tile:' in pt[11] and '2 / tile:' in pt[11]
    assert 'If none fits, stop' in pt[10]
    assert 'park each used card in a page 12 slot' in pt[10].lower()
    assert 'put each used supply on its tile' not in ' '.join(pt).lower()
    assert 'opening set plus five numbered mission piles' in gt[1].lower()
    assert 'Optional second-route challenge' in gt[8]
    assert 'Camp Guide:' in pt[13] and 'ADULT HOLDS UNTIL FINAL CHECK' in pt[13]
    assert 'hold the welcome on page 14' in ' '.join(gt).lower()
    assert 'THE TABLE / BEFORE PLAY' in gt[0]
    assert len(player.pages[0].images) == 1 and len(player.pages[13].images) == 1
    assert all(not page.images for index, page in enumerate(player.pages) if index not in (0, 13))
    assert hashlib.sha256(player.pages[0].images[0].data).hexdigest() != hashlib.sha256(
        player.pages[13].images[0].data).hexdigest()
    assert all(not page.images for page in guide.pages)
    assert 'OUR START' in pt[12] and 'CLOSED PLACE' in pt[12]
    combined = ' '.join(pt + gt)
    assert all(old not in combined for old in ['PINE SIGN', 'Camp A', 'backpack letter', 'signpost table'])
    for role, path, count in [('player', player_path, 15), ('guide', guide_path, 10)]:
        entry = next(item for item in manifest['items']
                     if (item['world'], item['setting'], item['paper'], item['role']) ==
                     ('dinosaur', 'home', paper, role))
        assert entry['pages'] == count
        assert entry['sha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
        report = audit(path)
        assert report['failures'] == [] and report['warnings'] == [], report
        assert report['smallest_body_font_pt'] >= 8.5
    with zipfile.ZipFile(PDF / f'dinosaur-home-{paper}-complete-1.0.zip') as archive:
        assert sorted(archive.namelist()) == sorted([player_path.name, guide_path.name])
        assert archive.testzip() is None
    width = expected_width - 88
    tile_width = (width - 78) / 3 - 16
    slot_width = (width - 78) / 3 - 4
    tile_height = 424 / 2 - 6
    slot_height = (500 - 55) / 2 - 4
    token_width, token_height = 110, 70
    marker_width, marker_height = 48, 64
    camp_width = 64
    parking_width, parking_height = (width - 197) / 2 - 4, 100
    backpack_slot_width, backpack_slot_height = (width - 42) / 2, 83
    assert slot_width - tile_width >= 12 and tile_height < slot_height
    assert token_width < backpack_slot_width and token_height < backpack_slot_height
    assert token_width < tile_width and marker_width < tile_width
    assert token_height < tile_height and marker_height < tile_height
    assert camp_width - marker_width >= 12
    assert parking_width - token_width >= 20 and parking_height - token_height >= 20

for number in (1, 2):
    assert (ROOT / 'public/assets' / f'dinosaur-home-preview-{number}.jpg').stat().st_size > 20000

print('Dinosaur Home: shuffled tiles, visible road ports, camp finish, 16 cut props, distinct cover/finale art, 15/10 pages, A4/Letter geometry, hints, manifest, ZIPs and previews passed.')

