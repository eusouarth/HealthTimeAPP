// Função para carregar a data atual formatada automaticamente em Português
function atualizarDataAtual() {
    const elementoData = document.querySelector('.date-text');
    if (!elementoData) return;

    const agora = new Date();

    // Formata o dia da semana, dia do mês e mês
    const opcoes = { weekday: 'long', day: 'numeric', month: 'long' };
    let dataFormatada = agora.toLocaleDateString('pt-BR', opcoes);

    // Deixa a primeira letra maiúscula
    dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

    elementoData.textContent = dataFormatada;
}

function mudarTela(idTela) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('screen-' + idTela).classList.add('active');
  event.currentTarget.classList.add('active');

  if (idTela === 'historico') {
    carregarHistoricoDoBanco();
  }
}

let cenarioAtual = 'NORMAL';
let bpm = 72;
let spo2 = 97;
let timerAlerta = null;
let alertaJaEnviado = false;

// Função chamada pelos botões de simulação da banca
function setCenario(novoCenario) {
  cenarioAtual = novoCenario;
  const bpmStatusElem = document.getElementById('bpmStatus');
  const alertBanner = document.getElementById('alertBanner');

  if (novoCenario === 'NORMAL') {
    cancelarAlerta();
    bpm = 72;
    spo2 = 97;
    bpmStatusElem.innerText = "● Ritmo normal em repouso";
    bpmStatusElem.style.color = "#10b981";
    alertBanner.style.display = 'none';
    alertaJaEnviado = false;

  } else if (novoCenario === 'TAQUICARDIA') {
    bpm = 138;
    spo2 = 91;
    bpmStatusElem.innerText = "● CRÍTICO: Taquicardia severa";
    bpmStatusElem.style.color = "#f43f5e";
    dispararAlerta("Frequência cardíaca crítica acima de 120 BPM em repouso!");

  } else if (novoCenario === 'QUEDA') {
    bpm = 115;
    spo2 = 93;
    bpmStatusElem.innerText = "● ALERTA: Queda corporal detectada";
    bpmStatusElem.style.color = "#f59e0b";
    dispararAlerta("Impacto brusco e imobilidade identificados pelo acelerômetro!");
  }

  document.getElementById('bpmValue').innerText = bpm;
  document.getElementById('spo2Value').innerText = spo2;
}

// Loop contínuo para simular oscilações leves apenas no estado NORMAL
setInterval(() => {
  if (cenarioAtual === 'NORMAL') {
    bpm = Math.floor(Math.random() * (78 - 68 + 1)) + 68;
    spo2 = Math.floor(Math.random() * (99 - 96 + 1)) + 96;

    const bpmElem = document.getElementById('bpmValue');
    const spo2Elem = document.getElementById('spo2Value');
    if (bpmElem) bpmElem.innerText = bpm;
    if (spo2Elem) spo2Elem.innerText = spo2;
  }
}, 3000);

function dispararAlerta(msg) {
  const banner = document.getElementById('alertBanner');
  const txtMsg = document.getElementById('alertMessage');
  const countdown = document.getElementById('countdown');

  if (banner.style.display === 'block') return;

  txtMsg.innerText = msg;
  banner.style.display = 'block';

  let tempo = 5;
  countdown.innerText = tempo;

  if (!timerAlerta) {
    timerAlerta = setInterval(() => {
      tempo--;
      countdown.innerText = tempo;
      if (tempo <= 0) {
        clearInterval(timerAlerta);
        timerAlerta = null;

        if (!alertaJaEnviado) {
          alertaJaEnviado = true;
          salvarAlertaNoBanco(msg);
        }

        cancelarAlerta();
      }
    }, 1000);
  }
}

function cancelarAlerta() {
  if (timerAlerta) {
    clearInterval(timerAlerta);
    timerAlerta = null;
  }
  document.getElementById('alertBanner').style.display = 'none';
}

