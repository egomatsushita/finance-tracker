class TransactionError(Exception):
    pass


class TransactionNotFoundError(TransactionError):
    def __init__(self):
        super().__init__("Transaction not found.")
