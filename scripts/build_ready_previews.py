"""Render two spoiler-safe A4 player pages per paid fixed pack for public preview."""
from pathlib import Path
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "previews"
OUTPUT.mkdir(parents=True, exist_ok=True)
renderer = shutil.which("pdftoppm")
if not renderer:
    raise RuntimeError("pdftoppm is required to build PDF previews")

count = 0
for world in ("dinosaur", "space", "forest", "halloween", "christmas"):
    manifest = json.loads((ROOT / "content" / f"{world}-pdf-manifest.v0.1.json").read_text(encoding="utf-8"))
    for setting in ("home", "classroom"):
        source = next(item for item in manifest["items"] if item["setting"] == setting and item["role"] == "player" and item["paper"] == "A4")
        if source["pages"] < 2:
            raise RuntimeError(f"Player Pack needs two previewable pages: {world}/{setting}")
        for page in (1, 2):
            prefix = OUTPUT / f"{world}-{setting}-v{manifest['version']}-p{page}"
            subprocess.run([renderer, "-f", str(page), "-l", str(page), "-singlefile", "-r", "110", "-jpeg",
                            "-jpegopt", "quality=84", str(ROOT / source["file"]), str(prefix)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            result = Path(str(prefix) + ".jpg")
            if not result.exists() or result.stat().st_size < 10000:
                raise RuntimeError(f"Preview render failed: {result}")
            count += 1

assert count == 20
print(f"Rendered {count} paid-pack player previews (cover and first checkpoint); adult answers remain private")
