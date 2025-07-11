/// Conexión WebSocket
const socket = new WebSocket('ws://localhost:8080');
const usuarioActual = localStorage.getItem('nombreUsuario') || `Entrenador_${Math.floor(Math.random() * 1000)}`;

const pokemonData = window.pokemonData || [];
const storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || [];

// Estado
let usuariosConectados = [];
let misCartas = [];
let cartasOtroUsuario = [];
let cartaSeleccionada = null;
let cartaDestinoSeleccionada = null;

// Elementos UI
const listaUsuarios = document.getElementById('lista-usuarios');
const selectDestino = document.getElementById('usuario-destino');
const listaMisCartas = document.getElementById('tus-cartas');
const listaCartasDestino = document.getElementById('cartas-destino');

// Registrar usuario al cargar
socket.addEventListener('open', () => {
socket.send(JSON.stringify({
    tipo: 'registro',
    usuario: usuarioActual
    }));

  // Solicitar mis cartas al conectarse
socket.send(JSON.stringify({
    tipo: 'solicitar_mis_cartas',
    usuario: usuarioActual
    }));
});

// Manejar mensajes del servidor
socket.addEventListener('message', (event) => {
const data = JSON.parse(event.data);

switch(data.tipo) {
    case 'usuarios_conectados':
    actualizarListaUsuarios(data.usuarios);
    break;
    
    case 'mis_cartas':
    misCartas = data.cartas;
    mostrarCartas(listaMisCartas, misCartas, 'seleccionar-carta');
    break;
    
    case 'cartas_usuario':
    cartasOtroUsuario = data.cartas;
    mostrarCartas(listaCartasDestino, cartasOtroUsuario, 'seleccionar-carta-destino');
    break;
    
    case 'intercambio_exitoso':
    alert(data.mensaje);

      // Recargar tus cartas después del intercambio
    socket.send(JSON.stringify({
        tipo: 'solicitar_mis_cartas',
        usuario: usuarioActual
    }));

      // Limpiar selección
    cartaSeleccionada = null;
    cartaDestinoSeleccionada = null;
    document.getElementById('boton-intercambiar').disabled = true;
    break;
    }
});

// Actualiza la lista de usuarios conectados
function actualizarListaUsuarios(usuarios) {
    usuariosConectados = usuarios.filter(u => u !== usuarioActual);
    listaUsuarios.innerHTML = '';
    selectDestino.innerHTML = '<option value="">Selecciona un usuario</option>';

    usuariosConectados.forEach(usuario => {
    const li = document.createElement('li');
    li.textContent = usuario;
    li.addEventListener('click', () => seleccionarUsuario(usuario));
    listaUsuarios.appendChild(li);
    
    const option = document.createElement('option');
    option.value = usuario;
    option.textContent = usuario;
    selectDestino.appendChild(option);
    });
}

// Solicita cartas del usuario seleccionado
function seleccionarUsuario(usuario) {
    socket.send(JSON.stringify({
    tipo: 'solicitar_cartas',
    usuario: usuario
    }));
}

// Muestra las cartas en el contenedor correspondiente
function mostrarCartas(contenedor, cartasIds, claseSeleccion) {
    contenedor.innerHTML = '';

    cartasIds.forEach(id => {
    const pokemon = pokemonData.find(p => p.id === id);
    if (!pokemon) return;

    const carta = document.createElement('li');
    carta.className = 'carta-pokemon';
    carta.innerHTML = `
        <img src="${pokemon.sprites?.other?.['official-artwork']?.front_default || ''}" 
        alt="${pokemon.name}" 
        width="100">
        <p>${pokemon.name}</p>
        <p>#${id.toString().padStart(3, '0')}</p>
    `;
    
    carta.addEventListener('click', () => {
        document.querySelectorAll(`.${claseSeleccion}`).forEach(el => el.classList.remove(claseSeleccion));
        carta.classList.add(claseSeleccion);
        if (claseSeleccion === 'seleccionar-carta') {
        cartaSeleccionada = id;
        } else {
        cartaDestinoSeleccionada = id;
        }

        document.getElementById('boton-intercambiar').disabled = !(cartaSeleccionada && cartaDestinoSeleccionada);
    });

    contenedor.appendChild(carta);
    });
}

// Envía la solicitud de intercambio
document.getElementById('form-intercambio').addEventListener('submit', (e) => {
    e.preventDefault();

    const usuarioDestino = selectDestino.value;
    if (cartaSeleccionada && cartaDestinoSeleccionada && usuarioDestino) {
    socket.send(JSON.stringify({
    tipo: 'intercambio',
    usuarioOrigen: usuarioActual,
    usuarioDestino: usuarioDestino,
    cartaOrigen: cartaSeleccionada,
    cartaDestino: cartaDestinoSeleccionada
    }));
}
});
