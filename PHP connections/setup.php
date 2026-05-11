<?php
require __DIR__ . "/db.php";

$sql = "CREATE TABLE IF NOT EXISTS meting (
	gewichtwaarde INT NOT NULL,
	datumwaarde DATE NOT NULL,
	PRIMARY KEY (gewichtwaarde, datumwaarde)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$pdo->exec($sql);

echo "Table meting is ready.";
