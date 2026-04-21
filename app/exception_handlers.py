from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from errors.auth import CredentialError, ForbiddenError, NotAuthenticatedError
from errors.database import ConflictError
from errors.params import InvalidFilterError
from errors.transaction import TransactionNotFoundError
from errors.user import UserAlreadyExistError, UserNotFoundError


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(InvalidFilterError)
    async def invalid_filter_error_handler(req: Request, exc: InvalidFilterError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": [{"loc": ["query"], "msg": str(exc), "type": "value_error"}]
            },
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_error_handler(req: Request, exc: ForbiddenError):
        raise HTTPException(status_code=403, detail=str(exc))

    @app.exception_handler(ConflictError)
    async def conflict_error_handler(req: Request, exc: ConflictError):
        raise HTTPException(status_code=409, detail=str(exc))

    @app.exception_handler(CredentialError)
    async def credential_error_handler(req: Request, exc: CredentialError):
        raise HTTPException(
            status_code=401, detail=str(exc), headers={"WWW-Authenticate": "Bearer"}
        )

    @app.exception_handler(NotAuthenticatedError)
    async def not_authenticated_error_handler(req: Request, exc: NotAuthenticatedError):
        raise HTTPException(
            status_code=401, detail=str(exc), headers={"WWW-Authenticate": "Bearer"}
        )

    @app.exception_handler(UserNotFoundError)
    async def user_not_found_error_handler(req: Request, exc: UserNotFoundError):
        raise HTTPException(status_code=404, detail=str(exc))

    @app.exception_handler(UserAlreadyExistError)
    async def user_already_exist_error_handler(
        req: Request, exc: UserAlreadyExistError
    ):
        raise HTTPException(status_code=409, detail=str(exc))

    @app.exception_handler(TransactionNotFoundError)
    async def transaction_not_found_error_handler(
        req: Request, exc: TransactionNotFoundError
    ):
        raise HTTPException(status_code=404, detail=str(exc))
