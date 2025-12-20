set -euo pipefail

git status -sb
echo
echo "=== changed files (name-only) ==="
git diff --name-only
echo
echo "=== M00-A key files snapshot ==="
ls -al apps/api/src/app/core
ls -al apps/api/src/app/api
ls -al apps/api/src/app/modules
ls -al apps/api/tests