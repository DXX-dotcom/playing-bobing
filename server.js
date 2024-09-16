const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public')); // 假设前端文件在 public 文件夹中

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // 处理掷骰子请求并广播结果
        if (data.type === 'roll') {
            const results = [];
            for (let i = 0; i < 6; i++) {
                results.push(Math.floor(Math.random() * 6) + 1);
            }
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
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});