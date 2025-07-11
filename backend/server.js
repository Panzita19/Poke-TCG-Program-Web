const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });
console.log("Servidor WebSocket corriendo en ws://localhost:8081");

const usuarios = {};
const cartasPorUsuario = {};

function obtenerCartasAleatorias() {
  const posiblesCartas = [1, 4, 7, 25];
  return posiblesCartas.sort(() => 0.5 - Math.random()).slice(0, 3);
}

wss.on('connection', (ws) => {
  let usuarioActual = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.tipo) {
      case 'registro':
        usuarioActual = data.usuario;
        usuarios[usuarioActual] = ws;
        
        if (!cartasPorUsuario[usuarioActual]) {
          cartasPorUsuario[usuarioActual] = obtenerCartasAleatorias();
        }

        // Notificar a todos los usuarios
        notificarUsuarios();
        
        // Enviar sus propias cartas
        ws.send(JSON.stringify({
          tipo: 'mis_cartas',
          cartas: cartasPorUsuario[usuarioActual]
        }));
        break;

      case 'solicitar_cartas':
        const destino = data.usuario;
        const cartas = cartasPorUsuario[destino] || [];
        ws.send(JSON.stringify({
          tipo: 'cartas_usuario',
          cartas
        }));
        break;

      case 'intercambio':
        const { usuarioOrigen, usuarioDestino, cartaOrigen, cartaDestino } = data;

        const cartasOrigen = cartasPorUsuario[usuarioOrigen] || [];
        const cartasDestino = cartasPorUsuario[usuarioDestino] || [];

        if (
          cartasOrigen.includes(cartaOrigen) &&
          cartasDestino.includes(cartaDestino)
        ) {
          // Realizar intercambio
          cartasPorUsuario[usuarioOrigen] = cartasOrigen.filter(c => c !== cartaOrigen).concat(cartaDestino);
          cartasPorUsuario[usuarioDestino] = cartasDestino.filter(c => c !== cartaDestino).concat(cartaOrigen);

          // Notificar éxito
          [usuarioOrigen, usuarioDestino].forEach((usuario) => {
            if (usuarios[usuario]) {
              usuarios[usuario].send(JSON.stringify({
                tipo: 'intercambio_exitoso',
                mensaje: `¡Intercambio exitoso entre ${usuarioOrigen} y ${usuarioDestino}!`
              }));

              // Actualizar cartas
              usuarios[usuario].send(JSON.stringify({
                tipo: 'mis_cartas',
                cartas: cartasPorUsuario[usuario]
              }));
            }
          });
        }
        break;
    }
  });

  ws.on('close', () => {
    if (usuarioActual) {
      delete usuarios[usuarioActual];
      notificarUsuarios();
    }
  });
});

function notificarUsuarios() {
  const lista = Object.keys(usuarios);
  const mensaje = JSON.stringify({
    tipo: 'usuarios_conectados',
    usuarios: lista
  });

  lista.forEach((usuario) => {
    usuarios[usuario].send(mensaje);
  });
}


