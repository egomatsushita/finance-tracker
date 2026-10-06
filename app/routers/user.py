from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body

from dependencies.auth import CurrentUserDep, VerifyOwnership
from dependencies.service import get_service_dep
from docs.user import user_endpoints, user_update_self_example
from schemas.user import UserReadSchema, UserUpdateSelfSchema
from services.user import UserService

ServiceDep = Annotated[UserService, get_service_dep(UserService)]

user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get(
    "/me",
    status_code=200,
    **user_endpoints["get_me"],
    response_model=UserReadSchema,
)
async def read_current_user(
    current_user: CurrentUserDep, service: ServiceDep
) -> UserReadSchema:
    """
    Retrieve the authenticated caller's own profile.
    """
    return await service.get_by_id(current_user.id)


@user_router.get(
    "/{user_id}",
    status_code=200,
    **user_endpoints["get_one"],
    response_model=UserReadSchema,
    dependencies=[VerifyOwnership],
)
async def read_user(user_id: UUID, service: ServiceDep) -> UserReadSchema:
    """
    Retrieve a user by the given `user_id`.

    Returns a user with their id, username, email, role, active status and timestamps.
    """
    user = await service.get_by_id(user_id)
    return user


@user_router.put(
    "/{user_id}",
    status_code=200,
    **user_endpoints["update"],
    response_model=UserReadSchema,
    dependencies=[VerifyOwnership],
)
async def update_user(
    user_id: UUID,
    data: Annotated[UserUpdateSelfSchema, Body(examples=[user_update_self_example])],
    service: ServiceDep,
) -> UserReadSchema:
    """
    Update own profile by the given `user_id`.

    **Request body** (all fields optional):
    - **username**: unique display name
    - **email**: unique email address
    - **password**: plain-text password (will be hashed before storage)

    Returns the updated user with their id, username, email, role, active status and
    timestamps.
    """
    user = await service.update(user_id, data)
    return user
