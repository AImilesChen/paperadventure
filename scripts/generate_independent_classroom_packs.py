"""Generate five distinct, private classroom game drafts from their frozen puzzle data.

The output is deliberately test-only. It is never copied into public/.
"""

from __future__ import annotations

import hashlib
import json
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/theme-design/classroom-independent-games.v0.1.json"
DEST = ROOT / "output/pdf"
MANIFEST_DIR = ROOT / "content"
MARGIN = 43
INK = colors.HexColor("#103056")
CREAM = colors.HexColor("#fffaf1")
PALE = colors.HexColor("#e8f4fa")
CORAL = colors.HexColor("#d43e2c")
PAPER = colors.HexColor("#f6f1e7")


def colour(value: str):
    return colors.HexColor(value)


def paragraph(pdf, value: str, x: float, y: float, width: float, size=10.5, leading=None,
              weight="normal", shade=INK, min_y=72):
    style = ParagraphStyle(
        "body", fontName="Helvetica-Bold" if weight == "bold" else "Helvetica",
        fontSize=size, leading=leading or size * 1.43, textColor=shade,
        spaceAfter=0, allowWidows=0, allowOrphans=0,
    )
    p = Paragraph(escape(value), style)
    _, height = p.wrap(width, 1000)
    if y - height < min_y:
        raise ValueError(f"Text overflow below page footer: {value[:70]}")
    p.drawOn(pdf, x, y - height)
    return y - height


def header(pdf, game, kind: str, page: int, total: int, page_width: float, page_height: float):
    accent = colour(game["accent"])
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, page_width, page_height, stroke=0, fill=1)
    pdf.setFillColor(accent)
    pdf.rect(0, page_height - 14, page_width, 14, stroke=0, fill=1)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(MARGIN, page_height - 39, "PAPER ADVENTURE  /  CLASSROOM")
    pdf.setFillColor(accent)
    pdf.drawRightString(page_width - MARGIN, page_height - 39, game["code"] + "  " + kind.upper())
    pdf.setStrokeColor(colors.HexColor("#c7dce6"))
    pdf.line(MARGIN, 47, page_width - MARGIN, 47)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(MARGIN, 33, "Internal test draft v0.1  |  Teacher-led paper activity")
    pdf.drawRightString(page_width - MARGIN, 33, f"{page} / {total}")


def heading(pdf, text: str, x: float, y: float, width: float, size=24):
    return paragraph(pdf, text, x, y, width, size=size, leading=size * 1.12,
                     weight="bold", min_y=120) - 12


def label(pdf, text: str, x: float, y: float, accent):
    pdf.setFillColor(accent)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(x, y, text.upper())
    return y - 17


def panel(pdf, x, y, width, height, fill=PALE, stroke=None):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke or colors.HexColor("#b4d3e0"))
    pdf.roundRect(x, y - height, width, height, 11, stroke=1, fill=1)


def cover(pdf, game, kind, w, h):
    header(pdf, game, kind, 1, 7, w, h)
    accent = colour(game["accent"])
    y = h - 70
    y = label(pdf, game["world"] + "  /  " + kind, MARGIN, y, accent)
    y = heading(pdf, game["title"], MARGIN, y, w - 2 * MARGIN, size=27)
    y = paragraph(pdf, game["opening"], MARGIN, y, w - 2 * MARGIN, size=12, min_y=150) - 17
    image = ROOT / game["cover"]
    image_height = min(340, max(255, y - 172))
    pdf.drawImage(str(image), MARGIN, y - image_height, width=w - 2 * MARGIN,
                  height=image_height, preserveAspectRatio=True, anchor="c", mask="auto")
    y -= image_height + 24
    panel(pdf, MARGIN, y, w - 2 * MARGIN, 65, fill=PAPER)
    if kind == "Player Pack":
        paragraph(pdf, "Five connected checkpoints. Your teacher hands out one page at a time. Read every printed clue and record why you chose an answer.",
                  MARGIN + 15, y - 13, w - 2 * MARGIN - 30, size=10.5, min_y=60)
    else:
        paragraph(pdf, "Keep this answer guide away from students. Give each small group one Player Pack in the same paper size, then release pages in sequence.",
                  MARGIN + 15, y - 13, w - 2 * MARGIN - 30, size=10.5, min_y=60)
    pdf.showPage()


