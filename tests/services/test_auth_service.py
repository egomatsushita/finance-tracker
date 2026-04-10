from datetime import datetime, timedelta, timezone

from services.auth import AuthService


def test_hash_and_verify_password():
    hashed = AuthService.create_hashed_password("secret")
    assert AuthService.verify_password("secret", hashed) is True


def test_verify_wrong_password():
    hashed = AuthService.create_hashed_password("secret")
    assert AuthService.verify_password("wrong", hashed) is False


def test_encode_decode_jwt_roundtrip():
    payload = {
        "sub": "testuser",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    token = AuthService.encode_jwt(payload)
    decoded = AuthService.decode_jwt(token)
    assert decoded["sub"] == "testuser"


def test_calc_expire_default():
    before = datetime.now(timezone.utc)
    expire = AuthService.calc_expire(None)
    after = datetime.now(timezone.utc)
    assert before + timedelta(minutes=15) <= expire <= after + timedelta(minutes=15)


def test_calc_expire_custom():
    delta = timedelta(hours=1)
    before = datetime.now(timezone.utc)
    expire = AuthService.calc_expire(delta)
    after = datetime.now(timezone.utc)
    assert before + delta <= expire <= after + delta


def test_authenticate_valid():
    hashed = AuthService.create_hashed_password("mypassword")
    assert AuthService.authenticate(hashed, "mypassword") is True


def test_authenticate_wrong_password():
    hashed = AuthService.create_hashed_password("mypassword")
    assert AuthService.authenticate(hashed, "wrongpassword") is False


def test_authenticate_none_hashed_password():
    assert AuthService.authenticate(None, "anypassword") is False
