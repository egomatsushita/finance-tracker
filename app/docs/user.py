user_update_self_example = {
    "username": "john-doe-updated",
    "email": "john.updated@example.com",
}

user_endpoints = {
    "get_one": {
        "summary": "Get a user",
        "description": "Retrieve a single user by their unique ID.",
    },
    "get_me": {
        "summary": "Get the current user",
        "description": "Retrieve the authenticated caller's own profile.",
    },
    "update": {
        "summary": "Update a user",
        "description": "Update an existing user's information by their unique ID.",
    },
}
