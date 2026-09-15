
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
            startGameBtn.disabled = false;
            startGameBtn.textContent = "▶ Avvia Partita";
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

        try {
            const payload = {
                username: username,
                difficulty: difficulty.toLowerCase()
            };

            const response = await fetch('/api/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Il server ha risposto con un errore.');
            }

            const data = await response.json();
            console.log('Risposta ricevuta dal backend:', data);

            // Save of the backend response in sessionStorage
            // 'wordsSession' is arbitrary
            sessionStorage.setItem('wordsSession', JSON.stringify(data.words));
            // if POST has been successfully completed, redirect to the gameboard page
            setTimeout(() => {
                window.location.href = "./gameboard.html";
            }, 1000);

        } catch (error) {
            console.error('Errore durante la comunicazione con il backend:', error);
            // Reset the button and show the error on the form screen
            startGameBtn.disabled = false;
            startGameBtn.textContent = "▶ Avvia Partita";
            formError.textContent = "Impossibile connettersi al server del gioco. Riprova più tardi.";
            formError.hidden = false;
        }
    })

    window.addEventListener('pagehide', () => {
        dialog.close();
    });
    
}
