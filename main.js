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

const URL = "https://pokeapi.co/api/v2/pokemon/";
const TOTAL_POKEMON = 150;
const CARTAS_POR_SOBRE = 6;

window.storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || [];
window.pokemonData = [];
let filtroActivo = "ver-todos";

document.addEventListener('DOMContentLoaded', () => {
    // Solo ejecuta la lógica principal si existe #listaPokemon (página principal)
    if (document.querySelector('#listaPokemon')) {
        initApp();
    } else {
        // Si estamos en intercambio.html, solo carga los datos si no están cargados
        if (!window.pokemonData || window.pokemonData.length === 0) {
            loadAllPokemon();
        }
    }
});

// Función principal de inicialización (osea si es primera vez que usas la app empiezas con 10 cartas desbloqueadas)
async function initApp() {
    if (storedCards.length === 0) {
        unlockRandomPokemon(10);
    }
    
    await loadAllPokemon();
    setupEventListeners();
    updateProgress();
}

//cargo los pokemons de la api
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
    const listaPokemon = document.querySelector('#listaPokemon');
    if (!listaPokemon) return;
    listaPokemon.innerHTML = '';
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

//crea los iconos de la pokedex
function createPokemonCard(pokemon, isUnlocked) {
    const tipos = pokemon.types.map(type => 
        `<p class="${type.type.name} tipo">${type.type.name.toUpperCase()}</p>`
    ).join('');

    const pokeId = pokemon.id.toString().padStart(3, '0');
    const heightInMeters = (pokemon.height / 10).toFixed(1);
    const weightInKg = (pokemon.weight / 10).toFixed(1);

    // divide los pokemons en desbloqueados y bloqueados (los bloqueados en blanco y negro)
    const card = document.createElement('div');
    card.classList.add('pokemon');
    if (!isUnlocked) card.classList.add('locked');
    
    //coge los datos que necesita de PokeAPI
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
    
    //si esta desbloqueada muestra los datos (peso, tamaño, tipo bla bla bla)
    if (isUnlocked) {
        card.addEventListener('click', () => showPokemonDetails(pokemon));
        card.style.cursor = 'pointer';

        // Efecto de rotación en la imagen de la carta
        const img = card.querySelector('.pokemon-imagen img');
        if (img) {
            addCardRotationEffect(img);
        }
    }
    return card;
}

//los datos de cuando le haces zoom a la carta
function showPokemonDetails(pokemon) {
    document.getElementById('modal-pokemon-name').textContent = pokemon.name;
    document.getElementById('modal-pokemon-id').textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    const imgUrl = pokemon.sprites.other['official-artwork'].front_default;
    const modalImage = document.getElementById('modal-pokemon-image');
    modalImage.src = imgUrl;
    modalImage.alt = pokemon.name;

    // Efecto de rotación en la imagen del modal
    addCardRotationEffect(modalImage);
    
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

// Efecto de rotación 3D en imágenes de cartas
function addCardRotationEffect(img) {
    let rect;
    img.addEventListener('mouseenter', () => {
        rect = img.getBoundingClientRect();
    });
    img.addEventListener('mousemove', (e) => {
        if (!rect) rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const xOffset = (x - 0.5) * 2; // -1 a 1
        const yOffset = (y - 0.5) * 2; // -1 a 1
        const maxDeg = 18;
        img.style.transform = `perspective(600px) rotateY(${xOffset*maxDeg}deg) rotateX(${-yOffset*maxDeg}deg)`;
    });
    img.addEventListener('mouseleave', () => {
        img.style.transform = 'none';
    });
}

//actualizas la barrita de progreso
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
    updateProgress();
    displayPokemonList(pokemonData);
    showBoosterModal(newCards);
}

// Modal para mostrar las cartas obtenidas en el sobre
function showBoosterModal(cardIds) {
    let modal = document.getElementById('booster-modal');
    if (!modal) {
        // Si no existe el div, lo creamos (fallback)
        modal = document.createElement('div');
        modal.id = 'booster-modal';
        modal.className = 'booster-modal';
        document.body.appendChild(modal);
    }
    // Limpiar contenido anterior
    modal.innerHTML = '';

    // Modal content
    const content = document.createElement('div');
    content.className = 'booster-modal-content';

    // Título
    const title = document.createElement('h2');
    title.textContent = '¡Nuevas cartas obtenidas!';
    content.appendChild(title);

    // Vista previa de cartas
    const preview = document.createElement('div');
    preview.className = 'booster-cards-preview';
    cardIds.forEach(id => {
        const poke = pokemonData.find(p => p.id === id);
        if (poke) {
            const card = document.createElement('div');
            card.className = 'booster-card';
            card.innerHTML = `
                <img src="${poke.sprites.other['official-artwork'].front_default}" alt="${poke.name}" loading="lazy">
                <p class="booster-card-name">${poke.name}</p>
            `;
            preview.appendChild(card);
        }
    });
    content.appendChild(preview);

    // Botones
    const btns = document.createElement('div');
    btns.className = 'booster-btns';

    const btnAceptar = document.createElement('button');
    btnAceptar.className = 'booster-btn aceptar';
    btnAceptar.textContent = 'Aceptar';
    btnAceptar.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    const btnAbrirOtro = document.createElement('button');
    btnAbrirOtro.className = 'booster-btn abrir-otro';
    btnAbrirOtro.textContent = 'Abrir otro sobre';
    btnAbrirOtro.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        setTimeout(() => openBoosterPack(), 200); // Pequeño delay para evitar doble modal
    };

    btns.appendChild(btnAceptar);
    btns.appendChild(btnAbrirOtro);
    content.appendChild(btns);

    // Cerrar modal al hacer click fuera del contenido
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    modal.appendChild(content);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
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

function filtrarPorNombre() {
    displayPokemonList(pokemonData); // Esta función ahora maneja todos los filtros
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
        
    setupModalEvents();

    barraBusqueda.addEventListener("input", filtrarPorNombre);
    botonBuscar.addEventListener("click", filtrarPorNombre);
}
// Reinicia la colección de cartas a 0 y actualiza la vista
function resetColeccion() {
    storedCards = [];
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
    updateProgress();
    displayPokemonList(pokemonData);
}