// main.js - Versión mejorada con diseño de cartas e intercambio WebSocket
const listaPokemon = document.querySelector("#listaPokemon");
const botonesHeader = document.querySelectorAll(".btn-header");
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const btnAbrir = document.getElementById('btn-abrir');
const btnIndice = document.getElementById('btn-indice');
const btnIntercambiar = document.getElementById('btn-intercambiar');
const modal = document.getElementById('pokemon-modal');
const closeModal = document.querySelector('.close-modal');
const barraBusqueda = document.getElementById("barra-busqueda");
const botonBuscar = document.getElementById("boton-buscar");

// Conexión WebSocket
const socket = new WebSocket('ws://localhost:8080');
const usuarioActual = localStorage.getItem('nombreUsuario') || `Entrenador_${Math.floor(Math.random() * 1000)}`;

// Datos globales
const URL = "https://pokeapi.co/api/v2/pokemon/";
const TOTAL_POKEMON = 150;
const CARTAS_POR_SOBRE = 6;

let storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || [];
let pokemonData = [];
let filtroActivo = "ver-todos";

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupEventListeners();
    
    // Registro WebSocket
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
            tipo: 'registro',
            usuario: usuarioActual,
            cartas: storedCards
        }));
    });
});

async function initApp() {
    if (storedCards.length === 0) {
        unlockRandomPokemon(10);
    }
    
    await loadAllPokemon();
    setupEventListeners();
    updateProgress();
}

async function loadAllPokemon() {
    try {
        showLoading(true);
        
        const requests = [];
        for (let i = 1; i <= TOTAL_POKEMON; i++) {
            requests.push(fetch(URL + i).then(res => res.json()));
        }
        pokemonData = await Promise.all(requests);
        
        displayPokemonList(pokemonData);
        
    } catch (error) {
        console.error("Error al cargar Pokémon:", error);
        showError();
    } finally {
        showLoading(false);
    }
}

function displayPokemonList(pokemons) {
    listaPokemon.innerHTML = '';
    
    let pokemonsFiltrados = pokemons.filter(p => storedCards.includes(p.id));
    
    if (filtroActivo !== "ver-todos") {
        pokemonsFiltrados = pokemonsFiltrados.filter(pokemon => 
            pokemon.types.some(t => t.type.name.includes(filtroActivo))
        );
    }
    
    const textoBusqueda = barraBusqueda.value.toLowerCase();
    if (textoBusqueda) {
        pokemonsFiltrados = pokemonsFiltrados.filter(pokemon => 
            pokemon.name.toLowerCase().includes(textoBusqueda)
        );
    }
    
    pokemonsFiltrados.forEach(pokemon => {
        const pokemonElement = createPokemonCard(pokemon);
        listaPokemon.appendChild(pokemonElement);
    });
    
    if (pokemonsFiltrados.length === 0) {
        listaPokemon.innerHTML = '<div class="sin-resultados">No se encontraron Pokémon</div>';
    }
}

function createPokemonCard(pokemon) {
    const tipos = pokemon.types.map(type => 
        `<p class="${type.type.name} tipo">${type.type.name.toUpperCase()}</p>`
    ).join('');

    const pokeId = pokemon.id.toString().padStart(3, '0');
    const heightInMeters = (pokemon.height / 10).toFixed(1);
    const weightInKg = (pokemon.weight / 10).toFixed(1);

    const card = document.createElement('div');
    card.classList.add('pokemon');
    card.dataset.id = pokemon.id;
    
    card.innerHTML = `
        <p class="pokemon-id-back">#${pokeId}</p>
        <div class="pokemon-imagen">
            <img src="${pokemon.sprites.other['official-artwork'].front_default}" 
                alt="${pokemon.name}"
                loading="lazy">
        </div>
        <div class="pokemon-info">
            <div class="nombre-contenedor">
                <p class="pokemon-id">#${pokeId}</p>
                <h2 class="pokemon-nombre">${pokemon.name}</h2>
            </div>
            <div class="pokemon-tipos">${tipos}</div>
            <div class="pokemon-stats">
                <p class="stat">${heightInMeters}m</p>
                <p class="stat">${weightInKg}kg</p>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showPokemonDetails(pokemon));
    return card;
}

// Resto de funciones (showPokemonDetails, setupModalEvents, updateProgress) se mantienen igual

function openBoosterPack() {
    const newCards = getRandomNewCards(CARTAS_POR_SOBRE);
    
    if (newCards.length === 0) {
        alert('¡Ya tienes todas las cartas!');
        return;
    }
    
    newCards.forEach(id => {
        if (!storedCards.includes(id)) {
            storedCards.push(id);
        }
    });
    
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
    
    // Notificar al servidor sobre nuevas cartas
    socket.send(JSON.stringify({
        tipo: 'actualizar_cartas',
        usuario: usuarioActual,
        cartas: storedCards
    }));
    
    updateProgress();
    displayPokemonList(pokemonData);
    alert(`¡Has obtenido ${newCards.length} nuevas cartas!`);
}

// Manejo de mensajes WebSocket
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    if (data.tipo === 'intercambio_exitoso') {
        // Actualizar cartas locales
        storedCards = data.nuevasCartas;
        localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
        
        // Mostrar notificación
        alert(`Intercambio exitoso! Recibiste: ${data.cartaRecibida.nombre}`);
        
        // Actualizar vista
        updateProgress();
        displayPokemonList(pokemonData);
    }
});

function setupEventListeners() {
    botonesHeader.forEach(boton => {
        boton.addEventListener('click', () => {
            filterPokemonByType(boton.id);
        });
    });
    
    btnAbrir.addEventListener('click', openBoosterPack);
    
    btnIndice.addEventListener('click', () => {
        filtroActivo = "ver-todos";
        barraBusqueda.value = "";
        displayPokemonList(pokemonData);
    });
    
    btnIntercambiar.addEventListener('click', () => {
        window.location.href = 'intercambio.html';
    });
    
    setupModalEvents();
    barraBusqueda.addEventListener("input", () => displayPokemonList(pokemonData));
    botonBuscar.addEventListener("click", () => displayPokemonList(pokemonData));
}