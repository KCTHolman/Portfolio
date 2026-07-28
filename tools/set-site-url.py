#!/usr/bin/env python3
"""Point the site at a different public URL.

Canonical tags, og:url, og:image, the sitemap and robots.txt all need the
absolute address the site is actually served from. Everything else on the site
uses relative paths, so this script is the only thing to run after a move.

    python3 tools/set-site-url.py https://koenholman.nl

Run it from the repository root. Re-running is safe.
"""
import pathlib
import re
import sys

FILES = [
    "index.html",
    "werk/index.html",
    "over/index.html",
    "contact/index.html",
    "sitemap.xml",
    "robots.txt",
]

def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    base = sys.argv[1].rstrip("/")
    if not base.startswith(("http://", "https://")):
        print(f"error: {base!r} needs an http:// or https:// scheme")
        return 2

    root = pathlib.Path(__file__).resolve().parent.parent
    current = detect_current(root)
    if current is None:
        print("error: could not read the current URL from index.html")
        return 1
    if current == base:
        print(f"already set to {base} — nothing to do")
        return 0

    total = 0
    for name in FILES:
        path = root / name
        text = path.read_text(encoding="utf-8")
        updated, n = re.subn(re.escape(current), base, text)
        if n:
            path.write_text(updated, encoding="utf-8")
            total += n
        print(f"  {name:<20} {n} replaced")

    print(f"\n{current} -> {base} ({total} references)")
    return 0


def detect_current(root: pathlib.Path) -> str | None:
    text = (root / "index.html").read_text(encoding="utf-8")
    m = re.search(r'<link rel="canonical" href="(https?://[^"]+?)/?">', text)
    return m.group(1) if m else None


if __name__ == "__main__":
    raise SystemExit(main())
