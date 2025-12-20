set -euo pipefail

# M00-A 冻结清单补丁（ALLOW-LIST 增补 1 项）的“落地记录”：
# - 不新增任何规范文件/说明文件，直接在允许新增的测试文件头部固化约束（防自由发挥）
# - 同时将该测试内容收敛到你规定的唯一覆盖范围

cat > apps/api/tests/test_internal_error_meta_crash.py <<'EOF'
"""
M00-A 冻结清单补丁（ALLOW-LIST 增补 1 项）
新增允许项：
  - apps/api/tests/test_internal_error_meta_crash.py

补丁后的 M00-A 测试文件允许清单（完整列出，便于对齐）：
  - apps/api/tests/test_health.py
  - apps/api/tests/test_error_envelope.py
  - apps/api/tests/test_request_id.py
  - apps/api/tests/test_pagination_contract.py
  - apps/api/tests/test_internal_error_meta_crash.py  ✅（新增允许项）

本文件内容约束（禁止自由发挥）：
- 只允许覆盖 1 件事：GET /api/_meta/crash 的平台回归
- 必须验证：
  1) HTTP status = 500
  2) 返回为 ErrorEnvelope：必须包含字段 error.code / error.message / error.details / request_id
  3) error.code = INTERNAL_ERROR
  4) 响应头 X-Request-Id 存在，且与 body.request_id 一致
- 禁止：
  - 加入任何业务模块相关测试（Projects/Series/Assets 等）
  - 引入额外依赖（仅 pytest + fastapi.testclient 即可）
"""

from fastapi.testclient import TestClient

from app.main import app


def test_internal_error_on_meta_crash_platform_regression():
    c = TestClient(app)
    r = c.get("/api/_meta/crash")

    # 1) status
    assert r.status_code == 500

    # 4) request_id header exists
    hdr_rid = r.headers.get("X-Request-Id")
    assert hdr_rid and isinstance(hdr_rid, str)

    # 2) ErrorEnvelope shape + 3) error.code
    j = r.json()
    assert isinstance(j, dict)
    assert "error" in j
    assert "request_id" in j

    err = j["error"]
    assert isinstance(err, dict)
    assert "code" in err
    assert "message" in err
    assert "details" in err  # may be None or dict

    assert err["code"] == "INTERNAL_ERROR"
    assert isinstance(err["message"], str) and err["message"]

    # 4) header/body consistency
    assert j["request_id"] == hdr_rid
EOF

echo "OK: ALLOW-LIST patch recorded + test constrained: apps/api/tests/test_internal_error_meta_crash.py"
