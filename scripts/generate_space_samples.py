"""Build internal H03/C03 Space paper-game drafts; these are not public products."""

from pathlib import Path
import hashlib
import json

from PIL import Image as PillowImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import Image, PageBreak, SimpleDocTemplate

from generate_celebration_samples import box, gap, grid, p, page_heading, role_cards, strip_cards, write_line


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
ART = ROOT / "public" / "assets" / "space.png"
THUMB = ROOT / "tmp" / "pdfs" / "space-cover.jpg"
WORLD_LABEL = "SPACE ADVENTURE"
BLUE = colors.HexColor("#DDF1FA")
NAVY = colors.HexColor("#153B56")
INK = colors.HexColor("#36546A")
CORAL = colors.HexColor("#E94B35")
CREAM = colors.HexColor("#FFFDF9")


HOME = {
    "code": "H03", "title": "The Lost Space Signal", "role": "HOST GUIDE",
    "intro": "Pip the little robot probe has sent a paper signal from somewhere in the story sky. Find the true message, follow the star map and send a pretend reply. All equipment is made of paper.",
    "record": ["Signal and sector", "Map and station", "Paper device and code", "Decoded word", "Probe and two pieces of evidence"],
    "prepare": "Print one Player Pack per cooperating group and one private Host Guide in the same size. Keep the guide separate. Give the cover first, then one checkpoint at a time. A pencil is enough; children may point or dictate instead of writing. If only one child plays, the adult reads role clues aloud.",
    "ending": "After the team identifies Probe A using at least two different clues, read: 'Pip received your message. Your team found the true signal by sharing every clue.' Do not require a real transmitter, app, electrical device or online account.",
    "steps": [
        {"title": "Find the real signal", "story": "The real signal has a ROUND border, THREE waves and ONE square gap at the lower right. Compare all three printed attributes.",
         "heads": ["Card", "Border", "Waves", "Gap", "Sector"],
         "rows": [["A", "Round", "2", "Square", "VEGA"], ["B", "Square", "3", "Square", "ALTAIR"], ["C", "Round", "3", "Square", "ORION"], ["D", "Round", "3", "None", "NOVA"]],
         "answer": "Card C; ORION", "handoff": "ORION", "used": "Star-map starting sector", "prompts": ["Matching card", "Our sector"],
         "next": "Only the star-map route beginning at your sector can lead to a numbered station.",
         "hints": ["Check border, waves and gap separately.", "All three properties must match at once.", "Card C; give ORION."]},
        {"title": "Repair the star map", "story": "Start from the sector in your record. Join strips where the end of one matches the start of another. The useful path ends at a NUMBERED STATION.",
         "heads": ["Strip", "From", "To"],
         "rows": [["D", "ORION", "RED STAR"], ["B", "BLUE STAR", "CRESCENT"], ["E", "RED STAR", "EMPTY FIELD"], ["C", "CRESCENT", "STATION 7"], ["A", "ORION", "BLUE STAR"]],
         "answer": "A-B-C; STATION 7", "handoff": "STATION 7", "used": "Paper-device station constraint", "prompts": ["Strip order", "Numbered station"],
         "next": "The station number is one of three facts needed to select a paper device.",
         "hints": ["Match printed end and start names.", "One ORION path ends in EMPTY FIELD; find the numbered station.", "A-B-C; give STATION 7."]},
        {"title": "Share calibration clues", "story": "Give Guide, Robot and Scout one clue line each. Read every clue aloud and choose one paper device. Guide: use your numbered station. Robot: TWO rings. Scout: TRIANGLE badge.",
         "heads": ["Device", "Station", "Rings", "Badge", "Code"],
         "rows": [["A", "7", "1", "Triangle", "2"], ["B", "7", "2", "Triangle", "6"], ["C", "7", "2", "Circle", "4"], ["D", "5", "2", "Triangle", "3"]],
         "answer": "Device B; Code 6", "handoff": "Code 6", "used": "Code-6 word dictionary", "prompts": ["Matching paper device", "Its code"],
         "next": "Only the dictionary labelled with your device code is used in the paper message.",
         "hints": ["Let each role read one fact.", "Intersect Station 7, two rings and triangle.", "Device B; give Code 6."]},
        {"title": "Decode Pip's message", "story": "Use the code on your chosen paper device. Replace each printed symbol in order using that code's dictionary row. No outside space knowledge is needed.",
         "heads": ["Symbol", "SUN", "MOON", "STAR", "PATH", "RING"],
         "rows": [["Code 2", "B", "E", "A", "C", "H"], ["Code 4", "L", "I", "G", "H", "T"], ["Code 6", "C", "O", "M", "E", "T"]],
         "extra": "Use only your selected device code. Paper message: SUN / MOON / STAR / PATH / RING", "answer": "COMET", "handoff": "COMET", "used": "Final probe label", "prompts": ["Five letters", "The whole word"],
         "next": "The decoded word is a label on exactly one fully matching probe record.",
         "hints": ["Start with the first symbol.", "Keep the printed order when replacing symbols.", "COMET; give the word to players."]},
        {"title": "Send the pretend reply", "story": "Compare your sector, station, code and decoded word with every probe record. Circle the only record matching all four. Tell your grown-up two facts that prove it.",
         "heads": ["Probe", "Sector", "Station", "Code", "Word"],
         "rows": [["A", "ORION", "7", "6", "COMET"], ["B", "ORION", "7", "6", "MOON"], ["C", "ORION", "5", "6", "COMET"], ["D", "VEGA", "7", "6", "COMET"], ["E", "ORION", "7", "4", "COMET"]],
         "answer": "Probe A", "handoff": "Host reads Pip's reply card", "used": "Story ending", "prompts": ["Matching probe", "Two supporting clues"],
         "next": "Your adult can read Pip's paper reply card.",
         "hints": ["Use the record sheet, not the illustration.", "Each wrong probe differs in at least one field.", "Probe A; read Pip's reply."]},
    ],
}

