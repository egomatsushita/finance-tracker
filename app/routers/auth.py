from typing import Annotated

from fastapi import APIRouter, Body, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from utils.cookies import clear_auth_cookies, issue_session, set_auth_cookies

from dependencies.auth import CurrentUserDep, VerifyCsrf
from dependencies.service import get_service_dep
from docs.user import user_signup_example
from schemas.auth import LoginResponse
from schemas.user import UserSignupSchema
from services.auth import AuthService
from services.user import UserService

auth_router = APIRouter(prefix="/auth")

ServiceDep = Annotated[AuthService, get_service_dep(AuthService)]
UserServiceDep = Annotated[UserService, get_service_dep(UserService)]


@auth_router.post("/token", include_in_schema=False)
async def login(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: ServiceDep,
) -> LoginResponse:
    """
    Authenticate with username and password to obtain a session.

    Accepts an OAuth2 passowrd form with:
    - **username**: the user's username
    - **password**: the user's password

    Sets an httpOnly `session` cookie and a readable `csrf_token` cookie.
    """
    token = await service.login(form_data)
    set_auth_cookies(response, token.access_token)
    return LoginResponse(detail="ok")


@auth_router.post("/signup", include_in_schema=False)
async def signup(
    response: Response,
    user_data: Annotated[UserSignupSchema, Body(examples=[user_signup_example])],
    user_service: UserServiceDep,
) -> LoginResponse:
    """
    Create a new account with a username, email, and password, then log in.

    Sets an httpOnly `session` cookie and a readable `csrf_token` cookie, same as
    `/auth/token`.
    """
    user = await user_service.create(user_data)
    issue_session(response, user.username)
    return LoginResponse(detail="ok")


@auth_router.post("/logout", dependencies=[VerifyCsrf], include_in_schema=False)
async def logout(response: Response, current_user: CurrentUserDep) -> LoginResponse:
    """
    Log out the current session by clearing the `session` and `csrf_token` cookies.
    """
    clear_auth_cookies(response)
    return LoginResponse(detail="ok")
