"""Convert half-width punctuation to full-width inside Chinese string literals.

Applies only to double-quoted string literals that contain CJK characters, so
English text, URLs, code and JSON keys are untouched. Inside such a literal:
  ,  →  ，      (not between two digits: 1,000 stays)
  :  →  ：      (not between two digits: 8:30 stays; not in http(s):)
  ;  →  ；
  ?  →  ？
  !  →  ！
  (  →  （      )  →  ）
A single ASCII space right after a converted mark is dropped ("，2026" not "， 2026").

Usage:  uv run python scripts/zh_punct.py <file> [<file> ...]      (edits in place, prints counts)
        uv run python scripts/zh_punct.py --check <file> ...       (no write; exit 1 if changes needed)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

CJK = re.compile(r"[㐀-䶿一-鿿　-〿＀-￯]")
STRING = re.compile(r'"((?:[^"\\]|\\.)*)"')       # double-quoted literal, handles \" escapes

FULL = {",": "，", ":": "：", ";": "；", "?": "？", "!": "！", "(": "（", ")": "）"}


def convert(s: str) -> str:
    out = []
    n = len(s)
    for i, ch in enumerate(s):
        if ch in FULL:
            prev = s[i - 1] if i > 0 else ""
            nxt = s[i + 1] if i + 1 < n else ""
            if ch in ",:" and prev.isdigit() and nxt.isdigit():
                out.append(ch); continue
            if ch == ":" and s[max(0, i - 5):i].lower().endswith(("http", "https")):
                out.append(ch); continue
            out.append(FULL[ch])
            continue
        # drop one ASCII space that follows a mark we just converted
        if ch == " " and out and out[-1] in FULL.values():
            continue
        out.append(ch)
    return "".join(out)


def process(text: str) -> tuple[str, int]:
    changed = 0
    def repl(m: re.Match) -> str:
        nonlocal changed
        body = m.group(1)
        if not CJK.search(body):
            return m.group(0)
        new = convert(body)
        if new != body:
            changed += 1
        return '"' + new + '"'
    return STRING.sub(repl, text), changed


def main() -> None:
    args = sys.argv[1:]
    check = "--check" in args
    files = [Path(a) for a in args if a != "--check"]
    bad = 0
    for f in files:
        text = f.read_text(encoding="utf-8")
        new, changed = process(text)
        if changed:
            bad += 1
            if not check:
                f.write_text(new, encoding="utf-8")
        print(f"{'would change' if check else 'changed'} {changed:4d} strings  {f}")
    sys.exit(1 if (check and bad) else 0)


if __name__ == "__main__":
    main()
