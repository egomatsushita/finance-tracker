from pwdlib import PasswordHash


recommended_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return recommended_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return recommended_hash.verify(password, hashed_password)