CLASSROOM = {
    "code": "C03", "title": "Restart the Star Station", "role": "TEACHER GUIDE",
    "intro": "Your group is a paper communication crew. Sort a signal, locate your story station, choose a pretend device and submit one clear restart record. Every group has the same complete set of clues.",
    "record": ["Signal and station", "Map and port", "Device and key", "Short message", "Restart report and evidence"],
    "prepare": "Print one Group Player Pack per group and one private Teacher Guide in the same size. Give each group all five checkpoint sheets, releasing one sheet at a time. Assign Reader, Mapper, Decoder and Recorder; combine or rotate roles for different group sizes. Groups never need another group's answer.",
    "ending": "Confirm Report B once the group has named at least two sources of evidence. Say: 'Your paper station is restored. Every crew member made the record clearer.' Invite each group to explain one discarded candidate. Do not rank children or collect names.",
    "steps": [
        {"title": "Sort signal from noise", "story": "A valid signal has a SQUARE border, TWO peaks and ONE round dot. Compare the three attributes, not the ink colour.",
         "heads": ["Card", "Border", "Peaks", "Dots", "Station"],
         "rows": [["A", "Square", "1", "1", "VEGA"], ["B", "Round", "2", "1", "NOVA"], ["C", "Square", "2", "0", "ORION"], ["D", "Square", "2", "1", "LYRA"]],
         "answer": "Card D; LYRA", "handoff": "LYRA", "used": "Map starting station", "prompts": ["Valid signal", "Station name"],
         "next": "Use the selected station name as the beginning of the paper star map.",
         "hints": ["Check border, peaks and dot count.", "The valid card satisfies all three rules.", "Card D; give LYRA."]},
        {"title": "Locate the station port", "story": "Start from your station name. Join strips at matching names. Use the path that reaches a NUMBERED PORT.",
         "heads": ["Strip", "From", "To"],
         "rows": [["C", "LYRA", "NODE A"], ["D", "NODE A", "BLANK"], ["B", "NODE B", "PORT 4"], ["A", "LYRA", "NODE B"]],
         "answer": "A-B; PORT 4", "handoff": "PORT 4", "used": "Paper device constraint", "prompts": ["Useful strip order", "Port number"],
         "next": "This port number must match the group's paper device.",
         "hints": ["Match the end and start words.", "NODE A reaches BLANK; choose the numbered port.", "A-B; give PORT 4."]},
        {"title": "Choose the pretend device", "story": "Mapper: use your map's port. Reader: choose TWO rings. Checker: choose an ARROW badge. Give the Recorder all three facts.",
         "heads": ["Kit", "Port", "Rings", "Badge", "Key"],
         "rows": [["A", "4", "1", "Arrow", "2-1-4"], ["B", "4", "2", "Circle", "4-1-3"], ["C", "4", "2", "Arrow", "3-1-4"], ["D", "2", "2", "Arrow", "3-1-2"]],
         "answer": "Kit C; key 3-1-4", "handoff": "Kit C / 3-1-4", "used": "Dictionary read order", "prompts": ["Selected kit", "Its three-number key"],
         "next": "Read the printed number dictionary in the order on your selected key.",
         "hints": ["Each role has a different condition.", "Find Port 4, two rings and arrow together.", "Kit C; give 3-1-4."]},
        {"title": "Read the paper message", "story": "Read the letters in the exact order of your key. Do not sort the key into numerical order.",
         "heads": ["Number", "1", "2", "3", "4"],
         "rows": [["Letter", "E", "A", "S", "T"]],
         "extra": "Key slots: first ____ / second ____ / third ____", "answer": "SET", "handoff": "SET", "used": "Restart report message", "prompts": ["Letters in key order", "Three-letter message"],
         "next": "The completed short message belongs in the final restart report.",
         "hints": ["Point to the first number of the key.", "Read 3, then 1, then 4.", "SET; give the message to the group."]},
        {"title": "File a restart report", "story": "Use your station, port, kit and short message. Choose the only report agreeing with every result and name two different clue sheets that support it.",
         "heads": ["Report", "Station", "Port", "Kit", "Message"],
         "rows": [["A", "LYRA", "4", "B", "SET"], ["B", "LYRA", "4", "C", "SET"], ["C", "LYRA", "2", "C", "SET"], ["D", "VEGA", "4", "C", "SET"], ["E", "LYRA", "4", "C", "SAT"]],
         "answer": "Report B", "handoff": "Teacher reads station reply", "used": "Group conclusion", "prompts": ["Matching report", "Two different supporting sheets"],
         "next": "The teacher confirms the completed paper station record.",
         "hints": ["Use all four record fields.", "Each wrong report has one mismatched entry.", "Report B; close the story."]},
    ],
}

