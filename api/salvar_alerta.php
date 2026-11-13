<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Bahia'); // Define o fuso horário local

try {
    $caminhoBanco = __DIR__ . '/../healthtime.db';
    $pdo = new PDO("sqlite:" . $caminhoBanco);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $input = json_decode(file_get_contents('php://input'), true);

    if ($input) {
        // Captura a data e a hora atual exatas do nosso fuso (Ex: "12/11/2026 21:15:00")
        $dataHoraAtual = date('d/m/Y H:i:s');

        // Note que agora incluímos a coluna 'data_hora' (confirme se o nome da coluna no seu banco é exatamente 'data_hora')
        $stmt = $pdo->prepare("INSERT INTO alertas_emergencia (bpm, spo2, tipo_evento, descricao, data_hora) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['bpm'], 
            $input['spo2'], 
            $input['tipo_evento'], 
            $input['descricao'],
            $dataHoraAtual
        ]);

        echo json_encode(['status' => 'sucesso', 'mensagem' => 'Alerta salvo com hora exata!']);
    } else {
        echo json_encode(['status' => 'erro', 'mensagem' => 'Dados inválidos.']);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'erro', 'mensagem' => $e->getMessage()]);
}
?>