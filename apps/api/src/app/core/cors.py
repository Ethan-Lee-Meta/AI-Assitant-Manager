from __future__ import annotations

from typing import List

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware


def apply_cors(app: FastAPI, allow_origins: List[str]) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["Content-Type", "X-Request-Id", "Authorization"],
        expose_headers=["X-Request-Id", "X-Error-Code"],
    )
