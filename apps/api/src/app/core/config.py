from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List


def _strip_trailing_slash(url: str) -> str:
    u = url.strip()
    while u.endswith("/") and len(u) > 1:
        u = u[:-1]
    return u


def _parse_origins_env(name: str, default: List[str]) -> List[str]:
    raw = os.getenv(name)
    if raw is None:
        return default

    s = raw.strip()
    if not s:
        return default

    # Support JSON array in env: ["http://localhost:2000", ...]
    if s.startswith("["):
        try:
            arr = json.loads(s)
            if isinstance(arr, list):
                out = []
                for x in arr:
                    if x is None:
                        continue
                    v = str(x).strip()
                    if v:
                        out.append(_strip_trailing_slash(v))
                return out or default
        except Exception:
            # Fall back to comma split
            pass

    # Comma-separated: http://a,http://b
    parts = [p.strip() for p in s.split(",")]
    out = [_strip_trailing_slash(p) for p in parts if p]
    return out or default


@dataclass(frozen=True)
class Settings:
    SERVICE_NAME: str
    ENV: str
    CORS_ALLOW_ORIGINS: List[str]
    LOG_LEVEL: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    service_name = os.getenv("SERVICE_NAME", "ai-assistant-manager").strip() or "ai-assistant-manager"
    env = os.getenv("ENV", "dev").strip() or "dev"
    log_level = (os.getenv("LOG_LEVEL", "INFO").strip() or "INFO").upper()

    cors_default = ["http://localhost:2000"]
    cors_allow_origins = _parse_origins_env("CORS_ALLOW_ORIGINS", cors_default)

    return Settings(
        SERVICE_NAME=service_name,
        ENV=env,
        CORS_ALLOW_ORIGINS=cors_allow_origins,
        LOG_LEVEL=log_level,
    )
