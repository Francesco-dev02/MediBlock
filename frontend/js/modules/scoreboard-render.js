
const MEDAL_BY_RANK = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function renderScoreboard(container, users) {
    if (users.length === 0) {
        const empty = document.createElement("p");
        empty.classList.add("scoreboard-empty");
        empty.textContent = "Nessun utente da mostrare al momento.";
        container.appendChild(empty);
        return;
    }

    users.forEach((user, index) => {
        const position = index + 1;
        const row = document.createElement("div");
        row.classList.add("scoreboard-row");
        if (position <= 3) {
            row.classList.add(`rank-${position}`);
        }
        // Animation delay to insert the row one after the other
        row.style.animationDelay = `${index * 60}ms`;

        const posSpan = document.createElement("span");
        posSpan.classList.add("posizione");
        posSpan.textContent = MEDAL_BY_RANK[position] ?? `${position}°`;

        const avatar = document.createElement("span");
        avatar.classList.add("avatar");
        avatar.textContent = user.username.charAt(0).toUpperCase();

        const nameSpan = document.createElement("span");
        nameSpan.classList.add("nome");
        nameSpan.textContent = user.username;

        const ptsSpan = document.createElement("span");
        ptsSpan.classList.add("punti");
        ptsSpan.textContent = `${user.score} pts`;

        row.append(posSpan, avatar, nameSpan, ptsSpan);
        container.appendChild(row);
    });
}
