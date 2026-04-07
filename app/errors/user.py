class UserError(Exception):
    pass


class UserNotFoundError(UserError):
    def __init__(self):
        super().__init__("User not found.")


class UserAlreadyExistError(UserError):
    def __init__(self):
        super().__init__("Username or email already exist.")
