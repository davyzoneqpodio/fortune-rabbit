const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// Salas criadas
const salas = {};

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Criar uma sala
app.post("/salas", (req, res) => {
  let codigo;

  do {
    codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (salas[codigo]);

  salas[codigo] = {
    jogadores: []
  };

  res.json({
    sucesso: true,
    codigo
  });
});

// Entrar em uma sala
app.post("/salas/:codigo/entrar", (req, res) => {
  const codigo = req.params.codigo.toUpperCase();

  if (!salas[codigo]) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Sala não encontrada"
    });
  }

  const jogador = {
    id: Date.now(),
    nome: req.body.nome || "Jogador"
  };

  salas[codigo].jogadores.push(jogador);

  res.json({
    sucesso: true,
    sala: salas[codigo]
  });
});

// Ver uma sala
app.get("/salas/:codigo", (req, res) => {
  const codigo = req.params.codigo.toUpperCase();

  if (!salas[codigo]) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Sala não encontrada"
    });
  }

  res.json({
    sucesso: true,
    sala: salas[codigo]
  });
});

app.listen(PORT, () => {
  console.log(`Fortune Rabbit rodando na porta ${PORT}`);
});
  
