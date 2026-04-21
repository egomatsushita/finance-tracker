transaction_create_example = {
    "amount": "1500.00",
    "kind": "income",
    "category": "salary",
    "description": "Monthly salary",
    "transaction_date": "2026-04-01T09:00:00Z",
}

transaction_update_example = {
    "amount": "200.00",
    "description": "Updated description",
}

transaction_endpoints = {
    "get_all": {
        "summary": "List transactions",
        "description": (
            "Retrieve a paginated list of the authenticated user's transactions. "
            "Supports filtering by `kind`, `category`, and date range."
        ),
    },
    "get_one": {
        "summary": "Get a transaction",
        "description": "Retrieve a single transaction by its unique ID.",
    },
    "create": {
        "summary": "Create a transaction",
        "description": """
            Record a new financial transaction. <br/><br/>
            - **amount**: positive decimal value <br/>
            - **kind**: `income` or `expense` <br/>
            - **category**: must be valid for the given kind <br/>
            - **transaction_date**: date and time of the transaction <br/>
            - **description** *(optional)*: free-text note
        """,
    },
    "update": {
        "summary": "Update a transaction",
        "description": "Update an existing transaction by its unique ID. All fields are optional.",
    },
    "delete": {
        "summary": "Delete a transaction",
        "description": "Permanently delete a transaction by its unique ID.",
    },
}
