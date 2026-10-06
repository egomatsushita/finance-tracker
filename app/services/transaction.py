import logging
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from errors.transaction import TransactionNotFoundError
from repositories.transaction import TransactionRepository
from schemas.params import TransactionFilterParams, TransactionSummaryFilterParams
from schemas.transaction import (
    CategorySummary,
    MonthSummary,
    TransactionCreateSchema,
    TransactionReadSchema,
    TransactionSummarySchema,
    TransactionUpdateSchema,
)

logger = logging.getLogger(__name__)


class TransactionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = TransactionRepository(session)

    async def get_all(
        self, user_id: UUID, filter_params: TransactionFilterParams
    ) -> list[TransactionReadSchema]:
        """
        Return a paginated and filtered list of transactions for a user.

        Args:
            user_id: the UUID of the authenticated user.
            filter_params: pagination, ordering, and filter options.

        Returns:
            A list of validated TransactionReadSchema instances.
        """
        transactions = await self.repo.get_all(user_id, filter_params)
        return [TransactionReadSchema.model_validate(t) for t in transactions]

    async def get_by_id(
        self, user_id: UUID, transaction_id: int
    ) -> TransactionReadSchema:
        """
        Return a transaction by ID, enforcing ownership.

        Args:
            user_id: the UUID of the authenticated user.
            transaction_id: the ID of the transaction to retrieve.

        Returns:
            The matching transaction as a TransactionReadSchema instance.

        Raises:
            TransactionNotFoundError: if no transaction with the given ID exists
                                      or it belongs to a different user.
        """
        transaction = await self.repo.get_by_id(user_id, transaction_id)
        if transaction is None:
            raise TransactionNotFoundError()
        return TransactionReadSchema.model_validate(transaction)

    async def create(
        self, user_id: UUID, data: TransactionCreateSchema
    ) -> TransactionReadSchema:
        """
        Create a new transaction for a user.

        Args:
            user_id: the UUID of the authenticated user.
            data: validated fields for the new transaction.

        Returns:
            The created transaction as a TransactionReadSchema instance.
        """
        transaction = await self.repo.create(user_id, data)
        logger.info(
            "transaction_created transaction_id=%s user_id=%s", transaction.id, user_id
        )
        return TransactionReadSchema.model_validate(transaction)

    async def update(
        self, user_id: UUID, transaction_id: int, data: TransactionUpdateSchema
    ) -> TransactionReadSchema:
        """
        Update a transaction by ID, enforcing ownership.

        Args:
            user_id: the UUID of the authenticated user.
            transaction_id: the ID of the transaction to update.
            data: partial update payload; unset fields are ignored.

        Returns:
            The updated transaction as a TransactionReadSchema instance.

        Raises:
            TransactionNotFoundError: if no transaction with the given ID exists
                                      or it belongs to a different user.
        """
        transaction = await self.repo.update(user_id, transaction_id, data)
        if transaction is None:
            raise TransactionNotFoundError()
        logger.info(
            "transaction_updated transaction_id=%s user_id=%s", transaction.id, user_id
        )
        return TransactionReadSchema.model_validate(transaction)

    async def delete(self, user_id: UUID, transaction_id: int) -> None:
        """
        Delete a transaction by ID, enforcing ownership.

        Args:
            user_id: the UUID of the authenticated user.
            transaction_id: the ID of the transaction to delete.
        Raises:
            TransactionNotFoundError: if no transaction with the given ID exists
                                      or it belongs to a different user.
        """
        if not await self.repo.delete(user_id, transaction_id):
            raise TransactionNotFoundError()
        logger.info(
            "transaction_deleted transaction_id=%s user_id=%s", transaction_id, user_id
        )

    async def get_summary(
        self, user_id: UUID, filter_params: TransactionSummaryFilterParams
    ) -> TransactionSummarySchema:
        """
        Return aggregated income/expense totals, category breakdown, and
        monthly trend for a user's transactions.

        Args:
            user_id: the UUID of the authenticated user.
            filter_params: optional `transaction_date` range filters.

        Returns:
            A validated TransactionSummarySchema instance. Totals default to
            `Decimal("0.00")` and breakdown lists default to empty when the
            user has no matching transactions.
        """
        summary = await self.repo.get_summary(user_id, filter_params)

        totals = summary["totals"]
        total_income = totals.get("income", Decimal("0.00"))
        total_expense = totals.get("expense", Decimal("0.00"))

        by_category = [
            CategorySummary(kind=kind, category=category, total=total)
            for kind, category, total in summary["by_category"]
        ]

        by_month_totals: dict[str, dict[str, Decimal]] = {}
        for month, kind, total in summary["by_month"]:
            by_month_totals.setdefault(
                month, {"income": Decimal("0.00"), "expense": Decimal("0.00")}
            )[kind] = total
        by_month = [
            MonthSummary(
                month=month, income=values["income"], expense=values["expense"]
            )
            for month, values in sorted(by_month_totals.items())
        ]

        return TransactionSummarySchema(
            total_income=total_income,
            total_expense=total_expense,
            net=total_income - total_expense,
            by_category=by_category,
            by_month=by_month,
        )
