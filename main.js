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
const socket = new WebSocket('ws://localhost:8081');
const usuarioActual = localStorage.getItem('nombreUsuario') || `Entrenador_${Math.floor(Math.random() * 1000)}`;

// Datos globales
const URL = "https://pokeapi.co/api/v2/pokemon/";
const TOTAL_POKEMON = 150;
const CARTAS_POR_SOBRE = 6;

let storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || [];
let pokemonData = [];
let filtroActivo = "ver-todos";

// Elementos de intercambio
const intercambioUI = document.createElement('div');
intercambioUI.id = 'intercambio-ui';
intercambioUI.innerHTML = `
    <div class="intercambio-container">
        <h2>Intercambiar Cartas</h2>
        <div class="usuarios-container">
            <h3>Usuarios Conectados</h3>
            <div id="lista-usuarios" class="lista-usuarios"></div>
        </div>
        <div class="cartas-container">
            <div class="cartas-seccion">
                <h3>Tus Cartas</h3>
                <div id="cartas-usuario" class="cartas-lista"></div>
            </div>
            <div class="cartas-seccion">
                <h3>Cartas del Oponente</h3>
                <div id="cartas-otro-usuario" class="cartas-lista"></div>
            </div>
        </div>
        <div class="intercambio-acciones">
            <button id="btn-confirmar-intercambio" class="btn-intercambio">Confirmar Intercambio</button>
            <button id="btn-cancelar-intercambio" class="btn-intercambio cancelar">Cancelar</button>
        </div>
    </div>
`;
document.body.appendChild(intercambioUI);
intercambioUI.style.display = 'none';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupIntercambioUI();
});

async function initApp() {
    if (storedCards.length === 0) {
        unlockRandomPokemon(10);
    }
    
    await loadAllPokemon();
    setupEventListeners();
    updateProgress();
    
    // Configurar WebSocket
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
            tipo: 'registro',
            usuario: usuarioActual,
            cartas: storedCards
        }));
    });
    
    socket.addEventListener('error', (error) => {
        console.error('Error en WebSocket:', error);
    });
}

function setupIntercambioUI() {
    const listaUsuarios = document.getElementById('lista-usuarios');
    const cartasUsuario = document.getElementById('cartas-usuario');
    const cartasOtroUsuario = document.getElementById('cartas-otro-usuario');
    const btnConfirmar = document.getElementById('btn-confirmar-intercambio');
    const btnCancelar = document.getElementById('btn-cancelar-intercambio');
    
    let usuarioSeleccionado = null;
    let cartaSeleccionadaUsuario = null;
    let cartaSeleccionadaOtro = null;
    
    // Manejar mensajes del servidor
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.tipo) {
            case 'usuarios_conectados':
                listaUsuarios.innerHTML = data.usuarios
                    .filter(u => u !== usuarioActual)
                    .map(u => `<div class="usuario" data-user="${u}">${u}</div>`)
                    .join('');
                
                document.querySelectorAll('.usuario').forEach(el => {
                    el.addEventListener('click', () => {
                        usuarioSeleccionado = el.dataset.user;
                        socket.send(JSON.stringify({
                            tipo: 'solicitar_cartas',
                            usuario: usuarioSeleccionado
                        }));
                    });
                });
                break;
                
            case 'cartas_usuario':
                cartasOtroUsuario.innerHTML = data.cartas
                    .map(id => {
                        const pokemon = pokemonData.find(p => p.id === id);
                        if (!pokemon) return '';
                        return createCardForExchange(pokemon, false);
                    })
                    .join('');
                
                document.querySelectorAll('#cartas-otro-usuario .carta-intercambio').forEach(el => {
                    el.addEventListener('click', () => {
                        document.querySelectorAll('#cartas-otro-usuario .carta-intercambio').forEach(c => c.classList.remove('seleccionada'));
                        el.classList.add('seleccionada');
                        cartaSeleccionadaOtro = parseInt(el.dataset.carta);
                    });
                });
                break;
                
            case 'intercambio_exitoso':
                alert(data.mensaje);
                storedCards = data.cartas || storedCards;
                localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
                updateProgress();
                displayPokemonList(pokemonData);
                hideIntercambioUI();
                break;
                
            case 'mis_cartas':
                // Actualizar cartas locales si es necesario
                storedCards = data.cartas;
                localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
                updateProgress();
                displayPokemonList(pokemonData);
                break;
        }
    });
    
    // Mostrar cartas del usuario actual
    function updateUserCards() {
        cartasUsuario.innerHTML = storedCards
            .map(id => {
                const pokemon = pokemonData.find(p => p.id === id);
                if (!pokemon) return '';
                return createCardForExchange(pokemon, true);
            })
            .join('');
        
        document.querySelectorAll('#cartas-usuario .carta-intercambio').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('#cartas-usuario .carta-intercambio').forEach(c => c.classList.remove('seleccionada'));
                el.classList.add('seleccionada');
                cartaSeleccionadaUsuario = parseInt(el.dataset.carta);
            });
        });
    }
    
    updateUserCards();
    
    // Confirmar intercambio
    btnConfirmar.addEventListener('click', () => {
        if (!usuarioSeleccionado) {
            alert('Selecciona un usuario para intercambiar');
            return;
        }
        
        if (!cartaSeleccionadaUsuario) {
            alert('Selecciona una de tus cartas para intercambiar');
            return;
        }
        
        if (!cartaSeleccionadaOtro) {
            alert('Selecciona una carta del otro usuario para intercambiar');
            return;
        }
        
        socket.send(JSON.stringify({
            tipo: 'intercambio',
            usuarioOrigen: usuarioActual,
            usuarioDestino: usuarioSeleccionado,
            cartaOrigen: cartaSeleccionadaUsuario,
            cartaDestino: cartaSeleccionadaOtro
        }));
    });
    
    btnCancelar.addEventListener('click', hideIntercambioUI);
}

