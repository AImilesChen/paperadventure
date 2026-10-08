"""Build internal Forest H04/C04 paper-game drafts from the approved theme blueprint."""

from pathlib import Path
from math import cos, pi, sin
from reportlab.lib import colors
from reportlab.platypus import Flowable
from generate_space_samples import PaperRouteWorkspace, render_drafts


ROOT = Path(__file__).resolve().parents[1]


class PostmarkCards(Flowable):
    """Four countable postmarks with a printed equivalent for every clue."""

    def __init__(self, width, rows, setting):
        super().__init__()
        self.width = width
        self.height = 193
        self.rows = rows
        self.setting = setting

    @staticmethod
    def star(canvas, cx, cy):
        path = canvas.beginPath()
        for point in range(10):
            angle = pi / 2 + point * pi / 5
            radius = 5.4 if point % 2 == 0 else 2.4
            x, y = cx + radius * cos(angle), cy + radius * sin(angle)
            (path.moveTo if point == 0 else path.lineTo)(x, y)
        path.close()
        canvas.drawPath(path, fill=0, stroke=1)

    def draw(self):
        c = self.canv
        c.saveState()
        gutter = 10
        card_width = (self.width - gutter) / 2
        card_height = 91
        for index, (letter, border, count, day, batch) in enumerate(self.rows):
            x = (index % 2) * (card_width + gutter)
            y = (1 - index // 2) * (card_height + gutter)
            c.setStrokeColor(colors.HexColor("#8BAFC1"))
            c.setLineWidth(.9)
            c.roundRect(x, y, card_width, card_height, 6, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#153B56"))
            c.setFont("ArialBold", 8.8)
            c.drawString(x + 9, y + 75, f"POSTMARK {letter}")
            c.setStrokeColor(colors.HexColor("#153B56"))
            c.setLineWidth(1.35)
            cx, cy = x + 34, y + 42
            if self.setting == "home":
                if border == "Leaf":
                    leaf = c.beginPath()
                    leaf.moveTo(cx - 17, cy - 8)
                    leaf.curveTo(cx - 15, cy + 12, cx + 5, cy + 19, cx + 17, cy + 8)
                    leaf.curveTo(cx + 12, cy - 11, cx - 8, cy - 18, cx - 17, cy - 8)
                    leaf.close()
                    c.drawPath(leaf)
                    c.line(cx - 15, cy - 8, cx + 13, cy + 7)
                else:
                    moon = c.beginPath()
                    moon.moveTo(cx + 9, cy + 17)
                    moon.curveTo(cx - 17, cy + 15, cx - 17, cy - 14, cx + 8, cy - 18)
                    moon.curveTo(cx - 2, cy - 8, cx - 2, cy + 7, cx + 9, cy + 17)
                    moon.close()
                    c.drawPath(moon)
                for mark in range(int(count)):
                    self.star(c, x + 59 + mark * 13, cy + 6)
                count_label = f"STARS  {count}"
            else:
                if border == "Round":
                    c.circle(cx, cy, 19, fill=0, stroke=1)
                else:
                    c.rect(cx - 19, cy - 19, 38, 38, fill=0, stroke=1)
                for mark in range(int(count)):
                    dx = [-9, 0, 9][mark]
                    c.circle(cx + dx, cy, 2.5, fill=1, stroke=0)
                count_label = f"DOTS  {count}"
            c.setFillColor(colors.HexColor("#36546A"))
            c.setFont("ArialBold", 8.4)
            tx = x + 86
            c.drawString(tx, y + 57, f"BORDER  {border.upper()}")
            c.drawString(tx, y + 42, count_label)
            c.drawString(tx, y + 27, f"DAY  {day}")
            c.drawString(tx, y + 12, f"BATCH  {batch}")
        c.restoreState()


class StoryAddressMap(Flowable):
    """A fictional four-block map that repeats district and code in each house."""

    def __init__(self, width, title, rows):
        super().__init__()
        self.width = width
        self.height = 145
        self.title = title
        self.rows = rows

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(colors.HexColor("#153B56"))
        c.setFont("ArialBold", 8.5)
        c.drawString(0, 132, self.title)
        c.setFillColor(colors.HexColor("#36546A"))
        c.setFont("Arial", 8.3)
        c.drawString(0, 118, "Match BOTH your place and fragment. Every location is invented.")
        gutter = 10
        block_width = (self.width - gutter) / 2
        block_height = 48
        for index, (place, fragment, marker) in enumerate(self.rows):
            col = index % 2
            row = index // 2
            x = col * (block_width + gutter)
            y = 60 - row * 56
            c.setStrokeColor(colors.HexColor("#8BAFC1"))
            c.setLineWidth(.9)
            c.roundRect(x, y, block_width, block_height, 5, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#153B56"))
            c.setFont("ArialBold", 8.1)
            c.drawString(x + 9, y + 31, f"BLOCK {index + 1}  /  {marker}")
            c.setFillColor(colors.HexColor("#36546A"))
            c.setFont("Arial", 8.3)
            c.drawString(x + 9, y + 16, f"{place}  +  {fragment}")
            # A little paper-house marker makes the register read as a story map
            # without relying on colour or an illustration to encode the answer.
            roof_x = x + block_width - 30
            c.line(roof_x, y + 29, roof_x + 8, y + 36)
            c.line(roof_x + 8, y + 36, roof_x + 16, y + 29)
            c.rect(roof_x + 2, y + 16, 12, 13, fill=0, stroke=1)
        c.restoreState()


class ForestPostcard(Flowable):
    """Guide-only postcard for the fictional delivery or classroom conclusion."""

    def __init__(self, width, classroom):
        super().__init__()
        self.width = width
        self.height = 113
        self.classroom = classroom

    def draw(self):
        c = self.canv
        c.saveState()
        c.setStrokeColor(colors.HexColor("#8BAFC1"))
        c.setLineWidth(0.9)
        c.roundRect(0, 0, self.width, self.height, 6, fill=0, stroke=1)
        c.setFillColor(colors.HexColor("#153B56"))
        c.setFont("ArialBold", 8.5)
        if self.classroom:
            title = "POST OFFICE REPLY  /  SHARE AFTER CONCLUSION CARD A"
            lines = [
                "To the postal investigators,",
                "R7, TREEHOUSE ROW and P3 pointed to OWL WINDOW.",
                "You checked two different sheets before fixing the paper label.",
                "The story parcel can now be delivered kindly.",
                "From the forest post office",
            ]
        else:
            title = "NORI'S PAPER POSTCARD  /  GIVE AFTER DELIVERY CARD A"
            lines = [
                "Dear forest helpers,",
                "M2, BLUE TREE and W4 led the parcel to OWL HOUSE.",
                "Your careful record made the story address clear again.",
                "Thank you for helping me finish this paper delivery!",
                "From Nori, the forest post carrier",
            ]
        c.drawString(12, 96, title)
        c.setFillColor(colors.HexColor("#36546A"))
        c.setFont("Arial", 8.6)
        for index, line in enumerate(lines):
            c.drawString(14, 79 - index * 15, line)
        c.restoreState()


def step(title, story, heads, rows, answer, handoff, used, prompts, next_story, hints, extra=None):
    item = {"title": title, "story": story, "heads": heads, "rows": rows,
            "answer": answer, "handoff": handoff, "used": used,
            "prompts": prompts, "next": next_story, "hints": hints}
    if extra:
        item["extra"] = extra
    return item


HOME = {
    "code": "H04", "title": "The Forest Post Office Mystery", "role": "HOST GUIDE",
    "intro": "A rain shower has blurred one paper parcel label. Help Nori the forest post carrier use postmark and route records to deliver it to the right story character. Every address is fictional.",
    "record": ["Postmark and batch", "Paper route and district", "Parcel and address fragment", "Recipient marker", "Delivery card and two reasons"],
    "prepare": "Print one Player Pack per cooperating group and one private Host Guide. Keep the guide apart from the player pages. Hand out the cover and then one checkpoint at a time. At Checkpoint 2, sort the three correct-batch route strips on Nori's paper route board or copy their place names. A pencil is enough; an adult may cut cards if desired. Read clues aloud or let children point; divide role lines among available players.",
    "ending": "After players identify Delivery Card A with at least two reasons, read Nori's note: 'The label is clear again. Your careful record helped this parcel reach the right story home.' No real address, mailbox or outdoor walk is required.",
    "steps": [
        step("Find the matching postmark", "The task postmark has a LEAF border, TWO stars and the weekday TUE. Match all three printed parts.",
             ["Card", "Border", "Stars", "Day", "Batch"],
             [["A", "Leaf", "1", "TUE", "M1"], ["B", "Leaf", "2", "TUE", "M2"], ["C", "Moon", "2", "TUE", "M3"], ["D", "Leaf", "2", "FRI", "M4"]],
             "Card B; M2", "M2", "Route record batch", ["Matching card", "Batch mark"],
             "Only route strips for your batch belong to the blurred parcel.",
             ["Inspect all three postmark properties.", "Border, star count and day must all match.", "Card B; give M2."]),
        step("Follow the paper route", "Use ONLY strips carrying your batch mark. Start at POST OFFICE and join matching place names. The useful path ends at a named tree with both colour and words.",
             ["Strip", "Batch", "From", "To"],
             [["D", "M1", "POST OFFICE", "POND"], ["B", "M2", "BRIDGE", "MOSS LANE"], ["E", "M1", "POND", "NO MAILBOX"], ["C", "M2", "MOSS LANE", "BLUE TREE"], ["A", "M2", "POST OFFICE", "BRIDGE"]],
             "A-B-C; BLUE TREE", "BLUE TREE", "Parcel district", ["Strip order", "District name"],
             "Take the district name to the parcel-sorting cards.",
             ["Keep only the correct batch's strips.", "Join the M2 place names from POST OFFICE to the named tree.", "A-B-C; give BLUE TREE."]),
        step("Share the parcel clues", "Carrier: use your route district. Sorter: the parcel has TWO leaf marks. Keeper: its paper outline is ROUND. Share all three facts before circling a card.",
             ["Parcel", "District", "Leaves", "Outline", "Fragment"],
             [["A", "BLUE TREE", "1", "Round", "N"], ["B", "BLUE TREE", "2", "Square", "P"], ["C", "BLUE TREE", "2", "Round", "W4"], ["D", "POND", "2", "Round", "Q"]],
             "Parcel C; W4", "W4", "Fictional forest map", ["Matching parcel", "Address fragment"],
             "Your parcel's address fragment and district together identify the recipient marker.",
             ["Let each role say a different clue.", "Intersect district, two leaves and round outline.", "Parcel C; give W4."]),
        step("Repair the story address", "On the fictional forest map, find the block matching BOTH your district and your parcel's fragment.",
             ["District", "Fragment", "Recipient marker"],
             [["BLUE TREE", "W2", "FOX DEN"], ["BLUE TREE", "W4", "OWL HOUSE"], ["POND", "W4", "BEAVER HUT"], ["MOSS LANE", "W4", "RABBIT GATE"]],
             "OWL HOUSE", "OWL HOUSE", "Final delivery card", ["Matching map block", "Recipient marker"],
             "The recipient marker is the last field in Nori's delivery record.",
             ["Look up district and fragment together.", "BLUE TREE has more than one row; inspect the fragment.", "OWL HOUSE; give this marker."]),
        step("Deliver the story parcel", "Compare batch, district, fragment and recipient marker. Circle the only card matching every discovery. Give your grown-up two reasons.",
             ["Card", "Batch", "District", "Fragment", "Recipient"],
             [["A", "M2", "BLUE TREE", "W4", "OWL HOUSE"], ["B", "M2", "BLUE TREE", "W4", "FOX DEN"], ["C", "M2", "POND", "W4", "OWL HOUSE"], ["D", "M1", "BLUE TREE", "W4", "OWL HOUSE"], ["E", "M2", "BLUE TREE", "W2", "OWL HOUSE"]],
             "Delivery Card A", "Host reads Nori's thank-you note", "Story conclusion", ["Matching card", "Two supporting clues"],
             "The grown-up can read Nori's paper thank-you note.",
             ["Use the record sheet, not the art.", "Every wrong card differs in one field.", "Card A; read Nori's note."]),
    ],
}

CLASSROOM = {
    "code": "C04", "title": "The Forest Postal Investigators", "role": "TEACHER GUIDE",
    "intro": "Your group is a postal investigation team. A pretend parcel was filed under the wrong label. Make a paper evidence record so it reaches the correct fictional character. Every group has all its own clues.",
    "record": ["Postmark and batch", "Route area", "Parcel card and code", "Recipient marker", "Conclusion and evidence"],
    "prepare": "Print one Group Player Pack per group and one private Teacher Guide. Give each group its own full set of five checkpoint pages, one at a time. At Checkpoint 2, groups can arrange the two correct-batch route strips on the paper investigation board or copy them there. Assign Route, Label, Shape and Recorder roles; merge or rotate roles for any group size. Ask groups to cite two different clue sheets; no group waits for another.",
    "ending": "Confirm Conclusion Card A after the group cites two independent reasons. Read: 'Your careful evidence corrected the pretend parcel label. The story post office can deliver it kindly.' No students' names, home addresses or real mail details are requested.",
    "steps": [
        step("Check the shift postmark", "This group's task mark is ROUND, has THREE dots and says WED. Find the one matching archive card.",
             ["Card", "Border", "Dots", "Day", "Batch"],
             [["A", "Round", "3", "WED", "R7"], ["B", "Square", "3", "WED", "R8"], ["C", "Round", "2", "WED", "R9"], ["D", "Round", "3", "FRI", "R6"]],
             "Card A; R7", "R7", "Route record batch", ["Correct archive card", "Batch mark"],
             "Use the batch mark to select the relevant route record.",
             ["Check border, dots and day.", "One archive card meets all three constraints.", "Card A; give R7."]),
        step("Read the delivery route", "Use ONLY strips carrying the batch mark from your first card. Begin at POST OFFICE, join matching names and reach a named ROW.",
             ["Strip", "Batch", "From", "To"],
             [["L3", "R8", "POST OFFICE", "POND"], ["L2", "R7", "STONE PATH", "TREEHOUSE ROW"], ["L4", "R8", "POND", "NO ROUTE"], ["L1", "R7", "POST OFFICE", "STONE PATH"]],
             "L1-L2; TREEHOUSE ROW", "TREEHOUSE ROW", "Parcel area", ["Useful strip order", "Area name"],
             "The area is needed for the group parcel-sorting decision.",
             ["Keep only strips from the correct batch.", "Join the R7 strips to reach the named ROW.", "L1-L2; give TREEHOUSE ROW."]),
        step("Combine the role cards", "Route role: use your route area. Label role: choose TWO stripes. Shape role: choose ROUNDED corners. Recorder checks all three conditions.",
             ["Parcel", "Area", "Stripes", "Corners", "Code"],
             [["A", "TREEHOUSE ROW", "1", "Round", "P1"], ["B", "TREEHOUSE ROW", "2", "Square", "P2"], ["C", "TREEHOUSE ROW", "2", "Round", "P3"], ["D", "POND", "2", "Round", "P4"]],
             "Parcel C; P3", "P3", "Fictional investigation map", ["Selected parcel", "Parcel code"],
             "Use both the area and parcel code to read the recipient register.",
             ["Every role has one constraint.", "Intersect TREEHOUSE ROW, two stripes, rounded corners.", "Parcel C; give P3."]),
        step("Identify the recipient marker", "On the investigation map, match your route area and parcel code in the same block. These are fictional labels, never real addresses.",
             ["Area", "Code", "Recipient marker"],
             [["TREEHOUSE ROW", "P1", "FOX WINDOW"], ["TREEHOUSE ROW", "P3", "OWL WINDOW"], ["POND", "P3", "OTTER DOOR"], ["STONE PATH", "P3", "BEAR GATE"]],
             "OWL WINDOW", "OWL WINDOW", "Final evidence card", ["Matching map block", "Recipient marker"],
             "The matching marker completes your evidence record.",
             ["Check area and code at once.", "P3 appears more than once; verify the area.", "OWL WINDOW; give this marker."]),
        step("Submit a clear conclusion", "Compare batch, area, parcel code and recipient marker. Circle one conclusion that agrees with every sheet; cite two different sheets.",
             ["Card", "Batch", "Area", "Code", "Recipient"],
             [["A", "R7", "TREEHOUSE ROW", "P3", "OWL WINDOW"], ["B", "R7", "TREEHOUSE ROW", "P3", "FOX WINDOW"], ["C", "R7", "POND", "P3", "OWL WINDOW"], ["D", "R8", "TREEHOUSE ROW", "P3", "OWL WINDOW"], ["E", "R7", "TREEHOUSE ROW", "P2", "OWL WINDOW"]],
             "Conclusion Card A", "Teacher reads thank-you card", "Group conclusion", ["Matching conclusion", "Two evidence sheets"],
             "The teacher can read the postal investigation thank-you card.",
             ["Read the four results on your cover.", "Each wrong card has one inconsistent field.", "Card A; close the story."]),
    ],
}


HOME["steps"][2]["role_cards"] = [
    ("Carrier", "Use the district from your paper route."),
    ("Sorter", "The parcel has TWO leaf marks."),
    ("Keeper", "The parcel has a ROUND paper outline."),
]
CLASSROOM["steps"][2]["role_cards"] = [
    ("Route", "Use the area from your paper route."),
    ("Label", "The parcel has TWO stripes."),
    ("Shape", "The parcel has ROUNDED corners."),
]
HOME["steps"][1]["strip_cards"] = True
CLASSROOM["steps"][1]["strip_cards"] = True
HOME["steps"][0]["card_factory"] = lambda width: PostmarkCards(width, HOME["steps"][0]["rows"], "home")
CLASSROOM["steps"][0]["card_factory"] = lambda width: PostmarkCards(width, CLASSROOM["steps"][0]["rows"], "classroom")
HOME["steps"][0]["card_note"] = "Compare the leaf or moon outline, star count and day together. Each printed label repeats the pictured clue; no colour clue is needed."
CLASSROOM["steps"][0]["card_note"] = "Compare the round or square outline, dot count and day together. Each printed label repeats the pictured clue; no colour clue is needed."
HOME["steps"][1]["template_factory"] = lambda width: PaperRouteWorkspace(
    width, "NORI'S POST ROUTE / SORT THREE M2 STRIPS", 3, "POST OFFICE", "NAMED TREE")
CLASSROOM["steps"][1]["template_factory"] = lambda width: PaperRouteWorkspace(
    width, "INVESTIGATION ROUTE / SORT TWO R7 STRIPS", 2, "POST OFFICE", "NAMED ROW")
HOME["steps"][3]["card_factory"] = lambda width: StoryAddressMap(
    width, "NORI'S FICTIONAL FOREST MAP", HOME["steps"][3]["rows"])
CLASSROOM["steps"][3]["card_factory"] = lambda width: StoryAddressMap(
    width, "INVESTIGATION MAP / FOUR STORY BLOCKS", CLASSROOM["steps"][3]["rows"])
for story in (HOME, CLASSROOM):
    story["steps"][3]["card_note"] = "Keep the four-block map intact. Match the place and printed fragment together before recording a recipient."
HOME["finale_factory"] = lambda width: ForestPostcard(width, False)
CLASSROOM["finale_factory"] = lambda width: ForestPostcard(width, True)


def validate_logic():
    for story in (HOME, CLASSROOM):
        assert len(story["steps"]) == 5
        for item in story["steps"]:
            assert len(item["hints"]) == 3
            assert all(len(row) == len(item["heads"]) for row in item["rows"])
    assert [r[0] for r in HOME["steps"][0]["rows"] if r[1:4] == ["Leaf", "2", "TUE"]] == ["B"]
    assert [r[0] for r in HOME["steps"][2]["rows"] if r[1:4] == ["BLUE TREE", "2", "Round"]] == ["C"]
    assert [r[2] for r in HOME["steps"][3]["rows"] if r[:2] == ["BLUE TREE", "W4"]] == ["OWL HOUSE"]
    assert [r[0] for r in HOME["steps"][4]["rows"] if r[1:] == ["M2", "BLUE TREE", "W4", "OWL HOUSE"]] == ["A"]
    assert [r[0] for r in CLASSROOM["steps"][0]["rows"] if r[1:4] == ["Round", "3", "WED"]] == ["A"]
    assert [r[0] for r in CLASSROOM["steps"][2]["rows"] if r[1:4] == ["TREEHOUSE ROW", "2", "Round"]] == ["C"]
    assert [r[2] for r in CLASSROOM["steps"][3]["rows"] if r[:2] == ["TREEHOUSE ROW", "P3"]] == ["OWL WINDOW"]
    assert [r[0] for r in CLASSROOM["steps"][4]["rows"] if r[1:] == ["R7", "TREEHOUSE ROW", "P3", "OWL WINDOW"]] == ["A"]


if __name__ == "__main__":
    validate_logic()
    render_drafts("forest", HOME, CLASSROOM, ROOT / "public" / "assets" / "forest.png", "FOREST ADVENTURE")
