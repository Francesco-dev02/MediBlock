
export function initNewGameDialog() {
    // get the new game buttons
    const newGameButtons = document.querySelectorAll(".trigger-new-game");
    const dialog = document.getElementById("game-settings");
    const newGameForm = document.getElementById("new-game-form");
    const formError = document.getElementById("form-error");
    const startGameBtn = document.getElementById("start-game-btn");

    if (!dialog || !newGameForm) return;

    newGameButtons.forEach(button =>
        button.addEventListener('click', (event) => {
            // tells the user agent that the event is being explicitly handled, 
            // so its default action should not be taken.
            event.preventDefault();
            // restore the form's default value
            newGameForm.reset();

            formError.hidden = true;
            dialog.showModal();
        })
    )

    // submit event must be applied to the form element and not on a specific element (i.e button ecc.)
    newGameForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        // FormData interface provides a way to construct a set of key/value pairs representing form fields and their values
        const formData = new FormData(newGameForm);
        // fall back to '' in case the field is missing, so .trim() never throws
        const username = (formData.get('username') || '').trim();
        const difficulty = formData.get('difficulty');

        formError.hidden = true;

        if (username.length < 3) {
            formError.textContent = "Il nome utente deve avere almeno 3 caratteri.";
            formError.hidden = false;
            return;
        }

        startGameBtn.disabled = true;
        startGameBtn.textContent = "Avvio in corso...";

        // setTimeout (not setInterval) so the redirect fires only once,
        setTimeout(() => {
            window.location.href = "./gameboard.html";
        }, 1000)

    })

    
}
