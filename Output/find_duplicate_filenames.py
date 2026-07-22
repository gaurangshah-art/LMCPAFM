# BEGIN: copy from here down into Notepad

from pathlib import Path
from collections import defaultdict
import argparse
import re

IGNORE_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".venv", ".venv-1", "node_modules",
    ".mypy_cache", ".ruff_cache", ".idea", ".vscode", "dist", "build", ".next", ".vite",
}
IGNORE_SUFFIXES = {".pyc", ".pyo", ".log", ".tmp"}
TEXT_SUFFIXES = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".toml", ".ini", ".cfg",
    ".md", ".html", ".css", ".scss", ".sql", ".txt",
}


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    if parts & IGNORE_DIRS:
        return True
    if path.suffix.lower() in IGNORE_SUFFIXES:
        return True
    return False


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_SUFFIXES


def collect_duplicates(root: Path):
    by_name = defaultdict(list)
    for p in root.rglob("*"):
        if p.is_file() and not should_skip(p):
            by_name[p.name].append(p)
    return {name: paths for name, paths in by_name.items() if len(paths) > 1}


def build_text_index(root: Path):
    index = []
    for p in root.rglob("*"):
        if p.is_file() and not should_skip(p) and is_text_file(p):
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
                index.append((p, text))
            except Exception:
                pass
    return index


def reference_hits(paths, text_index, root: Path):
    results = {}
    for target in paths:
        stem = target.stem
        rel = target.relative_to(root).as_posix()
        parent_name = target.parent.name
        patterns = [
            re.escape(rel),
            re.escape(stem),
            re.escape(parent_name + "/" + stem),
            re.escape(parent_name + "\\" + stem),
        ]
        regex = re.compile("|".join(patterns))
        hits = []
        for p, text in text_index:
            if p == target:
                continue
            if regex.search(text):
                hits.append(p.relative_to(root).as_posix())
        results[target] = sorted(set(hits))
    return results


def main():
    parser = argparse.ArgumentParser(
        description="List duplicate filenames in a repo and show possible references."
    )
    parser.add_argument("root", nargs="?", default=".", help="Repo root folder (default: current directory)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    dups = collect_duplicates(root)
    if not dups:
        print("No duplicate filenames found.")
        return

    print(f"Repo root: {root}")
    print(f"Duplicate filenames found: {len(dups)}")
    print("-" * 80)

    text_index = build_text_index(root)

    for name in sorted(dups):
        paths = sorted(dups[name])
        print(f"FILE NAME: {name}")
        refs = reference_hits(paths, text_index, root)
        for i, p in enumerate(paths, 1):
            rel = p.relative_to(root).as_posix()
            print(f"  {i}. {rel}")
            if refs[p]:
                print("     Possible references in:")
                for hit in refs[p][:10]:
                    print(f"       - {hit}")
                if len(refs[p]) > 10:
                    print(f"       ... and {len(refs[p]) - 10} more")
            else:
                print("     Possible references in: NONE found")
        print("-" * 80)

    print("How to use this report:")
    print("1. Keep the file path that is actually imported/routed/referenced.")
    print('2. Treat paths with "NONE found" as candidates for manual review.')
    print("3. Do not delete automatically; verify each candidate in your app first.")


if __name__ == "__main__":
    main()

# END: copy until here