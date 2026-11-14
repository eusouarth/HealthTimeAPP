<?php
// NOVO (app): busca no site as observações escritas pelo médico.
// O navegador chama este arquivo (mesmo servidor do app) e ele conversa com o site,
// então o endereço do site fica só em api/config.php.
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/sync.php';

try {
    // Aproveita para entregar ao site qualquer alerta que tenha ficado pendente
    enviar_pendentes(abrir_banco_app());
} catch (Throwable $e) {
    // não impede de listar as observações
}

$observacoes = chamar_site('api/listar_pareceres.php');
if ($observacoes === null) {
    http_response_code(502);
    echo json_encode(['erro' => 'Não foi possível falar com o site em ' . SITE_URL], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($observacoes, JSON_UNESCAPED_UNICODE);
