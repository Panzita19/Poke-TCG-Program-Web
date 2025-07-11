// trade.js
const WEBSOCKET_SERVER_URL = "wss://poke-tcg-websocket-server.onrender.com"; // URL de tu servidor en Render

let ws;
let myId = null;
let myUsername = localStorage.getItem('username') || null;
let users = [];
let selectedUserId = null;
let selectedMyCard = null;
let selectedTheirCard = null;
let theirCards = [];

function connectWebSocket() {
  ws = new WebSocket(WEBSOCKET_SERVER_URL);

  ws.onopen = () => {
    if (!myUsername) {
      myUsername = prompt("Ingresa tu nombre de usuario:");
      localStorage.setItem('username', myUsername);
    }
    ws.send(JSON.stringify({ type: 'register', username: myUsername }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case 'userList':
        users = msg.users.filter(u => u.name !== myUsername);
        updateUserList();
        break;
      case 'requestUserCards':
        ws.send(JSON.stringify({
          type: 'sendUserCards',
          senderId: msg.requesterId,
          cards: storedCards
        }));
        break;
      case 'sendUserCards':
        if (msg.userId === selectedUserId) {
          theirCards = msg.cards;
          renderTheirCards();
        }
        break;
      case 'tradeProposal':
        showTradeModal(msg);
        break;
      case 'tradeConfirmed':
        handleTradeResult(msg, true);
        break;
      case 'tradeRejected':
        handleTradeResult(msg, false);
        break;
      case 'error':
        alert(msg.message);
        break;
    }
  };

  ws.onclose = () => setTimeout(connectWebSocket, 2000);
  ws.onerror = () => ws.close();
}

function updateUserList() {
  const select = document.getElementById('usuario-destino');
  const ul = document.getElementById('lista-usuarios');
  select.innerHTML = '<option value="">Selecciona usuario</option>';
  ul.innerHTML = '';
  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    select.appendChild(opt);

    const li = document.createElement('li');
    li.textContent = u.name;
    ul.appendChild(li);
  });
}

document.getElementById('usuario-destino').addEventListener('change', function () {
  selectedUserId = this.value;
  selectedTheirCard = null;
  if (selectedUserId) {
    ws.send(JSON.stringify({ type: 'requestUserCards', targetUserId: selectedUserId }));
  }
  renderTheirCards();
  updateTradeButton();
});

function renderMyCards() {
  const cont = document.getElementById('tus-cartas');
  cont.innerHTML = '';
  storedCards.forEach(cardId => {
    const card = pokemonData.find(p => p.id == cardId);
    if (!card) return;
    const div = document.createElement('div');
    div.className = 'card' + (selectedMyCard == cardId ? ' selected' : '');
    div.textContent = card.name;
    div.onclick = () => {
      selectedMyCard = cardId;
      renderMyCards();
      updateTradeButton();
    };
    cont.appendChild(div);
  });
}

function renderTheirCards() {
  const cont = document.getElementById('cartas-destino');
  cont.innerHTML = '';
  (theirCards || []).forEach(cardId => {
    const card = pokemonData.find(p => p.id == cardId);
    if (!card) return;
    const div = document.createElement('div');
    div.className = 'card' + (selectedTheirCard == cardId ? ' selected' : '');
    div.textContent = card.name;
    div.onclick = () => {
      selectedTheirCard = cardId;
      renderTheirCards();
      updateTradeButton();
    };
    cont.appendChild(div);
  });
}

function updateTradeButton() {
  const btn = document.getElementById('boton-intercambiar');
  btn.disabled = !(selectedUserId && selectedMyCard && selectedTheirCard);
}

document.getElementById('boton-intercambiar').addEventListener('click', function () {
  if (selectedUserId && selectedMyCard && selectedTheirCard) {
    ws.send(JSON.stringify({
      type: 'proposeTrade',
      senderId: myId,
      receiverId: selectedUserId,
      myCardId: selectedMyCard,
      theirCardId: selectedTheirCard,
      senderUsername: myUsername
    }));
    this.disabled = true;
  }
});

function showTradeModal(data) {
  const cardA = pokemonData.find(p => p.id == data.myCardId);
  const cardB = pokemonData.find(p => p.id == data.theirCardId);
  const modal = document.getElementById('modal-intercambio');
  modal.querySelector('.modal-body').textContent =
    `${data.senderUsername} quiere intercambiar su ${cardA.name} por tu ${cardB.name}. ¿Aceptar?`;
  modal.style.display = 'block';

  modal.querySelector('.aceptar').onclick = () => {
    ws.send(JSON.stringify({
      type: 'respondToTrade',
      senderId: data.senderId,
      receiverId: selectedUserId || myId,
      accepted: true,
      myCardId: data.theirCardId,
      theirCardId: data.myCardId
    }));
    modal.style.display = 'none';
  };
  modal.querySelector('.rechazar').onclick = () => {
    ws.send(JSON.stringify({
      type: 'respondToTrade',
      senderId: data.senderId,
      receiverId: selectedUserId || myId,
      accepted: false,
      myCardId: data.theirCardId,
      theirCardId: data.myCardId
    }));
    modal.style.display = 'none';
  };
}

function handleTradeResult(data, accepted) {
  const cardA = pokemonData.find(p => p.id == data.myCardId);
  const cardB = pokemonData.find(p => p.id == data.theirCardId);
  const modal = document.getElementById('modal-exito');
  if (accepted) {
    let cards = storedCards.filter(id => id != data.myCardId);
    cards.push(data.theirCardId);
    localStorage.setItem('storedCards', JSON.stringify(cards));
    if (typeof updateProgress === 'function') updateProgress();
    if (typeof displayPokemonList === 'function') displayPokemonList(pokemonData);
    modal.querySelector('.modal-body').textContent =
      `¡Intercambio exitoso! Ahora tienes ${cardB.name} y entregaste ${cardA.name}.`;
  } else {
    modal.querySelector('.modal-body').textContent = data.message || 'El intercambio fue rechazado.';
  }
  modal.style.display = 'block';
  setTimeout(() => { modal.style.display = 'none'; }, 3000);
  selectedMyCard = null;
  selectedTheirCard = null;
  renderMyCards();
  renderTheirCards();
  updateTradeButton();
}

window.addEventListener('DOMContentLoaded', () => {
  window.storedCards = JSON.parse(localStorage.getItem('storedCards') || '[]');
  renderMyCards();
  connectWebSocket();
  updateTradeButton();
});
