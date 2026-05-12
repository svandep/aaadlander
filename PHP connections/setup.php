<?php
require __DIR__ . "/db.php";

$sql = "CREATE TABLE IF NOT EXISTS Meting (
	gewichtwaarde INT NOT NULL,
	datumwaarde DATETIME NOT NULL,
	notitie VARCHAR(30),
	PRIMARY KEY (gewichtwaarde, datumwaarde)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$pdo->exec($sql);

echo "Table Meting is ready.";
