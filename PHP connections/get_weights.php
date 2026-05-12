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

$stmt = $pdo->query("SELECT gewichtwaarde, datumwaarde, notitie FROM Meting ORDER BY datumwaarde DESC, gewichtwaarde DESC LIMIT 6");
$weights = $stmt->fetchAll();

echo json_encode(["weights" => $weights]);
?>
