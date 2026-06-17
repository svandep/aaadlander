<?php
function loadEnvFile(string $path): void {
	if (!is_readable($path)) {
		return;
	}

	foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
		$line = trim($line);
		if ($line === "" || str_starts_with($line, "#") || !str_contains($line, "=")) {
			continue;
		}

		[$key, $value] = explode("=", $line, 2);
		$key = trim($key);
		$value = trim($value, " \t\n\r\0\x0B\"'");

		if ($key !== "" && getenv($key) === false) {
			putenv("{$key}={$value}");
			$_ENV[$key] = $value;
		}
	}
}

loadEnvFile(dirname(__DIR__, 2) . "/.env");

$host = getenv("DB_HOST") ?: "127.0.0.1";
$db = getenv("DB_NAME") ?: "aaadlander";
$user = getenv("DB_USER") ?: "aaadlander";
$pass = getenv("DB_PASSWORD") ?: "aaadlander";
$charset = getenv("DB_CHARSET") ?: "utf8mb4";

$dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
$options = [
	PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
	PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$pdo = new PDO($dsn, $user, $pass, $options);
