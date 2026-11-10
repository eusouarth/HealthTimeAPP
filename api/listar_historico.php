<?php
header('Content-Type: application/json; charset=utf-8');

try {
    $caminhoBanco = __DIR__ . '/../healthtime.db';
    $pdo = new PDO("sqlite:" . $caminhoBanco);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SELECT * FROM alertas_emergencia ORDER BY id DESC LIMIT 5");
    $historico = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($historico);
} catch (Exception $e) {
    echo json_encode(['erro' => $e->getMessage()]);
}
?>