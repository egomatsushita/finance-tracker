from typing import Literal

from pydantic import BaseModel, Field


class FilterParams(BaseModel):
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=10, ge=0, le=100)
    order_by: Literal["created", "modified"] = "created"
