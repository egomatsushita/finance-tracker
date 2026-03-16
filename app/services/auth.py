from datetime import timedelta, datetime, timezone

from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
import jwt
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from repositories.user import UserRepository
from schemas.auth import Token, TokenPayload


class AuthService:
    recommended_hash = PasswordHash.recommended()

    def __init__(self, session: AsyncSession):
        self.session = session

    async def login(self, form_data: OAuth2PasswordRequestForm) -> Token:
        """
        Authenticate a user by username and password to obtain an access token.
        Args:
            form_data: OAuth2 form fields -- username and password.
        Returns:
            An access token with `access_token` and `token_type`.
        Raises:
            HTTPException (401): If the username doesn't exist or the password is incorrect.
        """
        repo = UserRepository(self.session)
        user = await repo.get_by_username(form_data.username)
        hashed_password = user.hashed_password if user else None
        is_authenticated = self.authenticate(hashed_password, form_data.password)

        if not is_authenticated:
            raise HTTPException(
                status_code=401, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"}
            )

        access_token_expires = timedelta(minutes=settings.access_token_expire_minute)
        access_token = self.create_access_token(user.username, access_token_expires)

        return Token(access_token=access_token, token_type="bearer")

    @classmethod
    def create_hashed_password(cls, password: str) -> str:
        """
        Hash a plain-text password using the recommended algorithm.
        Args:
            password: a plain-text password to hash.
        Returns:
            a hashed password string.
        """
        return cls.recommended_hash.hash(password)

    @classmethod
    def verify_password(cls, password: str, hashed_password: str) -> bool:
        """
        Verify a plain-text password against its hashed counterpart.
        Args:
            password: a plain-text password to verify.
            hashed_password: a stored hashed password to compare against.
        Returns:
            True if the password matches, False otherwise.
        """
        return cls.recommended_hash.verify(password, hashed_password)

    @staticmethod
    def calc_expire(expires_delta: timedelta | None) -> datetime:
        """
        Calculate an expiration timestamp from the current UTC time.
        Args:
            expires_delta: a time delta to add to the current time. Defaults to 15 minutes if not provided.
        Returns:
            A datetime representing the expiration time.
        """
        if expires_delta:
            return datetime.now(timezone.utc) + expires_delta

        return datetime.now(timezone.utc) + timedelta(minutes=15)

    @staticmethod
    def encode_jwt(token_payload: dict) -> str:
        """
        Encode a payload into a signed JSON web token.
        Args:
            token_payload: the claims to encode (e.g. sub, exp).
        Returns:
            A signed JWT string
        """
        return jwt.encode(token_payload, settings.secret_key, algorithm=settings.algorithm)

    @staticmethod
    def decode_jwt(token: str) -> dict:
        """
        Decode and verify a signed JSON web token.
        Args:
            token: the JWT string to decode.
        Returns:
            The decoded token claims as a dict.
        """
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

    @classmethod
    def create_access_token(cls, username: str, expires_delta: timedelta | None = None) -> str:
        """
        Create a signed JWT access token for the given username.
        Args:
            username: the subject to encode in the token.
            expires_delta: time delta for token expiry. Default to 15 minutes if not provided.
        Returns:
            A signed JWT string.
        """
        token_payload = TokenPayload(sub=username, exp=cls.calc_expire(expires_delta))
        encoded_jwt = cls.encode_jwt(token_payload.model_dump())
        return encoded_jwt

    @classmethod
    def authenticate(cls, hashed_password: str | None, password: str) -> bool:
        """
        Authenticate a plain-text password against user's hashed password.
        If `hashed_password` is `None`, a dummy hash is verified to prevent timing attacks.
        Args:
            hashed_password: a stored hashed password, or None if the user does not exist.
            passowrd: a plain-text password to verify.
        Returns:
            True if password matches, False otherwise.
        """
        if hashed_password is None:
            dummy_password = cls.create_hashed_password("DUMMY")
            cls.verify_password(password, dummy_password)
            return False

        if not cls.verify_password(password, hashed_password):
            return False

        return True