// APP -> SITE: o alerta confirmado é gravado no banco compartilhado e aparece no painel médico
function salvarAlertaNoBanco(descricao) {
  fetch('api/salvar_alerta.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bpm: bpm,
      spo2: spo2,
      tipo_evento: cenarioAtual,
      descricao: descricao
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Alerta salvo e enviado ao site:", data);
  })
  .catch(err => console.error("Erro ao salvar:", err));
}

// O texto das observações é digitado no site, então tudo que vem do banco é escapado antes de ir para o HTML
function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarEstado(tipo) {
  const t = String(tipo ?? '').trim().toUpperCase();
  if (t === 'TAQUICARDIA') return 'Taquicardia';
  if (t === 'QUEDA') return 'Queda';
  return 'Sem alteração';
}

function carregarHistoricoDoBanco(silencioso = false) {
  const lista = document.getElementById('listaHistorico');
  if (!silencioso) {
    lista.innerHTML = '<p style="font-size: 0.75rem; color: #64748b;">Buscando dados do servidor...</p>';
  }

  // As observações do médico ficam na mesma tela e são atualizadas junto
  carregarObservacoesMedico(silencioso);

  fetch('api/listar_historico.php')
    .then(res => res.json())
    .then(dados => {
      if (!Array.isArray(dados)) throw new Error((dados && dados.erro) || 'Resposta inválida do servidor');

      if (dados.length === 0) {
        lista.innerHTML = '<p style="font-size: 0.75rem; color: #64748b;">Nenhum registro encontrado no banco.</p>';
        return;
      }

      lista.innerHTML = dados.map(item => `
          <div class="history-item">
            <div><b>Evento:</b> ${escapeHtml(item.tipo_evento)} (${escapeHtml(item.bpm)} BPM | SpO₂: ${escapeHtml(item.spo2)}%)</div>
            <div style="color: #64748b; font-size: 0.7rem; margin-top: 2px;">${escapeHtml(item.descricao)}</div>
            <div class="history-date">${escapeHtml(item.data_hora)}</div>
          </div>
        `).join('');
    })
    .catch(() => {
      if (!silencioso) {
        lista.innerHTML = '<p style="font-size: 0.75rem; color: #f43f5e;">Erro ao carregar o histórico do banco.</p>';
      }
    });
}

// SITE -> APP: observações que o médico escreve no painel aparecem aqui
function carregarObservacoesMedico(silencioso = false) {
  const lista = document.getElementById('listaObservacoes');
  if (!lista) return;

  fetch('api/observacoes.php')
    .then(res => res.json())
    .then(dados => {
      if (!Array.isArray(dados)) throw new Error((dados && dados.erro) || 'Resposta inválida do servidor');

      if (dados.length === 0) {
        lista.innerHTML = '<p style="font-size: 0.75rem; color: #64748b;">Nenhuma observação do médico até o momento.</p>';
        return;
      }

      lista.innerHTML = dados.slice(0, 10).map(item => `
          <div class="history-item" style="border-left: 4px solid #0284c7;">
            <div><strong style="color: #0f172a;">🩺 ${escapeHtml(item.medico_nome)}</strong></div>
            <div style="color: #1e293b; margin-top: 4px; white-space: pre-wrap;">${escapeHtml(item.texto)}</div>
            <div class="history-date">${escapeHtml(item.data_hora)} • Estado: ${escapeHtml(formatarEstado(item.estado_evento))}</div>
          </div>
        `).join('');
    })
    .catch(() => {
      if (!silencioso) {
        lista.innerHTML = '<p style="font-size: 0.75rem; color: #f43f5e;">Erro ao carregar as observações do médico.</p>';
      }
    });
}

// Com a aba Histórico aberta, atualiza sozinho para novas observações aparecerem sem recarregar
function atualizarHistoricoSeVisivel() {
  const tela = document.getElementById('screen-historico');
  if (tela && tela.classList.contains('active')) {
    carregarHistoricoDoBanco(true);
  }
}

// Inicializa a data assim que o documento carregar
document.addEventListener('DOMContentLoaded', () => {
    atualizarDataAtual();
    setInterval(atualizarHistoricoSeVisivel, 5000);
});
