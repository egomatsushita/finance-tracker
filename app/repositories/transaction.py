from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.transaction import FinancialTransaction
from schemas.params import TransactionFilterParams
from schemas.transaction import TransactionCreateSchema, TransactionUpdateSchema

_ORDER_BY_COLUMNS = {
    "created_at": FinancialTransaction.created_at,
    "updated_at": FinancialTransaction.updated_at,
    "transaction_date": FinancialTransaction.transaction_date,
}


class TransactionRepository:
    """
    Repository for all database operations on the `FinancialTransaction` model.

    Centralizes all `FinancialTransaction` query logic and exposes it to the
    service layer. All methods require an active `AsyncSession` provided at
    instantiation.

    Attributes:
        session: The active SQLAlchemy async session used for all queries.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self, user_id: UUID, filter_params: TransactionFilterParams
    ) -> list[FinancialTransaction]:
        """
        Retrieve a paginated and ordered list of transactions for a given user.

        Args:
            user_id: The ID of the user whose transactions to retrieve.
            filter_params: Pagination, ordering, and optional filters for `kind`,
                           `category`, and `transaction_date` range.

        Returns:
            A list of `FinancialTransaction` instances matching the given filters.
            Returns an empty list if no transactions are found.
        """
        query = select(FinancialTransaction).where(
            FinancialTransaction.user_id == user_id
        )
        if filter_params.kind is not None:
            query = query.where(FinancialTransaction.kind == filter_params.kind)
        if filter_params.category is not None:
            query = query.where(FinancialTransaction.category == filter_params.category)
        if filter_params.transaction_date_from is not None:
            query = query.where(
                FinancialTransaction.transaction_date
                >= filter_params.transaction_date_from
            )
        if filter_params.transaction_date_to is not None:
            query = query.where(
                FinancialTransaction.transaction_date
                <= filter_params.transaction_date_to
            )
        query = (
            query.offset(filter_params.offset)
            .limit(filter_params.limit)
            .order_by(_ORDER_BY_COLUMNS[filter_params.order_by])
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_id(
        self, user_id: UUID, transaction_id: int
    ) -> FinancialTransaction | None:
        """
        Retrieve a single transaction by ID, scoped to the given user.

        Args:
            user_id: The ID of the user who owns the transaction.
            transaction_id: A unique transaction ID.

        Returns:
            A `FinancialTransaction` instance matching both IDs, or `None` if not found.
        """
        result = await self.session.execute(
            select(FinancialTransaction)
            .where(FinancialTransaction.id == transaction_id)
            .where(FinancialTransaction.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self, user_id: UUID, data: TransactionCreateSchema
    ) -> FinancialTransaction:
        """
        Persist a new transaction to the database.

        Args:
            user_id: The ID of the user who owns the transaction.
            data: Validated fields required to create a `FinancialTransaction` instance.

        Returns:
            A newly created `FinancialTransaction` instance with database-generated
            fields populated (e.g. `id`, `created_at`).

        Raises:
            SQLAlchemyError: If the flush fails due to a constraint violation.
        """
        transaction = FinancialTransaction(**data.model_dump(), user_id=user_id)
        self.session.add(transaction)
        await self.session.flush()
        return transaction

    async def update(
        self, user_id: UUID, transaction_id: int, data: TransactionUpdateSchema
    ) -> FinancialTransaction | None:
        """
        Update a transaction by ID, scoped to the given user.

        Args:
            user_id: The ID of the user who owns the transaction.
            transaction_id: A unique transaction ID.
            data: Validated optional fields to update a `FinancialTransaction` instance.

        Returns:
            The updated `FinancialTransaction` instance, or `None` if not found.

        Raises:
            SQLAlchemyError: If the flush fails due to a constraint violation.
        """
        transaction = await self.get_by_id(user_id, transaction_id)
        if transaction is None:
            return None
        for name, value in data.model_dump(exclude_unset=True).items():
            setattr(transaction, name, value)
        await self.session.flush()
        await self.session.refresh(transaction)
        return transaction

    async def delete(self, user_id: UUID, transaction_id: int) -> bool:
        """
        Delete a transaction by ID, scoped to the given user.

        Args:
            user_id: The ID of the user who owns the transaction.
            transaction_id: A unique transaction ID.

        Returns:
            `True` if the transaction was deleted, `False` if not found.
        """
        transaction = await self.get_by_id(user_id, transaction_id)
        if transaction is None:
            return False
        await self.session.delete(transaction)
        await self.session.flush()
        return True
