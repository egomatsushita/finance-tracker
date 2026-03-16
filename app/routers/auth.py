from typing import Annotated

from fastapi import Depends, APIRouter
from fastapi.security import OAuth2PasswordRequestForm

from dependencies.service import get_service_dep
from schemas.auth import Token
from services.auth import AuthService

auth_router = APIRouter(prefix="/auth")

ServiceDep = Annotated[AuthService, get_service_dep(AuthService)]


@auth_router.post("/token", include_in_schema=False)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], service: ServiceDep) -> Token:
    """
    Authenticate with username and password to obtain an access token.

    Accepts an OAuth2 passowrd form with:
    - **username**: the user's username
    - **password**: the user's password

    Returns a bearer token with `access_token` and `token_type`.
    """
    resp = await service.login(form_data)
    return resp
