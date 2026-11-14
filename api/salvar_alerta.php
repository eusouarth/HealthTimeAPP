<?php
// ALTERADO (app): continua gravando no banco do app e agora também envia ao site.
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Bahia'); // Define o fuso horário local
require_once __DIR__ . '/sync.php';

try {
    $pdo = abrir_banco_app();

    $input = json_decode(file_get_contents('php://input'), true);

    if ($input) {
        // Captura a data e a hora atual no padrão: "12/11/2026 21:15:00"
        $dataHoraAtual = date('d/m/Y H:i:s');

        $stmt = $pdo->prepare("INSERT INTO alertas_emergencia (bpm, spo2, tipo_evento, descricao, data_hora, sincronizado) VALUES (?, ?, ?, ?, ?, 0)");
        $stmt->execute([
            $input['bpm'],
            $input['spo2'],
            $input['tipo_evento'],
            $input['descricao'],
            $dataHoraAtual
        ]);

        // Envia ao site (junto com qualquer alerta antigo que ainda não tenha chegado lá)
        $sync = enviar_pendentes($pdo);

        echo json_encode([
            'status' => 'sucesso',
            'mensagem' => 'Alerta salvo com hora exata!',
            'enviado_ao_site' => $sync['pendentes'] === 0,
            'pendentes_para_o_site' => $sync['pendentes'],
        ]);
    } else {
        echo json_encode(['status' => 'erro', 'mensagem' => 'Dados inválidos.']);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'erro', 'mensagem' => $e->getMessage()]);
}
?>
