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

// Cambiamos a un objeto {id: cantidad} para almacenar las cartas
let storedCards = JSON.parse(localStorage.getItem('pokemonCards')) || {};
let pokemonData = [];
let filtroActivo = "ver-todos";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Si estamos en la página de inicio
    if (document.querySelector('.pagina-inicio')) {
        const progressData = getCollectionProgress();
        const latestPokemon = getLatestPokemonUnlocked(3);
        
        // Actualizar elementos de la página de inicio
        const progressBar = document.getElementById('barra-progreso-inicio');
        const porcentajeText = document.getElementById('porcentaje-completado');
        const mensajeBienvenida = document.getElementById('mensaje-bienvenida');
        const contadorCartas = document.getElementById('contador-cartas');
        const listaUltimasCartas = document.getElementById('lista-ultimas-cartas');
        
        if (progressBar && porcentajeText && contadorCartas) {
            progressBar.style.width = `${progressData.percentage}%`;
            porcentajeText.textContent = `${Math.round(progressData.percentage)}% completado`;
            contadorCartas.textContent = `Tienes ${progressData.total} de ${TOTAL_POKEMON} Pokémon`;
        }
        
        // Mostrar últimos Pokémon capturados
        if (listaUltimasCartas) {
            if (latestPokemon.length > 0) {
                Promise.all(latestPokemon.map(id => 
                    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => res.json())
                ).then(pokemons => {
                    listaUltimasCartas.innerHTML = pokemons.map(pokemon => `
                        <div class="carta-reciente">
                            <img src="${pokemon.sprites.other['official-artwork'].front_default}" 
                                alt="${pokemon.name}"
                                title="${pokemon.name}">
                            <span>#${pokemon.id.toString().padStart(3, '0')}</span>
                        </div>
                    `).join('');
                }));
            } else {
                listaUltimasCartas.innerHTML = '<p>Aún no has capturado Pokémon</p>';
            }
        }
        
        // Escuchar actualizaciones en tiempo real
        window.addEventListener('progressUpdated', (e) => {
            if (progressBar && porcentajeText && contadorCartas) {
                progressBar.style.width = `${e.detail.percentage}%`;
                porcentajeText.textContent = `${Math.round(e.detail.percentage)}% completado`;
                contadorCartas.textContent = `Tienes ${e.detail.total} de ${TOTAL_POKEMON} Pokémon`;
            }
        });
    }
});

async function initApp() {
    if (Object.keys(storedCards).length === 0) {
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
    
    let pokemonsFiltrados = [...pokemons];
    
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
        const cantidad = storedCards[pokemon.id] || 0;
        const pokemonElement = createPokemonCard(pokemon, cantidad > 0);
        listaPokemon.appendChild(pokemonElement);
    });
    
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
    const cantidad = storedCards[pokemon.id] || 0;

    const card = document.createElement('div');
    card.classList.add('pokemon');
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
            ${cantidad > 1 ? `<div class="pokemon-cantidad">x${cantidad}</div>` : ''}
        </div>
    `;
    
    if (isUnlocked) {
        card.addEventListener('click', () => showPokemonDetails(pokemon));
        card.style.cursor = 'pointer';

        const img = card.querySelector('.pokemon-imagen img');
        if (img) {
            addCardRotationEffect(img);
        }
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

function addCardRotationEffect(img) {
    let rect;
    img.addEventListener('mouseenter', () => {
        rect = img.getBoundingClientRect();
    });
    img.addEventListener('mousemove', (e) => {
        if (!rect) rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const xOffset = (x - 0.5) * 2;
        const yOffset = (y - 0.5) * 2;
        const maxDeg = 18;
        img.style.transform = `perspective(600px) rotateY(${xOffset*maxDeg}deg) rotateX(${-yOffset*maxDeg}deg)`;
    });
    img.addEventListener('mouseleave', () => {
        img.style.transform = 'none';
    });
}

function updateProgress() {
    const totalUnlocked = Object.keys(storedCards).length;
    const totalCards = Object.values(storedCards).reduce((a, b) => a + b, 0);
    const percentage = (totalUnlocked / TOTAL_POKEMON) * 100;
    
    if (progressFill && progressText) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${totalUnlocked}/${TOTAL_POKEMON}`;
    }
    
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
    localStorage.setItem('collectionProgress', JSON.stringify({
        total: totalUnlocked,
        percentage: percentage,
        totalCards: totalCards
    }));
}

function filterPokemonByType(type) {
    filtroActivo = type;
    displayPokemonList(pokemonData);
}

function openBoosterPack() {
    const newCards = getRandomNewCards(CARTAS_POR_SOBRE);
    const newCardIds = Object.keys(newCards).map(Number);
    
    if (newCardIds.length === 0) {
        alert('¡Ya tienes todas las cartas!');
        return;
    }
    
    // Actualizar el almacenamiento
    for (const [id, cantidad] of Object.entries(newCards)) {
        storedCards[id] = (storedCards[id] || 0) + cantidad;
    }
    
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
    updateProgress();
    displayPokemonList(pokemonData);
    showBoosterModal(newCards);
}

function showBoosterModal(newCards) {
    let modal = document.getElementById('booster-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'booster-modal';
        modal.className = 'booster-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = '';
    const content = document.createElement('div');
    content.className = 'booster-modal-content';

    const title = document.createElement('h2');
    title.textContent = '¡Nuevas cartas obtenidas!';
    content.appendChild(title);

    const preview = document.createElement('div');
    preview.className = 'booster-cards-preview';
    
    Object.entries(newCards).forEach(([id, cantidad]) => {
        const poke = pokemonData.find(p => p.id === parseInt(id));
        if (poke) {
            const card = document.createElement('div');
            card.className = 'booster-card';
            card.innerHTML = `
                <img src="${poke.sprites.other['official-artwork'].front_default}" alt="${poke.name}" loading="lazy">
                <p class="booster-card-name">${poke.name} ${cantidad > 1 ? `(x${cantidad})` : ''}</p>
            `;
            preview.appendChild(card);
        }
    });
    
    content.appendChild(preview);

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
        setTimeout(() => openBoosterPack(), 200);
    };

    btns.appendChild(btnAceptar);
    btns.appendChild(btnAbrirOtro);
    content.appendChild(btns);

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
    const newCards = {};
    const allIds = Array.from({length: TOTAL_POKEMON}, (_, i) => i + 1);
    
    for (let i = 0; i < count; i++) {
        const randomId = allIds[Math.floor(Math.random() * allIds.length)];
        newCards[randomId] = (newCards[randomId] || 0) + 1;
    }
    
    return newCards;
}

function unlockRandomPokemon(count) {
    const newCards = {};
    const allIds = Array.from({length: TOTAL_POKEMON}, (_, i) => i + 1);
    const shuffled = [...allIds].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < count && i < TOTAL_POKEMON; i++) {
        const id = shuffled[i];
        newCards[id] = 1;
    }
    
    // Combinar con las cartas existentes
    for (const [id, cantidad] of Object.entries(newCards)) {
        storedCards[id] = (storedCards[id] || 0) + cantidad;
    }
    
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
    return newCards;
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
    displayPokemonList(pokemonData);
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

function resetColeccion() {
    storedCards = {};
    localStorage.setItem('pokemonCards', JSON.stringify(storedCards));
    updateProgress();
    displayPokemonList(pokemonData);
}