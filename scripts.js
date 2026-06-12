const WS_URL = "ws://145.49.127.250:1880/ws/groep12";
const REST_URL = "http://145.49.127.250:1880/groep12";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const weightValue = document.getElementById("weightValue");
const lastUpdate = document.getElementById("lastUpdate");
const storedList = document.getElementById("storedList");
const endpointText = document.getElementById("endpointText");
const spacebarBtn = document.getElementById("spacebarBtn");
const logoFrame = document.getElementById("logoFrame");
const footerSignalDot = document.getElementById("footerSignalDot");
const footerSignalText = document.getElementById("footerSignalText");

const API_BASE = "PHP%20connections";
const EASTER_EGG_URL = "Easter%20Egg/easteregg.html";

// Hardcoded action URLs (from user's Postman mapping)
const ACTION_URLS = {
	SPINDLE_DOWN_START: `${REST_URL}?digital_output_2=200`,
	SPINDLE_UP_START: `${REST_URL}?digital_output_2=80`,
	SPINDLE_STOP: `${REST_URL}?digital_output_2=0`,
	GRIPPER_OPEN_START: `${REST_URL}?digital_output_4=90`,
	GRIPPER_CLOSE_START: `${REST_URL}?digital_output_4=45`,
	ARM_IN_START: `${REST_URL}?digital_output_3=10`,
	ARM_OUT_START: `${REST_URL}?digital_output_3=100`,
	ARM_STOP: `${REST_URL}?digital_output_3=0`,
	GRIPPER_STOP: `${REST_URL}?digital_output_4=0`,
};

// Control mapping is handled by hardcoded ACTION_URLS in sendRestControl

// Control buttons
const btnArmOut = document.getElementById("btnArmOut");
const btnArmIn = document.getElementById("btnArmIn");
const btnSpindleUp = document.getElementById("btnSpindleUp");
const btnSpindleDown = document.getElementById("btnSpindleDown");
const btnSpindleStop = document.getElementById("btnSpindleStop");
const btnGripperOpen = document.getElementById("btnGripperOpen");
const btnGripperClose = document.getElementById("btnGripperClose");

let socket = null;
let reconnectTimer = null;
let storedWeights = [];
let logoClickCount = 0;
let logoClickTimer = null;
let staleTimer = null;
const STALE_TIMEOUT_MS = 10000;
let hasReceivedData = false;

function setStatus(state, text) {
	statusText.textContent = text;
	statusDot.className = "status-dot";
	if (state) {
		statusDot.classList.add(state);
	}
	updateFooterSignal(state);
}

function updateFooterSignal(state) {
	if (!footerSignalDot || !footerSignalText) return;

	footerSignalDot.className = "signal-dot";
	if (state) {
		footerSignalDot.classList.add(state);
	}

	if (state === "is-error") {
		footerSignalText.textContent = "Satellite link inactive";
		return;
	}

	if (state === "is-connecting") {
		footerSignalText.textContent = "Satellite link connecting";
		return;
	}

	footerSignalText.textContent = "Satellite link active";
}

function scheduleReconnect() {
	if (reconnectTimer) return;

	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connectWebSocket();
	}, 2000);
}

function startStaleTimer() {
	if (staleTimer) {
		clearTimeout(staleTimer);
	}

	staleTimer = setTimeout(() => {
		if (socket && socket.readyState === WebSocket.OPEN) {
			setStatus("is-error", "Disconnected");
		}
	}, STALE_TIMEOUT_MS);
}

function stopStaleTimer() {
	if (!staleTimer) return;
	clearTimeout(staleTimer);
	staleTimer = null;
}

function connectWebSocket() {
	setStatus("is-connecting", "Connecting...");
	hasReceivedData = false;

	try {
		socket = new WebSocket(WS_URL);
	} catch (error) {
		setStatus("is-error", "Disconnected");
		scheduleReconnect();
		return;
	}

	socket.addEventListener("open", () => {
		setStatus("is-connecting", "Connecting...");
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
		startStaleTimer();
	});

	socket.addEventListener("message", (event) => {
		startStaleTimer();
		if (!hasReceivedData) {
			hasReceivedData = true;
			setStatus("", "Connected");
		}

		const weight = parseWeightMessage(event.data);
		if (weight !== null) {
			weightValue.textContent = `${Math.round(weight)}`;
			lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
			return;
		}

		console.log("Unhandled websocket message:", event.data);
	});

	socket.addEventListener("close", () => {
		setStatus("is-error", "Disconnected");
		stopStaleTimer();
		scheduleReconnect();
	});

	socket.addEventListener("error", () => {
		setStatus("is-error", "Error");
		stopStaleTimer();
	});
}

function handleLogoClick() {
	logoClickCount += 1;
	if (logoClickTimer) {
		clearTimeout(logoClickTimer);
	}

	if (logoClickCount >= 3) {
		logoClickCount = 0;
		window.location.href = EASTER_EGG_URL;
		return;
	}

	logoClickTimer = setTimeout(() => {
		logoClickCount = 0;
		logoClickTimer = null;
	}, 900);
}

