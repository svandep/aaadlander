const WS_URL = "ws://145.49.127.250:1880/ws/groep12";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const weightValue = document.getElementById("weightValue");
const lastUpdate = document.getElementById("lastUpdate");
const storedList = document.getElementById("storedList");
const endpointText = document.getElementById("endpointText");
const spacebarBtn = document.getElementById("spacebarBtn");

const API_BASE = "PHP%20connections";

// Control buttons
const btnQ = document.getElementById("btnQ");
const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");
const btnE = document.getElementById("btnE");

let socket = null;
let reconnectTimer = null;
let storedWeights = [];

function setStatus(state, text) {
	statusText.textContent = text;
	statusDot.className = "status-dot";
	if (state) {
		statusDot.classList.add(state);
	}
}

function scheduleReconnect() {
	if (reconnectTimer) return;

	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connectWebSocket();
	}, 2000);
}

function connectWebSocket() {
	setStatus("is-connecting", "Connecting...");

	try {
		socket = new WebSocket(WS_URL);
	} catch (error) {
		setStatus("is-error", "Disconnected");
		scheduleReconnect();
		return;
	}

	socket.addEventListener("open", () => {
		setStatus("", "Connected");
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	});

	socket.addEventListener("message", (event) => {
		try {
			const data = JSON.parse(event.data);

			if (data.weight_1 !== undefined) {
				const weight = Math.round(data.weight_1);
				weightValue.textContent = `${weight}`;
				lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
			}
		} catch (error) {
			console.log("Invalid websocket message:", event.data);
		}
	});

	socket.addEventListener("close", () => {
		setStatus("is-error", "Disconnected");
		scheduleReconnect();
	});

	socket.addEventListener("error", () => {
		setStatus("is-error", "Error");
	});
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
	const date = new Date(`${dateString}T00:00:00`);
	if (Number.isNaN(date.getTime())) {
		return dateString;
	}
	return date.toLocaleDateString();
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
		const item = document.createElement("div");
		item.className = "stored-item";
		item.dataset.weight = String(weight);
		item.dataset.date = dateValue;
		item.innerHTML = `
			<div class="stored-info">
				<span class="weight-value">${weight} g</span>
				<span class="weight-date">${dateLabel}</span>
			</div>
			<div class="menu-wrap">
				<button class="menu-icon" aria-label="Options" aria-expanded="false">⋮</button>
				<div class="menu-dropdown" role="menu">
					<button class="menu-action" data-action="delete" role="menuitem">Delete</button>
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
function handleControl(action) {
	console.log(`Control: ${action}`);
	
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({ action: action }));
	}
}

// Button click handlers
btnQ.addEventListener("click", () => handleControl("Q"));
btnUp.addEventListener("click", () => handleControl("UP"));
btnDown.addEventListener("click", () => handleControl("DOWN"));
btnE.addEventListener("click", () => handleControl("E"));
spacebarBtn.addEventListener("click", () => saveCurrentWeight());

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
});

document.addEventListener("click", (event) => {
	if (!event.target.closest(".stored-item")) {
		closeAllMenus();
	}
});

// Keyboard handlers
document.addEventListener("keydown", (e) => {
	if (e.key.toLowerCase() === "q") {
		btnQ.click();
		btnQ.style.transform = "scale(0.95)";
	} else if (e.key === "ArrowUp") {
		e.preventDefault();
		btnUp.click();
		btnUp.style.transform = "scale(0.95)";
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		btnDown.click();
		btnDown.style.transform = "scale(0.95)";
	} else if (e.key.toLowerCase() === "e") {
		btnE.click();
		btnE.style.transform = "scale(0.95)";
	} else if (e.code === "Space") {
		e.preventDefault();
		spacebarBtn.click();
	}
});

document.addEventListener("keyup", (e) => {
	if (["q", "e"].includes(e.key.toLowerCase()) || ["ArrowUp", "ArrowDown"].includes(e.key)) {
		document.querySelectorAll(".control-btn").forEach(btn => {
			btn.style.transform = "scale(1)";
		});
	}
});

endpointText.textContent = WS_URL;
updateStoredList();
loadStoredWeights();
connectWebSocket();
