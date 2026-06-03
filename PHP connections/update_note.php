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
$notitie = isset($input["notitie"]) ? trim((string) $input["notitie"]) : null;

if ($gewichtwaarde === null || $gewichtwaarde <= 0 || !$datumwaarde) {
	http_response_code(400);
	echo json_encode([
		"success" => false,
		"message" => "Invalid note payload.",
	]);
	exit;
}

if ($notitie !== null && $notitie !== "") {
	$notitie = substr($notitie, 0, 30);
} else {
	$notitie = null;
}

try {
	$stmt = $pdo->prepare("UPDATE Meting SET notitie = :notitie WHERE gewichtwaarde = :gewichtwaarde AND datumwaarde = :datumwaarde");
	$stmt->bindValue(":gewichtwaarde", $gewichtwaarde, PDO::PARAM_INT);
	$stmt->bindValue(":datumwaarde", $datumwaarde, PDO::PARAM_STR);
	if ($notitie === null) {
		$stmt->bindValue(":notitie", null, PDO::PARAM_NULL);
	} else {
		$stmt->bindValue(":notitie", $notitie, PDO::PARAM_STR);
	}
	$stmt->execute();

	echo json_encode([
		"success" => true,
		"updated" => $stmt->rowCount(),
	]);
} catch (PDOException $error) {
	http_response_code(500);
	echo json_encode([
		"success" => false,
		"message" => "Database update failed.",
		"details" => $error->getMessage(),
	]);
}