function createCardForExchange(pokemon, isUserCard) {
    const pokeId = pokemon.id.toString().padStart(3, '0');
    return `
        <div class="carta-intercambio ${isUserCard ? 'tu-carta' : 'oponente-carta'}" data-carta="${pokemon.id}">
            <div class="pokemon-imagen">
                <img src="${pokemon.sprites.other['official-artwork'].front_default}" 
                    alt="${pokemon.name}"
                    loading="lazy">
            </div>
            <div class="pokemon-info">
                <p class="pokemon-id">#${pokeId}</p>
                <h3 class="pokemon-nombre">${pokemon.name}</h3>
            </div>
        </div>
    `;
}

function showIntercambioUI() {
    intercambioUI.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Actualizar lista de usuarios
    socket.send(JSON.stringify({
        tipo: 'solicitar_usuarios'
    }));
    
    // Actualizar cartas del usuario
    const cartasUsuario = document.getElementById('cartas-usuario');
    cartasUsuario.innerHTML = storedCards
        .map(id => {
            const pokemon = pokemonData.find(p => p.id === id);
            if (!pokemon) return '';
            return createCardForExchange(pokemon, true);
        })
        .join('');
}

function hideIntercambioUI() {
    intercambioUI.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function initApp() {
    if (storedCards.length === 0) {
        unlockRandomPokemon(10);
    }
    
    await loadAllPokemon();
    setupEventListeners();
    updateProgress();
    

    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
            tipo: 'registro',
            usuario: usuarioActual,
            cartas: storedCards
        }));
    });
    
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
    
    // Aplicar filtros combinados
    let pokemonsFiltrados = [...pokemons];
    
    // Filtrar por tipo si no es "ver-todos"
    if (filtroActivo !== "ver-todos") {
        pokemonsFiltrados = pokemonsFiltrados.filter(pokemon => 
            pokemon.types.some(t => t.type.name.includes(filtroActivo))
        );
    }
    
    // Filtrar por nombre si hay texto en la búsqueda
    const textoBusqueda = barraBusqueda.value.toLowerCase();
    if (textoBusqueda) {
        pokemonsFiltrados = pokemonsFiltrados.filter(pokemon => 
            pokemon.name.toLowerCase().includes(textoBusqueda)
        );
    }
    
    // Mostrar Pokémon filtrados
    pokemonsFiltrados.forEach(pokemon => {
        const isUnlocked = storedCards.includes(pokemon.id);
        const pokemonElement = createPokemonCard(pokemon, isUnlocked);
        listaPokemon.appendChild(pokemonElement);
    });
    
    // Mostrar mensaje si no hay resultados
    if (pokemonsFiltrados.length === 0) {
        listaPokemon.innerHTML = '<div class="sin-resultados">No se encontraron Pokémon</div>';
    }
}