def player_stage(pdf, game, stage, stage_number, w, h):
    header(pdf, game, "Player Pack", stage_number + 1, 7, w, h)
    accent = colour(game["accent"])
    y = h - 73
    y = label(pdf, f"Checkpoint {stage_number} of 5", MARGIN, y, accent)
    y = heading(pdf, stage["title"], MARGIN, y, w - 2 * MARGIN, size=24)
    panel(pdf, MARGIN, y, w - 2 * MARGIN, 39, fill=PALE)
    paragraph(pdf, "Teacher: give this page after " + ("the opening" if stage_number == 1 else "the crew finds " + stage["requires"]) + ".",
              MARGIN + 13, y - 11, w - 2 * MARGIN - 26, size=9, weight="bold")
    y -= 59
    y = label(pdf, "The clue", MARGIN, y, accent)
    y = paragraph(pdf, stage["setup"], MARGIN, y, w - 2 * MARGIN, size=11.5,
                  leading=16.2, min_y=310) - 23
    y = label(pdf, "Paper evidence cards", MARGIN, y, accent)
    for index, card in enumerate(stage["cards"]):
        panel(pdf, MARGIN, y, w - 2 * MARGIN, 39, fill=colors.white)
        paragraph(pdf, f"{index + 1}.  {card}", MARGIN + 12, y - 10,
                  w - 2 * MARGIN - 24, size=10.2, min_y=150)
        y -= 47
    y -= 6
    y = label(pdf, "Your group decides", MARGIN, y, accent)
    y = paragraph(pdf, stage["prompt"], MARGIN, y, w - 2 * MARGIN, size=11,
                  weight="bold", min_y=160) - 12
    for index, option in enumerate(stage["options"]):
        y = paragraph(pdf, f"[  ] {chr(65 + index)}. {option}", MARGIN + 7, y,
                      w - 2 * MARGIN - 14, size=10.5, min_y=100) - 4
    y -= 10
    y = label(pdf, "Why? Name the printed evidence", MARGIN, y, accent)
    pdf.setStrokeColor(colors.HexColor("#8ea9b6"))
    for offset in (0, 30):
        if y - offset < 92:
            raise ValueError(f"Player answer space overflow: {game['id']} stage {stage_number}")
        pdf.line(MARGIN, y - offset, w - MARGIN, y - offset)
    pdf.showPage()


def player_ending(pdf, game, w, h):
    header(pdf, game, "Player Pack", 7, 7, w, h)
    accent = colour(game["accent"])
    y = h - 80
    y = label(pdf, "Mission complete", MARGIN, y, accent)
    y = heading(pdf, "Your paper adventure has an ending.", MARGIN, y,
                w - 2 * MARGIN, size=26)
    y = paragraph(pdf, game["ending"], MARGIN, y, w - 2 * MARGIN,
                  size=12.5, min_y=340) - 28
    panel(pdf, MARGIN, y, w - 2 * MARGIN, 245, fill=PALE)
    inner_y = y - 22
    inner_y = paragraph(pdf, "Our group's evidence trail", MARGIN + 18, inner_y,
                        w - 2 * MARGIN - 36, size=13, weight="bold") - 17
    for number in range(1, 6):
        inner_y = paragraph(pdf, f"{number}. Checkpoint result: _________________________________",
                            MARGIN + 18, inner_y, w - 2 * MARGIN - 36, size=10.8) - 15
    y -= 275
    paragraph(pdf, "Tell another group which two clues mattered most. There is no extra code or online step.",
              MARGIN, y, w - 2 * MARGIN, size=11, min_y=75)
    pdf.showPage()


def guide_setup(pdf, game, w, h):
    header(pdf, game, "Teacher Guide", 2, 7, w, h)
    accent = colour(game["accent"])
    y = h - 74
    y = label(pdf, "Before the lesson", MARGIN, y, accent)
    y = heading(pdf, "Run the game in five small steps.", MARGIN, y,
                w - 2 * MARGIN, size=24)
    blocks = [
        ("What to print", "Print one complete Player Pack per group in A4 or US Letter. Keep one Teacher Guide for yourself. The page numbers are identical in both sizes."),
        ("Group roles", "; ".join(game["roles"]) + ". Rotate the roles at a later checkpoint if time allows."),
        ("How to hand out pages", "Begin with the Player Pack cover. Give checkpoint pages 1-5 one at a time after checking the previous answer. Give the final page only after checkpoint 5. Do not hand every answer card to students at once."),
        ("What you need", "Ordinary paper and pens are enough. Cutting out card borders is optional. No account, device, specialist tool or real-world fact is required by students."),
        ("How to help", "Ask for the printed evidence. Use Hint 1, then Hint 2, then Hint 3 only as needed. If a group is stuck or a page is skipped, give the stated handover clue and continue without a penalty."),
        ("Safety and privacy", "This is fictional, collaborative paper play. Do not request a child's name, photo or personal story. Do not use a real specimen, machine or weather forecast as part of the answer."),
    ]
    for title, body in blocks:
        y = label(pdf, title, MARGIN, y - 8, accent)
        y = paragraph(pdf, body, MARGIN, y, w - 2 * MARGIN, size=10.6,
                      leading=14.9, min_y=72) - 16
    pdf.showPage()


