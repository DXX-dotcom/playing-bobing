const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let playerCount = 0;
let players = {}; // { id: { ws, name } }

wss.on('connection', (ws) => {
  playerCount++;
  const playerId = playerCount;
  players[playerId] = { ws, name: null };

  console.log(`✅ 玩家 ${playerId} 加入`);

  // 通知自己分配到的 id
  ws.send(JSON.stringify({ type: 'welcome', player: playerId }));

  // 发送当前已存在的玩家列表给新玩家
  const existingPlayers = Object.keys(players)
    .filter(id => id != playerId)
    .map(id => ({ id: Number(id), name: players[id].name }));
  ws.send(JSON.stringify({ type: 'existingPlayers', players: existingPlayers }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'setName') {
      players[playerId].name = data.name || `玩家 ${playerId}`;
      ws.send(JSON.stringify({ type: 'nameConfirmed', name: players[playerId].name }));
      broadcast({ type: 'playerJoined', player: { id: playerId, name: players[playerId].name } });
    }

    if (data.type === 'roll') {
      let results = [];
      for (let i = 0; i < 6; i++) {
        results.push(Math.floor(Math.random() * 6) + 1);
      }
      broadcast({
        type: 'roll',
        player: data.player,
        results: results
      });
    }
  });

  ws.on('close', () => {
    console.log(`❌ 玩家 ${playerId} 离开`);
    delete players[playerId];
    broadcast({ type: 'playerLeft', player: playerId });
  });
});

function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 服务器已启动在端口 ${PORT}`);
});
