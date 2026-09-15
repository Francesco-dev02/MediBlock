import { initHeroCanvas } from './modules/hero-canvas.js';
import { initNewGameDialog } from './modules/new-game-dialog.js';
// Background animation
initHeroCanvas();
// New Game dialog
initNewGameDialog();

const scoreboardLinks = document.querySelectorAll(".trigger-scoreboard");
scoreboardLinks.forEach(link => {
    link.addEventListener('click', async (event) => {
        event.preventDefault();

        console.log("Clicked scoreboard event listener ")
        let url = "/api"
        let response = await fetch(url);
        if (response.ok) { // if HTTP-status is 200-299
        // get the response body (the method explained below)
        let json = await response.json();
        console.log(json)
        } else {
        alert("HTTP-Error: " + response.status);
        }
    })
})
