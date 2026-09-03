import * as mock from "./mock-game-api.js";

export async function fetchWords(count) {
    try {
        const res = await fetch(`${API_BASE}/words?count=${count}`);
        if (!res.ok) throw new Error(`GET /words -> ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.words)) throw new Error("risposta di /words malformata");
        return data.words;
    } catch (err) {
        console.warn("[game-api] backend non disponibile per /words, uso il mock:", err.message);
        return mock.fetchWords(count);
    }
}

export async function fetchBestMatch(word, candidates) {
    try {
        const res = await fetch(`${API_BASE}/similarity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word, candidates }),
        });
        if (!res.ok) throw new Error(`POST /similarity -> ${res.status}`);
        const data = await res.json();
        if (!candidates.includes(data.best)) throw new Error("risposta di /similarity malformata");
        return data;
    } catch (err) {
        console.warn("[game-api] backend non disponibile per /similarity, uso il mock:", err.message);
        return mock.fetchBestMatch(word, candidates);
    }
}
