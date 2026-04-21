from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import Field, model_validator

from schemas.base import Base


class TransactionKindEnum(str, Enum):
    income = "income"
    expense = "expense"


class IncomeCategoryEnum(str, Enum):
    salary = "salary"
    investment = "investment"
    rental = "rental"
    gift = "gift"
    other = "other"


class ExpenseCategoryEnum(str, Enum):
    housing = "housing"
    utilities = "utilities"
    groceries = "groceries"
    transport = "transport"
    health = "health"
    entertainment = "entertainment"
    education = "education"
    clothing = "clothing"
    travel = "travel"
    savings = "savings"
    other = "other"


_VALID_CATEGORIES: dict[TransactionKindEnum, set[str]] = {
    TransactionKindEnum.income: {c.value for c in IncomeCategoryEnum},
    TransactionKindEnum.expense: {c.value for c in ExpenseCategoryEnum},
}


class TransactionBase(Base):
    amount: Decimal = Field(gt=0, examples=["50.00"])
    kind: TransactionKindEnum
    category: str
    description: str | None = None
    transaction_date: datetime


class TransactionCreateSchema(TransactionBase):
    @model_validator(mode="after")
    def validate_category_for_kind(self) -> "TransactionCreateSchema":
        valid = _VALID_CATEGORIES.get(self.kind, set())
        if self.category not in valid:
            raise ValueError(
                f"'{self.category}' is not a valid category for "
                f"kind '{self.kind.value}'. "
                f"Valid options: {sorted(valid)}"
            )
        return self


class TransactionUpdateSchema(Base):
    amount: Decimal | None = Field(default=None, gt=0)
    kind: TransactionKindEnum | None = None
    category: str | None = None
    description: str | None = None
    transaction_date: datetime | None = None

    @model_validator(mode="after")
    def validate_category_for_kind(self) -> "TransactionUpdateSchema":
        if self.kind is not None and self.category is not None:
            valid = _VALID_CATEGORIES.get(self.kind, set())
            if self.category not in valid:
                raise ValueError(
                    f"'{self.category}' is not a valid category for "
                    f"kind '{self.kind.value}'. "
                    f"Valid options: {sorted(valid)}"
                )
        return self


class TransactionReadSchema(TransactionBase):
    id: int
    user_id: UUID
    created_at: datetime
    updated_at: datetime
