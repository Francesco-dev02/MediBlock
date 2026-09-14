class UserClient:
    """
    STUB TEMPORANEO.
    Finché non abbiamo accesso al database reale, questa classe si limita
    a stampare un messaggio, senza salvare nulla davvero.

    Quando avremo i dettagli veri (funzioni fornite, sincrone/asincrone),
    sostituiremo SOLO il contenuto di questo file — nessun altro file
    dell'applicazione (in particolare i controller) dovrà cambiare.
    """

    async def save_username(self, username: str) -> None:
        print(f"[STUB] Salverei l'utente '{username}' sul database (non ancora implementato)")


user_client = UserClient()
