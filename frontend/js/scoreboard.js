// Entry point della pagina classifica: inizializza i moduli e popola la classifica.
import { initBackButton } from './modules/back-button.js';
import { randomExtraction } from './modules/random-extraction.js';
import { USERS } from './modules/mock-users.js';
import { renderScoreboard } from './modules/scoreboard-render.js';

initBackButton();

let maxUser = Math.floor(Math.random() * USERS.length)
let extracted = randomExtraction(USERS, maxUser)

extracted.sort((a, b) => b.pt - a.pt);

/* Div will contain all the user */
const scoreboard = document.getElementById("users-scoreboard");

renderScoreboard(scoreboard, extracted);
