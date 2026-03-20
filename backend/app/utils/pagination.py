from __future__ import annotations

from typing import Any, Dict, Generic, List, Optional, Sequence, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams:
    """Parse and hold pagination parameters."""

    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), 100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class PaginatedResponse(BaseModel):
    items: List[Any] = []
    total: int = 0
    page: int = 1
    page_size: int = 20


def paginate(items: Sequence, total: int, page: int, page_size: int) -> dict:
    return {
        "items": list(items),
        "total": total,
        "page": page,
        "page_size": page_size,
    }
