from typing import TypeVar

from fastapi import Depends

from dependencies.database import SessionDep

ServiceType = TypeVar("ServiceType")


def get_service_dep(service_class: type[ServiceType]) -> ServiceType:
    """
    Create a FastAPI `Depends` factory that instantiates a service class
    with an active `AsyncSession`.
    Args:
        service_class: The service class to instantiate (e.g. `UserService`).
                       Must accept an `AsyncSession` as its constructor argument.
    Returns:
        A `Depends` object that resolves to an instantiated `service_class` bound
        to the current session.
    """

    async def get_service(session: SessionDep):
        return service_class(session)

    return Depends(get_service)
