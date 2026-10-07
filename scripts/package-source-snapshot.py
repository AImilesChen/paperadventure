"""Create a source-only ZIP for transfer without local Git network access."""

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "paper-adventure-source-snapshot.zip"
SKIP_DIRS = {".git", ".npm-cache", ".wrangler", ".wrangler-preview-build", "node_modules", "dist", "output", "tmp"}
SKIP_FILES = {".env"}

OUTPUT.parent.mkdir(exist_ok=True)
with ZipFile(OUTPUT, "w", ZIP_DEFLATED, compresslevel=6, strict_timestamps=False) as archive:
    for file in sorted(ROOT.rglob("*")):
        if not file.is_file():
            continue
        relative = file.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        if file.name in SKIP_FILES or file.name.startswith(".env.") and file.name != ".env.example":
            continue
        if len(relative.parts) == 1 and file.suffix.lower() == ".png" and file.name.startswith("qa-"):
            continue
        archive.write(file, relative.as_posix())

print(f"Created source snapshot: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
