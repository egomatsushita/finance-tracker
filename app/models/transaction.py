import sqlalchemy as sa
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import mapped_column
from sqlalchemy.types import UUID, DateTime, Integer, Numeric

from models.base import Base


class FinancialTransaction(Base):
    """Represents a financial transaction recorded by a user."""

    __tablename__ = "financial_transaction"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    amount = mapped_column(Numeric(10, 2), nullable=False)
    kind = mapped_column(
        sa.Enum("income", "expense", name="transaction_kind", create_type=False),
        nullable=False,
    )
    category = mapped_column(sa.String(50), nullable=False)
    description = mapped_column(sa.String(255), nullable=True)
    user_id = mapped_column(UUID, ForeignKey("user.id"), nullable=False)
    transaction_date = mapped_column(DateTime(timezone=True), nullable=False)
    created_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self):
        return (
            f"<FinancialTransaction(id={self.id!r}, kind={self.kind!r}, "
            f"amount={self.amount!r})>"
        )
