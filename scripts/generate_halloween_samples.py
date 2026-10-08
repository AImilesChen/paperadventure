"""Build internal, child-friendly Halloween H05 and autumn classroom C05 drafts."""

from pathlib import Path
from reportlab.lib import colors
from reportlab.platypus import Flowable
from generate_space_samples import PaperRouteWorkspace, render_drafts


ROOT = Path(__file__).resolve().parents[1]


class PaperSealCards(Flowable):
    """Four blank paper seals; players supply values from the previous checkpoints."""

    def __init__(self, width):
        super().__init__()
        self.width = width
        self.height = 116

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(colors.HexColor("#153B56"))
        c.setFont("ArialBold", 8.5)
        c.drawString(0, 103, "FOUR PAPER SEALS / WRITE THE NUMBERS YOU FOUND")
        gap_width = 8
        card_width = (self.width - 3 * gap_width) / 4
        for index, name in enumerate(("SUN", "MOON", "HAT", "STAR")):
            left = index * (card_width + gap_width)
            c.setStrokeColor(colors.HexColor("#BCD8E3"))
            c.setLineWidth(0.8)
            c.rect(left, 0, card_width, 90, fill=0, stroke=1)
            center = left + card_width / 2
            c.setStrokeColor(colors.HexColor("#153B56"))
            c.circle(center, 37, 28, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#153B56"))
            c.setFont("ArialBold", 9)
            c.drawCentredString(center, 75, name)
            c.setFont("Arial", 9)
            c.drawCentredString(center, 32, "NUMBER")
            c.line(center - 15, 22, center + 15, 22)
        c.restoreState()


def step(title, story, heads, rows, answer, handoff, used, prompts, next_story, hints, extra=None):
    item = {"title": title, "story": story, "heads": heads, "rows": rows,
            "answer": answer, "handoff": handoff, "used": used,
            "prompts": prompts, "next": next_story, "hints": hints}
    if extra:
        item["extra"] = extra
    return item


HOME = {
    "code": "H05", "title": "The Missing Pumpkin Light", "role": "HOST GUIDE",
    "intro": "Pip's pretend paper pumpkin lantern has gone dim. Four paper seals can make the festival picture bright again. Find the seals and put them in the order written in the final note. There is no real light or flame.",
    "record": ["SUN seal and map start", "MOON seal and parcel batch", "HAT seal and paper parcel", "STAR seal and seal order", "Four-digit paper lantern code"],
    "prepare": "Print one Player Pack per cooperating group and one private Host Guide in the same size. Hand out the cover, then one checkpoint at a time. At Checkpoint 2, place or copy three useful route strips on Pip's paper festival map. Use only the paper clues, a pencil and optional safe scissors handled by an adult. No real lantern, candle, fire or outdoor activity is part of the game.",
    "ending": "Once the children assemble 5-7-2-3 in the decoded SUN-MOON-HAT-STAR order, unfold a paper picture or read: 'Everyone's clue helped the festival picture shine.' This is a pretend paper-lit ending, never a request to light anything.",
    "steps": [
        step("Find Pip's letter", "Pip's letter has a FOX-shaped seal, TWO stars and a MOON postmark. Find the card matching all three parts.",
             ["Letter", "Seal", "Stars", "Postmark", "SUN / Start"],
             [["A", "Fox", "2", "Sun", "4 / SHED"], ["B", "Owl", "2", "Moon", "6 / TREE"], ["C", "Fox", "2", "Moon", "5 / GATE"], ["D", "Fox", "1", "Moon", "8 / PATH"]],
             "Letter C; SUN=5 and GATE", "SUN 5 / GATE", "Map starting place", ["Matching letter", "SUN seal and start"],
             "Use the start word on Pip's letter to follow the paper festival map.",
             ["Check seal, stars and postmark.", "All three printed properties must match.", "Letter C; give SUN=5 and GATE."]),
        step("Repair the festival map", "Use ONLY strips with Pip's GATE start and join matching place names. The useful route reaches PARCEL TABLE, not END.",
             ["Strip", "From", "To", "MOON / Batch"],
             [["D", "GATE", "SHED", "-"], ["B", "BANNER", "PUMPKIN STAND", "-"], ["E", "SHED", "END", "-"], ["C", "PUMPKIN STAND", "PARCEL TABLE", "7 / P3"], ["A", "GATE", "BANNER", "-"]],
             "A-B-C; MOON=7 and P3", "MOON 7 / P3", "Parcel batch", ["Useful strip order", "MOON seal and batch"],
             "The parcel batch helps the crew find Pip's decorated paper parcel.",
             ["Join names from GATE.", "The SHED path stops; continue to PARCEL TABLE.", "A-B-C; give MOON=7 and P3."]),
        step("Share the parcel clues", "Courier: use the batch from the map. Decorator: look for TWO stripes. Keeper: choose a ROUNDED paper outline. Compare every card.",
             ["Parcel", "Batch", "Stripes", "Outline", "HAT seal"],
             [["A", "P3", "1", "Round", "4"], ["B", "P3", "2", "Round", "2"], ["C", "P3", "2", "Square", "6"], ["D", "P2", "2", "Round", "8"]],
             "Parcel B; HAT=2", "HAT 2 / Parcel B", "Dictionary row on reply", ["Matching parcel", "HAT seal"],
             "The parcel letter chooses which dictionary row to use on the reply card.",
             ["Each role reads a different condition.", "Intersect P3, two stripes and round outline.", "Parcel B; give HAT=2 and row B."]),
        step("Decode the paper reply", "Use the dictionary ROW labelled with your chosen parcel. Replace the four code words in the printed order. Read the STAR seal value from the same row.",
             ["Parcel row", "KITE", "TREE", "ACORN", "FLAG", "STAR value"],
             [["A", "MOON", "SUN", "HAT", "STAR", "4"], ["B", "SUN", "MOON", "HAT", "STAR", "3"], ["C", "STAR", "HAT", "SUN", "MOON", "6"], ["D", "HAT", "SUN", "STAR", "MOON", "8"]],
             "Parcel B row; SUN-MOON-HAT-STAR; STAR=3", "STAR 3 / SUN-MOON-HAT-STAR", "Final seal order", ["Four seal names", "STAR seal value and order"],
             "Write each seal's number in the decoded order on the final paper lantern card.",
             ["Use the parcel letter, not the first row.", "Replace KITE-TREE-ACORN-FLAG in that order.", "Row B; STAR=3, order SUN-MOON-HAT-STAR."],
             "Encoded reply: KITE / TREE / ACORN / FLAG"),
        step("Complete the paper lantern", "Write each discovered number on its named paper seal. Put the four seals in the order from the reply, then circle the matching four-digit card. No real light is needed.",
             ["Card", "Four-digit paper code"],
             [["A", "5723"], ["B", "5732"], ["C", "7523"], ["D", "5724"]],
             "Card A; 5723", "Host unfolds paper ending", "Story conclusion", ["Seal order", "Matching code card"],
             "The grown-up can show the safe paper festival picture.",
             ["Write seal names before numbers.", "Use SUN=5, MOON=7, HAT=2 and STAR=3 in the decoded order.", "5723; read the paper ending."]),
    ],
}

CLASSROOM = {
    "code": "C05", "title": "The Autumn Festival Crew", "role": "TEACHER GUIDE",
    "intro": "Your group is preparing a friendly PAPER autumn festival. Sort an invitation, find the pretend booth, share decoration clues and submit one opening plan. No costumes, candy, spooky scenes or family holiday stories are required.",
    "record": ["Invitation, crew and start", "Booth on the paper map", "Decoration and leaf mark", "Opening order and word", "Plan card and evidence"],
    "prepare": "Print one Group Player Pack per group and one private Teacher Guide. Give each group its own complete pages. At Checkpoint 2, place or copy the two useful strips on the Autumn Crew map. This draft is the neutral Autumn Festival version; a Halloween-worded classroom edition has not been produced or checked. Map, Shape, Count and Recorder roles can be combined or rotated. No group depends on another.",
    "ending": "Confirm Plan A after each group cites at least two clue sheets. Read: 'The friendly paper festival is ready. Everyone shared a clue to make the opening plan clear.' Never ask students to reveal their religious, cultural or family celebration practices.",
    "steps": [
        step("Find the crew invitation", "The true invitation shows a SMILING PUMPKIN icon, TWO flags and a ROUND frame. All three labels are printed; colour does not matter.",
             ["Card", "Icon", "Flags", "Frame", "Crew / Start"],
             [["A", "Pumpkin", "1", "Round", "A / SHED"], ["B", "Pumpkin", "2", "Round", "B / GATE"], ["C", "Moon", "2", "Round", "C / TREE"], ["D", "Pumpkin", "2", "Square", "D / PATH"]],
             "Card B; CREW B and GATE", "CREW B / GATE", "Map starting place", ["Invitation", "Crew and start"],
             "The start word takes the group to its paper festival booth.",
             ["Compare icon, flags and frame.", "One card satisfies every invitation detail.", "Card B; give CREW B and GATE."]),
        step("Find the festival booth", "Start from the place on your invitation. Join matching map strips until you reach a BOOTH; the other path ends at BLANK.",
             ["Strip", "From", "To"],
             [["C", "GATE", "SHED"], ["B", "PAPER ARCH", "ORANGE BOOTH"], ["D", "SHED", "BLANK"], ["A", "GATE", "PAPER ARCH"]],
             "A-B; ORANGE BOOTH", "ORANGE BOOTH", "Decoration place", ["Useful strip order", "Booth name"],
             "The booth name is one of three conditions on the decoration cards.",
             ["Join end and start names.", "Only one route reaches a BOOTH.", "A-B; give ORANGE BOOTH."]),
        step("Combine decoration clues", "Map role: use the booth you found. Shape role: choose a CIRCLE banner. Count role: choose THREE stars. Recorder checks every condition.",
             ["Decor", "Booth", "Banner", "Stars", "Mark"],
             [["A", "ORANGE", "Circle", "2", "SUN"], ["B", "ORANGE", "Square", "3", "MOON"], ["C", "ORANGE", "Circle", "3", "LEAF"], ["D", "BLUE", "Circle", "3", "STAR"]],
             "Decor C; LEAF MARK", "Decor C / LEAF MARK", "Opening schedule", ["Selected decoration", "Paper mark"],
             "The chosen paper mark must appear in your opening schedule.",
             ["Every role has a separate clue.", "Intersect ORANGE, Circle and three stars.", "Decor C; give LEAF MARK."]),
        step("Put the opening plan in order", "Use only schedule lines agreeing with your crew, booth and decoration. Put them in the sensible order INVITE, MAP, DECORATE, OPEN.",
             ["Line", "Action", "Record"],
             [["R", "DECORATE", "LEAF MARK"], ["X", "DECORATE", "MOON MARK"], ["P", "INVITE", "CREW B"], ["S", "OPEN", "WELCOME"], ["Q", "MAP", "ORANGE BOOTH"]],
             "P-Q-R-S; WELCOME", "P-Q-R-S / WELCOME", "Final plan card", ["Useful line order", "Opening word"],
             "Use the complete order and opening word to check the final plan.",
             ["Filter lines using your earlier record.", "Then sort invitation, map, decoration, opening.", "P-Q-R-S; give WELCOME."]),
        step("Submit one opening plan", "Compare crew, booth, decoration and opening order. Circle the plan that matches all four recorded discoveries and name two clue sources.",
             ["Plan", "Crew", "Booth", "Decor", "Order"],
             [["A", "B", "ORANGE", "C", "P-Q-R-S"], ["B", "B", "ORANGE", "C", "P-R-Q-S"], ["C", "A", "ORANGE", "C", "P-Q-R-S"], ["D", "B", "BLUE", "C", "P-Q-R-S"], ["E", "B", "ORANGE", "B", "P-Q-R-S"]],
             "Plan A; WELCOME", "Teacher reads festival ending", "Group conclusion", ["Matching plan", "Two supporting clues"],
             "Your teacher can read the friendly paper festival ending.",
             ["Use all four cover results.", "Every other plan changes one part of your record.", "Plan A; finish with WELCOME."]),
    ],
}


HOME["steps"][2]["role_cards"] = [
    ("Courier", "Use the parcel batch from your paper map."),
    ("Decorator", "The parcel has TWO stripes."),
    ("Keeper", "The parcel has a ROUNDED paper outline."),
]
CLASSROOM["steps"][2]["role_cards"] = [
    ("Map", "Use the booth from your paper map."),
    ("Shape", "The banner is a CIRCLE."),
    ("Count", "The decoration has THREE stars."),
]
HOME["steps"][1]["strip_cards"] = True
CLASSROOM["steps"][1]["strip_cards"] = True
HOME["steps"][1]["template_factory"] = lambda width: PaperRouteWorkspace(
    width, "PIP'S PAPER FESTIVAL MAP / THREE USEFUL STRIPS", 3, "GATE", "PARCEL TABLE")
CLASSROOM["steps"][1]["template_factory"] = lambda width: PaperRouteWorkspace(
    width, "AUTUMN CREW MAP / TWO USEFUL STRIPS", 2, "GATE", "NAMED BOOTH")
HOME["steps"][4]["template_factory"] = PaperSealCards


def validate_logic():
    for story in (HOME, CLASSROOM):
        assert len(story["steps"]) == 5
        for item in story["steps"]:
            assert len(item["hints"]) == 3
            assert all(len(row) == len(item["heads"]) for row in item["rows"])
    assert [r[0] for r in HOME["steps"][0]["rows"] if r[1:4] == ["Fox", "2", "Moon"]] == ["C"]
    assert [r[0] for r in HOME["steps"][2]["rows"] if r[1:4] == ["P3", "2", "Round"]] == ["B"]
    assert HOME["steps"][3]["rows"][1][1:] == ["SUN", "MOON", "HAT", "STAR", "3"]
    assert [r[0] for r in HOME["steps"][4]["rows"] if r[1] == "5723"] == ["A"]
    assert [r[0] for r in CLASSROOM["steps"][0]["rows"] if r[1:4] == ["Pumpkin", "2", "Round"]] == ["B"]
    assert [r[0] for r in CLASSROOM["steps"][2]["rows"] if r[1:4] == ["ORANGE", "Circle", "3"]] == ["C"]
    assert [r[0] for r in CLASSROOM["steps"][4]["rows"] if r[1:] == ["B", "ORANGE", "C", "P-Q-R-S"]] == ["A"]


if __name__ == "__main__":
    validate_logic()
    render_drafts("halloween", HOME, CLASSROOM,
                  ROOT / "public" / "assets" / "halloween-friendly-v0.1.jpg",
                  "FRIENDLY AUTUMN ADVENTURE",
                  classroom_art_path=ROOT / "public" / "assets" / "autumn-classroom-v0.1.jpg")
