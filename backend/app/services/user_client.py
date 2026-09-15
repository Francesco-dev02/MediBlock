from utils.manage_users import add_user

class UserClient:
    def __init__(self):
        self._username = ""
        self._difficulty = ""

    async def save_username(self, username: str, difficulty: str) -> None:
        add_user(username=username, difficulty=difficulty)
        self._username = username
        self._difficulty = difficulty

    def get_username(self):
        return self._username

    def get_difficulty(self):
        return self._difficulty


user_client = UserClient()
