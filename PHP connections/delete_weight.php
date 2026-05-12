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
$datumwaarde = isset($input["datumwaarde"]) ? $input["datumwaarde"] : null;

if ($gewichtwaarde === null || $gewichtwaarde <= 0 || !$datumwaarde) {
	http_response_code(400);
	echo json_encode([
		"success" => false,
		"message" => "Invalid delete payload.",
	]);
	exit;
}

try {
	$stmt = $pdo->prepare("DELETE FROM Meting WHERE gewichtwaarde = :gewichtwaarde AND datumwaarde = :datumwaarde");
	$stmt->execute([
		"gewichtwaarde" => $gewichtwaarde,
		"datumwaarde" => $datumwaarde,
	]);

	echo json_encode([
		"success" => true,
		"deleted" => $stmt->rowCount(),
	]);
} catch (PDOException $error) {
	http_response_code(500);
	echo json_encode([
		"success" => false,
		"message" => "Database delete failed.",
		"details" => $error->getMessage(),
	]);
}
