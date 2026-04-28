import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from errors.transaction import TransactionNotFoundError
from repositories.transaction import TransactionRepository
from schemas.params import TransactionFilterParams
from schemas.transaction import (
    TransactionCreateSchema,
    TransactionReadSchema,
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
