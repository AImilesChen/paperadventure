"""Dinosaur Home: a physical map-and-supplies expedition, not a card-selection chain.

The same fixed edition is rendered at A4 and US Letter by generate_retail_packs.
All story clues, usable paper props, host answers and hints live here.
"""
from html import escape

from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import Flowable, Image, Paragraph, Spacer, Table, TableStyle

import generate_celebration_samples as g


BODY = ParagraphStyle('dino-2-body', fontName='Arial', fontSize=13.3, leading=18.7,
                      textColor=g.NAVY, spaceAfter=9)
HOST = ParagraphStyle('dino-2-host', parent=BODY, fontSize=13, leading=18.5, spaceAfter=9)
CARD = ParagraphStyle('dino-2-card', parent=BODY, fontSize=12.1, leading=16.5, spaceAfter=5)
NOTE = ParagraphStyle('dino-2-note', parent=BODY, fontSize=11.2, leading=15, spaceAfter=5)


def p(value, kind='body'):
    style = {'body': BODY, 'host': HOST, 'card': CARD, 'note': NOTE}[kind]
    return Paragraph(value, style)


def heading(title, label):
    return [g.p(label, 'eyebrow'), g.p(title, 'title'), Spacer(1, 5)]


def steps(items, kind='body'):
    return [p(f'<b>{n}.</b> {value}', kind) for n, value in enumerate(items, 1)]


