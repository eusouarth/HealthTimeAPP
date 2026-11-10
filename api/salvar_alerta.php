<?php
header('Content-Type: application/json; charset=utf-8');

try {
    // __DIR__ pega o caminho absoluto da pasta api, e '/../healthtime.db' aponta pra raiz
    $caminhoBanco = __DIR__ . '/../healthtime.db';
    $pdo = new PDO("sqlite:" . $caminhoBanco);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $input = json_decode(file_get_contents('php://input'), true);

    if ($input) {
        $stmt = $pdo->prepare("INSERT INTO alertas_emergencia (bpm, spo2, tipo_evento, descricao) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $input['bpm'], 
            $input['spo2'], 
            $input['tipo_evento'], 
            $input['descricao']
        ]);

        echo json_encode(['status' => 'sucesso', 'mensagem' => 'Alerta salvo no SQLite!']);
    } else {
        echo json_encode(['status' => 'erro', 'mensagem' => 'Dados inválidos.']);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'erro', 'mensagem' => $e->getMessage()]);
}
?>