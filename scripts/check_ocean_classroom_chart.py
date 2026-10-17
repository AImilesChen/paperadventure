"""Check the C07 chart game logic, PDF bounds and two-file archives."""
from __future__ import annotations

import hashlib
import itertools
import json
import zipfile
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"output"/"pdf"


def check_map_solution():
    pieces={
        "KELP BAY":{"right":"circle","bottom":"triangle"},
        "LIGHTHOUSE":{"left":"circle","bottom":"square"},
        "CHANNEL":{"top":"triangle","right":"diamond"},
        "CORAL REEF":{"top":"square","left":"diamond"},
    }
    valid=[]
    for tl,tr,bl,br in itertools.permutations(pieces):
        if tl!="KELP BAY":continue # the printed NORTH arrow anchors the first quarter
        if all(pieces[a].get(edge)==pieces[b].get(other) and pieces[a].get(edge)
               for a,edge,b,other in ((tl,"right",tr,"left"),(tl,"bottom",bl,"top"),
                                       (tr,"bottom",br,"top"),(bl,"right",br,"left"))):
            valid.append((tl,tr,bl,br))
    assert valid==[("KELP BAY","LIGHTHOUSE","CHANNEL","CORAL REEF")],valid
    chart={("A",1):"KELP BAY",("B",1):"LIGHTHOUSE",("A",2):"CHANNEL",("B",2):"CORAL REEF"}
    assert chart[("B",2)]=="CORAL REEF"


def main():
    check_map_solution()
    manifest=json.loads((OUT/"retail-packs-1.0-manifest.json").read_text(encoding="utf-8"))
    items=[x for x in manifest["items"] if (x["world"],x["setting"])==("ocean","classroom")]
    assert len(items)==4
    text_by_size={}
    for paper in ("A4","Letter"):
        selected=[]
        for role in ("player","guide"):
            item=next(x for x in items if x["paper"]==paper and x["role"]==role)
            path=ROOT/item["path"]
            raw=path.read_bytes()
            assert len(raw)==item["bytes"] and hashlib.sha256(raw).hexdigest()==item["sha256"]
            reader=PdfReader(path)
            assert len(reader.pages)==item["pages"]==9
            with pdfplumber.open(path) as pdf:
                pages=[page.extract_text() or "" for page in pdf.pages]
                text_by_size[(paper,role)]=[
                    sorted(" ".join(t.split()).replace("US Letter", "PAPER").replace("A4", "PAPER").split())
                    for t in pages
                ]
                assert all(len(t)>130 for t in pages),(paper,role,"empty page")
                assert all(f"Page {n} of 9" in t for n,t in enumerate(pages,1))
                assert all("Edition 1.0" in t for t in pages)
                assert not any("BLUE-3" in t or "East Passage" in t or "Report 1" in t for t in pages)
                for n,page in enumerate(pdf.pages,1):
                    assert page.width>580 and page.height>780
                    for char in page.chars:
                        assert 0<=char["x0"]<=char["x1"]<=page.width+1,(paper,role,n,char)
                        assert 0<=char["top"]<=char["bottom"]<=page.height+1,(paper,role,n,char)
                if role=="player":
                    assert "Copied log checked" in pages[1]
                    assert "Two log corrections" not in " ".join(pages[:7])
                    assert "Four chart quarters" in pages[2]
                    assert "KELP BAY" in pages[2] and "CORAL REEF" in pages[2]
                    assert "UNSURVEYED REEF" not in " ".join(pages)
                    assert "Which place is not yet surveyed?" not in pages[3]
                    assert "Do not choose the survey square yet" in pages[3]
                    assert "B2" not in " ".join(pages[:7])
                    assert "LIGHTHOUSE" in pages[4] and "CHANNEL" in pages[4]
                    assert pages[5].count("PRIVATE CLUE")==3
                    assert "THREE FISH MARKS" in pages[5] and "STRIPED BUOY" in pages[5]
                    clues_flat=" ".join(pages[5].split())
                    assert "THREE FISH MARKS" in clues_flat.split("OBSERVER B")[0]
                    assert "to its LEFT" in clues_flat.split("OBSERVER C")[0]
                    assert "THREE FISH MARKS" not in pages[6] and "STRIPED BUOY" not in pages[6]
                    assert "Two fish marks" in pages[7] and "buoy is LEFT" in pages[7]
                    assert "exactly two" not in pages[7].lower()
                    assert "Correct entry B" not in pages[7] and "Correct entry C" not in pages[7]
                    assert "Mark one:" in pages[7]
                    assert "Report 1" not in pages[8] and "Survey square" in pages[8]
                    assert "fish count" not in pages[8].lower() and "buoy position" not in pages[8].lower()
                else:
                    assert "63 Player sheets" in pages[0]
                    assert "eight loose pieces per crew" in pages[0].lower()
                    all_text=" ".join(" ".join(t.split()) for t in pages).lower()
                    assert "never hand the guide or uncut observation page 6" in all_text
                    assert "reader or observer" not in all_text
                    assert all("Read this story aloud" in pages[i] and "Three hints" in pages[i]
                               for i in range(2,7))
                    assert "wrong number and wrong side" not in pages[5]
                    assert "both captain's notes and the framed chart" in pages[5]
                    assert "supported by slips A and B" in pages[5]
                    assert "3 FISH" in pages[7] and "B2" in pages[7]
            selected.append(path)
        archive=OUT/f"ocean-classroom-{paper}-complete-1.0.zip"
        with zipfile.ZipFile(archive) as z:
            assert sorted(z.namelist())==sorted(p.name for p in selected)
            assert z.testzip() is None
            for path in selected:assert z.read(path.name)==path.read_bytes()
        print("OK",paper,"9 Player + 9 Teacher pages; complete matching ZIP")
    for role in ("player","guide"):
        assert text_by_size[("A4",role)]==text_by_size[("Letter",role)],(role,"A4/Letter word drift")
    print("OK A4/Letter player and guide word parity")


if __name__=="__main__":main()

