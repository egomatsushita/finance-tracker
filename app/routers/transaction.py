from typing import Annotated

from fastapi import APIRouter, Body, Response

from dependencies.auth import CurrentUserDep
from dependencies.params import TransactionFilterParamsDep
from dependencies.service import get_service_dep
from docs.transaction import (
    transaction_create_example,
    transaction_endpoints,
    transaction_update_example,
)
from schemas.transaction import (
    TransactionCreateSchema,
    TransactionReadSchema,
    TransactionUpdateSchema,
)
from services.transaction import TransactionService

ServiceDep = Annotated[TransactionService, get_service_dep(TransactionService)]

transaction_router = APIRouter(prefix="/transactions", tags=["transactions"])


@transaction_router.get(
    "/",
    status_code=200,
    **transaction_endpoints["get_all"],
    response_model=list[TransactionReadSchema],
)
async def read_transactions(
    service: ServiceDep,
    current_user: CurrentUserDep,
    filter_params: TransactionFilterParamsDep,
) -> list[TransactionReadSchema]:
    """
    Retrieve a paginated list of the authenticated user's transactions.
    """
    return await service.get_all(current_user.id, filter_params)


@transaction_router.post(
    "/",
    status_code=201,
    **transaction_endpoints["create"],
    response_model=TransactionReadSchema,
)
async def create_transaction(
    service: ServiceDep,
    current_user: CurrentUserDep,
    data: Annotated[
        TransactionCreateSchema, Body(examples=[transaction_create_example])
    ],
) -> TransactionReadSchema:
    """
    Create a new transaction for the authenticated user.
    """
    return await service.create(current_user.id, data)


@transaction_router.get(
    "/{transaction_id}",
    status_code=200,
    **transaction_endpoints["get_one"],
    response_model=TransactionReadSchema,
)
async def read_transaction(
    transaction_id: int,
    service: ServiceDep,
    current_user: CurrentUserDep,
) -> TransactionReadSchema:
    """
    Retrieve a transaction by the given `transaction_id`.
    """
    return await service.get_by_id(current_user.id, transaction_id)


@transaction_router.patch(
    "/{transaction_id}",
    status_code=200,
    **transaction_endpoints["update"],
    response_model=TransactionReadSchema,
)
async def update_transaction(
    transaction_id: int,
    data: Annotated[
        TransactionUpdateSchema, Body(examples=[transaction_update_example])
    ],
    service: ServiceDep,
    current_user: CurrentUserDep,
) -> TransactionReadSchema:
    """
    Update a transaction by the given `transaction_id`.
    """
    return await service.update(current_user.id, transaction_id, data)


@transaction_router.delete(
    "/{transaction_id}",
    status_code=204,
    **transaction_endpoints["delete"],
    response_model=None,
)
async def delete_transaction(
    transaction_id: int,
    service: ServiceDep,
    current_user: CurrentUserDep,
) -> Response:
    """
    Delete a transaction by the given `transaction_id`.
    """
    await service.delete(current_user.id, transaction_id)
    return Response(status_code=204)
