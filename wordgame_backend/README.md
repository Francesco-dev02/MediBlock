# Word Game Backend — Prototipo

## Come avviarlo

1. (Consigliato) crea un ambiente virtuale:
   ```
   python3 -m venv venv
   source venv/bin/activate      # su Windows: venv\Scripts\activate
   ```

2. Installa le dipendenze:
   ```
   pip install -r requirements.txt
   ```

3. Avvia il server:
   ```
   uvicorn app.main:app --reload
   ```

4. Apri il browser su `http://localhost:8000/docs` per la documentazione
   interattiva, oppure testa con curl (esempi sotto).

Al primo avvio, il download del modello `sentence-transformers/all-MiniLM-L6-v2`
richiede una connessione a internet (viene scaricato da huggingface.co) e può
richiedere qualche minuto la prima volta. Le volte successive è già in cache
e parte velocemente.

## Endpoint disponibili

### POST /session/start
```
curl -X POST http://localhost:8000/session/start \
  -H "Content-Type: application/json" \
  -d '{"username": "mario", "difficulty": "easy"}'
```

### POST /words/similarity
```
curl -X POST http://localhost:8000/words/similarity \
  -H "Content-Type: application/json" \
  -d '{"words": ["mela", "sole", "gatto"], "target": "banana"}'
```

## Cosa è vero e cosa è ancora "finto" (stub)

- `word_service.py` → REALE, legge i file in `app/data/*.json`.
  **Sostituisci quei 3 file con le tue liste di parole vere.**
- `embedding_service.py` → REALE, usa sentence-transformers per davvero.
- `user_client.py` → **STUB**. Non salva nulla su nessun database, si limita
  a stampare un messaggio in console. Quando avrai i dettagli di accesso
  al database (funzioni fornite, sincrone o asincrone), va sostituito il
  contenuto di questo file — nessun altro file dell'app deve cambiare.

## Struttura del progetto

```
app/
├── main.py                    # entry point, CORS, registrazione router
├── core/config.py             # configurazione (nome modello, cartella dati)
├── data/                      # dizionari di parole (JSON) per difficoltà
├── api/routes/
│   ├── session.py             # controller POST /session/start
│   └── words.py                # controller POST /words/similarity
├── schemas/
│   ├── session.py              # validazione dati sessione
│   └── words.py                 # validazione dati similarità
└── services/
    ├── word_service.py         # selezione parole dal dizionario
    ├── embedding_service.py    # calcolo similarità (sentence-transformers)
    └── user_client.py          # STUB salvataggio utente (da sostituire)
```
