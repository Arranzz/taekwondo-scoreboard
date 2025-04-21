const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estáticos desde /client
app.use(express.static(path.join(__dirname, '../client')));

// Estado de los tapices
const mats = {
  1: {
    roundNumber: 1,
    redTechniques: { puno: 0, peto: 0, casco: 0, giro: 0 },
    blueTechniques: { puno: 0, peto: 0, casco: 0, giro: 0 },
    redGamjeoms: 0,
    blueGamjeoms: 0,
    timer: 120,
    isTimerRunning: false,
    startTime: null,
    redRoundWins: 0,
    blueRoundWins: 0,
    settings: { roundDuration: 120, bestOfThree: true, gamjeomValidity: true }
  },
  2: {
    roundNumber: 1,
    redTechniques: { puno: 0, peto: 0, casco: 0, giro: 0 },
    blueTechniques: { puno: 0, peto: 0, casco: 0, giro: 0 },
    redGamjeoms: 0,
    blueGamjeoms: 0,
    timer: 120,
    isTimerRunning: false,
    startTime: null,
    redRoundWins: 0,
    blueRoundWins: 0,
    settings: { roundDuration: 120, bestOfThree: true, gamjeomValidity: true }
  }
};

// Calcular puntuación total
function calculateTotalScore(techniques, opponentGamjeoms) {
  const techniquePoints = (techniques.puno * 1) + (techniques.peto * 2) + (techniques.casco * 3) + (techniques.giro * 2);
  return techniquePoints + (opponentGamjeoms * 1);
}

// Lógica del temporizador
setInterval(() => {
  for (const matId in mats) {
    const mat = mats[matId];
    if (mat.isTimerRunning && mat.timer > 0) {
      mat.timer -= 1;
      io.emit('stateUpdate', mats);
      if (mat.timer <= 0) {
        mat.isTimerRunning = false;
        // Finalizar ronda
        if (mat.settings.bestOfThree) {
          determineRoundWinner(matId);
        }
      }
    }
  }
}, 1000);

// Determinar ganador de la ronda
function determineRoundWinner(matId) {
  const mat = mats[matId];
  const redTotal = calculateTotalScore(mat.redTechniques, mat.blueGamjeoms);
  const blueTotal = calculateTotalScore(mat.blueTechniques, mat.redGamjeoms);
  let winner = null;

  if (redTotal > blueTotal) {
    winner = 'red';
  } else if (blueTotal > redTotal) {
    winner = 'blue';
  } else {
    // Desempate
    const redGiroPoints = mat.redTechniques.giro * 2;
    const blueGiroPoints = mat.blueTechniques.giro * 2;
    if (redGiroPoints > blueGiroPoints) {
      winner = 'red';
    } else if (blueGiroPoints > redGiroPoints) {
      winner = 'blue';
    } else {
      if (mat.redTechniques.casco > mat.blueTechniques.casco) {
        winner = 'red';
      } else if (mat.blueTechniques.casco > mat.blueTechniques.casco) {
        winner = 'blue';
      }
    }
  }

  if (winner) {
    if (winner === 'red') {
      mat.redRoundWins += 1;
    } else {
      mat.blueRoundWins += 1;
    }
  }

  // Verificar ganador del combate
  if (mat.settings.bestOfThree && (mat.redRoundWins >= 2 || mat.blueRoundWins >= 2)) {
    // Combate terminado
    mat.isTimerRunning = false;
  }
}

// Manejo de conexiones
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  socket.emit('stateUpdate', mats);

  socket.on('action', (data) => {
    const { matId, action, payload } = data;
    const mat = mats[matId];
    if (!mat) return;

    if (action === 'startTimer') {
      if (!mat.isTimerRunning) {
        mat.isTimerRunning = true;
        mat.startTime = Date.now();
      }
    } else if (action === 'stopTimer') {
      mat.isTimerRunning = false;
    } else if (action === 'addTechnique') {
      const { color, technique } = payload;
      if (color === 'red') {
        mat.redTechniques[technique] += 1;
      } else {
        mat.blueTechniques[technique] += 1;
      }
    } else if (action === 'subtractTechnique') {
      const { color, technique } = payload;
      if (color === 'red') {
        if (mat.redTechniques[technique] > 0) mat.redTechniques[technique] -= 1;
      } else {
        if (mat.blueTechniques[technique] > 0) mat.blueTechniques[technique] -= 1;
      }
    } else if (action === 'addGamjeom') {
      const { color } = payload;
      if (color === 'red') {
        mat.redGamjeoms += 1;
        if (mat.settings.gamjeomValidity && mat.redGamjeoms >= 5) {
          mat.blueRoundWins += 1;
          if (mat.settings.bestOfThree) {
            resetRound(matId);
          }
        }
      } else {
        mat.blueGamjeoms += 1;
        if (mat.settings.gamjeomValidity && mat.blueGamjeoms >= 5) {
          mat.redRoundWins += 1;
          if (mat.settings.bestOfThree) {
            resetRound(matId);
          }
        }
      }
    } else if (action === 'subtractGamjeom') {
      const { color } = payload;
      if (color === 'red') {
        if (mat.redGamjeoms > 0) mat.redGamjeoms -= 1;
      } else {
        if (mat.blueGamjeoms > 0) mat.blueGamjeoms -= 1;
      }
    } else if (action === 'nextRound') {
      if (mat.settings.bestOfThree) {
        determineRoundWinner(matId);
      }
      resetRound(matId);
      mat.roundNumber += 1;
    } else if (action === 'reset') {
      mat.roundNumber = 1;
      mat.redTechniques = { puno: 0, peto: 0, casco: 0, giro: 0 };
      mat.blueTechniques = { puno: 0, peto: 0, casco: 0, giro: 0 };
      mat.redGamjeoms = 0;
      mat.blueGamjeoms = 0;
      mat.timer = mat.settings.roundDuration;
      mat.isTimerRunning = false;
      mat.redRoundWins = 0;
      mat.blueRoundWins = 0;
    } else if (action === 'setSettings') {
      mat.settings = { ...mat.settings, ...payload };
      mat.timer = mat.settings.roundDuration;
    }

    io.emit('stateUpdate', mats);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Reiniciar ronda
function resetRound(matId) {
  const mat = mats[matId];
  if (mat.settings.bestOfThree) {
    mat.redTechniques = { puno: 0, peto: 0, casco: 0, giro: 0 };
    mat.blueTechniques = { puno: 0, peto: 0, casco: 0, giro: 0 };
    mat.redGamjeoms = 0;
    mat.blueGamjeoms = 0;
  }
  mat.timer = mat.settings.roundDuration;
  mat.isTimerRunning = false;
}

server.listen(3000, () => {
  console.log('Servidor ejecutándose en el puerto 3000');
});