"""Check the C01 paper-badge PDF/ZIP contract without claiming physical playtesting."""
from __future__ import annotations

import hashlib
import itertools
import json
import math
import zipfile
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"


def check_logic():
    edges = {
        "A": {"right": "circle", "bottom": "triangle"},
        "B": {"left": "circle", "bottom": "square"},
        "C": {"top": "triangle", "right": "diamond"},
        "D": {"top": "square", "left": "diamond"},
    }
    valid = []
    for tl, tr, bl, br in itertools.permutations(edges):
        if all((edges[a].get(side) and edges[a].get(side) == edges[b].get(opposite))
               for a, side, b, opposite in ((tl, "right", tr, "left"), (tl, "bottom", bl, "top"),
                                             (tr, "bottom", br, "top"), (bl, "right", br, "left"))):
            valid.append((tl, tr, bl, br))
    assert valid == [("A", "B", "C", "D")], valid
    tiles = ("MAP", "BADGE", "PENCIL")
    valid_orders = [x for x in itertools.permutations(tiles)
                    if x[0] == "MAP" and x.index("BADGE") > x.index("MAP")
                    and x.index("BADGE") < x.index("PENCIL")]
    assert valid_orders == [("MAP", "BADGE", "PENCIL")], valid_orders
    # Six 52 pt symbol squares fit as two top, three middle, one bottom inside
    # the printed 100 pt radius badge circle without overlapping one another.
    assert math.hypot(52, 78) < 100
    assert math.hypot(78, 26) < 100
    assert math.hypot(26, 78) < 100


def main():
    check_logic()
    manifest = json.loads((OUT / "retail-packs-1.0-manifest.json").read_text(encoding="utf-8"))
    selected = [i for i in manifest["items"] if (i["world"], i["setting"]) == ("celebration", "classroom")]
    assert len(selected) == 4
    for paper in ("A4", "Letter"):
        pdf_paths = []
        for role in ("player", "guide"):
            item = next(i for i in selected if i["paper"] == paper and i["role"] == role)
            path = ROOT / item["path"]
            assert path.exists() and path.stat().st_size == item["bytes"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]
            assert len(PdfReader(str(path)).pages) == item["pages"] == 9
            pdf_paths.append(path)
            with pdfplumber.open(path) as pdf:
                texts = [p.extract_text() or "" for p in pdf.pages]
                assert all(len(t) > 110 for t in texts), path
                assert all(f"Page {n} of 9" in t for n, t in enumerate(texts, 1)), path
                assert all("Edition 1.0" in t for t in texts), path
                assert "Trace the team route" not in " ".join(texts)
                assert "Equipment A" not in " ".join(texts)
                assert "Plan A" not in " ".join(texts)
                for page in pdf.pages:
                    assert page.width > 580 and page.height > 780
                    for char in page.chars:
                        assert 0 <= char["x0"] <= char["x1"] <= page.width + 1
                        assert 0 <= char["top"] <= char["bottom"] <= page.height + 1
                if role == "player":
                    assert "Rebuild the invitation" in texts[2]
                    assert "OAK END" in texts[3] and "GATE END" in texts[3]
                    assert texts[4].count("PRIVATE CLUE") == 4
                    assert "COMPASS" not in texts[5] and "HANDS" not in texts[5]
                    assert "TOP / 2" in texts[7] and "FOLD LINE" in texts[7]
                    assert "COMPASS" not in texts[8] and "BOOK" not in texts[8]
                    assert "Keep all four cards through Mission 5" in texts[4]
                    assert "LEFT HAND" in texts[6] and "RIGHT HAND" in texts[6]
                    assert "CREW SYMBOL (NO NAMES)" in texts[7]
                    assert "next group in a circle" in texts[8]
                else:
                    assert "63 sheets" in texts[0] and "140 for seven groups" in texts[0]
                    assert "Low-cut mode: eight pre-cut pieces per crew" in texts[1]
                    assert "never expose the full" in texts[1]
                    assert "The adult reads each story scene" in texts[2]
                    assert "next crew, even with an odd number" in " ".join(texts[7].split())
                    assert "screen-render QA" not in texts[8]
                    assert "MAP, BADGE, PENCIL" in " ".join(texts)
                    assert "MOON, KEY and FLAG" in " ".join(texts)
        archive = OUT / f"celebration-classroom-{paper}-complete-1.0.zip"
        with zipfile.ZipFile(archive) as z:
            assert sorted(z.namelist()) == sorted(p.name for p in pdf_paths)
            for path in pdf_paths:
                assert z.read(path.name) == path.read_bytes()
        print("OK", paper, "9 Player pages + 9 Guide pages + matching ZIP")


if __name__ == "__main__":
    main()

