// server.js
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// HTTP server para handshake y CORS
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(200);
  res.end('WebSocket server running.\n');
});

const wss = new WebSocket.Server({ server });

const users = {}; // clientId: { ws, username, currentTradeOffer }

function broadcastUserList() {
  const userList = Object.entries(users).map(([id, u]) => ({
    id,
    name: u.username,
  }));
  const msg = JSON.stringify({ type: 'userList', users: userList });
  Object.values(users).forEach(u => {
    if (u.ws.readyState === 1) u.ws.send(msg);
  });
}

function sendTo(clientId, message) {
  const user = users[clientId];
  if (user && user.ws.readyState === 1) {
    user.ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  users[clientId] = { ws, username: null, currentTradeOffer: null };

  ws.on('message', (msg) => {
    let message;
    try { message = JSON.parse(msg); } catch { return; }

    switch (message.type) {
      case 'register':
        users[clientId].username = message.username;
        broadcastUserList();
        break;

      case 'requestUserCards':
        sendTo(message.targetUserId, {
          type: 'requestUserCards',
          requesterId: clientId
        });
        break;

      case 'sendUserCards':
        sendTo(message.senderId, {
          type: 'sendUserCards',
          userId: clientId,
          cards: message.cards
        });
        break;

      case 'proposeTrade':
        users[message.receiverId].currentTradeOffer = {
          from: clientId,
          myCardId: message.myCardId,
          theirCardId: message.theirCardId
        };
        sendTo(message.receiverId, {
          type: 'tradeProposal',
          senderId: clientId,
          senderUsername: message.senderUsername,
          myCardId: message.myCardId,
          theirCardId: message.theirCardId
        });
        break;

      case 'respondToTrade':
        if (users[message.senderId]) users[message.senderId].currentTradeOffer = null;
        if (users[message.receiverId]) users[message.receiverId].currentTradeOffer = null;
        if (message.accepted) {
          sendTo(message.senderId, {
            type: 'tradeConfirmed',
            myCardId: message.myCardId,
            theirCardId: message.theirCardId,
            message: '¡Intercambio realizado con éxito!'
          });
          sendTo(message.receiverId, {
            type: 'tradeConfirmed',
            myCardId: message.theirCardId,
            theirCardId: message.myCardId,
            message: '¡Intercambio realizado con éxito!'
          });
        } else {
          sendTo(message.senderId, { type: 'tradeRejected', message: 'El intercambio fue rechazado.' });
          sendTo(message.receiverId, { type: 'tradeRejected', message: 'El intercambio fue rechazado.' });
        }
        break;

      default:
        sendTo(clientId, { type: 'error', message: 'Mensaje no reconocido.' });
    }
  });

  ws.on('close', () => {
    delete users[clientId];
    broadcastUserList();
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
