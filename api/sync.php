<?php
// NOVO (app): comunicação com o site. O banco do app continua sendo só do app.
require_once __DIR__ . '/config.php';

function abrir_banco_app(): PDO
{
    $pdo = new PDO('sqlite:' . __DIR__ . '/../healthtime.db');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA busy_timeout = 3000');

    // Marca quais alertas já foram entregues ao site
    $colunas = $pdo->query('PRAGMA table_info(alertas_emergencia)')->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('sincronizado', $colunas, true)) {
        $pdo->exec('ALTER TABLE alertas_emergencia ADD COLUMN sincronizado INTEGER DEFAULT 0');
    }
    return $pdo;
}

/** Chama a API do site. Devolve o JSON decodificado, ou null se o site não respondeu OK. */
function chamar_site(string $caminho, ?array $corpo = null): ?array
{
    $url = rtrim(SITE_URL, '/') . '/' . ltrim($caminho, '/');
    $json = $corpo !== null ? json_encode($corpo, JSON_UNESCAPED_UNICODE) : null;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3, CURLOPT_CONNECTTIMEOUT => 2]);
        if ($json !== null) {
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $json,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            ]);
        }
        $resp = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => $json !== null ? 'POST' : 'GET',
            'header' => "Content-Type: application/json\r\n",
            'content' => $json ?? '',
            'timeout' => 3,
            'ignore_errors' => true,
        ]]);
        $resp = @file_get_contents($url, false, $ctx);
        $http = 0;
        if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
            $http = (int) $m[1];
        }
    }

    if ($resp === false || $http < 200 || $http >= 300) {
        return null;
    }
    $dados = json_decode($resp, true);
    return is_array($dados) ? $dados : null;
}

/**
 * O app gravou datas em dois formatos: 'd/m/Y H:i:s' (horário local) e 'Y-m-d H:i:s'
 * (padrão CURRENT_TIMESTAMP do SQLite, que é UTC). O site espera 'Y-m-d H:i:s' local.
 */
function data_para_site(string $dh): string
{
    $dh = trim($dh);
    if (preg_match('#^(\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2})(:\d{2})?$#', $dh, $m)) {
        return "{$m[3]}-{$m[2]}-{$m[1]} {$m[4]}" . ($m[5] !== '' ? $m[5] : ':00');
    }
    $d = new DateTime($dh, new DateTimeZone('UTC'));
    $d->setTimezone(new DateTimeZone('America/Sao_Paulo'));
    return $d->format('Y-m-d H:i:s');
}

/** Envia ao site todos os alertas ainda não entregues (do mais antigo ao mais novo). */
function enviar_pendentes(PDO $pdo): array
{
    $pendentes = $pdo->query("SELECT id, bpm, spo2, tipo_evento, descricao, data_hora FROM alertas_emergencia
                              WHERE COALESCE(sincronizado, 0) = 0 ORDER BY id LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
    $marcar = $pdo->prepare('UPDATE alertas_emergencia SET sincronizado = 1 WHERE id = :id');

    $enviados = 0;
    foreach ($pendentes as $a) {
        $resp = chamar_site('api/receber_alerta.php', [
            'bpm' => (int) $a['bpm'],
            'spo2' => (int) $a['spo2'],
            'tipo_evento' => $a['tipo_evento'],
            'descricao' => $a['descricao'],
            'data_hora' => data_para_site($a['data_hora']),
        ]);
        if (!$resp || ($resp['status'] ?? '') !== 'sucesso') {
            break; // site fora do ar: tenta de novo na próxima vez, sem perder nada
        }
        $marcar->execute([':id' => $a['id']]);
        $enviados++;
    }

    return ['enviados' => $enviados, 'pendentes' => count($pendentes) - $enviados];
}