function createPokemonCard(pokemon, isUnlocked) {
    const tipos = pokemon.types.map(type => 
        `<p class="${type.type.name} tipo">${type.type.name.toUpperCase()}</p>`
    ).join('');

    const pokeId = pokemon.id.toString().padStart(3, '0');
    const heightInMeters = (pokemon.height / 10).toFixed(1);
    const weightInKg = (pokemon.weight / 10).toFixed(1);

    const card = document.createElement('div');
    card.classList.add('pokemon');
    card.dataset.id = pokemon.id;
    if (!isUnlocked) card.classList.add('locked');
    
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
                <h2 class="pokemon-nombre">${isUnlocked ? pokemon.name : '???'}</h2>
            </div>
            ${isUnlocked ? `<div class="pokemon-tipos">${tipos}</div>` : ''}
            ${isUnlocked ? `
            <div class="pokemon-stats">
                <p class="stat">${heightInMeters}m</p>
                <p class="stat">${weightInKg}kg</p>
            </div>` : ''}
        </div>
    `;
    
    if (isUnlocked) {
        card.addEventListener('click', () => showPokemonDetails(pokemon));
        card.style.cursor = 'pointer';
    }
    
    return card;
}

function showPokemonDetails(pokemon) {
    document.getElementById('modal-pokemon-name').textContent = pokemon.name;
    document.getElementById('modal-pokemon-id').textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    const imgUrl = pokemon.sprites.other['official-artwork'].front_default;
    const modalImage = document.getElementById('modal-pokemon-image');
    modalImage.src = imgUrl;
    modalImage.alt = pokemon.name;
    
    const typesContainer = document.getElementById('modal-pokemon-types');
    typesContainer.innerHTML = pokemon.types.map(type => `
        <p class="${type.type.name} tipo">${type.type.name.toUpperCase()}</p>
    `).join('');
    
    document.getElementById('modal-pokemon-height').textContent = `${(pokemon.height / 10).toFixed(1)}m`;
    document.getElementById('modal-pokemon-weight').textContent = `${(pokemon.weight / 10).toFixed(1)}kg`;
    
    const statsContainer = document.getElementById('modal-pokemon-stats');
    statsContainer.innerHTML = pokemon.stats.map(stat => `
        <div class="stat-item">
            <span class="stat-name">${stat.stat.name.replace('-', ' ')}</span>
            <span class="stat-value">${stat.base_stat}</span>
            <div class="stat-bar">
                <div class="stat-bar-fill" style="width: ${(stat.base_stat / 255) * 100}%"></div>
            </div>
        </div>
    `).join('');
    
    const abilitiesContainer = document.getElementById('modal-pokemon-abilities');
    abilitiesContainer.innerHTML = pokemon.abilities.map(ability => `
        <span class="ability">${ability.ability.name.replace('-', ' ')}</span>
    `).join('');
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function setupModalEvents() {
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

function updateProgress() {
    const total = storedCards.length;
    const percentage = (total / TOTAL_POKEMON) * 100;
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${total}/${TOTAL_POKEMON}`;
}

function filterPokemonByType(type) {
    filtroActivo = type;
    displayPokemonList(pokemonData);
}

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
    
    socket.send(JSON.stringify({
        tipo: 'actualizar_cartas',
        usuario: usuarioActual,
        cartas: storedCards
    }));
 
    
    updateProgress();
    displayPokemonList(pokemonData);
    alert(`¡Has obtenido ${newCards.length} nuevas cartas!`);
}

function getRandomNewCards(count) {
    const unlockedIds = new Set(storedCards);
    const lockedPokemon = pokemonData.filter(p => !unlockedIds.has(p.id));
    
    if (lockedPokemon.length === 0) return [];
    
    const shuffled = [...lockedPokemon].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(p => p.id);
}

function unlockRandomPokemon(count) {
    const newCards = [];
    
    while (newCards.length < count && newCards.length < TOTAL_POKEMON) {
        const randomId = Math.floor(Math.random() * TOTAL_POKEMON) + 1;
        if (!newCards.includes(randomId) && !storedCards.includes(randomId)) {
            newCards.push(randomId);
        }
    }
    
    storedCards = [...storedCards, ...newCards];
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
}

function showLoading(show) {
    if (show) {
        listaPokemon.innerHTML = '<div class="loading">Cargando Pokémon...</div>';
    }
}

function showError() {
    listaPokemon.innerHTML = '<div class="error">Error al cargar los Pokémon. Intenta recargar la página.</div>';
}



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
    
    btnIntercambiar.addEventListener('click', showIntercambioUI);
    
    setupModalEvents();
    
    barraBusqueda.addEventListener("input", () => displayPokemonList(pokemonData));
    botonBuscar.addEventListener("click", () => displayPokemonList(pokemonData));
}


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
