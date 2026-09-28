<p align="center">
  <img src="frontend/assets/logo.svg" alt="Logo MediBlock" width="120" height="120">
</p>

<h1 align="center">MediBlock</h1>

<p align="center"><em>Un word game a tema medico ispirato a <a href="https://research.google.com/semantris/">Semantris</a> di Google</em></p>

---

**MediBlock** è un word game a tema medico. Sullo schermo vengono mostrati dei blocchi colorati, alcuni con una parola e altri vuoti. Per far crollare un blocco con una parola devi scriverne una dal significato simile a quella contenuta. Un modello di intelligenza artificiale calcola gli embedding e viene eliminato il blocco con la similarità coseno più alta rispetto alla parola inserita. Per questo motivo, il risultato non è sempre quello che ci si aspetta.

Se la torre raggiunge il tetto, la partita finisce, e il punteggio finisce in classifica.

Il gioco è ispirato a [**Semantris**](https://research.google.com/semantris/), il word game basato sull'associazione semantica tra parole sviluppato da Google Research. 

---

## Indice

- [Come si gioca](#come-si-gioca)
- [Requisiti](#requisiti)
- [Avvio rapido](#avvio-rapido)
- [Architettura](#architettura)
- [API del backend](#api-del-backend)
- [Struttura del progetto](#struttura-del-progetto)
- [Configurazione e personalizzazione](#configurazione-e-personalizzazione)
- [Sviluppo senza Docker](#sviluppo-senza-docker)
- [Limitazioni note](#limitazioni-note)

---

## Come si gioca

1. **Inizia una partita**: dalla home premi *Nuova Partita*, inserisci un nome utente (almeno 3 caratteri) e scegli la difficoltà (**Facile** o **Difficile**).
   > **N.B.** La difficoltà determina solo le parole che compaiono nei blocchi: in modalità *Difficile* il dizionario include anche termini medici più specialistici (es. *prognosi*, *biopsia*, *edema*). Velocità di discesa, durata della barra di avanzamento e punteggio restano identici in entrambe le modalità. Le classifiche sono separate per difficoltà.
2. **Osserva i blocchi**: il tabellone contiene blocchi colorati. Alcuni riportano un termine medico (ma non solo), altri sono vuoti.
3. **Scrivi una parola**: pensa a una parola con un significato il più vicino possibile a quella di uno dei blocchi e inviala. L'IA sceglie il blocco semanticamente più simile e lo elimina, insieme ai **blocchi vuoti dello stesso colore** collegati a esso.
4. **Non riscrivere la parola esatta**: se scrivi una parola già presente sul tabellone, il blocco viene segnato con una croce rossa e non succede nulla.
5. **Fai presto**: una barra di avanzamento si riempie in circa 30 secondi. Quando è piena scendono nuovi blocchi. Ne scendono altri anche dopo ogni tentativo andato a segno.
6. **Game over**: quando la torre tocca il bordo superiore la partita termina e il punteggio viene salvato.

### Punteggio

| Evento | Punti |
|---|---|
| Blocco con parola eliminato | fino a **50**, in proporzione alla similarità tra la tua parola e quella del blocco |
| Ogni blocco vuoto eliminato a catena | **50** |

Conviene quindi puntare ai blocchi collegati a molti blocchi vuoti dello stesso colore.

---

## Requisiti

Il modo consigliato per eseguire MediBlock è **Docker**.

| Requisito | Note |
|---|---|
| [Docker Engine](https://docs.docker.com/engine/install/) | con il plugin **Docker Compose v2** (comando `docker compose`) |
| Connessione a Internet | necessaria al **primo avvio** per scaricare l'immagine Python, le dipendenze e il modello di embedding da Hugging Face |
| Porte **8080** e **8000** libere | 8080 per il sito, 8000 per le API |

Non serve una GPU: il modello gira anche su CPU.

---

## Avvio rapido

```bash
git clone <url-del-repository>
cd MediBlock
docker compose up --build
```

> Il comando va eseguito dalla cartella che contiene `docker-compose.yml`.

Al **primo avvio** il backend scarica il modello `paraphrase-multilingual-mpnet-base-v2` e calcola gli embedding dei dizionari, quindi può impiegare qualche minuto. Il backend è pronto quando nei log compare una riga come:

```
mediblock-backend  | INFO:     Uvicorn running on http://0.0.0.0:8000
```

Il modello resta salvato in un volume Docker (`huggingface_cache`), per cui dal secondo avvio in poi il backend parte molto più in fretta.

Una volta avviato:

| Servizio | URL |
|---|---|
| Gioco | http://localhost:8080 |
| Documentazione interattiva delle API (Swagger) | http://localhost:8000/docs |

Per fermare tutto premi `Ctrl+C`, oppure da un altro terminale:

```bash
docker compose down
```

---

## Architettura

Il sistema è composto da due container orchestrati con Docker Compose:

- **`web`** (immagine ufficiale `nginx`): serve le pagine statiche del frontend e inoltra al backend tutte le richieste che iniziano con `/api/` (il prefisso viene rimosso). In questo modo browser e API condividono la stessa origine e non serve configurare CORS.
- **`backend`** (Python 3.12, FastAPI + Uvicorn): espone le API di gioco, calcola la similarità semantica tra parole e salva le partite in un database SQLite.

Il frontend è scritto in **HTML, CSS e JavaScript**, senza framework.


---

## API del backend

Tutti gli endpoint sono raggiungibili direttamente su `http://localhost:8000` oppure passando da nginx su `http://localhost:8080/api`. La documentazione completa e interattiva si trova su http://localhost:8000/docs.

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/session/start` | Registra il giocatore e restituisce le parole della partita |
| `POST` | `/session/gameover` | Salva il punteggio finale e restituisce i migliori 5 della difficoltà |
| `POST` | `/words/similarity` | Calcola la similarità tra una parola e una lista di parole |
| `GET` | `/scoreboard/` | Restituisce la classifica completa |


---

## Configurazione e personalizzazione

### Cambiare le parole

I dizionari sono semplici array JSON di stringhe:

- `backend/app/data/words_facile.json`
- `backend/app/data/words_difficile.json`

Dopo averli modificati riavvia il backend (`docker compose restart backend`) per ricalcolare gli embedding.

### Cambiare il modello di embedding

Il modello è impostato in `backend/app/core/config.py` e si può sovrascrivere con la variabile d'ambiente `EMBEDDING_MODEL`, oppure con un file `.env` nella cartella di lavoro del backend:

```env
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

Si può usare qualsiasi modello compatibile con `sentence-transformers`. Per parole italiane conviene sceglierne uno multilingue.

---

## Sviluppo senza Docker

Il backend si può avviare anche in locale con **Python 3.12**:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # su Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

> I comandi vanno lanciati dalla cartella `backend/`, perché i percorsi dei dizionari (`app/data`) e del database (`games.db`) sono relativi alla cartella di lavoro.

Il frontend chiama le API sul percorso relativo `/api`, quindi per giocare serve comunque un web server che serva `frontend/` e inoltri `/api/` al backend, come fa `nginx.conf`. Per questo il modo più semplice resta `docker compose up`.

---

## Limitazioni note

- **Un giocatore alla volta**: l'utente della sessione è salvato in memoria nel backend e non è legato al singolo client. Se più persone giocano contemporaneamente sullo stesso server, i punteggi possono essere attribuiti al giocatore sbagliato.
- **Nessuna autenticazione**: il nome utente serve solo per la classifica. Usare lo stesso nome significa condividere la stessa riga in classifica.
- **Primo avvio lento**: il download del modello e il calcolo degli embedding possono richiedere alcuni minuti. Finché il backend non è pronto, il pulsante *Avvia Partita* mostra un errore di connessione.
- **Embedding non sempre accurati**: il modello di embedding non è particolarmente accurato e può portare all'eliminazione di blocchi inattesi.
- **Frontend non perfettamente modularizzato**: parte della logica è ancora concentrata negli script delle singole pagine invece di essere suddivisa in moduli riutilizzabili.

Queste limitazioni sono note e saranno risolte nelle versioni successive.
