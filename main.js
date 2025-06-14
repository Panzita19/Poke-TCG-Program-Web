const listaPokemon = document.querySelector("#listaPokemon");
const botonesHeader = document.querySelectorAll(".btn-header");
let URL= "https://pokeapi.co/api/v2/pokemon/";
const TOTAL_POKEMON = 150;
const CARTAS_POR_SOBRE = 6;
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const btnAbrir = document.getElementById('btn-abrir');
const btnIndice = document.getElementById('btn-indice');
const btnIntercambiar = document.getElementById('btn-intercambiar');


let storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || [];
let pokemonData = [];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});


async function initApp() { //esto es pa probar lo de los sobres

    if (storedCards.length === 0) {
        unlockRandomPokemon(10);
    }
    
    await loadAllPokemon();
    setupEventListeners();
    updateProgress();
}

// Cargar todos los Pokémon
async function loadAllPokemon() {
    try {
        showLoading(true);
        
        let requests = [];
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

// Mostrar lista de Pokémon
function displayPokemonList(pokemons) {
    listaPokemon.innerHTML = '';
    
    pokemons.forEach(pokemon => {
        let isUnlocked = storedCards.includes(pokemon.id);
        let pokemonElement = createPokemonCard(pokemon, isUnlocked);
        listaPokemon.appendChild(pokemonElement);
    });
}

// Crear tarjeta de Pokémon
function createPokemonCard(pokemon, isUnlocked) {
    let tipos = pokemon.types.map(type => 
        `<p class="${type.type.name} tipo">${type.type.name.toUpperCase()}</p>`
    ).join('');

    let pokeId = pokemon.id.toString().padStart(3,'0');
    let heightInMeters = pokemon.height / 10;
    let weightInKg = pokemon.weight / 10;

    let card = document.createElement('div');
    card.classList.add('pokemon');
    if (!isUnlocked) card.classList.add('locked');
    
    card.innerHTML = `
        <p class="pokemon-id-back">#${pokeId}</p>
        <div class="pokemon-imagen">
            <img src="${pokemon.sprites.front_default}" 
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
    }
    
    return card;
}

// Mostrar detalles del Pokémon (osea la carta detallada cuando le hacemos click)
function showPokemonDetails(pokemon) {
}


function updateProgress() {
    let total = storedCards.length;
    let percentage = (total / TOTAL_POKEMON) * 100;
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${total}/${TOTAL_POKEMON}`;
}


function filterPokemonByType(type) {
    if (type === 'ver-todos') {
        displayPokemonList(pokemonData);
    } else {
        let filtered = pokemonData.filter(pokemon => 
            pokemon.types.some(t => t.type.name.includes(type))
        );
        displayPokemonList(filtered);
    }
}


function openBoosterPack() {
    let newCards = getRandomNewCards(CARTAS_POR_SOBRE);
    
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
    
    showNewCardsAnimation(newCards);
}


function getRandomNewCards(count) {
    let unlockedIds = new Set(storedCards);
    let lockedPokemon = pokemonData.filter(p => !unlockedIds.has(p.id));
    
    if (lockedPokemon.length === 0) return [];
    
    const shuffled = [...lockedPokemon].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(p => p.id);
}

//pongamos aca la animacion de las cartas 
function showNewCardsAnimation(newCardIds) {
    // Implementar animación visual (puedes usar CSS o librerías como Anime.js)
    console.log("Nuevas cartas obtenidas:", newCardIds);

    displayPokemonList(pokemonData);
    
    alert(`¡Has obtenido ${newCardIds.length} nuevas cartas!`);
}

// Desbloquear Pokémon aleatorios (para pruebas)
function unlockRandomPokemon(count) {
    const newCards = [];
    
    while (newCards.length < count && newCards.length < TOTAL_POKEMON) {
        let randomId = Math.floor(Math.random() * TOTAL_POKEMON) + 1;
        if (!newCards.includes(randomId) && !storedCards.includes(randomId)) {
            newCards.push(randomId);
        }
    }
    
    storedCards = [...storedCards, ...newCards];
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
}


function setupEventListeners() {
    botonesHeader.forEach(boton => {
        boton.addEventListener('click', () => {
            filterPokemonByType(boton.id);
        });
    });
    
    btnAbrir.addEventListener('click', openBoosterPack);
    
    btnIndice.addEventListener('click', () => {
        displayPokemonList(pokemonData);
    });
    
    btnIntercambiar.addEventListener('click', () => { //no se como hacer lo de los intercambios xd
        alert('Funcionalidad de intercambio en desarrollo');
    });
}


function showLoading(show) {
    if (show) {
        listaPokemon.innerHTML = '<div class="loading">Cargando Pokémon...</div>';
    }
}


function showError() {
    listaPokemon.innerHTML = '<div class="error">Error al cargar los Pokémon. Intenta recargar la página.</div>';
}