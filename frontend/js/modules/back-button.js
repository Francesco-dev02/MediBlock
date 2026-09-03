export function initBackButton() {
    const backButton = document.getElementById("go-back");
    if (!backButton) return;

    backButton.addEventListener("click",
        () => {
            history.back()
        }
    )
}
