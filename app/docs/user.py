user_create_example = {
    "username": "john-doe",
    "email": "john@example.com",
    "disabled": False,
    "password": "secureP@ssword123",
}

user_update_example = {
    "username": "john-doe-updated",
    "email": "john.updated@example.com",
    "disabled": False,
}

user_endpoints = {
    "get_all": {
        "summary": "List all users",
        "description": "Retrieve a paginated list of all registered users.",
    },
    "get_one": {
        "summary": "Get a user",
        "description": "Retrieve a single user by their unique ID.",
    },
    "create": {
        "summary": "Create a user",
        "description": """
            Create a new user with the following information: </br></br>
            - **username**: must be unique </br>
            - **email**: must be a valid and unique email address </br>
            - **disabled**: indicates whether the account is active </br>
            - **password**: use a strong password with letters, numbers, and special characters
        """,
    },
    "update": {
        "summary": "Update a user",
        "description": "Update an existing user's information by their unique ID.",
    },
    "delete": {
        "summary": "Delete a user",
        "description": "Permanently delete a user by their unique ID.",
    },
}
