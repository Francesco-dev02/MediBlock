const API_BASE = "/api";

export async function fetchWords(count) {
    const res = await fetch(`${API_BASE}/words?count=${count}`);
    if (!res.ok) throw new Error(`GET /words -> ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.words)) throw new Error("risposta di /words malformata");
    return data.words;
}

export async function fetchBestMatch(word, candidates) {
    console.log(`Word ${word} sending`)
    const res = await fetch(`${API_BASE}/words/similarity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: candidates, target: word }),
    });
    if (!res.ok) throw new Error(`POST /words/similarity -> ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.similarities) || data.similarities.length === 0) {
        throw new Error("risposta di /words/similarity malformata");
    }
    const best = data.similarities.reduce((a, b) => (b.score > a.score ? b : a));
    console.log(`Best match: ${best.word}`)
    return { best: best.word, score: best.score };
}
