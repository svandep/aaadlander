(() => {
	const canvas = document.getElementById("tetris");
	const context = canvas.getContext("2d");
	const overlay = document.getElementById("gameOverlay");
	const scoreEl = document.getElementById("score");
	const linesEl = document.getElementById("lines");
	const levelEl = document.getElementById("level");
	const newGameBtn = document.getElementById("newGameBtn");

	const COLS = 10;
	const ROWS = 20;
	const BLOCK_SIZE = 24;
	const DROP_BASE = 800;
	const MOVE_INITIAL_DELAY = 120;
	const MOVE_REPEAT = 42;
	const SOFT_DROP_REPEAT = 35;

	canvas.width = COLS * BLOCK_SIZE;
	canvas.height = ROWS * BLOCK_SIZE;
	context.scale(BLOCK_SIZE, BLOCK_SIZE);

	const COLORS = [
		null,
		"#5ec9ff",
		"#ffd54a",
		"#8b74ff",
		"#4de39b",
		"#ff6b6b",
		"#4c7bff",
		"#ff8f3f",
	];

	const SHAPES = {
		T: [
			[0, 0, 0],
			[1, 1, 1],
			[0, 1, 0],
		],
		O: [
			[2, 2],
			[2, 2],
		],
		L: [
			[0, 3, 0],
			[0, 3, 0],
			[0, 3, 3],
		],
		J: [
			[0, 4, 0],
			[0, 4, 0],
			[4, 4, 0],
		],
		I: [
			[0, 5, 0, 0],
			[0, 5, 0, 0],
			[0, 5, 0, 0],
			[0, 5, 0, 0],
		],
		S: [
			[0, 6, 6],
			[6, 6, 0],
			[0, 0, 0],
		],
		Z: [
			[7, 7, 0],
			[0, 7, 7],
			[0, 0, 0],
		],
	};

	let arena = createMatrix(COLS, ROWS);
	let score = 0;
	let lines = 0;
	let level = 1;
	let dropInterval = DROP_BASE;
	let dropCounter = 0;
	let lastTime = 0;
	let paused = false;
	let gameOver = false;
	let moveDelay = 0;
	let moveCounter = 0;
	let lastMoveDir = 0;
	let softDropCounter = 0;
	let pieceBag = [];

	const inputState = {
		left: false,
		right: false,
		down: false,
	};

	const player = {
		pos: { x: 0, y: 0 },
		matrix: null,
	};

	function createMatrix(width, height) {
		const matrix = [];
		while (height--) {
			matrix.push(new Array(width).fill(0));
		}
		return matrix;
	}

	function drawMatrix(matrix, offset) {
		matrix.forEach((row, y) => {
			row.forEach((value, x) => {
				if (value !== 0) {
					context.fillStyle = COLORS[value];
					context.fillRect(x + offset.x, y + offset.y, 1, 1);
				}
			});
		});
	}

	function refillBag() {
		pieceBag = ["T", "J", "L", "O", "S", "Z", "I"];
		for (let i = pieceBag.length - 1; i > 0; i -= 1) {
			const j = (Math.random() * (i + 1)) | 0;
			[pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
		}
	}

	function getNextPiece() {
		if (!pieceBag.length) {
			refillBag();
		}
		return pieceBag.pop();
	}

	function collide(board, actor) {
		const { matrix, pos } = actor;
		for (let y = 0; y < matrix.length; y += 1) {
			for (let x = 0; x < matrix[y].length; x += 1) {
				if (matrix[y][x] !== 0 && (board[y + pos.y] && board[y + pos.y][x + pos.x]) !== 0) {
					return true;
				}
			}
		}
		return false;
	}

	function merge(board, actor) {
		actor.matrix.forEach((row, y) => {
			row.forEach((value, x) => {
				if (value !== 0) {
					board[y + actor.pos.y][x + actor.pos.x] = value;
				}
			});
		});
	}

	function rotate(matrix, dir) {
		for (let y = 0; y < matrix.length; y += 1) {
			for (let x = 0; x < y; x += 1) {
				[matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
			}
		}
		if (dir > 0) {
			matrix.forEach((row) => row.reverse());
		} else {
			matrix.reverse();
		}
	}

	function playerRotate(dir) {
		const pos = player.pos.x;
		let offset = 1;
		rotate(player.matrix, dir);
		while (collide(arena, player)) {
			player.pos.x += offset;
			offset = -(offset + (offset > 0 ? 1 : -1));
			if (Math.abs(offset) > player.matrix[0].length) {
				rotate(player.matrix, -dir);
				player.pos.x = pos;
				return;
			}
		}
	}

	function playerDrop() {
		player.pos.y += 1;
		if (collide(arena, player)) {
			player.pos.y -= 1;
			merge(arena, player);
			arenaSweep();
			playerReset();
		}
		dropCounter = 0;
	}

	function playerHardDrop() {
		while (!collide(arena, player)) {
			player.pos.y += 1;
		}
		player.pos.y -= 1;
		merge(arena, player);
		arenaSweep();
		playerReset();
		dropCounter = 0;
	}

	function playerMove(dir) {
		player.pos.x += dir;
		if (collide(arena, player)) {
			player.pos.x -= dir;
		}
	}

	function arenaSweep() {
		let rowCount = 0;
		outer: for (let y = arena.length - 1; y >= 0; y -= 1) {
			for (let x = 0; x < arena[y].length; x += 1) {
				if (arena[y][x] === 0) {
					continue outer;
				}
			}
			const row = arena.splice(y, 1)[0].fill(0);
			arena.unshift(row);
			y += 1;
			rowCount += 1;
		}

		if (rowCount > 0) {
			const points = [0, 40, 100, 300, 1200];
			score += points[rowCount] * level;
			lines += rowCount;
			level = Math.floor(lines / 10) + 1;
			dropInterval = Math.max(120, DROP_BASE - (level - 1) * 60);
			updateStats();
		}
	}

	function playerReset() {
		const shape = getNextPiece();
		player.matrix = SHAPES[shape].map((row) => row.slice());
		player.pos.y = 0;
		player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
		if (collide(arena, player)) {
			gameOver = true;
			paused = true;
			showOverlay("Game Over");
		}
	}

	function updateStats() {
		scoreEl.textContent = score;
		linesEl.textContent = lines;
		levelEl.textContent = level;
	}

	function showOverlay(text) {
		overlay.textContent = text;
		overlay.classList.add("is-visible");
	}

	function hideOverlay() {
		overlay.classList.remove("is-visible");
	}

	function togglePause() {
		if (gameOver) {
			return;
		}
		paused = !paused;
		if (paused) {
			showOverlay("Paused");
		} else {
			hideOverlay();
			lastTime = performance.now();
			requestAnimationFrame(update);
		}
	}

	function draw() {
		context.fillStyle = "#0a1020";
		context.fillRect(0, 0, COLS, ROWS);
		drawMatrix(arena, { x: 0, y: 0 });
		drawMatrix(player.matrix, player.pos);
	}

	function update(time = 0) {
		if (paused) {
			return;
		}
		const deltaTime = time - lastTime;
		lastTime = time;
		handleHorizontalInput(deltaTime);
		handleSoftDrop(deltaTime);
		dropCounter += deltaTime;
		if (dropCounter > dropInterval) {
			playerDrop();
		}
		draw();
		if (!paused) {
			requestAnimationFrame(update);
		}
	}

	function handleHorizontalInput(deltaTime) {
		const dir = inputState.left ? -1 : inputState.right ? 1 : 0;
		if (dir === 0) {
			moveDelay = 0;
			moveCounter = 0;
			lastMoveDir = 0;
			return;
		}
		if (dir !== lastMoveDir) {
			playerMove(dir);
			moveDelay = 0;
			moveCounter = 0;
			lastMoveDir = dir;
			return;
		}
		if (moveDelay < MOVE_INITIAL_DELAY) {
			moveDelay += deltaTime;
			return;
		}
		moveCounter += deltaTime;
		while (moveCounter >= MOVE_REPEAT) {
			playerMove(dir);
			moveCounter -= MOVE_REPEAT;
		}
	}

	function handleSoftDrop(deltaTime) {
		if (!inputState.down) {
			softDropCounter = 0;
			return;
		}
		softDropCounter += deltaTime;
		while (softDropCounter >= SOFT_DROP_REPEAT) {
			playerDrop();
			softDropCounter -= SOFT_DROP_REPEAT;
		}
	}

	function resetGame() {
		arena = createMatrix(COLS, ROWS);
		score = 0;
		lines = 0;
		level = 1;
		dropInterval = DROP_BASE;
		dropCounter = 0;
		paused = false;
		gameOver = false;
		updateStats();
		hideOverlay();
		playerReset();
		lastTime = performance.now();
		requestAnimationFrame(update);
	}

	newGameBtn.addEventListener("click", () => resetGame());

	document.addEventListener("keydown", (event) => {
		if (event.repeat) {
			return;
		}
		if (event.code === "KeyP") {
			togglePause();
			return;
		}
		if (paused) {
			return;
		}
		switch (event.code) {
			case "ArrowLeft":
			case "KeyA":
				inputState.left = true;
				inputState.right = false;
				break;
			case "ArrowRight":
			case "KeyD":
				inputState.right = true;
				inputState.left = false;
				break;
			case "ArrowDown":
			case "KeyS":
				inputState.down = true;
				break;
			case "ArrowUp":
			case "KeyW":
				playerRotate(1);
				break;
			case "Space":
				event.preventDefault();
				playerHardDrop();
				break;
			default:
				break;
		}
	});

	document.addEventListener("keyup", (event) => {
		switch (event.code) {
			case "ArrowLeft":
			case "KeyA":
				inputState.left = false;
				break;
			case "ArrowRight":
			case "KeyD":
				inputState.right = false;
				break;
			case "ArrowDown":
			case "KeyS":
				inputState.down = false;
				break;
			default:
				break;
		}
	});

	resetGame();
})();
