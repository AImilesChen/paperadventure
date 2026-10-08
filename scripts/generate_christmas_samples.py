"""Build internal Christmas H06 and neutral winter C06 paper-game drafts."""

from pathlib import Path
from generate_space_samples import render_drafts


ROOT = Path(__file__).resolve().parents[1]


def step(title, story, heads, rows, answer, handoff, used, prompts, next_story, hints, extra=None):
    item = {"title": title, "story": story, "heads": heads, "rows": rows,
            "answer": answer, "handoff": handoff, "used": used,
            "prompts": prompts, "next": next_story, "hints": hints}
    if extra:
        item["extra"] = extra
    return item


HOME = {
    "code": "H06", "title": "The Christmas Delivery Office", "role": "HOST GUIDE",
    "intro": "The story delivery office has mixed up its last paper list. Match pretend gift cards with story destinations and find the final thank-you note. No one needs to buy, exchange or wrap a real gift.",
    "record": ["Label and batch", "Three gift-to-place pairs", "Three-stop paper route", "Last place and message", "Final delivery card and evidence"],
    "prepare": "Print one Player Pack per cooperating group and one private Host Guide in the same size. Give the cover first, then each checkpoint in order. A pencil is the only required extra. Invite children to read or point. All cards, places and gifts are fictional paper props, not invitations to travel or shop.",
    "ending": "After players select Delivery Card A and explain two clues, read: 'The messenger finished the paper route. Every story friend has a matching picture card. Thank you for checking the list together.' Any family reward is an adult's optional separate choice.",
    "steps": [
        step("Choose the right list", "The task label has a SNOWFLAKE frame, TWO round dots and a STAR print. Match every property.",
             ["Card", "Frame", "Dots", "Print", "Batch"],
             [["A", "Snowflake", "2", "Star", "B3"], ["B", "Snowflake", "1", "Star", "B2"], ["C", "Leaf", "2", "Star", "B4"], ["D", "Snowflake", "2", "Moon", "B5"]],
             "Card A; B3", "B3", "Gift-card batch filter", ["Matching label", "Batch mark"],
             "Use only gift cards from the chosen batch.",
             ["Check frame, dots and print.", "All three details must match together.", "Card A; give B3."]),
        step("Match the picture gifts", "Use only your batch. Owl wants the ROUND picture at OWL WINDOW; Fox wants the SQUARE picture at FOX DEN; Rabbit wants the TRIANGLE picture at RABBIT GATE. These are imaginary characters.",
             ["Gift", "Batch", "Picture shape"],
             [["A", "B3", "Round"], ["D", "B2", "Round"], ["C", "B3", "Triangle"], ["B", "B3", "Square"]],
             "A-Owl, B-Fox, C-Rabbit", "OWL / FOX / RABBIT places", "Three route stops", ["Gift-to-place pairs", "Three places"],
             "All three places must appear exactly once in the paper route.",
             ["First remove the wrong batch.", "Match each shape to the stated character and place.", "A-Owl, B-Fox, C-Rabbit; keep their places."],
             "Destination cards: OWL WINDOW / FOX DEN / RABBIT GATE"),
        step("Share the route conditions", "Use your gift-to-place pairs from Checkpoint 2. Guide: FOX DEN comes BEFORE OWL WINDOW. Clock: RABBIT GATE is LAST. Map: visit the three places once. Put the gift LETTERS in route order.",
             ["Route", "First gift", "Second gift", "Last gift"],
             [["A", "A", "B", "C"], ["B", "B", "A", "C"], ["C", "B", "C", "A"], ["D", "C", "B", "A"]],
             "Route B; FOX-OWL-RABBIT", "FOX-OWL-RABBIT / RABBIT GATE", "Last-stop paper envelope", ["Matching route", "Last story place"],
             "Only the last place has the coded paper thank-you note.",
             ["Use the three gift-to-place pairs first.", "Rabbit's gift is last and Fox's gift comes before Owl's.", "Route B: gifts B-A-C; give FOX-OWL-RABBIT."]),
        step("Read the final paper note", "Find the envelope for the LAST place on your route. Use the printed dictionary in order; the note is pretend and no one needs to go anywhere.",
             ["Envelope", "Paper code", "Note state"],
             [["FOX DEN", "--", "Blank"], ["RABBIT GATE", "TREE / STAR / MOON", "Coded"], ["OWL WINDOW", "--", "Blank"]],
             "RABBIT GATE; GO!", "RABBIT GATE / GO!", "Final delivery record", ["Last place", "Decoded note"],
             "Use both last place and note on the final delivery card.",
             ["Choose the route's final place.", "Replace TREE, STAR, MOON without sorting them.", "RABBIT GATE; give GO!."],
             "Dictionary: TREE = G / STAR = O / MOON = !"),
        step("Check the final delivery", "Compare batch, route order, last place and note. Circle the only card matching all four and tell your grown-up two reasons.",
             ["Card", "Batch", "Route", "Last", "Note"],
             [["A", "B3", "FOX-OWL-RABBIT", "RABBIT", "GO!"], ["B", "B3", "OWL-FOX-RABBIT", "RABBIT", "GO!"], ["C", "B2", "FOX-OWL-RABBIT", "RABBIT", "GO!"], ["D", "B3", "FOX-OWL-RABBIT", "FOX", "GO!"], ["E", "B3", "FOX-OWL-RABBIT", "RABBIT", "NO!"]],
             "Delivery Card A", "Host reads thank-you note", "Story conclusion", ["Matching card", "Two supporting facts"],
             "The grown-up can read the paper thank-you note.",
             ["Use the full record sheet.", "Each other card changes one field.", "Card A; read the thank-you note."]),
    ],
}

