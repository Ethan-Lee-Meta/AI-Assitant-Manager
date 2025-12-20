from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List


def _load_dotenv_if_present() -> None:
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return
    load_dotenv(override=False)


def _split_csv(value: str) -> List[str]:
    items = [x.strip() for x in (value or "").split(",")]
    return [x for x in items if x]


@dataclass(frozen=True)
class Settings:
    SERVICE_NAME: str
    ENV: str  # dev/prod
    CORS_ALLOW_ORIGINS: List[str]
    LOG_LEVEL: str


def load_settings() -> Settings:
    _load_dotenv_if_present()

    service_name = os.getenv("SERVICE_NAME", "ai-assistant-manager").strip() or "ai-assistant-manager"
    env = os.getenv("ENV", "dev").strip() or "dev"
    cors_raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:2000")
    cors_list = _split_csv(cors_raw)
    if "http://localhost:2000" not in cors_list:
        cors_list.insert(0, "http://localhost:2000")

    log_level = os.getenv("LOG_LEVEL", "INFO").strip() or "INFO"

    return Settings(
        SERVICE_NAME=service_name,
        ENV=env,
        CORS_ALLOW_ORIGINS=cors_list,
        LOG_LEVEL=log_level,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # 全局唯一配置入口（禁止业务模块散落读取 env）
    return load_settings()
