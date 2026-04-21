user_create_example = {
    "username": "john-doe",
    "email": "john@example.com",
    "is_active": True,
    "role": "member",
    "password": "secureP@ssword123",
}

user_update_admin_example = {
    "username": "john-doe-updated",
    "email": "john.updated@example.com",
    "is_active": True,
    "role": "admin",
}

user_update_self_example = {
    "username": "john-doe-updated",
    "email": "john.updated@example.com",
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
            Create a new user with the following information: <br/><br/>
            - **username**: must be unique <br/>
            - **email**: must be a valid and unique email address <br/>
            - **is_active**: indicates whether the account is active - inactive users cannot log in <br/>
            - **role**: `admin` has full access to all users resources (create, read, update, delete) | `user` can only read and update their own profile <br/>
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
