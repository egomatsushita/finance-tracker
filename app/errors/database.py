
class DatabaseError(Exception):
    pass

class ConflictError(DatabaseError):
    def __init__(self):
        super().__init__("A conflict occurred.")
