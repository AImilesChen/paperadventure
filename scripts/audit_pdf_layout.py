"""Audit draft PDF page geometry and text, without treating it as print QA."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "output" / "pdf"
REPORT = PDF_ROOT / "layout-audit-v0.1.json"
PAPER = {"A4": (595.28, 841.89), "Letter": (612.0, 792.0)}


def audit(pdf_path: Path) -> dict:
    paper = "A4" if pdf_path.stem.endswith("-A4") else "Letter" if pdf_path.stem.endswith("-Letter") else None
    failures: list[str] = []
    warnings: list[str] = []
    small_body_chars = 0
    small_header_footer_chars = 0
    near_edge_chars = 0
    char_count = 0
    smallest_size = None
    smallest_body_size = None
    with pdfplumber.open(pdf_path) as pdf:
        for number, page in enumerate(pdf.pages, 1):
            if paper:
                expected_width, expected_height = PAPER[paper]
                if abs(page.width - expected_width) > 1 or abs(page.height - expected_height) > 1:
                    failures.append(f"p{number}: {paper} dimensions mismatch ({page.width:.2f}x{page.height:.2f})")
            if not page.chars and not page.images and not page.rects and not page.lines:
                failures.append(f"p{number}: empty page")
            char_count += len(page.chars)
            for char in page.chars:
                size = float(char["size"])
                smallest_size = size if smallest_size is None else min(smallest_size, size)
                if size < 8:
                    if 40 <= float(char["top"]) <= page.height - 40:
                        small_body_chars += 1
                    else:
                        small_header_footer_chars += 1
                if 40 <= float(char["top"]) <= page.height - 40:
                    smallest_body_size = size if smallest_body_size is None else min(smallest_body_size, size)
                x0, x1 = float(char["x0"]), float(char["x1"])
                top, bottom = float(char["top"]), float(char["bottom"])
                if x0 < -0.5 or top < -0.5 or x1 > page.width + 0.5 or bottom > page.height + 0.5:
                    failures.append(f"p{number}: text outside page at ({x0:.1f},{top:.1f})–({x1:.1f},{bottom:.1f})")
                elif x0 < 12 or top < 12 or x1 > page.width - 12 or bottom > page.height - 12:
                    near_edge_chars += 1
        if not char_count:
            warnings.append("No extractable text; visual/manual review required")
        if small_body_chars:
            warnings.append(f"{small_body_chars} body glyphs below 8 pt; check their print role")
        if near_edge_chars:
            warnings.append(f"{near_edge_chars} glyphs within 12 pt of a page edge")
        return {
            "file": pdf_path.name,
            "paper": paper,
            "pages": len(pdf.pages),
            "extractable_glyphs": char_count,
            "smallest_font_pt": round(smallest_size, 2) if smallest_size is not None else None,
            "smallest_body_font_pt": round(smallest_body_size, 2) if smallest_body_size is not None else None,
            "small_header_footer_glyphs": small_header_footer_chars,
            "failures": failures,
            "warnings": warnings,
        }


def main() -> int:
    pdf_paths = sorted(PDF_ROOT.glob("*.pdf"))
    results = [audit(path) for path in pdf_paths]
    themes = Counter(item["file"].split("-")[0] for item in results)
    report = {
        "scope": "Screen geometry/text scan only; not a real play-test or physical print check",
        "pdf_count": len(results),
        "theme_counts": dict(sorted(themes.items())),
        "pages": sum(item["pages"] for item in results),
        "documents_with_failures": sum(bool(item["failures"]) for item in results),
        "documents_with_warnings": sum(bool(item["warnings"]) for item in results),
        "documents": results,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("pdf_count", "theme_counts", "pages", "documents_with_failures", "documents_with_warnings")}, ensure_ascii=False))
    for item in results:
        for failure in item["failures"]:
            print(f"FAIL {item['file']} {failure}")
        if item["warnings"]:
            print(f"WARN {item['file']}: {'; '.join(item['warnings'])}")
    return 1 if report["documents_with_failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
