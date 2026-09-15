import sqlite3

conn = sqlite3.connect("games.db")
cursor = conn.cursor()

cursor.execute("CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, username TEXT, score INTEGER, difficulty TEXT)")
conn.commit()

def add_user(username: str, difficulty: str):
    values = (username, 0, difficulty)
    cursor.execute("INSERT INTO games (username, score, difficulty) VALUES (?, ?, ?)", values)
    conn.commit()
    print(f"Successo: il giocatore '{username}' è stato registrato correttamente!")

def update_score(username: str, score: int, difficulty: str):
    print(f"Il giocatore '{username}' ha totalizzato {score} punti.")
    query = """
    UPDATE games
    SET score = ?
    WHERE id = (
    SELECT MAX(id) 
    FROM games 
    WHERE username = ? AND difficulty = ?)
    """
    cursor.execute(query, (score, username, difficulty))
    conn.commit()

def get_score(username: str):
    query = """
    SELECT score
    FROM games
    WHERE username = ?
    """
    cursor.execute(query, (username,))
    actual_score = cursor.fetchone()
    return actual_score

def get_top_scorer(difficulty: str, top_k: int = 5):
    query = """
    SELECT username, score
    FROM games
    WHERE difficulty = ?
    ORDER BY score DESC
    LIMIT ?
    """
    cursor.execute(query, (difficulty, top_k))
    selected_rows = cursor.fetchall()
    print(f"Top-{top_k} scorer: ")
    for posizione, (username, score) in enumerate(selected_rows, start=1):
        print(f"{posizione}. {username}: {score} punti")
    return selected_rows

# conn.close()