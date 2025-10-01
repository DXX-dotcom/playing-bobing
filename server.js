// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静态文件托管（public 文件夹里放 index.html 和骰子图片）
app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
  console.log('✅ 有玩家连接进来');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'roll') {
      // 掷 6 个骰子
      let results = [];
      for (let i = 0; i < 6; i++) {
        results.push(Math.floor(Math.random() * 6) + 1);
      }

      // 广播结果给所有客户端
      const response = {
        type: 'roll',
        player: data.player,
        results: results
      };

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(response));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('❌ 玩家断开连接');
  });
});

// Render 必须用 process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 服务器已启动在端口 ${PORT}`);
});