CLASSROOM = {
    "code": "C06", "title": "The Winter Gift Sorting Station", "role": "TEACHER GUIDE",
    "intro": "Your group is a paper sorting crew. Match pretend picture items with named shelves, use simple size grades and check a paper departure list. No real gifts, family traditions or shopping are part of this activity.",
    "record": ["Shift batch", "Item-to-place matches", "Paper loading order", "Paper route and READY mark", "Final manifest and evidence"],
    "prepare": "Print one Group Player Pack per group and one private Teacher Guide. Give each group a complete set of pages, one checkpoint at a time. Size, Order, Destination and Recorder roles may be merged or rotated. Use the neutral Winter title by default. The organiser may choose explicit Christmas wording only after reviewing school context; do not infer it from student location or language.",
    "ending": "Confirm Manifest A after the group cites two different facts. Read: 'The paper sorting station is ready. Your team checked every picture card and route.' Do not ask children to share holiday, religion, family purchasing or gift practices.",
    "steps": [
        step("Check the shift batch", "Today's mark has a SQUARE frame, TWO lines and the printed word SNOW. Compare all three features.",
             ["Card", "Frame", "Lines", "Word", "Batch"],
             [["A", "Square", "1", "SNOW", "T1"], ["B", "Square", "2", "SNOW", "T2"], ["C", "Circle", "2", "SNOW", "T3"], ["D", "Square", "2", "LEAF", "T4"]],
             "Card B; T2", "T2", "Order-sheet batch", ["Matching mark", "Shift batch"],
             "Use only order-sheet rows with your batch mark.",
             ["Check frame, line count and word.", "One card meets every feature.", "Card B; give T2."]),
        step("Match the picture items", "Keep only your batch. BOOK belongs at LIBRARY DESK, STAR at SKY SHELF and BELL at MUSIC NOOK. These are printed story labels, not real destinations.",
             ["Item", "Batch", "Icon"],
             [["A", "T2", "BOOK"], ["X", "T1", "BOOK"], ["C", "T2", "BELL"], ["B", "T2", "STAR"]],
             "BOOK-LIBRARY, STAR-SKY, BELL-MUSIC", "Three item-place matches", "Loading and route constraints", ["Three matches", "Named shelf for each icon"],
             "Keep each item attached to its place when sorting the paper load.",
             ["Remove the wrong batch first.", "Match each named icon with its stated place.", "Book-Library, Star-Sky, Bell-Music."],
             "Destination cards: LIBRARY DESK / SKY SHELF / MUSIC NOOK"),
        step("Share the loading rule", "Size role: BOOK grade 3, STAR grade 1, BELL grade 2. Order role: smallest grade first. Destination role: keep each item's place from Checkpoint 2. Choose one item order.",
             ["Load", "First", "Second", "Third"],
             [["A", "BOOK", "BELL", "STAR"], ["B", "STAR", "BELL", "BOOK"], ["C", "BELL", "STAR", "BOOK"], ["D", "STAR", "BOOK", "BELL"]],
             "Load B; STAR-BELL-BOOK", "STAR-BELL-BOOK", "Paper route lookup", ["Matching load", "Item order"],
             "Turn the item order into the matching destination order.",
             ["Each role reads a condition.", "Sort invented grades 1, 2, 3 from small to large.", "Load B; give STAR-BELL-BOOK."]),
        step("Choose the paper route", "Convert your load order to the places matched earlier. Choose the route with those destinations in exactly that order. No real travel is involved.",
             ["Route", "First place", "Second place", "Third place", "Mark"],
             [["R1", "SKY", "MUSIC", "LIBRARY", "READY"], ["R2", "LIBRARY", "MUSIC", "SKY", "WAIT"], ["R3", "SKY", "LIBRARY", "MUSIC", "WAIT"], ["R4", "MUSIC", "SKY", "LIBRARY", "WAIT"]],
             "R1; SKY-MUSIC-LIBRARY; READY", "R1 / READY", "Final manifest", ["Matching route", "Route mark"],
             "Use the route number and mark on the final paper manifest.",
             ["Replace item names with their places.", "STAR-SKY, BELL-MUSIC, BOOK-LIBRARY.", "R1; give READY."]),
        step("Finish the paper manifest", "Compare shift batch, item order, route and route mark. Circle the one manifest matching your record; name two clue sheets that prove it.",
             ["Manifest", "Batch", "Load", "Route", "Mark"],
             [["A", "T2", "STAR-BELL-BOOK", "R1", "READY"], ["B", "T1", "STAR-BELL-BOOK", "R1", "READY"], ["C", "T2", "BOOK-BELL-STAR", "R1", "READY"], ["D", "T2", "STAR-BELL-BOOK", "R3", "READY"], ["E", "T2", "STAR-BELL-BOOK", "R1", "WAIT"]],
             "Manifest A", "Teacher reads winter ending", "Group conclusion", ["Matching manifest", "Two sources of evidence"],
             "The teacher can read the paper station thank-you card.",
             ["Use each cover-sheet result.", "All other manifests change exactly one field.", "Manifest A; close the story."]),
    ],
}


