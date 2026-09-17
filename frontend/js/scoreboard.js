// Entry point della pagina classifica: inizializza i moduli e popola la classifica.
import { initBackButton } from './modules/back-button.js';
import { USERS } from './modules/mock-users.js';
import { renderScoreboard } from './modules/scoreboard-render.js';

initBackButton();

/* Div will contain all the user */
const scoreboard = document.getElementById("users-scoreboard");
// Select all input element with attribute "name" set to difficult-menu
const difficultyInputs = document.querySelectorAll('input[name="difficult-menu"]');

let users = [];

function getSelectedDifficulty() {
    const checked = document.querySelector('input[name="difficult-menu"]:checked');
    return checked ? checked.value : "facile";
}

function render() {
    const difficulty = getSelectedDifficulty();
    const filtered = users
        .filter(user => user.difficulty === difficulty)
        .sort((a, b) => b.score - a.score);

    scoreboard.replaceChildren();
    renderScoreboard(scoreboard, filtered);
}

async function loadScoreboard() {
    try {
        const res = await fetch("/api/scoreboard/");
        if (!res.ok) throw new Error(`GET /scoreboard -> ${res.status}`);
        const data = await res.json();
        users = data.score_board;
        console.log(users)
    } catch (err) {
        console.warn("[scoreboard] backend non disponibile, uso il mock:", err.message);
        users = USERS;
    }
    render();
}

difficultyInputs.forEach(input => input.addEventListener("change", render));

loadScoreboard();


