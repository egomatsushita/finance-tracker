from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body

from dependencies.auth import RequireAdmin, VerifyOwnership
from dependencies.params import FilterParamsDep
from dependencies.service import get_service_dep
from docs.user import user_create_example, user_endpoints, user_update_example
from schemas.user import UserCreateSchema, UserReadSchema, UserUpdateSchema
from services.user import UserService

ServiceDep = Annotated[UserService, get_service_dep(UserService)]

user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get(
    "/",
    status_code=200,
    **user_endpoints["get_all"],
    response_model=list[UserReadSchema],
    dependencies=[RequireAdmin],
)
async def read_users(
    service: ServiceDep, filter_params: FilterParamsDep
) -> list[UserReadSchema]:
    """
    Retrieve a paginated list of all users.

    Supports filtering via query parameters:
    - **offset**: number of records to skip (default: 0)
    - **limit**: number of records to return (default: 10, max: 100)
    - **order_by**: sort field -- `created_at` or `updated_at` (default: `created_at`)

    Returns a list of users with their id, username, email, role, active status and
    timestamps.
    """
    users = await service.get_all(filter_params)
    return users


@user_router.post(
    "/",
    status_code=201,
    **user_endpoints["create"],
    response_model=UserReadSchema,
    dependencies=[RequireAdmin],
)
async def create_user(
    service: ServiceDep,
    user_data: Annotated[UserCreateSchema, Body(examples=[user_create_example])],
) -> UserReadSchema:
    """
    Create a new user.

    **Request body:**
    - **username**: unique display name
    - **email**: unique email address
    - **password**: plain-text password (will be hashed before storage)
    - **role** *(optional)*: `admin` or `user` (default: `user`)
    - **is_active** *(optional)*: account active status (default: `true`)

    Returns the created user with generated `id` and timestamps.
    """
    user = await service.create(user_data)
    return user


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
    data: Annotated[UserUpdateSchema, Body(examples=[user_update_example])],
    service: ServiceDep,
) -> UserReadSchema:
    """
    Update user data by the given `user_id`.

    **Request body** (all fields optional):
    - **username**: unique display name
    - **email**: unique email address
    - **password**: plain-text password (will be hashed before storage)
    - **role**: `admin` or `user`
    - **is_active**: account active status

    Returns the updated user with their id, username, email, role, active status and
    timestamps.
    """
    user = await service.update(user_id, data)
    return user


@user_router.delete(
    "/{user_id}",
    status_code=204,
    **user_endpoints["delete"],
    dependencies=[RequireAdmin],
)
async def delete_user(user_id: UUID, service: ServiceDep) -> None:
    """
    Delete a user by the given `user_id`.
    """
    await service.delete(user_id)