function parseWeightMessage(message) {
	if (typeof message === "string") {
		const trimmed = message.trim();
		if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
			try {
				return parseWeightFromData(JSON.parse(trimmed));
			} catch (error) {
				return parseWeightFromString(trimmed);
			}
		}
		return parseWeightFromString(trimmed);
	}

	return parseWeightFromData(message);
}

function parseWeightFromString(message) {
	const match = message.match(/WEIGHT\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
	if (match) {
		return Number(match[1]);
	}
	return null;
}

function parseWeightFromData(data) {
	if (!data) return null;

	const directWeight =
		data.weight_1 ??
		data.weight ??
		data.weight_g ??
		data.gewichtwaarde ??
		data.gewicht;

	if (directWeight !== undefined && directWeight !== null) {
		const weightNumber = Number(directWeight);
		return Number.isNaN(weightNumber) ? null : weightNumber;
	}

	// No LPP payload parsing: Node-RED provides weight fields directly (weight, weight_1, etc.)
	return null;
}





function addStoredWeight(entry) {
	// Add to beginning of array
	storedWeights.unshift(entry);
	
	// Keep only last 50 weights
	if (storedWeights.length > 50) {
		storedWeights.pop();
	}
	
	updateStoredList();
}

function formatDateLabel(dateString) {
	if (!dateString) return "";
	const normalized = dateString.includes(" ") ? dateString.replace(" ", "T") : dateString;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) {
		return dateString;
	}
	return date.toLocaleString();
}

function closeAllMenus(except) {
	storedList.querySelectorAll(".stored-item").forEach(item => {
		if (except && item === except) return;
		item.classList.remove("is-menu-open");
		const button = item.querySelector(".menu-icon");
		if (button) {
			button.setAttribute("aria-expanded", "false");
		}
	});
}

function updateStoredList() {
	storedList.innerHTML = "";

	if (!storedWeights.length) {
		return;
	}

	storedWeights.forEach(entry => {
		const weight = Number(entry.gewichtwaarde);
		const dateValue = entry.datumwaarde || "";
		const dateLabel = formatDateLabel(dateValue);
		const noteValue = (entry.notitie || "").trim();
		const item = document.createElement("div");
		item.className = "stored-item";
		item.dataset.weight = String(weight);
		item.dataset.date = dateValue;
		item.dataset.note = noteValue;
		item.innerHTML = `
			<div class="stored-info">
				<span class="weight-value">${weight} g</span>
				<span class="weight-date">${dateLabel}</span>
				${noteValue ? `<span class="weight-note">${noteValue}</span>` : ""}
			</div>
			<div class="menu-wrap">
				<button class="menu-icon" aria-label="Options" aria-expanded="false">⋮</button>
				<div class="menu-dropdown" role="menu">
					<button class="menu-action menu-action-note" data-action="note" role="menuitem">Add note</button>
					<button class="menu-action menu-action-delete" data-action="delete" role="menuitem">Delete</button>
				</div>
			</div>
		`;
		storedList.appendChild(item);
	});
}

async function loadStoredWeights() {
	try {
		const response = await fetch(`${API_BASE}/get_weights.php`);
		const data = await response.json();
		if (Array.isArray(data.weights)) {
			storedWeights = data.weights;
			updateStoredList();
		}
	} catch (error) {
		console.log("Failed to load stored weights", error);
	}
}

async function deleteStoredWeight(weight, dateValue) {
	try {
		const response = await fetch(`${API_BASE}/delete_weight.php`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gewichtwaarde: Number(weight),
				datumwaarde: dateValue,
			}),
		});

		const data = await response.json();
		if (data.success) {
			lastUpdate.textContent = "Weight deleted.";
			await loadStoredWeights();
		} else {
			lastUpdate.textContent = data.message || "Failed to delete.";
		}
	} catch (error) {
		console.log("Failed to delete weight", error);
		lastUpdate.textContent = "Delete failed.";
	}
}

async function updateStoredNote(weight, dateValue, noteValue) {
	try {
		const response = await fetch(`${API_BASE}/update_note.php`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gewichtwaarde: Number(weight),
				datumwaarde: dateValue,
				notitie: noteValue,
			}),
		});

		const data = await response.json();
		if (data.success) {
			lastUpdate.textContent = "Note saved.";
			await loadStoredWeights();
		} else {
			lastUpdate.textContent = data.message || "Failed to save note.";
		}
	} catch (error) {
		console.log("Failed to save note", error);
		lastUpdate.textContent = "Note save failed.";
	}
}

