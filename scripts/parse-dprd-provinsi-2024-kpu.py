"""Extract direct KPU DPRD Provinsi 2024 votes from provincial L5 PDFs."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import pymupdf

SOURCE_DIR = Path(r"G:\Drive Saya\2026\data-suara-sumber-internet\2024\dprd-provinsi\lampiran-resmi")
OUTPUT = Path(__file__).resolve().parent / "data" / "dprd-provinsi-2024-kpu-results.json"
PARTY_MARKER = re.compile(r"\b(PARTAI|PDI|GOLKAR|NASDEM|PKB|PKS|PAN|DEMOKRAT|HANURA|GARUDA|GELORA|UMMAT|PERINDO|PBB)\b", re.I)
NUMBER = re.compile(r"^\d[\d.,]*$")
CANDIDATE_ROW = re.compile(r"^(\d+)\s+(.+?)\s+(\d[\d.,]*)\s+(\d+)$")


def integer(value: str) -> int:
    return int(value.replace(".", "").replace(",", ""))


def extract_pdf(path: Path) -> dict:
    document = pymupdf.open(str(path))
    file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    dapil = None
    awaiting_dapil = False
    current_party = None
    mode = "party"
    pending_party = None
    candidate_ballot = None
    candidate_name: list[str] = []
    candidate_votes = None
    candidate_rows = []
    party_votes = {}
    warnings = []

    def reset_dapil(name: str) -> None:
        nonlocal dapil, current_party, mode, pending_party, candidate_ballot, candidate_name, candidate_votes
        dapil = name.strip().lstrip(": ").upper()
        current_party = None
        mode = "party"
        pending_party = None
        candidate_ballot = None
        candidate_name = []
        candidate_votes = None

    def add_candidate(page_number: int, ballot: int, name: str, votes: int, rank: int) -> None:
        name = re.sub(rf"^{ballot}\s*[.)]?\s*", "", name.strip())
        candidate_rows.append({
            "dapil": dapil, "partyBallot": current_party,
            "candidateBallot": ballot, "name": name,
            "votes": votes, "rank": rank, "page": page_number,
        })

    for page_number, page in enumerate(document, start=1):
        for raw in page.get_text("text").splitlines():
            line = " ".join(raw.split())
            if not line:
                continue

            heading = re.search(r"\bDAERAH PEMILIHAN\s*:\s*(.+)$", line, re.I)
            if heading:
                reset_dapil(heading.group(1))
                awaiting_dapil = False
                continue
            if line.upper() == "DAERAH PEMILIHAN":
                awaiting_dapil = True
                continue
            if awaiting_dapil:
                if line == ":":
                    continue
                reset_dapil(line)
                awaiting_dapil = False
                continue

            if dapil is None:
                continue

            upper = line.upper()
            if upper in {"NO", "NO.", "URUT", "SUARA SAH", "PERINGKAT", "CALON", "(1)", "(2)", "(3)", "(4)"}:
                continue
            if upper.startswith(("NO ", "NO.", "URUT", "PARTAI POLITIK/NAMA CALON", "SUARA SAH", "PERINGKAT", "PEROLEHAN SUARA", "SUARA TOTAL", "JDIH")):
                continue
            if re.match(r"^-\s*\d+\s*-$", line) or line.lower().startswith("jdih.kpu.go.id"):
                continue

            # Some PDFs keep an entire candidate row on one extracted line.
            match = CANDIDATE_ROW.match(line)
            if match and current_party is not None:
                add_candidate(page_number, int(match.group(1)), match.group(2), integer(match.group(3)), int(match.group(4)))
                mode = "candidate_no"
                candidate_ballot = None
                candidate_name = []
                candidate_votes = None
                continue

            # Party labels mark the transition into the next ballot group.
            if PARTY_MARKER.search(line):
                party_row = re.match(r"^(\d{1,2})\.?\s+(.+)$", line)
                if party_row:
                    pending_party = int(party_row.group(1))
                elif mode == "candidate_name" and candidate_ballot is not None and not candidate_name:
                    pending_party = candidate_ballot
                current_party = pending_party
                pending_party = None
                if current_party is None:
                    warnings.append(f"party label without ballot number, page {page_number}: {line}")
                    continue
                candidate_ballot = None
                candidate_name = []
                candidate_votes = None
                mode = "party_total"
                continue

            if NUMBER.fullmatch(line):
                value = integer(line)
                if mode == "party":
                    pending_party = value
                    mode = "party_name"
                elif mode == "party_name":
                    # A wrapped party label may place the party-only votes
                    # after its name, once the label itself has been read.
                    continue
                elif mode == "party_total":
                    party_votes[(dapil, current_party)] = value
                    mode = "candidate_no"
                elif mode == "candidate_no":
                    candidate_ballot = value
                    candidate_name = []
                    mode = "candidate_name"
                elif mode == "candidate_name":
                    candidate_votes = value
                    mode = "candidate_rank"
                elif mode == "candidate_rank":
                    if candidate_ballot is not None and candidate_name and candidate_votes is not None:
                        add_candidate(page_number, candidate_ballot, " ".join(candidate_name), candidate_votes, value)
                    candidate_ballot = None
                    candidate_name = []
                    candidate_votes = None
                    mode = "candidate_no"
                continue

            if mode == "party_name":
                # The first party name line can be split across several rows.
                if PARTY_MARKER.search(line):
                    mode = "party_total"
                continue
            if mode == "candidate_name":
                candidate_name.append(line)

    return {
        "file": path.name,
        "sha256": file_hash,
        "pageCount": len(document),
        "candidateRows": candidate_rows,
        "partyVotes": [
            {"dapil": key[0], "partyBallot": key[1], "votes": value}
            for key, value in sorted(party_votes.items(), key=lambda item: (str(item[0][0]), int(item[0][1] or 0)))
        ],
        "warnings": warnings,
    }


if __name__ == "__main__":
    pdfs = sorted(SOURCE_DIR.glob("L5*.pdf"))
    if not pdfs:
        raise SystemExit(f"No L5 PDFs found in {SOURCE_DIR}")
    results = [extract_pdf(path) for path in pdfs]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"source": "Keputusan Penetapan Hasil KPU Provinsi 2024, Lampiran II", "documents": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"pdfs": len(results), "pages": sum(x["pageCount"] for x in results), "candidateRows": sum(len(x["candidateRows"]) for x in results), "partyVoteRows": sum(len(x["partyVotes"]) for x in results), "warnings": sum(len(x["warnings"]) for x in results), "output": str(OUTPUT)}, ensure_ascii=False))
