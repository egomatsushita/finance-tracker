class AuthError(Exception):
    pass


class NotAuthenticatedError(AuthError):
    def __init__(self):
        super().__init__("Incorrect username or password")


class CredentialError(AuthError):
    def __init__(self):
        super().__init__("Could not validate credentials")
