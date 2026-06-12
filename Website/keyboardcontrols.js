// Keyboard shortcuts for every visible button action on the main console.
const kbdMenuBtn = document.querySelector(".menu-btn");
const kbdBtnArmOut = document.getElementById("btnArmOut");
const kbdBtnArmIn = document.getElementById("btnArmIn");
const kbdBtnSpindleUp = document.getElementById("btnSpindleUp");
const kbdBtnSpindleBump = document.getElementById("btnSpindleBump");
const kbdBtnSpindleDown = document.getElementById("btnSpindleDown");
const kbdBtnSpindleStop = document.getElementById("btnSpindleStop");
const kbdBtnGripperOpen = document.getElementById("btnGripperOpen");
const kbdBtnGripperClose = document.getElementById("btnGripperClose");
const kbdSpacebarBtn = document.getElementById("spacebarBtn");
const shortcutOverlay = document.getElementById("shortcutOverlay");
const shortcutCloseBtn = document.getElementById("shortcutCloseBtn");

function isTypingTarget(event) {
    const target = event.target;
    return Boolean(
        target && (
            target.isContentEditable ||
            /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
        )
    );
}

function clickButton(button) {
    if (button) {
        button.click();
    }
}

function isShortcutOverlayOpen() {
    return Boolean(shortcutOverlay && shortcutOverlay.classList.contains("is-open"));
}

function setShortcutOverlayOpen(isOpen) {
    if (!shortcutOverlay) {
        return;
    }

    shortcutOverlay.classList.toggle("is-open", isOpen);
    shortcutOverlay.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen && shortcutCloseBtn) {
        shortcutCloseBtn.focus();
    }
}

function toggleShortcutOverlay() {
    setShortcutOverlayOpen(!isShortcutOverlayOpen());
}

if (shortcutCloseBtn) {
    shortcutCloseBtn.addEventListener("click", () => setShortcutOverlayOpen(false));
}

if (shortcutOverlay) {
    shortcutOverlay.addEventListener("click", (event) => {
        if (event.target === shortcutOverlay) {
            setShortcutOverlayOpen(false);
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event)) {
        return;
    }

    if (event.code === "AltLeft" || event.code === "AltRight") {
        event.preventDefault();
        toggleShortcutOverlay();
        return;
    }

    if (event.code === "Escape" && isShortcutOverlayOpen()) {
        event.preventDefault();
        setShortcutOverlayOpen(false);
        return;
    }

    if (event.code === "ArrowUp") {
        event.preventDefault();
        clickButton(kbdBtnSpindleUp);
        return;
    }

    if (event.code === "PageUp") {
        event.preventDefault();
        clickButton(kbdBtnSpindleBump);
        return;
    }

    if (event.code === "ArrowDown") {
        event.preventDefault();
        clickButton(kbdBtnSpindleDown);
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();
        clickButton(kbdSpacebarBtn);
        return;
    }

    if (event.code === "KeyO") {
        event.preventDefault();
        clickButton(kbdBtnArmOut);
        return;
    }

    if (event.code === "KeyI") {
        event.preventDefault();
        clickButton(kbdBtnArmIn);
        return;
    }

    if (event.code === "KeyX") {
        event.preventDefault();
        clickButton(kbdBtnSpindleStop);
        return;
    }

    if (event.code === "KeyG") {
        event.preventDefault();
        clickButton(kbdBtnGripperOpen);
        return;
    }

    if (event.code === "KeyH") {
        event.preventDefault();
        clickButton(kbdBtnGripperClose);
        return;
    }

    if (event.code === "KeyM") {
        event.preventDefault();
        toggleShortcutOverlay();
    }
});

document.addEventListener("keyup", (event) => {
    if (isTypingTarget(event)) {
        return;
    }

    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        clickButton(kbdBtnSpindleStop);
    }
});
