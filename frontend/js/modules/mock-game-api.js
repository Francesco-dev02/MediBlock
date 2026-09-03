import { WORDS } from "./mock-blocks.js";
import { randomExtraction } from "./random-extraction.js";



function bigrams(str) {
    const s = str.toUpperCase();
    const grams = [];
    for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
    return grams;
}

// Dice coefficient: 2 * |shared bigrams| / (|A bigrams| + |B bigrams|),
// each shared bigram consumed once so repeated letters don't get double
// counted. Falls back to exact-match when a word is too short to have any
// bigram (e.g. single letter).
function bigramSimilarity(a, b) {
    const gramsA = bigrams(a);
    const gramsB = bigrams(b);
    if (gramsA.length === 0 || gramsB.length === 0) {
        return a.toUpperCase() === b.toUpperCase() ? 1 : 0;
    }
    let shared = 0;
    for (const g of gramsA) {
        const idx = gramsB.indexOf(g);
        if (idx !== -1) { shared++; gramsB.splice(idx, 1); }
    }
    return (2 * shared) / (bigrams(a).length + bigrams(b).length);
}

export async function fetchWords(count) {
    return randomExtraction(WORDS, count);
}

// Mirrors POST /api/similarity - see game-api.js for the contract.
export async function fetchBestMatch(word, candidates) {
    await delay();
    let best = candidates[0];
    let bestScore = -1;
    for (const candidate of candidates) {
        const score = bigramSimilarity(word, candidate);
        if (score > bestScore) { best = candidate; bestScore = score; }
    }
    return { best, score: bestScore };
}
