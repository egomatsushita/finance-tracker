from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends

from dependencies.auth import verify_token
from dependencies.params import FilterParamsDep
from dependencies.service import get_service_dep
from docs.user import user_create_example, user_update_example, user_endpoints
from services.user import UserService
from schemas.user import UserReadSchema, UserCreateSchema, UserUpdateSchema


ServiceDep = Annotated[UserService, get_service_dep(UserService)]

user_router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(verify_token)])


@user_router.get("/", status_code=200, **user_endpoints["get_all"])
async def read_users(service: ServiceDep, filter_params: FilterParamsDep) -> list[UserReadSchema]:
    """
    Get all the users
    """
    users = await service.get_all(filter_params)
    return users


@user_router.post("/", status_code=201, **user_endpoints["create"])
async def create_user(
    service: ServiceDep,
    user_data: Annotated[UserCreateSchema, Body(examples=[user_create_example])],
) -> UserReadSchema:
    user = await service.create(user_data)
    return user


@user_router.get("/{user_id}", status_code=200, **user_endpoints["get_one"])
async def read_user(user_id: UUID, service: ServiceDep) -> UserReadSchema:
    """
    Get the user by ID
    """
    user = await service.get_by_id(user_id)
    return user


@user_router.put("/{user_id}", status_code=200, **user_endpoints["update"])
async def update_user(
    user_id: UUID, data: Annotated[UserUpdateSchema, Body(examples=[user_update_example])], service: ServiceDep
) -> UserReadSchema:
    """
    Update the user data
    """
    user = await service.update(user_id, data)
    return user


@user_router.delete("/{user_id}", status_code=204, **user_endpoints["delete"])
async def delete_user(user_id: UUID, service: ServiceDep) -> None:
    """
    Delete the user by ID
    """
    await service.delete(user_id)
