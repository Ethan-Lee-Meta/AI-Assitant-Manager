set -euo pipefail

python - <<'PY'
from pathlib import Path
import re

p = Path("apps/api/src/app/main.py")
s = p.read_text(encoding="utf-8")
lines = s.splitlines(True)

# locate the first line of apply_cors(
apply_i = None
for i, l in enumerate(lines):
    if re.match(r"^\s*apply_cors\s*\(", l):
        apply_i = i
        break
if apply_i is None:
    raise SystemExit("PATCH FAIL: cannot find apply_cors(...) in apps/api/src/app/main.py")

# capture the apply_cors(...) statement block (supports multiline)
def capture_stmt(start_idx: int):
    buf = []
    depth = 0
    started = False
    i = start_idx
    while i < len(lines):
        line = lines[i]
        buf.append(line)
        for ch in line:
            if ch == "(":
                depth += 1
                started = True
            elif ch == ")" and started:
                depth -= 1
        if started and depth <= 0:
            return start_idx, i + 1, "".join(buf)
        i += 1
    raise SystemExit("PATCH FAIL: cannot capture apply_cors(...) statement block")

a0, a1, ablock = capture_stmt(apply_i)

# find first middleware registration line (add_middleware or @app.middleware)
first_mw = None
for i, l in enumerate(lines):
    if "add_middleware" in l or re.match(r"^\s*@app\.middleware\(", l):
        first_mw = i
        break
if first_mw is None:
    raise SystemExit("PATCH FAIL: cannot find any middleware registration in main.py")

# We want apply_cors(...) to be BEFORE any other middleware registration
if a0 < first_mw:
    print("OK: apply_cors(...) is already before other middleware registrations. No change.")
    raise SystemExit(0)

new_lines = lines[:a0] + lines[a1:]
# adjust insert position after removal
insert_at = first_mw
if first_mw > a0:
    insert_at = first_mw - (a1 - a0)

new_lines = new_lines[:insert_at] + [ablock] + new_lines[insert_at:]
p.write_text("".join(new_lines), encoding="utf-8")
print("OK: moved apply_cors(...) before other middleware registrations in main.py")
PY
