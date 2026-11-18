"""Export collaborating-researcher / student Form B SOP as PDF.

Usage:
  python scripts/export_student_sop_pdf.py
  python scripts/export_student_sop_pdf.py -o Docs/LMCPAFM-Student-Form-B-SOP.pdf
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from utils.markdown_pdf import markdown_to_pdf_bytes

SOURCE = ROOT / "Docs" / "sop_student_personnel.md"
DEFAULT_OUT = ROOT / "Docs" / "LMCPAFM-Student-Form-B-SOP.pdf"


def main() -> None:
    parser = argparse.ArgumentParser(description="Export student / collaborating researcher SOP PDF")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    if not SOURCE.is_file():
        print(f"Missing source: {SOURCE}", file=sys.stderr)
        sys.exit(1)

    text = SOURCE.read_text(encoding="utf-8")
    pdf_bytes = markdown_to_pdf_bytes(text)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(pdf_bytes)
    print(f"Wrote {args.output} ({len(pdf_bytes):,} bytes)")


if __name__ == "__main__":
    main()