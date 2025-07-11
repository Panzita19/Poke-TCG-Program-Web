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

let storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || [];
let pokemonData = [];
let filtroActivo = "ver-todos";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
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