const WS_URL = "ws://145.49.127.250:1880/ws/groep12";
const HTTP_BASE_URL = "http://145.49.127.250:1880/groep12";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const toggleBtn = document.getElementById("toggleBtn");

let socket = null;
let lightOn = false;
let reconnectTimer = null;

function updateButton() {
	toggleBtn.textContent = lightOn ? "Turn Light OFF" : "Turn Light ON";
	toggleBtn.classList.toggle("on", lightOn);
}

function setStatus(stateClass, text) {
	statusDot.className = "dot";
	statusDot.classList.add(stateClass);
	statusText.textContent = text;
}

function scheduleReconnect() {
	if (reconnectTimer) return;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connectWebSocket();
	}, 2000);
}

function connectWebSocket() {
	setStatus("busy", "Connecting...");
	toggleBtn.disabled = false;
	try {
		socket = new WebSocket(WS_URL);
	} catch (error) {
		setStatus("error", "Connect failed, retrying...");
		scheduleReconnect();
		return;
	}

	socket.addEventListener("open", () => {
		setStatus("success", "Connected");
		toggleBtn.disabled = false;
	});

	socket.addEventListener("message", (event) => {
		const msg = String(event.data).trim().toUpperCase();
		if (msg === "ON" || msg === "255") {
			lightOn = true;
			updateButton();
		}
		if (msg === "OFF" || msg === "127") {
			lightOn = false;
			updateButton();
		}
	});

	socket.addEventListener("close", () => {
		setStatus("error", "Disconnected, retrying...");
		toggleBtn.disabled = false;
		scheduleReconnect();
	});

	socket.addEventListener("error", () => {
		setStatus("error", "Socket error");
		toggleBtn.disabled = false;
	});
}

toggleBtn.addEventListener("click", () => {
	sendCommand(!lightOn);
});

async function sendCommand(nextState) {
	const value = nextState ? "255" : "127";
	const description = nextState ? "led_on" : "led_off";
	const url = `${HTTP_BASE_URL}?digital_output_1=${value}&description=${description}`;

	try {
		setStatus("busy", nextState ? "Sending ON..." : "Sending OFF...");
		await fetch(url, {
			method: "POST",
			mode: "no-cors",
			cache: "no-store"
		});

		lightOn = nextState;
		updateButton();
		setStatus("success", lightOn ? "ON sent via HTTP POST" : "OFF sent via HTTP POST");
	} catch (error) {
		setStatus("error", "HTTP POST failed");
	}
}

updateButton();
connectWebSocket();