def validate_logic():
    for story in (HOME, CLASSROOM):
        assert len(story["steps"]) == 5
        for item in story["steps"]:
            assert len(item["hints"]) == 3
            assert all(len(row) == len(item["heads"]) for row in item["rows"])
    assert [r[0] for r in HOME["steps"][0]["rows"] if r[1:4] == ["Snowflake", "2", "Star"]] == ["A"]
    assert [r[0] for r in HOME["steps"][2]["rows"] if r[1:] == ["B", "A", "C"]] == ["B"]
    assert [r[0] for r in HOME["steps"][4]["rows"] if r[1:] == ["B3", "FOX-OWL-RABBIT", "RABBIT", "GO!"]] == ["A"]
    assert [r[0] for r in CLASSROOM["steps"][0]["rows"] if r[1:4] == ["Square", "2", "SNOW"]] == ["B"]
    assert [r[0] for r in CLASSROOM["steps"][2]["rows"] if r[1:] == ["STAR", "BELL", "BOOK"]] == ["B"]
    assert [r[0] for r in CLASSROOM["steps"][4]["rows"] if r[1:] == ["T2", "STAR-BELL-BOOK", "R1", "READY"]] == ["A"]


if __name__ == "__main__":
    validate_logic()
    render_drafts("christmas", HOME, CLASSROOM,
                  ROOT / "public" / "assets" / "christmas.png", "WINTER STORY ADVENTURE",
                  classroom_art_path=ROOT / "public" / "assets" / "winter-classroom-v0.1.jpg")
