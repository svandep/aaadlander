<?php
header("Content-Type: application/json");

try {
	require __DIR__ . "/db.php";
} catch (Throwable $error) {
	http_response_code(500);
	echo json_encode([
		"success" => false,
		"message" => "Database connection failed.",
		"details" => $error->getMessage(),
	]);
	exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$jsonError = json_last_error();
$jsonErrorMessage = json_last_error_msg();

if ($jsonError !== JSON_ERROR_NONE) {
	http_response_code(400);
	echo json_encode([
		"success" => false,
		"message" => "Invalid JSON payload.",
		"details" => $jsonErrorMessage,
	]);
	exit;
}
$gewichtwaarde = isset($input["gewichtwaarde"]) ? (int) $input["gewichtwaarde"] : null;

if ($gewichtwaarde === null || $gewichtwaarde <= 0) {
	echo json_encode([
		"success" => false,
		"message" => "Invalid weight value."
	]);
	exit;
}

try {
	$stmt = $pdo->prepare("INSERT INTO meting (gewichtwaarde, datumwaarde) VALUES (:gewichtwaarde, CURDATE())");
	$stmt->execute(["gewichtwaarde" => $gewichtwaarde]);
	echo json_encode(["success" => true]);
} catch (PDOException $error) {
	http_response_code(500);
	echo json_encode([
		"success" => false,
		"message" => "Database insert failed.",
		"details" => $error->getMessage(),
	]);
}
