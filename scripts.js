const WS_URL = "ws://145.49.127.250:1880/ws/groep12";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const weightValue = document.getElementById("weightValue");
const lastUpdate = document.getElementById("lastUpdate");

let socket = null;
let reconnectTimer = null;

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

	try {
		socket = new WebSocket(WS_URL);
	} catch (error) {
		setStatus("error", "Connect failed, retrying...");
		scheduleReconnect();
		return;
	}

	socket.addEventListener("open", () => {
		setStatus("success", "Connected");
	});

	socket.addEventListener("message", (event) => {
		try {
			const data = JSON.parse(event.data);

			if (data.weight_1 !== undefined) {
				weightValue.textContent = `${data.weight_1} g`;
				lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
			}
		} catch (error) {
			console.log("Invalid websocket message:", event.data);
		}
	});

	socket.addEventListener("close", () => {
		setStatus("error", "Disconnected, retrying...");
		scheduleReconnect();
	});

	socket.addEventListener("error", () => {
		setStatus("error", "Socket error");
	});
}

connectWebSocket();