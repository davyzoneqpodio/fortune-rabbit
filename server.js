  const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Servir os arquivos do jogo
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// ===============================
// DADOS DO JOGO
// ===============================

const salas = {};
const rankingGlobal = [];

const MAX_JOGADORES = 7;

// ===============================
// FUNÇÕES AUXILIARES
// ===============================

function gerarCodigo() {
  let codigo;

  do {
    codigo = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (salas[codigo]);

  return codigo;
}

function gerarId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}

function limparNome(nome) {
  return String(nome || "Jogador")
    .trim()
    .substring(0, 18) || "Jogador";
}

function encontrarJogador(sala, id) {
  return sala.jogadores.find(j => j.id === id);
}

// ===============================
// PÁGINA PRINCIPAL
// ===============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// RANKING GLOBAL
// ===============================

app.get("/api/ranking", (req, res) => {
  const ranking = [...rankingGlobal]
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 20);

  res.json(ranking);
});

// Registrar ganho no ranking global
app.post("/api/cashout", (req, res) => {
  const nome = limparNome(req.body.name);
  const ganho = Number(req.body.gain) || 0;

  if (ganho <= 0) {
    return res.status(400).json({
      error: "Ganho inválido."
    });
  }

  const existente = rankingGlobal.find(
    jogador => jogador.name.toLowerCase() === nome.toLowerCase()
  );

  if (existente) {
    existente.gain += ganho;
  } else {
    rankingGlobal.push({
      name: nome,
      gain: ganho
    });
  }

  const ranking = [...rankingGlobal]
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 20);

  res.json(ranking);
});

// ===============================
// CRIAR SALA
// ===============================

app.post("/api/rooms", (req, res) => {
  const nome = limparNome(req.body.name);

  const codigo = gerarCodigo();
  const jogadorId = gerarId();

  salas[codigo] = {
    code: codigo,
    hostId: jogadorId,
    started: false,

    jogadores: [
      {
        id: jogadorId,
        name: nome,
        host: true,
        gain: 0
      }
    ],

    createdAt: Date.now()
  };

  res.json({
    success: true,
    code: codigo,
    playerId: jogadorId,
    host: true,
    players: salas[codigo].jogadores
  });
});

// ===============================
// ENTRAR EM SALA
// ===============================

app.post("/api/rooms/:codigo/join", (req, res) => {
  const codigo = String(req.params.codigo || "")
    .toUpperCase()
    .trim();

  const sala = salas[codigo];

  if (!sala) {
    return res.status(404).json({
      error: "Sala não encontrada."
    });
  }

  if (sala.started) {
    return res.status(400).json({
      error: "Essa sala já começou."
    });
  }

  if (sala.jogadores.length >= MAX_JOGADORES) {
    return res.status(400).json({
      error: "A sala já está cheia."
    });
  }

  const nome = limparNome(req.body.name);
  const jogadorId = gerarId();

  sala.jogadores.push({
    id: jogadorId,
    name: nome,
    host: false,
    gain: 0
  });

  res.json({
    success: true,
    code: codigo,
    playerId: jogadorId,
    host: false,
    players: sala.jogadores
  });
});

// ===============================
// VER SALA
// ===============================

app.get("/api/rooms/:codigo", (req, res) => {
  const codigo = String(req.params.codigo || "")
    .toUpperCase()
    .trim();

  const sala = salas[codigo];

  if (!sala) {
    return res.status(404).json({
      error: "Sala não encontrada."
    });
  }

  res.json({
    success: true,
    code: sala.code,
    started: sala.started,
    host: false,
    players: sala.jogadores
  });
});

// ===============================
// COMEÇAR PARTIDA
// ===============================

app.post("/api/rooms/:codigo/start", (req, res) => {
  const codigo = String(req.params.codigo || "")
    .toUpperCase()
    .trim();

  const sala = salas[codigo];

  if (!sala) {
    return res.status(404).json({
      error: "Sala não encontrada."
    });
  }

  sala.started = true;

  res.json({
    success: true,
    started: true,
    players: sala.jogadores
  });
});

// ===============================
// SAIR DA SALA
// ===============================

app.post("/api/rooms/:codigo/leave", (req, res) => {
  const codigo = String(req.params.codigo || "")
    .toUpperCase()
    .trim();

  const sala = salas[codigo];

  if (!sala) {
    return res.status(404).json({
      error: "Sala não encontrada."
    });
  }

  const nome = limparNome(req.body.name);

  const indice = sala.jogadores.findIndex(
    jogador =>
      jogador.name.toLowerCase() === nome.toLowerCase()
  );

  if (indice !== -1) {
    const saiuEraHost =
      sala.jogadores[indice].id === sala.hostId;

    sala.jogadores.splice(indice, 1);

    // Se o anfitrião sair, outro jogador vira anfitrião
    if (saiuEraHost && sala.jogadores.length > 0) {
      sala.hostId = sala.jogadores[0].id;

      sala.jogadores.forEach(jogador => {
        jogador.host = jogador.id === sala.hostId;
      });
    }
  }

  // Se não houver mais jogadores, apagar a sala
  if (sala.jogadores.length === 0) {
    delete salas[codigo];

    return res.json({
      success: true,
      deleted: true
    });
  }

  res.json({
    success: true,
    players: sala.jogadores
  });
});

// ===============================
// REGISTRAR GANHO NA SALA
// ===============================

app.post("/api/rooms/:codigo/gain", (req, res) => {
  const codigo = String(req.params.codigo || "")
    .toUpperCase()
    .trim();

  const sala = salas[codigo];

  if (!sala) {
    return res.status(404).json({
      error: "Sala não encontrada."
    });
  }

  const nome = limparNome(req.body.name);
  const ganho = Number(req.body.gain) || 0;

  if (ganho <= 0) {
    return res.status(400).json({
      error: "Ganho inválido."
    });
  }

  const jogador = sala.jogadores.find(
    j => j.name.toLowerCase() === nome.toLowerCase()
  );

  if (jogador) {
    jogador.gain += ganho;
  }

  res.json({
    success: true,
    players: sala.jogadores
  });
});

// ===============================
// LIMPEZA AUTOMÁTICA DE SALAS
// ===============================

// Apaga salas abandonadas há mais de 2 horas
setInterval(() => {
  const agora = Date.now();

  for (const codigo in salas) {
    const sala = salas[codigo];

    if (agora - sala.createdAt > 2 * 60 * 60 * 1000) {
      delete salas[codigo];
    }
  }
}, 10 * 60 * 1000);

// ===============================
// INICIAR SERVIDOR
// ===============================

app.listen(PORT, () => {
  console.log(`Fortune Rabbit rodando na porta ${PORT}`);
});
