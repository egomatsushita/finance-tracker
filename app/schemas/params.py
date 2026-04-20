from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from schemas.transaction import TransactionKindEnum


class FilterParams(BaseModel):
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=10, ge=0, le=100)
    order_by: Literal["created_at", "updated_at"] = "created_at"


class TransactionFilterParams(FilterParams):
    order_by: Literal["created_at", "updated_at", "transaction_date"] = (
        "transaction_date"
    )
    kind: TransactionKindEnum | None = None
    category: str | None = None
    transaction_date_from: datetime | None = None
    transaction_date_to: datetime | None = None
