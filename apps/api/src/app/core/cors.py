from __future__ import annotations

from typing import Any, List, Sequence

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware


def _normalize_allow_origins(allow_origins: Any) -> List[str]:
    # Accept list[str] OR comma string OR JSON array string; always return list[str]
    if allow_origins is None:
        return []

    if isinstance(allow_origins, str):
        s = allow_origins.strip()
        if not s:
            return []
        if s.startswith("[") and s.endswith("]"):
            try:
                import json

                arr = json.loads(s)
                if isinstance(arr, list):
                    out = []
                    for x in arr:
                        if x is None:
                            continue
                        v = str(x).strip()
                        if v:
                            out.append(v.rstrip("/"))
                    return out
            except Exception:
                pass
        parts = [p.strip() for p in s.split(",")]
        return [p.rstrip("/") for p in parts if p]

    if isinstance(allow_origins, Sequence):
        out: List[str] = []
        for x in allow_origins:
            if x is None:
                continue
            v = str(x).strip()
            if v:
                out.append(v.rstrip("/"))
        return out

    return []


def apply_cors(app: FastAPI, allow_origins: Any) -> None:
    origins = _normalize_allow_origins(allow_origins)
    if not origins:
        origins = ["http://localhost:2000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=[
            "Content-Type",
            "X-Request-Id",
            "Authorization",
        ],
        expose_headers=[
            "X-Request-Id",
            "X-Error-Code",
        ],
    )
