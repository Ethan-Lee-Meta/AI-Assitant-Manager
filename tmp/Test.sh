set -euo pipefail
pycmd() { if command -v python >/dev/null 2>&1; then python "$@"; else py -3 "$@"; fi; }

source .venv/Scripts/activate
cd apps/api
PYTHONPATH=./src pycmd -m pytest -q