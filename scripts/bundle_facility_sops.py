"""Build a zip of LMCP animal-facility SOP markdown (CLI wrapper).

Usage:
    python scripts/bundle_facility_sops.py
    python scripts/bundle_facility_sops.py --output C:/Users/me/Downloads/LMCP-Facility-SOPs.zip
"""

from __future__ import annotations

import argparse
from pathlib import Path

from utils.facility_sop_pack import REPO_ROOT, build_facility_sop_zip_bytes, facility_sop_zip_filename


def main() -> None:
    parser = argparse.ArgumentParser(description="Zip LMCP animal facility SOP documents.")
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "dist" / facility_sop_zip_filename(),
        help="Output zip path",
    )
    args = parser.parse_args()
    out_path: Path = args.output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(build_facility_sop_zip_bytes())
    print(f"Created: {out_path}")


if __name__ == "__main__":
    main()
