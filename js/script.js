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

function setCenario(novoCenario) {
  cenarioAtual = novoCenario;
  if (novoCenario === 'NORMAL') {
    cancelarAlerta();
  }
}

setInterval(() => {
  const bpmElem = document.getElementById('bpmValue');
  const spo2Elem = document.getElementById('spo2Value');
  const bpmStatusElem = document.getElementById('bpmStatus');
  const alertBanner = document.getElementById('alertBanner');

  if (cenarioAtual === 'NORMAL') {
    bpm = Math.floor(Math.random() * (75 - 70 + 1)) + 70;
    spo2 = 97;
    bpmStatusElem.innerText = "● Ritmo normal em repouso";
    bpmStatusElem.style.color = "#34d399";
    alertBanner.style.display = 'none';
    alertaJaEnviado = false;

  } else if (cenarioAtual === 'TAQUICARDIA') {
    bpm = 138;
    spo2 = 91;
    bpmStatusElem.innerText = "● CRÍTICO: Taquicardia severa";
    bpmStatusElem.style.color = "#ef4444";
    dispararAlerta("Frequência cardíaca crítica acima de 120 BPM em repouso!");

  } else if (cenarioAtual === 'QUEDA') {
    bpm = 115;
    spo2 = 93;
    bpmStatusElem.innerText = "● ALERTA: Queda corporal detectada";
    bpmStatusElem.style.color = "#f59e0b";
    dispararAlerta("Impacto brusco e imobilidade identificados pelo acelerômetro!");
  }

  if (bpmElem) bpmElem.innerText = bpm;
  if (spo2Elem) spo2Elem.innerText = spo2;
}, 2000);

function dispararAlerta(msg) {
  const banner = document.getElementById('alertBanner');
  const txtMsg = document.getElementById('alertMessage');
  const countdown = document.getElementById('countdown');

  if (banner.style.display === 'block') return;

  txtMsg.innerText = msg;
  banner.style.display = 'block';

  let tempo = 10;
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
  setCenario('NORMAL');
}

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
    console.log("Alerta salvo no SQLite:", data);
  })
  .catch(err => console.error("Erro ao salvar:", err));
}

function carregarHistoricoDoBanco() {
  const lista = document.getElementById('listaHistorico');
  lista.innerHTML = '<p style="font-size: 0.75rem; color: #94a3b8;">Buscando dados do servidor...</p>';

  fetch('api/listar_historico.php')
    .then(res => res.json())
    .then(dados => {
      if (dados.length === 0) {
        lista.innerHTML = '<p style="font-size: 0.75rem; color: #94a3b8;">Nenhum registro encontrado no banco.</p>';
        return;
      }

      lista.innerHTML = '';
      dados.forEach(item => {
        lista.innerHTML += `
          <div class="history-item">
            <div><b>Evento:</b> ${item.tipo_evento} (${item.bpm} BPM | SpO₂: ${item.spo2}%)</div>
            <div style="color: #94a3b8; font-size: 0.7rem;">${item.descricao}</div>
            <div style="font-size: 0.65rem; color: #38bdf8; margin-top: 2px;">${item.data_hora}</div>
          </div>
        `;
      });
    })
    .catch(err => {
      lista.innerHTML = '<p style="font-size: 0.75rem; color: #ef4444;">Erro ao carregar o histórico do banco.</p>';
    });
}