HOME["steps"][2]["role_cards"] = [
    ("Guide", "Use the numbered station from your map."),
    ("Robot", "The paper device has TWO rings."),
    ("Scout", "The paper device has a TRIANGLE badge."),
]
CLASSROOM["steps"][2]["role_cards"] = [
    ("Mapper", "Use the port from your paper map."),
    ("Reader", "The kit has TWO rings."),
    ("Checker", "The kit has an ARROW badge."),
]
HOME["steps"][1]["strip_cards"] = True
CLASSROOM["steps"][1]["strip_cards"] = True


def footer(canvas, doc):
    width, height = doc.pagesize
    canvas.saveState()
    canvas.setFillColor(BLUE)
    canvas.rect(0, height - 37, width, 37, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.setFont("ArialBold", 8)
    canvas.drawString(44, height - 23, f"PAPER ADVENTURE WORKSHOP  /  {WORLD_LABEL}")
    canvas.setFillColor(CORAL)
    canvas.setFont("ArialBold", 7)
    canvas.drawRightString(width - 44, height - 23, "NOT PLAY-TESTED")
    canvas.setStrokeColor(colors.HexColor("#BCD8E3"))
    canvas.line(44, 42, width - 44, 42)
    canvas.setFillColor(INK)
    canvas.setFont("Arial", 7.8)
    canvas.drawString(44, 28, f"{doc.product_code}  |  content draft v0.1  |  {doc.paper_label}")
    canvas.drawRightString(width - 44, 28, f"Page {doc.page}")
    canvas.restoreState()


def player_flow(story, width):
    art = Image(str(THUMB), width=132, height=99)
    art.hAlign = "CENTER"
    flow = [p(f"{story['code']} / {'GROUP ' if story['code'].startswith('C') else ''}PLAYER PACK", "eyebrow"),
            p(story["title"], "title"), box(story["intro"], width, CREAM), gap(13), art,
            gap(13), p("Your five discoveries", "h2"),
            grid(["Step", "Write or circle your result"],
                 [[str(i), line + ": ______________________________"] for i, line in enumerate(story["record"], 1)],
                 [width * .16, width * .84]), gap(11),
            p("An adult or teacher gives you checkpoint pages in order. Use a pencil and the printed clues. Ask for a hint when you need one. Story objects are paper props; no real-world trip or device is needed.", "small"), PageBreak()]
    for number, step in enumerate(story["steps"], 1):
        cols = len(step["heads"])
        fractions = [1 / cols] * cols
        if cols == 5:
            fractions = [.16, .22, .17, .20, .25]
        story_text = ("Ask your adult or teacher for one clue card per role. Read all three before choosing."
                      if step.get("role_cards") else step["story"])
        flow += page_heading(number, step["title"], story_text)
        if step.get("role_cards"):
            flow += role_cards(step["role_cards"], width)
            flow += [p("Only an adult or teacher cuts cards. Without scissors, cover and reveal one card at a time.", "small"), gap(5)]
        if step.get("strip_cards") or number == 5:
            flow += strip_cards(step["heads"], step["rows"], width)
            flow += [p("An adult or teacher may cut the bordered cards; you can also compare or number them on this page.", "small"), gap(8)]
        else:
            flow += [grid(step["heads"], step["rows"], [width * f for f in fractions]), gap(13)]
        if step.get("template_factory"):
            flow += [step["template_factory"](width), gap(8)]
        if step.get("extra"):
            flow += [box(step["extra"], width, CREAM), gap(12)]
        for prompt in step["prompts"]:
            flow += write_line(prompt)
        flow += [gap(7), box("<b>Next in the story:</b> " + step["next"], width)]
        if number < 5:
            flow.append(PageBreak())
    return flow


def guide_flow(story, width):
    steps = story["steps"]
    flow = [p(f"{story['code']} / {story['role']}", "eyebrow"), p(story["title"], "title"),
            box("<b>Internal content and layout draft.</b> Not play-tested, print-approved or published. Do not sell or offer public downloads.", width, CREAM),
            gap(14), p("Prepare the paper adventure", "h2"), p(story["prepare"]),
            p("Checkpoint 3 has three bordered role cards. An adult or teacher may cut and distribute one per player; without scissors, cover unused cards and reveal them in turn. Each group keeps its own complete clue set."),
            p("Checkpoint 2 has bordered route or matching cards. An adult or teacher may cut them out; without scissors, players can write the sequence or matches on the intact page."),
            p("No physical equipment, real travel, student accounts or outdoor activity are required."),
            p("How one result powers the next", "h2"),
            grid(["Step", "Standard result", "Used by"],
                 [[str(i), step["handoff"], step["used"]] for i, step in enumerate(steps, 1)],
                 [width * .14, width * .39, width * .47]), PageBreak(),
            p("ANSWER KEY", "eyebrow"), p("Five connected checkpoints", "h1")]
    for i, step in enumerate(steps, 1):
        flow.append(p(f"<b>{i}. {step['title']}:</b> {step['answer']}."))
    flow += [gap(14), p("Final story hand-off", "h2"), p(story["ending"]),
             p("When a group skips a step, hand over that step's standard result; later cards must still be solvable."),
             PageBreak(), p("HINTS AND SKIPS", "eyebrow"), p("Keep every group moving", "h1"),
             p("Offer one level at a time: where to look, how to reason, then the full solution. A skipped step receives the same result as a solved step."),
             grid(["Step", "Observe", "Reason", "Solve / hand off"],
                  [[str(i), *step["hints"]] for i, step in enumerate(steps, 1)],
                  [width * .09, width * .27, width * .30, width * .34]), gap(13),
             p("Safety and release gate", "h2"),
             p("The story locations and labels are fictional. Check both paper sizes, colour and grey printing, readable labels, role participation, ambiguous answers and real play timing. Revise every output after testing."),
             box("<b>Release gate:</b> Human play-tests, physical print checks, image rights, copy and legal/product review are still required. The catalog remains unpublished.", width, CREAM)]
    return flow


def validate_logic():
    assert len(HOME["steps"]) == len(CLASSROOM["steps"]) == 5
    assert len({step["handoff"] for step in HOME["steps"]}) == 5
    assert len({step["handoff"] for step in CLASSROOM["steps"]}) == 5
    for story in (HOME, CLASSROOM):
        for step in story["steps"]:
            assert len(step["hints"]) == 3
            assert len(step["heads"]) >= 3
            assert all(len(row) == len(step["heads"]) for row in step["rows"])
    assert [row[0] for row in HOME["steps"][0]["rows"] if row[1:4] == ["Round", "3", "Square"]] == ["C"]
    assert [row[0] for row in HOME["steps"][2]["rows"] if row[1:4] == ["7", "2", "Triangle"]] == ["B"]
    assert [row[0] for row in HOME["steps"][4]["rows"] if row[1:] == ["ORION", "7", "6", "COMET"]] == ["A"]
    assert [row[0] for row in CLASSROOM["steps"][0]["rows"] if row[1:4] == ["Square", "2", "1"]] == ["D"]
    assert [row[0] for row in CLASSROOM["steps"][2]["rows"] if row[1:4] == ["4", "2", "Arrow"]] == ["C"]
    assert [row[0] for row in CLASSROOM["steps"][4]["rows"] if row[1:] == ["LYRA", "4", "C", "SET"]] == ["B"]


def render_drafts(slug, home, classroom, art_path, world_label, classroom_art_path=None):
    global THUMB, WORLD_LABEL
    THUMB = ROOT / "tmp" / "pdfs" / f"{slug}-cover.jpg"
    WORLD_LABEL = world_label
    OUT.mkdir(parents=True, exist_ok=True)
    THUMB.parent.mkdir(parents=True, exist_ok=True)
    cover_paths = {home["code"]: THUMB}
    if classroom_art_path:
        cover_paths[classroom["code"]] = ROOT / "tmp" / "pdfs" / f"{slug}-classroom-cover.jpg"
    else:
        cover_paths[classroom["code"]] = THUMB
    art_pairs = [(art_path, THUMB)]
    if classroom_art_path:
        art_pairs.append((classroom_art_path, cover_paths[classroom["code"]]))
    for source_path, output_path in art_pairs:
        with PillowImage.open(source_path) as source:
            image = source.convert("RGB")
            image.thumbnail((528, 396))
            image.save(output_path, format="JPEG", quality=88, optimize=True)
    files = []
    for paper, size in [("A4", A4), ("Letter", letter)]:
        width = size[0] - 88
        for story in (home, classroom):
            THUMB = cover_paths[story["code"]]
            for role, flow in [("player", player_flow(story, width)),
                               ("host" if story is home else "teacher", guide_flow(story, width))]:
                name = f"{slug}-{story['code']}-{role}-v0.1-{paper}.pdf"
                path = OUT / name
                doc = SimpleDocTemplate(str(path), pagesize=size, leftMargin=44, rightMargin=44,
                                        topMargin=63, bottomMargin=57,
                                        title=f"{story['code']} {world_label} content draft",
                                        author="Paper Adventure Workshop - draft")
                doc.product_code = f"{story['code']} {role.title()}"
                doc.paper_label = paper
                doc.build(flow, onFirstPage=footer, onLaterPages=footer)
                files.append({"file": str(path.relative_to(ROOT).as_posix()),
                              "setting": "home" if story is home else "classroom",
                              "role": role, "paper": paper, "pages": 6 if role == "player" else 3,
                              "bytes": path.stat().st_size,
                              "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                              "status": "draft", "public": False})
                print(path)
    manifest = ROOT / "content" / f"{slug}-pdf-manifest.v0.1.json"
    manifest.write_text(json.dumps({"version": "0.1", "themeWorldId": slug,
                                    "published": False, "items": files}, indent=2) + "\n", encoding="utf-8")


def main():
    validate_logic()
    render_drafts("space", HOME, CLASSROOM, ART, "SPACE ADVENTURE")


if __name__ == "__main__":
    main()
