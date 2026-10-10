"""Structural and clue-chain checks for the five independent Classroom drafts."""

import hashlib
import json
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "content/theme-design/classroom-independent-games.v0.1.json").read_text(encoding="utf-8"))
assert len(data["games"]) == 5
assert len({game["id"] for game in data["games"]}) == 5
all_hashes = set()

for game in data["games"]:
    previous = "START"
    for number, stage in enumerate(game["stages"], 1):
        assert stage["requires"] == previous, (game["id"], number)
        assert len(stage["cards"]) == len(stage["options"]) == len(stage["hints"]) == 3
        assert 0 <= stage["answer"] < 3
        assert stage["options"][stage["answer"]] in stage["why"] or stage["unlock"] in stage["why"] or len(stage["why"]) >= 25
        previous = stage["unlock"]

    manifest_path = ROOT / f"content/{game['id']}-classroom-pdf-manifest.v0.1.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["themeWorldId"] == game["id"]
    assert manifest["published"] is False and manifest["internalTest"] is True
    assert len(manifest["items"]) == 4
    slots = set()
    for item in manifest["items"]:
        assert item["setting"] == "classroom" and item["status"] == "draft" and item["public"] is False
        slot = (item["paper"], item["role"])
        assert slot not in slots
        slots.add(slot)
        path = ROOT / item["file"]
        pdf_bytes = path.read_bytes()
        digest = hashlib.sha256(pdf_bytes).hexdigest()
        assert digest == item["sha256"] and len(pdf_bytes) == item["bytes"]
        assert digest not in all_hashes
        all_hashes.add(digest)
        reader = PdfReader(str(path))
        assert len(reader.pages) == item["pages"] == 7
        expected_size = (595, 842) if item["paper"] == "A4" else (612, 792)
        actual_size = (round(float(reader.pages[0].mediabox.width)), round(float(reader.pages[0].mediabox.height)))
        assert actual_size == expected_size, (path, actual_size)
        page_text = [page.extract_text() or "" for page in reader.pages]
        assert game["title"] in page_text[0]
        assert all("Internal test draft v0.1" in page for page in page_text)
        if item["role"] == "player":
            assert all(stage["title"] in page_text[number] for number, stage in enumerate(game["stages"], 1))
            assert "Correct choice:" not in "\n".join(page_text)
            assert " ".join(game["ending"].split()) in " ".join(page_text[-1].split())
        else:
            assert all(stage["unlock"] in page_text[number + 1] for number, stage in enumerate(game["stages"], 1))
            assert all("PROGRESSIVE HINTS" in page_text[number + 1] for number in range(1, 6))
    assert slots == {("A4", "player"), ("A4", "teacher"), ("Letter", "player"), ("Letter", "teacher")}

print("Validated 5 unique Classroom worlds, 25 causal checkpoints and 20 private seven-page PDFs.")

