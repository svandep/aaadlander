// Keyboard handlers (moved out from scripts.js)
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        e.preventDefault();
        if (typeof btnSpindleUp !== 'undefined' && btnSpindleUp) {
            btnSpindleUp.style.transform = "scale(0.95)";
        }
        if (typeof sendControl === 'function') sendControl("SPINDLE_UP_START");
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (typeof btnSpindleDown !== 'undefined' && btnSpindleDown) {
            btnSpindleDown.style.transform = "scale(0.95)";
        }
        if (typeof sendControl === 'function') sendControl("SPINDLE_DOWN_START");
    } else if (e.code === "Space") {
        e.preventDefault();
        if (typeof spacebarBtn !== 'undefined' && spacebarBtn) spacebarBtn.click();
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp") {
        if (typeof btnSpindleUp !== 'undefined' && btnSpindleUp) {
            btnSpindleUp.style.transform = "scale(1)";
        }
        if (typeof sendControl === 'function') sendControl("SPINDLE_STOP");
    } else if (e.key === "ArrowDown") {
        if (typeof btnSpindleDown !== 'undefined' && btnSpindleDown) {
            btnSpindleDown.style.transform = "scale(1)";
        }
        if (typeof sendControl === 'function') sendControl("SPINDLE_STOP");
    }
});