async function saveCurrentWeight() {
	const rawValue = weightValue.textContent.trim();
	if (!rawValue || rawValue === "--") {
		lastUpdate.textContent = "No weight to save.";
		return;
	}

	const weight = Number(rawValue);
	if (Number.isNaN(weight)) {
		lastUpdate.textContent = "Invalid weight value.";
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/save_weight.php`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gewichtwaarde: weight }),
		});

		const data = await response.json();
		if (data.success) {
			lastUpdate.textContent = "Weight saved.";
			await loadStoredWeights();
		} else {
			lastUpdate.textContent = data.message || "Failed to save.";
		}
	} catch (error) {
		console.log("Failed to save weight", error);
		lastUpdate.textContent = "Save failed.";
	}
}

// Control button handlers
function sendControl(action) {
	console.log(`Control: ${action}`);
	sendRestControl(action);
}

// legacy encoder and payload builder removed — using hardcoded ACTION_URLS instead

async function sendRestControl(action) {
	// Use the shared ACTION_URLS mapping and only send the specific parameter
	const url = ACTION_URLS[action];
	if (!url) return;

	try {
		await fetch(url, { method: "POST" });
	} catch (error) {
		console.log("REST control failed", error);
	}
}

function bindControl(button, action) {
	if (!button) return;
	button.addEventListener("click", () => {
		// brief visual feedback
		button.style.transform = "scale(0.95)";
		setTimeout(() => (button.style.transform = "scale(1)"), 120);
		sendControl(action);
	});
}

bindControl(btnArmOut, "ARM_OUT_START");
bindControl(btnArmIn, "ARM_IN_START");
bindControl(btnSpindleUp, "SPINDLE_UP_START");
bindControl(btnSpindleDown, "SPINDLE_DOWN_START");
bindControl(btnSpindleStop, "SPINDLE_STOP");
bindControl(btnGripperOpen, "GRIPPER_OPEN_START");
bindControl(btnGripperClose, "GRIPPER_CLOSE_START");

const btnSpindleBump = document.getElementById("btnSpindleBump");

if (btnSpindleBump) {
    btnSpindleBump.addEventListener("click", () => {
        // Visuele klik-animatie voor de knop
        btnSpindleBump.style.transform = "scale(0.95)";
        setTimeout(() => (btnSpindleBump.style.transform = "scale(1)"), 120);

        // 1. Stuur het commando om de motor te starten
        sendControl("SPINDLE_UP_START");

        // 2. Wacht 500 milliseconden en stuur dan automatisch het STOP commando
        setTimeout(() => {
            sendControl("SPINDLE_STOP");
        }, 500); 
    });
}

spacebarBtn.addEventListener("click", () => saveCurrentWeight());
if (logoFrame) {
	logoFrame.addEventListener("click", handleLogoClick);
}

storedList.addEventListener("click", (event) => {
	const menuButton = event.target.closest(".menu-icon");
	const actionButton = event.target.closest(".menu-action");

	if (menuButton) {
		const item = menuButton.closest(".stored-item");
		const isOpen = item.classList.contains("is-menu-open");
		closeAllMenus(item);
		item.classList.toggle("is-menu-open", !isOpen);
		menuButton.setAttribute("aria-expanded", String(!isOpen));
		return;
	}

	if (actionButton && actionButton.dataset.action === "delete") {
		const item = actionButton.closest(".stored-item");
		closeAllMenus();
		deleteStoredWeight(item.dataset.weight, item.dataset.date);
	}

	if (actionButton && actionButton.dataset.action === "note") {
		const item = actionButton.closest(".stored-item");
		const currentNote = item.dataset.note || "";
		const noteInput = window.prompt("Note (max 30 chars):", currentNote);
		closeAllMenus();
		if (noteInput === null) {
			return;
		}
		const trimmedNote = noteInput.trim().slice(0, 30);
		const noteValue = trimmedNote.length ? trimmedNote : null;
		updateStoredNote(item.dataset.weight, item.dataset.date, noteValue);
	}
});

document.addEventListener("click", (event) => {
	if (!event.target.closest(".stored-item")) {
		closeAllMenus();
	}
});

// Keyboard handlers
document.addEventListener("keydown", (e) => {
	if (e.key === "ArrowUp") {
		e.preventDefault();
		if (btnSpindleUp) {
			btnSpindleUp.style.transform = "scale(0.95)";
		}
		sendControl("SPINDLE_UP_START");
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		if (btnSpindleDown) {
			btnSpindleDown.style.transform = "scale(0.95)";
		}
		sendControl("SPINDLE_DOWN_START");
	} else if (e.code === "Space") {
		e.preventDefault();
		spacebarBtn.click();
	}
});

document.addEventListener("keyup", (e) => {
	if (e.key === "ArrowUp") {
		if (btnSpindleUp) {
			btnSpindleUp.style.transform = "scale(1)";
		}
		sendControl("SPINDLE_STOP");
	} else if (e.key === "ArrowDown") {
		if (btnSpindleDown) {
			btnSpindleDown.style.transform = "scale(1)";
		}
		sendControl("SPINDLE_STOP");
	}
});

endpointText.textContent = `${WS_URL} | ${REST_URL}`;
updateStoredList();
loadStoredWeights();
connectWebSocket();
