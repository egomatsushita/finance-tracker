from typing import TypeVar

from fastapi import Depends

from dependencies.database import SessionDep

ServiceType = TypeVar("ServiceType")


def get_service_dep(service_class: type[ServiceType]):
    async def get_service(session: SessionDep):
        return service_class(session)

    return Depends(get_service)
