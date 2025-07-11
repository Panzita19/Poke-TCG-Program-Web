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
    // Tomar el nombre del input
    const input = document.getElementById('usuario-origen');
    myUsername = input.value.trim() || localStorage.getItem('username') || '';
    if (!myUsername) {
      input.focus();
      input.addEventListener('change', () => {
        myUsername = input.value.trim();
        localStorage.setItem('username', myUsername);
        ws.send(JSON.stringify({ type: 'register', username: myUsername }));
      }, { once: true });
      return;
    }
    localStorage.setItem('username', myUsername);
    ws.send(JSON.stringify({ type: 'register', username: myUsername }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'userList') {
      users = msg.users.filter(u => u.name !== myUsername);
      updateUserList();
    } else if (msg.type === 'requestUserCards') {
      ws.send(JSON.stringify({
        type: 'sendUserCards',
        senderId: msg.requesterId,
        cards: storedCards
      }));
    } else if (msg.type === 'sendUserCards') {
      if (msg.userId === selectedUserId) {
        theirCards = msg.cards;
        renderTheirCards();
      }
    } else if (msg.type === 'tradeProposal') {
      showTradeModal(msg);
    } else if (msg.type === 'tradeConfirmed') {
      handleTradeResult(msg, true);
    } else if (msg.type === 'tradeRejected') {
      handleTradeResult(msg, false);
    } else if (msg.type === 'error') {
      alert(msg.message);
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
    div.className = 'mini-card' + (selectedMyCard == cardId ? ' selected' : '');
    div.innerHTML = `
      <img src="${card.sprites?.other['official-artwork'].front_default}" alt="${card.name}" class="mini-card-img" />
      <span class="mini-card-name">${card.name}</span>
      <span class="mini-card-types">${card.types.map(t => t.type.name).join(', ')}</span>
    `;
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
    div.className = 'mini-card' + (selectedTheirCard == cardId ? ' selected' : '');
    div.innerHTML = `
      <img src="${card.sprites?.other['official-artwork'].front_default}" alt="${card.name}" class="mini-card-img" />
      <span class="mini-card-name">${card.name}</span>
      <span class="mini-card-types">${card.types.map(t => t.type.name).join(', ')}</span>
    `;
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

function waitForPokemonData(callback) {
  if (window.pokemonData && window.pokemonData.length > 0) {
    callback();
  } else {
    setTimeout(() => waitForPokemonData(callback), 100);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  waitForPokemonData(() => {
    renderMyCards();
    connectWebSocket();
    updateTradeButton();
  });
});
