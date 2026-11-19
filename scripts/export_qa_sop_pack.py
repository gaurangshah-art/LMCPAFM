"""Write QA SOP zip to disk for email / SharePoint sharing (no login required).

Usage:
  python scripts/build_qa_validation_pack.py
  python scripts/export_qa_sop_pack.py
  python scripts/export_qa_sop_pack.py --output C:\\Users\\You\\Desktop\\LMCPAFM-QA.zip
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from utils.qa_sop_pack import build_qa_sop_zip_bytes, qa_pack_zip_filename


def main() -> None:
    parser = argparse.ArgumentParser(description="Export LMCPAFM QA SOP zip pack")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Output zip path (default: repo root / LMCPAFM-QA-SOP-Pack-YYYYMMDD.zip)",
    )
    args = parser.parse_args()

    try:
        zip_bytes = build_qa_sop_zip_bytes(ROOT)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    out = args.output or (ROOT / qa_pack_zip_filename())
    out.write_bytes(zip_bytes)
    print(f"Wrote {out} ({len(zip_bytes):,} bytes)")
    print("Share on college-restricted storage only. QA can open .md files in Word and Save as PDF.")


if __name__ == "__main__":
    main()
