import sqlite3

conn = sqlite3.connect("players.db")
cursor = conn.cursor()

# cursor.execute("CREATE TABLE IF NOT EXISTS players(id INTEGER PRIMARY KEY, username TEXT, score INTEGER)")
# conn.commit()

def add_user(username: str):
    cursor.execute("SELECT 1 FROM players WHERE username = ?", (username,))
    already_in_use = cursor.fetchone()
    if already_in_use:
        print(f"Attenzione: lo username '{username}' risulta essere già in uso da un altro giocatore!")
    else:
        values = (username, 0)
        cursor.execute("INSERT INTO players (username, score) VALUES (?, ?)", values)
        conn.commit()
        print(f"Successo: il giocatore '{username}' è stato registrato correttamente!")

def update_score(username: str, score: int):
    print(f"Il giocatore '{username}' ha totalizzato {score} punti.")
    actual_score = get_score(username)
    print(f"Il giocatore '{username}' era in possesso di {actual_score[0]} punti.")
    query = """
    UPDATE players
    SET score = score + ?
    WHERE username = ?
    """
    cursor.execute(query, (score, username))
    conn.commit()
    final_score = actual_score[0] + score
    print(f"Il giocatore '{username}' ha raggiunto {final_score} punti!")

def get_score(username: str):
    query = """
    SELECT score
    FROM players
    WHERE username = ?
    """
    cursor.execute(query, (username,))
    actual_score = cursor.fetchone()
    return actual_score

def get_top_scorer(top_k: int = 5):
    query = """
    SELECT username, score
    FROM players
    ORDER BY score DESC
    LIMIT ?
    """
    cursor.execute(query, (top_k,))
    selected_rows = cursor.fetchall()
    print(f"Top-{top_k} scorer: ")
    for posizione, (username, score) in enumerate(selected_rows, start=1):
        print(f"{posizione}. {username}: {score} punti")
    return selected_rows

# conn.close()