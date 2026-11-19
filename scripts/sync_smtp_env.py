"""Merge IAEC SMTP settings from crud/.env into the repo-root .env file."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
EXAMPLE_PATH = ROOT / ".env.example"
LEGACY_ENV_PATH = ROOT / "crud" / ".env"

IAEC_KEYS = (
    "IAEC_SMTP_HOST",
    "IAEC_SMTP_PORT",
    "IAEC_SMTP_USERNAME",
    "IAEC_SMTP_PASSWORD",
    "IAEC_SMTP_USE_TLS",
    "IAEC_SENDER_EMAIL",
    "IAEC_SENDER_NAME",
    "IAEC_PPT_GOOGLE_FORM_URL",
    "IAEC_SUPPORT_CONTACT",
)


def _parse_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _render_env(base_lines: list[str], updates: dict[str, str]) -> str:
    seen: set[str] = set()
    output: list[str] = []

    for line in base_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            if key in updates:
                output.append(f"{key}={updates[key]}")
                seen.add(key)
                continue
        output.append(line.rstrip())

    missing = [key for key in IAEC_KEYS if key in updates and key not in seen]
    if missing:
        if output and output[-1].strip():
            output.append("")
        output.append("# IAEC meeting invitation email")
        for key in missing:
            output.append(f"{key}={updates[key]}")

    return "\n".join(output).rstrip() + "\n"


def main() -> None:
    if not ENV_PATH.exists():
        ENV_PATH.write_text(EXAMPLE_PATH.read_text(encoding="utf-8"), encoding="utf-8")

    base_lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    legacy_values = _parse_env(LEGACY_ENV_PATH)
    updates = {key: legacy_values[key] for key in IAEC_KEYS if key in legacy_values and legacy_values[key]}

    if not updates:
        print("No IAEC SMTP values found to merge.")
        return

    ENV_PATH.write_text(_render_env(base_lines, updates), encoding="utf-8")
    print(f"Updated {ENV_PATH.name} with IAEC SMTP settings.")


if __name__ == "__main__":
    main()
