<?php
$host = "127.0.0.1";
$db = "aaadlander";
$user = "aaadlander";
$pass = "aaadlander";

$dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
$options = [
	PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
	PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$pdo = new PDO($dsn, $user, $pass, $options);
