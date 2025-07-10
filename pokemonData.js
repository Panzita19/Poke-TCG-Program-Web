// pokemonData.js - Manejo optimizado de datos de la PokeAPI
const TOTAL_POKEMON = 150;
const POKEAPI_URL = "https://pokeapi.co/api/v2/pokemon/";

// Cache para almacenar los datos de Pokémon
let pokemonDataCache = null;

// Función principal para cargar todos los Pokémon
async function loadAllPokemon() {
    // Si ya tenemos los datos en caché, los retornamos directamente
    if (pokemonDataCache) {
        return pokemonDataCache;
    }

    try {
        console.log("Cargando datos de Pokémon desde la API...");
        
        // 1. Primero obtenemos la lista básica de Pokémon
        const listResponse = await fetch(`${POKEAPI_URL}?limit=${TOTAL_POKEMON}`);
        const listData = await listResponse.json();
        
        // 2. Creamos un array de promesas para obtener los detalles de cada Pokémon
        const detailRequests = listData.results.map((pokemon, index) => 
            fetch(`${POKEAPI_URL}${index + 1}`).then(res => res.json())
        );
        
        // 3. Esperamos a que todas las peticiones se completen
        pokemonDataCache = await Promise.all(detailRequests);
        
        console.log(`Datos de ${pokemonDataCache.length} Pokémon cargados correctamente`);
        return pokemonDataCache;
        
    } catch (error) {
        console.error("Error al cargar los Pokémon:", error);
        throw error;
    }
}

// Función para obtener un Pokémon por ID
function getPokemonById(id) {
    if (!pokemonDataCache) {
        throw new Error("Los datos de Pokémon no han sido cargados");
    }
    return pokemonDataCache.find(p => p.id === id);
}

// Función para filtrar Pokémon por tipo
function filterByType(type) {
    if (!pokemonDataCache) {
        throw new Error("Los datos de Pokémon no han sido cargados");
    }
    return pokemonDataCache.filter(pokemon => 
        pokemon.types.some(t => t.type.name === type)
    );
}

// Función para buscar Pokémon por nombre
function searchByName(name) {
    if (!pokemonDataCache) {
        throw new Error("Los datos de Pokémon no han sido cargados");
    }
    const searchTerm = name.toLowerCase();
    return pokemonDataCache.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm)
    );
}

// Exportamos las funciones para usar en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    // Para Node.js
    module.exports = {
        loadAllPokemon,
        getPokemonById,
        filterByType,
        searchByName,
        TOTAL_POKEMON
    };
} else {
    // Para el navegador
    window.PokemonData = {
        loadAllPokemon,
        getPokemonById,
        filterByType,
        searchByName,
        TOTAL_POKEMON
    };
}