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

const CONTROL_CHANNELS = {
	SPINDLE: 2,
	ARM: 3,
	GRIPPER: 4,
};

const CONTROL_VALUES = {
	SPINDLE_SPEED: 127,
	ARM_OUT: 90,
	ARM_IN: 0,
	GRIPPER_OPEN: 45,
	GRIPPER_CLOSE: 90,
};

// Control buttons
const btnArmOut = document.getElementById("btnArmOut");
const btnArmIn = document.getElementById("btnArmIn");
const btnSpindleUp = document.getElementById("btnSpindleUp");
const btnSpindleDown = document.getElementById("btnSpindleDown");
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

	const payloadBytes = extractPayloadBytes(data.payload ?? data.lpp ?? data.bytes);
	if (payloadBytes) {
		return parseLppWeight(payloadBytes);
	}

	return null;
}

function extractPayloadBytes(payload) {
	if (!payload) return null;
	if (Array.isArray(payload)) return payload;
	if (typeof payload === "string") {
		try {
			const binary = atob(payload);
			return Array.from(binary, (char) => char.charCodeAt(0));
		} catch (error) {
			return null;
		}
	}
	return null;
}

function parseLppWeight(bytes) {
	const LPP_WEIGHT = 154;
	for (let i = 0; i + 3 < bytes.length; i += 1) {
		if (bytes[i + 1] === LPP_WEIGHT) {
			return (bytes[i + 2] << 8) | bytes[i + 3];
		}
	}
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

function encodeSpindle(direction, speed) {
	const cappedSpeed = Math.max(0, Math.min(127, speed));
	if (direction === "stop") return 0;
	const directionBit = direction === "down" ? 0x80 : 0x00;
	return directionBit | cappedSpeed;
}

function buildControlPayload(action) {
	switch (action) {
		case "SPINDLE_UP_START":
			return {
				[`digital_output_${CONTROL_CHANNELS.SPINDLE}`]: encodeSpindle(
					"up",
					CONTROL_VALUES.SPINDLE_SPEED
				),
			};
		case "SPINDLE_DOWN_START":
			return {
				[`digital_output_${CONTROL_CHANNELS.SPINDLE}`]: encodeSpindle(
					"down",
					CONTROL_VALUES.SPINDLE_SPEED
				),
			};
		case "SPINDLE_STOP":
			return {
				[`digital_output_${CONTROL_CHANNELS.SPINDLE}`]: encodeSpindle(
					"stop",
					0
				),
			};
		case "ARM_OUT_START":
			return { [`digital_output_${CONTROL_CHANNELS.ARM}`]: CONTROL_VALUES.ARM_OUT };
		case "ARM_IN_START":
			return { [`digital_output_${CONTROL_CHANNELS.ARM}`]: CONTROL_VALUES.ARM_IN };
		case "ARM_STOP":
			return { [`digital_output_${CONTROL_CHANNELS.ARM}`]: CONTROL_VALUES.ARM_IN };
		case "GRIPPER_OPEN_START":
			return { [`digital_output_${CONTROL_CHANNELS.GRIPPER}`]: CONTROL_VALUES.GRIPPER_OPEN };
		case "GRIPPER_CLOSE_START":
			return { [`digital_output_${CONTROL_CHANNELS.GRIPPER}`]: CONTROL_VALUES.GRIPPER_CLOSE };
		case "GRIPPER_STOP":
			return { [`digital_output_${CONTROL_CHANNELS.GRIPPER}`]: CONTROL_VALUES.GRIPPER_CLOSE };
		default:
			return null;
	}
}

async function sendRestControl(action) {
	const payload = buildControlPayload(action);
	if (!payload) return;
	const query = new URLSearchParams();
	Object.entries(payload).forEach(([key, value]) => {
		query.set(key, String(value));
	});

	const url = `${REST_URL}?${query.toString()}`;

	try {
		await fetch(url, { method: "POST" });
	} catch (error) {
		console.log("REST control failed", error);
	}
}

function bindHoldControl(button, startAction, stopAction) {
	if (!button) return;
	let isPressed = false;

	const start = () => {
		if (isPressed) return;
		isPressed = true;
		button.style.transform = "scale(0.95)";
		sendControl(startAction);
	};

	const stop = () => {
		if (!isPressed) return;
		isPressed = false;
		button.style.transform = "scale(1)";
		sendControl(stopAction);
	};

	button.addEventListener("pointerdown", start);
	button.addEventListener("pointerup", stop);
	button.addEventListener("pointerleave", stop);
	button.addEventListener("pointercancel", stop);
	button.addEventListener("blur", stop);
}

bindHoldControl(btnArmOut, "ARM_OUT_START", "ARM_STOP");
bindHoldControl(btnArmIn, "ARM_IN_START", "ARM_STOP");
bindHoldControl(btnSpindleUp, "SPINDLE_UP_START", "SPINDLE_STOP");
bindHoldControl(btnSpindleDown, "SPINDLE_DOWN_START", "SPINDLE_STOP");
bindHoldControl(btnGripperOpen, "GRIPPER_OPEN_START", "GRIPPER_STOP");
bindHoldControl(btnGripperClose, "GRIPPER_CLOSE_START", "GRIPPER_STOP");
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
