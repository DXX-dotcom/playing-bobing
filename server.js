const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// 玩家管理
let players = {};       // { id: { ws, name } }
let freeIds = [];       // 空闲 ID 队列
let nextId = 1;         // 下一个可用 ID

wss.on('connection', (ws) => {
  // 分配玩家 ID
  let playerId;
  if (freeIds.length > 0) {
    playerId = freeIds.shift();
  } else {
    playerId = nextId++;
  }

  players[playerId] = { ws, name: null };
  console.log(`✅ 玩家 ${playerId} 加入`);

  // 发送欢迎信息
  ws.send(JSON.stringify({ type: 'welcome', player: playerId }));

  // 发送已有玩家列表
  const existingPlayers = Object.keys(players)
    .filter(id => id != playerId)
    .map(id => ({ id: Number(id), name: players[id].name }));
  ws.send(JSON.stringify({ type: 'existingPlayers', players: existingPlayers }));

  // 消息处理
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'setName') {
      players[playerId].name = data.name || `玩家 ${playerId}`;
      // 确认昵称
      ws.send(JSON.stringify({ type: 'nameConfirmed', name: players[playerId].name }));
      // 广播新玩家
      broadcast({ type: 'playerJoined', player: { id: playerId, name: players[playerId].name } });
    }

    if (data.type === 'roll') {
      let results = [];
      for (let i = 0; i < 6; i++) {
        results.push(Math.floor(Math.random() * 6) + 1);
      }
      broadcast({ type: 'roll', player: data.player, results: results });
    }
  });

  // 玩家离开
  ws.on('close', () => {
    console.log(`❌ 玩家 ${playerId} 离开`);
    delete players[playerId];
    freeIds.push(playerId); // 回收 ID
    broadcast({ type: 'playerLeft', player: playerId });
  });
});

// 广播函数
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
