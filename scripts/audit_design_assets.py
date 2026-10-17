"""Record exact image files in the public build and private design handoff.

This is a file inventory, not a licence or commercial-use approval.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "design-handoff" / "ASSET_FILE_REGISTER.md"
SEARCH_ROOTS = (
    (ROOT / "public", "public build"),
    (ROOT / "design-handoff" / "concepts", "internal design"),
    (ROOT / "design-handoff" / "material-previews", "internal design"),
)
EXTENSIONS = {".png", ".jpg", ".jpeg", ".ico", ".svg", ".webp"}


def dimensions(path: Path) -> str:
    if path.suffix.lower() == ".svg":
        root = ET.parse(path).getroot()
        return root.attrib.get("viewBox", "SVG viewport not specified")
    with Image.open(path) as image:
        if path.suffix.lower() == ".ico":
            sizes = sorted(image.ico.sizes())
            return ", ".join(f"{width}×{height}" for width, height in sizes)
        width, height = image.size
        return f"{width}×{height}"


def main() -> None:
    rows: list[str] = []
    for directory, boundary in SEARCH_ROOTS:
        for path in sorted(directory.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
                continue
            relative = path.relative_to(ROOT).as_posix()
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            size = path.stat().st_size
            rows.append(
                f"| `{relative}` | {boundary} | {dimensions(path)} | {size:,} | `{digest}` |"
            )

    document = "\n".join(
        [
            "# Design asset file register",
            "",
            "Generated from current local file bytes by `scripts/audit_design_assets.py`. "
            "Use with [asset provenance](ASSET_PROVENANCE.md): dimensions and hashes "
            "identify a file version but do not establish origin, licence, or approval.",
            "",
            "| File | Boundary | Dimensions / SVG viewBox | Bytes | SHA-256 |",
            "| --- | --- | --- | ---: | --- |",
            *rows,
            "",
            f"Total: **{len(rows)} visual files**. A file marked `public build` "
            "is web-accessible in the current technical preview; it is not an approved sales asset.",
            "",
        ]
    )
    OUTPUT.write_text(document, encoding="utf-8")
    print(f"Recorded {len(rows)} files in {OUTPUT}")


if __name__ == "__main__":
    main()
