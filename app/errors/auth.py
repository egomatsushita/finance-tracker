class AuthError(Exception):
    pass


class NotAuthenticatedError(AuthError):
    def __init__(self):
        super().__init__("Incorrect username or password")


class CredentialError(AuthError):
    def __init__(self):
        super().__init__("Could not validate credentials")


class ForbiddenError(AuthError):
    def __init__(self):
        super().__init__("You do not have permission to perform this action.")
