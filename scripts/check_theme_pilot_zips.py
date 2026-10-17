"""Check every private play-test ZIP against its current PDF manifest and sources."""

from pathlib import Path
import hashlib
import json
import re
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "output" / "pdf"
CONTENT = ROOT / "content"
BASE_WORLDS = ("celebration", "dinosaur", "space", "forest", "halloween", "christmas")
VARIANTS = (("halloween", "halloween"), ("christmas", "christmas"))
DOCS = {"README.md", "设计蓝图.md", "试玩与打印记录表.md", "SHA256SUMS.txt"}
SUM_LINE = re.compile(r"^([0-9a-f]{64})  (.+\.pdf)$")


def check_kit(name: str, manifest_name: str, expected_count: int) -> int:
    manifest = json.loads((CONTENT / manifest_name).read_text(encoding="utf-8"))
    if "published" in manifest:
        assert manifest["published"] is False, manifest_name
    else:
        assert manifest_name.startswith("celebration-") and manifest["publishedFreeSample"] is False
    items = manifest["items"]
    assert len(items) == expected_count, (manifest_name, len(items))
    expected = {Path(item["file"]).name: item for item in items}
    assert len(expected) == expected_count, manifest_name
    zip_path = PDF_ROOT / f"{name}.zip"
    with zipfile.ZipFile(zip_path) as kit:
        assert kit.testzip() is None, zip_path
        names = set(kit.namelist())
        assert len(names) == len(kit.namelist()), (zip_path, "duplicate entries")
        assert names == set(expected) | DOCS, (zip_path, names ^ (set(expected) | DOCS))
        sum_lines = kit.read("SHA256SUMS.txt").decode("utf-8-sig").splitlines()
        recorded = {}
        for line in sum_lines:
            match = SUM_LINE.fullmatch(line)
            assert match, (zip_path, "bad checksum line", line)
            sha, filename = match.groups()
            assert filename not in recorded, (zip_path, "duplicate checksum", filename)
            recorded[filename] = sha
        assert set(recorded) == set(expected), zip_path
        for filename, item in expected.items():
            assert item["status"] == "draft" and item["public"] is False, filename
            packed = kit.read(filename)
            local = (ROOT / item["file"]).read_bytes()
            assert packed == local, (zip_path, "stale packed PDF", filename)
            digest = hashlib.sha256(packed).hexdigest()
            assert digest == item["sha256"] == recorded[filename], (zip_path, filename)
    return expected_count


def main() -> None:
    checked = 0
    pdfs = 0
    for world in BASE_WORLDS:
        pdfs += check_kit(f"pilot-{world}-v0.1", f"{world}-pdf-manifest.v0.1.json", 8)
        checked += 1
    for world, wording in VARIANTS:
        pdfs += check_kit(
            f"pilot-{world}-classroom-{wording}-v0.1",
            f"{world}-classroom-{wording}-pdf-manifest.v0.1.json",
            4,
        )
        checked += 1
    print(f"Validated {checked} private tester ZIPs and {pdfs} PDFs against current manifests and source bytes")


if __name__ == "__main__":
    main()