def guide_stage(pdf, game, stage, number, w, h):
    header(pdf, game, "Teacher Guide", number + 2, 7, w, h)
    accent = colour(game["accent"])
    y = h - 74
    y = label(pdf, f"Teacher checkpoint {number} of 5", MARGIN, y, accent)
    y = heading(pdf, stage["title"], MARGIN, y, w - 2 * MARGIN, size=24)
    y = paragraph(pdf, "Entry clue: " + stage["requires"], MARGIN, y,
                  w - 2 * MARGIN, size=10.5, weight="bold") - 16
    panel(pdf, MARGIN, y, w - 2 * MARGIN, 94, fill=PALE)
    y2 = paragraph(pdf, "Correct choice: " + stage["options"][stage["answer"]],
                   MARGIN + 14, y - 13, w - 2 * MARGIN - 28,
                   size=12, weight="bold") - 10
    y2 = paragraph(pdf, "Why: " + stage["why"], MARGIN + 14, y2,
                   w - 2 * MARGIN - 28, size=10.8) - 9
    paragraph(pdf, "Handover clue: " + stage["unlock"], MARGIN + 14, y2,
              w - 2 * MARGIN - 28, size=10.8, weight="bold")
    y -= 122
    y = label(pdf, "Progressive hints", MARGIN, y, accent)
    for index, hint in enumerate(stage["hints"], start=1):
        y = paragraph(pdf, f"{index}. {hint}", MARGIN + 8, y,
                      w - 2 * MARGIN - 16, size=11, min_y=190) - 13
    y -= 14
    y = label(pdf, "If this checkpoint is skipped", MARGIN, y, accent)
    y = paragraph(pdf, stage["skip"], MARGIN, y, w - 2 * MARGIN,
                  size=11, min_y=150) - 28
    y = label(pdf, "Teacher check", MARGIN, y, accent)
    paragraph(pdf, "Ask one student to name the card or printed rule supporting the answer. "
              "A correct guess without evidence can be discussed, but do not block the story.",
              MARGIN, y, w - 2 * MARGIN, size=10.5, min_y=80)
    pdf.showPage()


def validate_game(game):
    stages = game["stages"]
    if len(stages) != 5 or not game["id"].isalpha() or len(game["roles"]) != 3:
        raise ValueError("Invalid game structure")
    previous = "START"
    for index, stage in enumerate(stages, start=1):
        if stage["requires"] != previous or len(stage["cards"]) != 3 or len(stage["options"]) != 3 or len(stage["hints"]) != 3:
            raise ValueError(f"Broken clue chain in {game['id']} checkpoint {index}")
        if stage["answer"] not in (0, 1, 2) or len(set(stage["options"])) != 3:
            raise ValueError(f"Ambiguous choices in {game['id']} checkpoint {index}")
        previous = stage["unlock"]
    if not (ROOT / game["cover"]).is_file():
        raise ValueError("Missing cover: " + game["cover"])


def write_pdf(game, paper: str, kind: str):
    page_size = A4 if paper == "A4" else letter
    w, h = page_size
    stem = f"{game['id']}-classroom-{paper.lower()}-{'player' if kind == 'Player Pack' else 'teacher'}-v0.1.pdf"
    path = DEST / stem
    pdf = canvas.Canvas(str(path), pagesize=page_size, pageCompression=1)
    pdf.setTitle(f"{game['title']} - {kind} - {paper}")
    pdf.setAuthor("Paper Adventure Workshop")
    cover(pdf, game, kind, w, h)
    if kind == "Player Pack":
        for index, stage in enumerate(game["stages"], start=1):
            player_stage(pdf, game, stage, index, w, h)
        player_ending(pdf, game, w, h)
    else:
        guide_setup(pdf, game, w, h)
        for index, stage in enumerate(game["stages"], start=1):
            guide_stage(pdf, game, stage, index, w, h)
    pdf.save()
    data = path.read_bytes()
    return {
        "file": path.relative_to(ROOT).as_posix(),
        "setting": "classroom",
        "paper": paper,
        "role": "player" if kind == "Player Pack" else "teacher",
        "pages": 7,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "status": "draft",
        "public": False,
    }


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    DEST.mkdir(parents=True, exist_ok=True)
    for game in data["games"]:
        validate_game(game)
        items = [
            write_pdf(game, paper, kind)
            for paper in ("A4", "Letter")
            for kind in ("Player Pack", "Teacher Guide")
        ]
        manifest = {
            "themeWorldId": game["id"],
            "version": data["version"],
            "published": False,
            "publishedFreeSample": False,
            "internalTest": True,
            "source": SOURCE.relative_to(ROOT).as_posix(),
            "items": items,
        }
        path = MANIFEST_DIR / f"{game['id']}-classroom-pdf-manifest.v0.1.json"
        path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"{game['id']}: {len(items)} private classroom PDFs")


if __name__ == "__main__":
    main()