def cut_grid(items, width, cell_height=145):
    rows = []
    for i in range(0, len(items), 2):
        row = [[p(title, 'card'), Spacer(1, 9), p(body, 'card')]
               for title, body in items[i:i + 2]]
        if len(row) == 1:
            row.append([p('UNCUT SPACE', 'card')])
        rows.append(row)
    table = Table(rows, colWidths=[width / 2] * 2,
                  rowHeights=[cell_height] * len(rows))
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    for i in range(len(items)):
        table.setStyle(TableStyle([('BOX', (i % 2, i // 2), (i % 2, i // 2),
                                    1, g.NAVY, 1, (4, 3))]))
    return table


class DrawBoard(Flowable):
    """Text-labelled, colour-independent boards and actual-size cut pieces."""
    def __init__(self, width, kind, height):
        super().__init__()
        self.width, self.height, self.kind = width, height, kind

    def draw(self):
        c, w, h = self.canv, self.width, self.height
        c.setStrokeColor(g.NAVY)
        c.setFillColor(g.NAVY)

        def label(x, y, value, size=11, bold=True):
            c.setFont('ArialBold' if bold else 'Arial', size)
            c.drawString(x, y, value)

        def box(x, y, bw, bh, value='', dashed=False):
            c.setDash(5, 4) if dashed else c.setDash()
            c.roundRect(x, y, bw, bh, 5, fill=0, stroke=1)
            c.setDash()
            if value:
                label(x + 9, y + bh - 19, value)

        if self.kind == 'record':
            rows = [
                '1 / Trail marks spell the start: ______________',
                '2 / My six map tiles fit the board: YES / CHECK AGAIN',
                '3 / My two packed supplies: ______________ + ______________',
                '4 / Safe route after rain: ____ > ____ > ____ > ____ > CAMP',
                '5 / At the camp: show the route and both used supplies.',
            ]
            row_h = (h - 10) / 5
            for i, row in enumerate(rows):
                y = h - (i + 1) * row_h
                box(0, y + 3, w, row_h - 9)
                label(12, y + row_h - 26, row, 11)
                label(12, y + row_h - 51, 'My evidence / action: __________________________________________', 10, False)
                label(12, y + 18, 'Something we changed or checked: _________________________________', 10, False)
        elif self.kind == 'tracks':
            tracks = [
                ('1 / S', 3, 'ROUND', True), ('2 / O', 2, 'ROUND', True),
                ('3 / U', 3, 'ROUND', True), ('4 / A', 3, 'POINT', True),
                ('5 / N', 3, 'ROUND', True), ('6 / R', 3, 'ROUND', False),
            ]
            cw, ch = w / 3, h / 2
            for i, (code, toes, heel, notch) in enumerate(tracks):
                x, y = i % 3 * cw, h - (i // 3 + 1) * ch
                box(x + 3, y + 3, cw - 6, ch - 6, code)
                cx, cy = x + cw / 2, y + ch / 2 + 8
                for t in range(toes):
                    c.circle(cx + (t - (toes - 1) / 2) * 29, cy + 43, 9, fill=0, stroke=1)
                if heel == 'ROUND':
                    c.ellipse(cx - 42, cy - 33, cx + 42, cy + 22, fill=0, stroke=1)
                else:
                    path = c.beginPath()
                    path.moveTo(cx - 42, cy + 19)
                    path.lineTo(cx, cy - 34)
                    path.lineTo(cx + 42, cy + 19)
                    path.close()
                    c.drawPath(path)
                if notch:
                    c.setFillColor(g.PALE)
                    c.rect(cx + 28, cy - 13, 17, 20, fill=1, stroke=0)
                    c.setFillColor(g.NAVY)
                    c.line(cx + 43, cy + 7, cx + 27, cy - 3)
                    c.line(cx + 27, cy - 3, cx + 43, cy - 13)
                label(x + 12, y + 28, f'{toes} TOES / {heel} HEEL', 10)
                label(x + 12, y + 12, 'RIGHT NOTCH' if notch else 'NO NOTCH', 10)
        elif self.kind == 'map':
            label(8, h - 18, 'NORTH  ^  /  Put the six loose tiles on the slots', 11)
            cell_w = (w - 78) / 3
            cell_h = (h - 55) / 2
            top = h - 36
            for row in range(2):
                for col in range(3):
                    x, y = col * cell_w, top - (row + 1) * cell_h
                    box(x + 2, y + 2, cell_w - 4, cell_h - 4,
                        f'{"ABC"[col]}{row + 1} / TILE SLOT', dashed=True)
            camp_x = 3 * cell_w + 8
            camp_y = top - 2 * cell_h + 2
            box(camp_x, camp_y, 64, cell_h - 4, 'CAMP')
            c.setLineWidth(3)
            c.line(3 * cell_w - 2, camp_y + 98, camp_x, camp_y + 98)
            c.setLineWidth(1)
            label(camp_x + 13, camp_y + 34, 'FINISH', 10)
            label(10, 4, 'Follow paths at touching edges. Move MILO to CAMP only at the end.', 10, False)
        elif self.kind == 'tiles':
            # Print order is deliberately unrelated to the solved board order.
            tiles = [
                ('HOLLOW', (), 'A quiet place with no open path.'),
                ('BRIDGE', ('WEST', 'SOUTH'), 'A crossing beneath rain clouds.'),
                ('FORD', ('NORTH', 'EAST'), 'A shallow, wet crossing.'),
                ('FERN', ('WEST', 'EAST', 'SOUTH'), 'A fork with three open paths.'),
                ('SUN', ('EAST',), 'START / Milo waits here.'),
                ('TUNNEL', ('WEST', 'NORTH', 'EAST'), 'A dark passage. CAMP lies east.'),
            ]
            cell_w, ch = (w - 78) / 3, h / 2
            tile_w = cell_w - 16  # 12 pt total clearance against the board slot.
            for i, (name, exits, instruction) in enumerate(tiles):
                x = i % 3 * cell_w + 8
                y = h - (i // 3 + 1) * ch + 3
                tile_h = ch - 6
                box(x, y, tile_w, tile_h, name)
                words = instruction.split(' ')
                line = ''
                line_y = y + tile_h - 48
                for word in words:
                    candidate = (line + ' ' + word).strip()
                    if line and pdfmetrics.stringWidth(candidate, 'Arial', 11.5) > tile_w - 22:
                        label(x + 11, line_y, line, 11.5, False)
                        line_y -= 17
                        line = word
                    else:
                        line = candidate
                label(x + 11, line_y, line, 11.5, False)
                cx, cy = x + tile_w / 2, y + tile_h * .44
                vertical_port_x = x + tile_w - 12
                # Real printed roads reach the edge, with the vertical road in a clear margin.
                c.setStrokeColor(g.CORAL)
                c.setLineWidth(5)
                for side in exits:
                    if side in ('WEST', 'EAST'):
                        c.line(cx, cy, x if side == 'WEST' else x + tile_w, cy)
                    else:
                        mid_y = cy + (16 if side == 'NORTH' else -16)
                        c.line(cx, cy, vertical_port_x, mid_y)
                        c.line(vertical_port_x, mid_y, vertical_port_x,
                               y + tile_h if side == 'NORTH' else y)
                c.setStrokeColor(g.NAVY)
                c.setLineWidth(1)
                c.setFillColor(g.CREAM)
                c.circle(cx, cy, 18, fill=1, stroke=1)
                c.setFillColor(g.NAVY)
                c.setFont('ArialBold', 10)
                c.drawCentredString(cx, cy - 4, {
                    'BRIDGE': 'BR', 'HOLLOW': 'HO', 'SUN': 'SU',
                    'TUNNEL': 'TU', 'FERN': 'FE', 'FORD': 'FO'}[name])
                label(x + 11, y + 13, 'PATH ENDS: ' + str(len(exits)), 11.5)
        elif self.kind == 'backpack':
            box(0, h - 122, w, 120, 'BACKPACK / TWO SLOTS ONLY')
            gap = 14
            half = (w - 42) / 2
            box(14, h - 113, half, 83, 'SLOT 1', dashed=True)
            box(28 + half, h - 113, half, 83, 'SLOT 2', dashed=True)
            label(5, h - 139, 'CUT FOUR SUPPLY TOKENS BELOW. PACK TWO.', 10)
            names = [('BOOTS', 'Dry feet on wet stones.'),
                     ('LANTERN', 'See a dark path clearly.'),
                     ('ROPE', 'Hold on at an open bridge.'),
                     ('SNACK', 'Food for a rest stop.')]
            token_w, token_h = 110, 70
            left = (w - 2 * token_w - 16) / 2
            for i, (name, detail) in enumerate(names):
                x, y = left + i % 2 * (token_w + 16), h - 162 - (i // 2 + 1) * (token_h + 8)
                box(x, y, token_w, token_h, name)
                icon_x, icon_y = x + token_w - 19, y + token_h - 19
                c.saveState()
                c.setStrokeColor(g.NAVY)
                c.setLineWidth(1.4)
                if name == 'BOOTS':
                    c.line(icon_x - 9, icon_y - 6, icon_x + 9, icon_y - 6)
                    c.line(icon_x - 6, icon_y - 6, icon_x - 6, icon_y + 8)
                    c.line(icon_x - 6, icon_y + 8, icon_x + 1, icon_y + 8)
                    c.line(icon_x + 1, icon_y + 8, icon_x + 1, icon_y - 2)
                elif name == 'LANTERN':
                    c.roundRect(icon_x - 7, icon_y - 8, 14, 15, 2, stroke=1, fill=0)
                    c.arc(icon_x - 5, icon_y + 3, icon_x + 5, icon_y + 14, 0, 180)
                    c.line(icon_x - 9, icon_y - 8, icon_x + 9, icon_y - 8)
                elif name == 'ROPE':
                    c.circle(icon_x, icon_y, 8, stroke=1, fill=0)
                    c.circle(icon_x, icon_y, 4, stroke=1, fill=0)
                else:
                    c.roundRect(icon_x - 8, icon_y - 6, 16, 12, 2, stroke=1, fill=0)
                    c.line(icon_x - 3, icon_y + 2, icon_x + 3, icon_y + 2)
                c.restoreState()
                lines = ['']
                for word in detail.split():
                    if len(lines[-1] + ' ' + word) > 18:
                        lines.append('')
                    lines[-1] = (lines[-1] + ' ' + word).strip()
                for j, line in enumerate(lines[:2]):
                    label(x + 9, y + 31 - j * 15, line, 11.5, False)
            box(3, 8, w - 6, 92, 'TEST YOUR TWO-PIECE PACK')
            label(14, 62, 'Rain may shut the bridge. Plan a route that still works.', 11, False)
            label(14, 41, 'Which two pieces keep the route open?', 11)
            label(14, 21, 'Pack only two; keep the other two outside.', 10.5, False)
        elif self.kind == 'storm':
            box(10, h - 164, w - 20, 154, 'STORM NOTICE / ADULT GIVES AT MISSION 4')
            label(28, h - 62, 'The BRIDGE is CLOSED.', 18)
            label(28, h - 88, 'Place the BLOCK marker on the BRIDGE tile.', 11)
            label(28, h - 109, 'Find another connected path from the FERN fork.', 11)
            box(10, 10, 64, 64, 'BLOCK')
            label(31, 26, 'X', 25)
            # CAMP is 64 pt wide. A narrower MILO marker leaves room for cutting error.
            box(88, 10, 48, 64, 'MILO')
            label(102, 26, 'M', 25)
            box(167, 0, w - 177, 154, 'USED SUPPLIES / SHOW THE ADULT')
            label(178, 121, 'Write a tile name; park its used card below.', 10.5, False)
            parking_w = (w - 197) / 2 - 4
            box(178, 14, parking_w, 100, '1 / tile: ________', dashed=True)
            box(186 + parking_w, 14, parking_w, 100, '2 / tile: ________', dashed=True)
            label(12, h - 205, 'TRACE YOUR DETOUR / use the assembled map', 11)
            route_y = h - 262
            for i, name in enumerate(['START', 'NEXT', 'NEXT', 'NEXT', 'CAMP']):
                bx = 8 + i * (w - 16) / 5
                box(bx, route_y, (w - 16) / 5 - 4, 45, name)
            label(12, h - 290, 'Do not copy a route: move MILO and prove each connection.', 10.5, False)
        elif self.kind == 'keepsake':
            box(2, 2, w - 4, h - 4, 'DRAW YOUR EXPEDITION / mark the rainy bridge')
            label(12, 16, 'My favourite part: _______________________________________________', 11, False)
        elif self.kind.startswith('work'):
            number = int(self.kind[-1])
            headings = [
                'TRACK INSPECTION / circle the three matching numbers',
                'MAP BUILDER / point to each shared exit',
                'SUPPLY PLAN / trace the route before packing',
                'SAFE DETOUR / trace with your finger',
                'ARRIVAL CHECK / show the evidence, then welcome Milo',
            ]
            box(0, 0, w, h, headings[number - 1])
            if number == 1:
                for i, value in enumerate(['THREE TOES', 'ROUND HEEL', 'RIGHT NOTCH']):
                    x = 14 + i * (w - 28) / 3
                    box(x, 55, (w - 45) / 3, 83, value)
                label(16, 24, 'Our matching track numbers: ______ + ______ + ______', 12)
            elif number == 2:
                for row in range(2):
                    for col in range(3):
                        x, y = 13 + col * (w - 26) / 3, 24 + (1 - row) * 56
                        box(x, y, (w - 38) / 3, 50, f'{"ABC"[col]}{row + 1}: __________')
                label(16, 12, 'Show why HOLLOW has no usable exit.', 11)
            elif number == 3:
                for i, value in enumerate(['BRIDGE', 'FORD', 'TUNNEL']):
                    x = 14 + i * (w - 28) / 3
                    box(x, 63, (w - 45) / 3, 75, value)
                label(16, 36, 'If the bridge shuts, which two places need supplies?', 11)
                label(16, 15, 'Our two packed pieces: __________________ + __________________', 11)
            elif number == 4:
                for i, value in enumerate(['START', '2', '3', '4', 'CAMP']):
                    x = 10 + i * (w - 20) / 5
                    box(x, 61, (w - 30) / 5, 70, value)
                label(16, 29, 'BLOCK covers BRIDGE; park each used card in a page 12 slot.', 11)
            else:
                for i, value in enumerate(['OUR START', 'CLOSED PLACE', 'TWO TOOLS']):
                    x = 14 + i * (w - 28) / 3
                    box(x, 61, (w - 45) / 3, 77, value)
                label(16, 29, 'Fill this arrival proof before the adult opens the welcome.', 11)
        elif self.kind == 'table':
            box(0, 0, w, h, 'THE TABLE / BEFORE PLAY')
            box(14, 20, w * .49, h - 55, 'ACTIVE TEAM AREA')
            label(26, 67, 'record + jobs + current mission', 10.5, False)
            box(w * .55, h - 91, w * .40, 56, 'HOST ONLY')
            label(w * .55 + 9, h - 76, 'guide + later pages', 10.5, False)
            box(w * .55, 14, w * .40, 50, 'NEXT PILE')
            label(w * .55 + 9, 29, 'give one at a time', 10.5, False)


MISSIONS = [
    ('Read the trail marks', 4, 5,
     'Milo has paused somewhere on the rain-washed paper trail, and the camp guide has lost sight of him. Six prints remain but only some belong to Milo: three toes, a round heel and a tiny right-edge notch. Find his starting place.',
     ['Put the whole track sheet on the table. Do not cut the six printed tracks.',
      'Reader says the three features aloud. Point to toes, heel and right edge on one track.',
      'Circle every track with ALL three features. Read the letters on the matching tracks in number order.',
      'Recorder writes the three-letter start on page 3; Checker explains why one other print fails.'],
     'SUN', 'The matching tracks are 1/S, 3/U and 5/N. They spell SUN.'),
    ('Rebuild the expedition map', 6, 7,
     'Milo waits at the sunny trailhead. A gust has scattered the camp map across the table. The guide can still see CAMP beyond the east side of the lower-right space. Rebuild the paths so Milo can travel without stepping across a gap.',
     ['Adult gives map board page 7 and the six cut tiles from page 8. Keep NORTH pointing up.',
      'Put SUN at A1. CAMP is east of C2; find the tile that says CAMP lies east. Fit every other tile so an open path faces another open path. A closed edge must not face a path.',
      'Check the three-way FERN fork, the isolated HOLLOW and both ways into TUNNEL. Trace each continuous road with a finger.',
      'Point to SUN as Milo\'s start. Checker shows the whole map to the adult; Recorder marks row 2 on page 3.'],
     'SUN > FERN; FERN > BRIDGE or FORD; both meet TUNNEL',
     'The six tiles follow the positional clues: top SUN FERN BRIDGE, bottom HOLLOW FORD TUNNEL. SUN meets FERN; FERN meets BRIDGE and FORD; both branches meet TUNNEL. HOLLOW has no open path.'),
    ('Pack for the possible detour', 9, 10,
     'The camp guide watches dark clouds above the bridge. The short crossing might close. A wet ford and a dark tunnel form another route, but Milo\'s paper backpack has only two spaces. What will keep him moving if the storm arrives?',
     ['Read the weather report on this page, then inspect all four supply cards on page 10.',
      'Adult gives the four pre-cut supply tokens from page 10. Place exactly TWO in the backpack slots.',
      'Trace both possible routes with a finger. Explain why your two packed pieces still work if BRIDGE closes.',
      'Checker shows the two tokens to the adult. Recorder writes them on page 3. Leave unused tokens beside the board.'],
     'BOOTS + LANTERN', 'BOOTS are needed at FORD; LANTERN is needed at TUNNEL. ROPE cannot reopen a closed bridge; SNACK solves no obstacle.'),
    ('Follow the changed route', 11, 12,
     'A clap of thunder reaches the FERN fork. The bridge is now shut. Milo pauses on the paper trail and waits while your team tests every connection of the safer detour.',
     ['Adult gives page 12 and its two pre-cut markers. Put BLOCK on BRIDGE and MILO on SUN.',
      'Move MILO SUN to FERN. Do not move onto the blocked BRIDGE. Name a connected next tile.',
      'Check each path join. Before MILO enters a wet or dark tile, show a matching packed card. If none fits, stop. After moving, park that card in a page 12 slot and write the tile name.',
      'Recorder writes the safe route on page 3. Checker shows the host the blocked tile, route and two supplies.'],
     'SUN > FERN > FORD > TUNNEL > CAMP', 'BRIDGE is blocked. The connected detour is SUN > FERN > FORD > TUNNEL > CAMP. BOOTS and LANTERN are parked in the page 12 used-supply slots, labelled FORD and TUNNEL.'),
    ('Bring Milo home', 13, 14,
     'The tunnel opens to a small camp. The guide has one last request: make an arrival proof from the decisions your team actually made. Then Milo can step into the welcome light.',
     ['Move MILO from TUNNEL into the separate CAMP finish area on the map board.',
      'Fill the arrival proof below: write or dictate the start, the closed place and the two tools used. Do not move or cover your evidence yet.',
      'Each player points to one action they completed. Checker compares the proof with the map, BLOCK and used tokens.',
      'Adult checks the route, reads the held-back welcome on page 14 and gives the keepsake on page 15.'],
     'Milo reaches CAMP by the safe detour', 'Accept when Milo fits inside the CAMP finish area and the team can show the blocked bridge, full route and both used supplies in the labelled page 12 slots.'),
]

ROLE_CUES = [
    'Reader names the three track features; Mapmaker points to each print; Supply Keeper sorts the matches; Checker &amp; Recorder writes the three-letter start.',
    'Reader reads the map rule; Mapmaker places tiles; Supply Keeper tests the path edges; Checker &amp; Recorder checks and records the completed map.',
    'Reader reads the weather report; Mapmaker traces both routes; Supply Keeper packs two cards; Checker &amp; Recorder asks why they survive a closure.',
    'Reader announces the storm; Mapmaker moves MILO; Supply Keeper parks each used card on page 12; Checker &amp; Recorder records the route.',
    'Reader tells the journey back; Mapmaker parks MILO at CAMP; Supply Keeper shows used tokens; Checker &amp; Recorder fills and checks the arrival proof.',
]

TRANSITIONS = [
    'The marks read SUN. "That is where I last saw Milo," says the guide. "But the wind has scattered our map."',
    'The paths join. "Now I can see two ways forward," says Milo. "Those clouds make me wonder which one will stay open."',
    'Milo closes his two-slot pack. "I hope we chose well," he says. A rumble comes from the bridge.',
    'The detour holds. Milo can see the camp light beyond the tunnel, but the guide needs proof that the team travelled safely.',
    'The guide smiles at the proof. "You found a path when the bridge closed," she says. "Milo, the camp is ready for you!"',
]


def mission_page(number, width):
    title, task_page, prop_page, story, actions, result, why = MISSIONS[number - 1]
    return (heading(title, f'CHECKPOINT {number} / READ THE STORY, THEN PLAY') +
            [g.box(escape(story), width), Spacer(1, 10),
             p(('<b>Put on the table:</b> record page 3, the assembled map and the page 12 used-supply slots. '
                'The adult holds the welcome on page 14 until the route is checked.' if number == 5 else
                f'<b>Put on the table:</b> record page 3' +
                (', the assembled map' if number > 2 else '') + f', and player page {prop_page}' +
                (' plus page 8' if number == 2 else '') + '. The adult holds later missions.'), 'note'),
             p('Each job now: ' + ROLE_CUES[number - 1], 'note'),
             p('Do this together', 'body')] + steps(actions) +
            [Spacer(1, 9), DrawBoard(width, f'work{number}', 160 if number == 2 else 178), Spacer(1, 8),
             g.box('BEFORE ASKING FOR THE NEXT PAGE: ' +
                                  ('show the host your evidence and record the discovery.' if number < 5
                                   else 'show the host your complete physical route and used supplies.'), width),
             Spacer(1, 3)])


def player(s, width):
    pages = []
    pages.append(heading(s['title'], 'PLAYER PACK / DINOSAUR HOME') +
                 [p('Milo is safe somewhere on the paper trail. Find his starting place, rebuild a map, choose two supplies and guide him through changing weather to camp.'),
                  Image(str(g.ROOT / s['cover']), width=420, height=315, kind='proportional'),
                  Spacer(1, 12), p('Five connected missions', 'body'),
                  p('Read trail marks > build six landscape tiles > pack two supplies > adapt the route > move Milo to camp.'),
                  g.box('Everything used in the story is printed here. Adult: keep the welcome page hidden, give one mission at a time and follow the separate Host Guide.', width),
                  p('Ages 6-12 with adult reading help when needed. One team of 2-6; for 7-12 players print a second complete Player Pack and run two teams.')])
    pages.append(heading('Your explorer team', 'PLAYER PAGE 2 / CUT FOUR JOB CARDS') +
                 [p('These are game jobs, not story characters. Everyone may suggest a route. Give each child a job or pair, then pass the jobs after missions 1-4.'),
                  cut_grid([
                      ('READER / CUT', '<b>1</b> Read the track clues.<br/><b>2</b> Read the map rule aloud.<br/><b>3</b> Read the weather report.<br/><b>4</b> Announce the storm.<br/><b>5</b> Tell the journey back.'),
                      ('MAPMAKER / CUT', '<b>1</b> Point to each print.<br/><b>2</b> Place six terrain tiles.<br/><b>3</b> Trace both route choices.<br/><b>4</b> Move MILO one tile at a time.<br/><b>5</b> Park MILO at CAMP.'),
                      ('SUPPLY KEEPER / CUT', '<b>1</b> Sort the matching prints.<br/><b>2</b> Test facing path ends.<br/><b>3</b> Pack exactly two supplies.<br/><b>4</b> Show each tool, then park it on p12.<br/><b>5</b> Show both used tools.'),
                      ('CHECKER &amp; RECORDER / CUT', '<b>1</b> Check three features; write the start.<br/><b>2</b> Check every path edge; log the map.<br/><b>3</b> Ask why the pack works if rain comes.<br/><b>4</b> Record the safe route.<br/><b>5</b> Fill and check the arrival proof.'),
                  ], width, 221),
                  p('Two players: A holds Reader + Checker &amp; Recorder; B holds Mapmaker + Supply Keeper. Swap bundles after each mission. Three players: A holds Reader + Checker &amp; Recorder; the others hold one job each. Five or six: pair Reader and Mapmaker; partners swap speaking or moving. No one is eliminated.')])
    pages.append(heading('Our expedition record', 'PLAYER PAGE 3 / KEEP WHOLE') +
                 [p('Keep this sheet beside the map. Write or dictate one row after each mission. You may erase and correct. An invented team name is enough: __________________'),
                  DrawBoard(width, 'record', 474),
                  Spacer(1, 9), p('A younger player can point, place a tile or say a clue while an adult writes. The journey stays at the table; no outdoor trail or real animal is involved.')])
    pages.append(mission_page(1, width))
    pages.append(heading('The six rain-marked tracks', 'CHECKPOINT 1 / PAGE 5 / KEEP WHOLE') +
                 [p('Milo has THREE toes, a ROUND heel and a RIGHT notch. Circle all matching prints. Read their letter labels in track-number order. The large drawings carry the same information as the written labels.'),
                  DrawBoard(width, 'tracks', 485)])
    pages.append(mission_page(2, width))
    pages.append(heading('The expedition map', 'CHECKPOINT 2 / PAGE 7 / KEEP WHOLE') +
                 [p('Keep this board whole and flat. Place the six cut landscape tiles from page 8 inside the six slots. CAMP is a separate finish area, not a seventh tile.'),
                  DrawBoard(width, 'map', 500),
                  p('A path ending at one tile edge must continue from the touching edge of the next tile. Keep this board through mission 5.')])
    pages.append(heading('Six landscape tiles', 'CHECKPOINT 2 / PAGE 8 / CUT SIX TILES') +
                 [p('Adult: cut the SIX outer rectangles, keeping each name and path edge on its piece. The pieces are printed out of map order. Do not trim the coloured path ends.'),
                  DrawBoard(width, 'tiles', 424),
                  p('No-cut option: write the six names and paths into the board slots. The host may point to the path ends on this whole page.')])
    pages.append(mission_page(3, width))
    pages.append(heading('Pack exactly two supplies', 'CHECKPOINT 3 / PAGE 10 / CUT FOUR TOKENS') +
                 [p('Adult: cut the FOUR lower supply rectangles. Keep the backpack mat whole. The short BRIDGE route could close; the FORD has wet stones and the TUNNEL is dark. Choose for the route that remains safe.'),
                  DrawBoard(width, 'backpack', 452),
                  p('Place the two selected tokens in the slots. The other two remain visible but unpacked. Supplies are paper game pieces; you do not need real boots or a lamp.')])
    pages.append(mission_page(4, width))
    pages.append(heading('The bridge closes', 'CHECKPOINT 4 / PAGE 12 / CUT TWO MARKERS') +
                 [p('Adult: cut BLOCK and MILO before play and keep them with this page. Give the page and both markers only after the team has packed two supplies. Put the storm notice where everyone can read it.'),
                  DrawBoard(width, 'storm', 460),
                  Spacer(1, 10), p('Board rule: move only through facing printed path ends. BRIDGE is out of play. Before entering a wet or dark tile, show a matching packed card; if none matches, stop. Park each used card in a page 12 slot and write the tile name so the road stays visible.')])
    pages.append(mission_page(5, width))
    pages.append(heading('A welcome at camp', 'PAGE 14 / ADULT HOLDS UNTIL FINAL CHECK') +
                 [p('Camp Guide: "Milo! We saw your tracks at SUN, rebuilt the paths and packed for the storm. When the bridge closed, your team used the ford and tunnel. They checked every step and brought you safely home."'),
                  Spacer(1, 15), Image(str(g.ROOT / 'public/assets/dinosaur-home-camp-v1.jpg'), width=420, height=315, kind='proportional'),
                  Spacer(1, 15), g.box('THE GATE OPENS / the route, the two used tools and the arrival proof belong to your team.', width),
                  Spacer(1, 12), p('Ask each player to show one contribution, then give the keepsake on page 15. Milo is home; no additional prop or prize is needed.')])
    pages.append(heading('My expedition keepsake', 'PAGE 15 / KEEP WHOLE') +
                 [p('Draw the map, Milo or your favourite moment. Show where the storm changed your plan. An adult may write your words.'),
                  g.box('We started at: _________<br/><br/>We avoided: _________<br/><br/>We used _________ at FORD and _________ at TUNNEL.<br/><br/>I helped by: ______________________________________________', width),
                  Spacer(1, 15), DrawBoard(width, 'keepsake', 375)])
    return pages


def guide(s, width, counts, base):
    pages = []
    pages.append(heading('Run Milo\'s paper expedition', 'HOST GUIDE / DINOSAUR HOME') +
                 [p('Keep this guide away from players. One adult hosts 2-6 children aged 6-12; for 7-12 children, print two complete Player Packs for two teams.', 'host'),
                  DrawBoard(width, 'table', 164), Spacer(1, 12),
                  p('Before the children sit down', 'host'),
                  p('<b>1.</b> Print Player Pack pages 1-15 once per team, single-sided at Actual size. Choose A4 or US Letter.', 'host'),
                  p('<b>2.</b> Cut 4 jobs (p2), 6 terrain tiles (p8), 4 supplies (p10), BLOCK and MILO (p12). Set out a pencil and flat table.', 'host'),
                  p('<b>3.</b> Sort five numbered mission piles. Give pages 1-3 first; hold pages 4-15, especially the welcome on p14.', 'host'),
                  p('<b>4.</b> Read each mission scene, give only that mission, check the physical evidence and read its story transition before the next pile.', 'host'),
                  g.box('Everything the game names is printed in the Player Pack. Children move paper pieces on the table; no real river, lamp or dinosaur toy is needed.', width),
                  Spacer(1, 14), p('The five moves', 'host'),
                  p('1 / Match Milo\'s tracks.  2 / Fit the shuffled map.  3 / Pack two supplies.  4 / Reroute after rain.  5 / Finish the arrival proof.', 'host')])
    pages.append(heading('Print, cut and sort', 'HOST / PREPARATION') +
                 [p('Print Player Pack pages 1-15 once per team, single-sided, at Actual size / 100%. Do not use fit-to-page or several pages per sheet. Select A4 or US Letter to match your printer. Keep the guide on a screen or print it separately.', 'host'),
                  p('Cut exactly 16 pieces per team: 4 job cards (p2), 6 map tiles (p8), 4 supply tokens (p10), BLOCK and MILO markers (p12). Cut outer rectangles only; keep labels and rule text. Scissors are used by an adult before play.', 'host'),
                  p('Prepare an opening set plus five numbered mission piles:', 'host'),
                  g.grid(['Pile','Player pages','Adult action'],[
                      ['Opening','1-3','Give cover, jobs and record.'],
                      ['1 / Tracks','4-5','Give after reading the opening.'],
                      ['2 / Map','6-8','Give board and all six cut tiles.'],
                      ['3 / Supplies','9-10','Give backpack mat and four cut tokens.'],
                      ['4 / Storm','11-12','Give only after supply choice.'],
                      ['5 / Arrival','13; hold 14-15','Read page 14 after route check; give 15.'],
                  ], [width*.2,width*.24,width*.56]),
                  p('Also have a pencil and a flat table. No envelope, dice, screen, printer during play, special prop or purchased prize is required. An adult may write for a child.', 'host'),
                  p('No-cut fallback: circle track marks on page 5; write tile names and edge paths into map slots using page 8 as a reference; circle BOOTS and LANTERN on page 10; draw X on BRIDGE and redraw M at each stop. Record each used supply in the page 12 parking slots.', 'host')])
    pages.append(heading('Set out the table', 'HOST / ZERO-MINUTE CHECK') +
                 [p('Before players arrive, count all pieces against page 2. Keep pages 4-15 in numbered piles, with page 14 turned face down. Give page 3 and four jobs to the team. Set an empty space for the map.', 'host'),
                  p('Paper-size check: place one cut map tile inside a board slot before play. Its path endpoints and name must remain visible. The tile has extra cut tolerance; do not trim the printed path. Verify the right notch on tracks 1, 3 and 5.', 'host'),
                  p('For 2 players: A takes Reader + Checker & Recorder; B takes Mapmaker + Supply Keeper, then swap bundles each mission. For 3, combine Reader with Checker & Recorder. For 4, one job each. For 5-6, pair Reader and Mapmaker; partners alternate speaking and moving.', 'host'),
                  p('Tell players: "We stay at the table. Try, check the paper and change your mind. I will reveal one mission at a time."', 'host')])
    pages.append(heading('How the journey flows', 'HOST / RUN OF SHOW') +
                 [p('Read each mission story before giving its prop page. Let players handle the paper before asking for a spoken answer. Keep the assembled map and record visible from mission 2 onward.', 'host'),
                  p('At every handover: (1) ask Checker for an action and a printed reason, (2) compare with the exact answer in this guide, (3) allow correction without a penalty, (4) write one result on page 3, (5) pass jobs, (6) give the next pile.', 'host'),
                  p('The map has two branches. BRIDGE is usable until the mission 4 storm; FORD then becomes the safe detour. The two-slot backpack must cover wet stones and darkness. Let children propose and test a route before you reveal the answer.', 'host'),
                  p('All obstacles are labelled paper tiles. No real travel, water crossing, animal handling or lamp use is part of the game.', 'host')])
    for i, (title, task_page, prop_page, story, actions, result, why) in enumerate(MISSIONS, 1):
        next_line = (f'Pass jobs and give mission {i+1}.' if i < 5
                     else 'Read player page 14 aloud and give page 15.')
        pages.append(heading(title, f'HOST / CHECKPOINT {i} / READ, PLAY, VERIFY') +
                     [p(('Give player page 13 only; hold the welcome on page 14 until the final route check.' if i == 5 else
                         f'Prepare and distribute player page {task_page} and prop page {prop_page}' +
                         (' plus the six tiles on page 8' if i == 2 else '') + '. Keep later pages hidden.'), 'host'),
                      p('Read the story aloud', 'host'), g.box(escape(story), width), Spacer(1, 7),
                      p('Lead the printed actions', 'host')] + steps(actions, 'host') +
                     [p('Accept only after checking', 'host'), g.box(escape(why), width), Spacer(1, 7),
                      p('If unsure, ask for printed evidence, then use guide page 9 hints. Keep later pages hidden.', 'host'),
                      p('Story feedback - read aloud', 'host'), g.box(escape(TRANSITIONS[i - 1]), width), Spacer(1, 7),
                      p(f'<b>Handover:</b> Confirm the record entry. {next_line}', 'host')])
    pages.append(heading('Hints without taking over', 'HOST / PROGRESSIVE HINTS') +
                 [p('Offer one hint, let the team try, then offer the next if needed. A hint does not remove a player. If the team is stuck, reveal the needed result and continue the story.', 'host'),
                  g.grid(['Mission','Hint 1','Hint 2','Direct help'],[
                      ['1','Count toes.','Check heel and right edge.','Circle 1, 3, 5; read SUN.'],
                      ['2','Find NORTH.','Put SUN top-left, FERN east.','Top SUN FERN BRIDGE; bottom HOLLOW FORD TUNNEL.'],
                      ['3','Read FORD.','Read TUNNEL; two slots.','Pack BOOTS and LANTERN.'],
                      ['4','BLOCK covers BRIDGE.','Return to FERN; find another exit.','SUN FERN FORD TUNNEL CAMP.'],
                      ['5','Move MILO to CAMP.','Show both used tokens.','BOOTS at FORD; LANTERN at TUNNEL.'],
                  ], [width*.12,width*.23,width*.27,width*.38]),
                  p('If a child selects ROPE because the bridge appears shorter, agree that it could help only while the bridge is open. After the printed storm, no supply makes the closed bridge safe. Allow the team to repack before tracing.', 'host'),
                  p('If a tile is missing, use the no-cut option: write the printed names and exits in the corresponding board slots. Never invent a new tile rule.', 'host'),
                  p('Optional second-route challenge / after the ending', 'host'),
                  p('For confident players, ask: "Imagine FORD closed instead of BRIDGE. Without moving any tiles, can Milo still reach CAMP? Which of your two packed supplies would be unused?" Let them move MILO and explain every path edge. Answer: SUN > FERN > BRIDGE > TUNNEL > CAMP; BOOTS is unused, LANTERN still helps at the dark tunnel. This is a bonus thought experiment, not a change to the five-mission story.', 'host')])
    pages.append(heading('Play with different readers', 'HOST / ACCESS AND PACING') +
                 [p('Early readers: read a sentence aloud, let a child point to the matching print or tile, and write their dictated entry. The written labels duplicate all visual distinctions; colour is never the sole clue.', 'host'),
                  p('Confident readers: ask why HOLLOW is disconnected, why ROPE cannot make a closed bridge usable, or which tile pairs have matching exits. These are optional explanations, not extra gates.', 'host'),
                  p('Quiet players: invite a concrete action: place SUN in A1, point north, move BOOTS to FORD or show the blocked tile. No acting voice is required.', 'host'),
                  p('Two teams: print each team a full Player Pack. Check each route independently and keep the two sets separate. The guide can be shared by the adult.', 'host')])
    pages.append(heading('Ending and reset', 'HOST / FINAL CHECK') +
                 [p('Before the welcome, confirm five visible facts: SUN on record row 1; six tiles in their A1-C2 slots; BOOTS and LANTERN selected; BLOCK on BRIDGE; MILO inside CAMP after going through FORD and TUNNEL, with the two used cards in the labelled page 12 slots.', 'host'),
                  p('If one item is missing, return to that player page and let the team correct it. Ask one child to name the changed decision and another to show the paper evidence. Then read the full welcome on player page 14.', 'host'),
                  p('The keepsake on page 15 asks children to show where the plan changed, not to guess a final answer. Let them draw and write only if they want to.', 'host'),
                  p('Reset: erase pencil, gather 6 tiles, 4 supplies, 2 markers and 4 jobs, then restack missions 1-5. Hide the ending. Replay uses the same route with new jobs.', 'host')])
    # Pair short host sections without compressing the five read/play/verify pages.
    return [
        pages[0],
        pages[1],
        pages[2] + [Spacer(1, 17)] + pages[3],
        pages[4], pages[5], pages[6], pages[7], pages[8],
        pages[9],
        pages[10] + [Spacer(1, 17)] + pages[11],
    ]


