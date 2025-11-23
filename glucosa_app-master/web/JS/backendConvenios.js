// --- CONFIGURACIÓN DE SUPABASE ---
// Reusar cliente global si ya fue inicializado por otro script.
window.SUPABASE_URL = window.SUPABASE_URL || 'https://lxbjjvfrankabciuizsu.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
try {
    if (!window.supabaseClient) {
        if (typeof supabase === 'undefined') {
            console.error('[Convenios] Supabase SDK no está cargado todavía.');
        } else {
            window.supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }
    }
} catch (e) {
    console.error('[Convenios] Error creando cliente de Supabase:', e);
}
const supabaseClient = window.supabaseClient || null;

// --- NOTA SOBRE UI BRIDGE ---
// No capturamos referencias a elementos o funciones de UI en el momento de carga
// (la vista se inyecta dinámicamente en la SPA). En su lugar resolvemos
// `document.getElementById` y `window.displayPharmaciesUI` dentro de las funciones
// para garantizar que apunten a los elementos/funciones actuales.

// ------------------------------------------------------------------
// --- FUNCIONES DE GEOCODIFICACIÓN (Nominatim) ---
// ------------------------------------------------------------------

/**
 * Intenta obtener las coordenadas de una dirección usando Nominatim (OpenStreetMap).
 * @param {string} direccion - La dirección a buscar.
 * @returns {Promise<{lat: number, lng: number} | null>} Coordenadas o null si falla.
 */
async function geocodeAddress(direccion) {
    // Evita consultas a direcciones vacías o muy cortas
    if (!direccion || direccion.length < 10) return null; 

    // URL del API de Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en la solicitud de geocodificación: ${response.statusText}`);
        }
        const data = await response.json();

        if (data && data.length > 0) {
            // Toma el primer resultado
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error(`Error de geocodificación para "${direccion}":`, error.message);
        return null;
    }
}

// ------------------------------------------------------------------
// --- FUNCIONES CRUD Y LÓGICA PRINCIPAL ---
// ------------------------------------------------------------------

/**
 * Carga las farmacias desde Supabase, incluyendo las coordenadas guardadas, 
 * y las envía a la UI para su visualización y mapeo.
 */
async function loadAndDisplayPharmacies() {
    if (!supabaseClient) {
        const pharmacyListContentUI = document.getElementById('pharmacy-list-content');
        if (pharmacyListContentUI) {
            pharmacyListContentUI.innerHTML = '<li class="pharmacy-item" style="color:red;">Error: Supabase no inicializado.</li>';
        }
        throw new Error('Supabase no inicializado');
    }
    const pharmacyListContentUI = document.getElementById('pharmacy-list-content');
    if (pharmacyListContentUI) {
        pharmacyListContentUI.innerHTML = '<li class="pharmacy-item">Cargando farmacias...</li>';
    }

    try {
        // Seleccionamos latitud y longitud, ya guardadas previamente
        const { data: farmacias, error } = await supabaseClient
            .from('farmacia')
            .select('id_farmacia, nombre, direccion, telefono, promociones_descuentos, latitud, longitud')
            .order('nombre', { ascending: true }); 

        if (error) throw error;
        
        // Mapeamos los datos para generar el objeto 'coords' que espera el Frontend
        const farmaciasConCoords = farmacias.map(f => ({
            ...f,
            coords: (f.latitud !== null && f.longitud !== null) ? { lat: f.latitud, lng: f.longitud } : null
        }));

        // 1. Llama a la función de renderizado de la UI (lista)
        if (typeof window.displayPharmaciesUI === 'function') {
            try { window.displayPharmaciesUI(farmaciasConCoords); } catch (e) { console.error('displayPharmaciesUI error:', e); }
        }

        // 2. Llama a la función de inicialización y carga de marcadores del mapa
        if (typeof window.setupMapUI === 'function') {
            try { window.setupMapUI(farmaciasConCoords); } catch (e) { console.error('setupMapUI error:', e); }
        }

    } catch (error) {
        console.error("Error al cargar farmacias en backend:", error);
        if (pharmacyListContentUI) {
            pharmacyListContentUI.innerHTML = `<li class="pharmacy-item" style="color: red;">Error: ${error.message}</li>`;
        }
    }
}

/**
 * Guarda una nueva farmacia en Supabase, priorizando coordenadas manuales, sino geocodifica.
 * @param {string} nombre - Nombre de la farmacia.
 * @param {string} direccion - Dirección.
 * @param {string} telefono - Teléfono.
 * @param {string} promociones - Promociones separadas por coma.
 * @param {string} coordenadasManuales - Latitud,Longitud ingresada manualmente (opcional).
 */
async function saveNewPharmacy(nombre, direccion, telefono, promociones, coordenadasManuales) {
    if (!supabaseClient) {
        throw new Error('Supabase no inicializado');
    }
    let latitud = null;
    let longitud = null;
    
    // PASO 1: PROCESAR COORDENADAS MANUALES (PRIORIDAD)
    if (coordenadasManuales) {
        const parts = coordenadasManuales.split(',').map(p => p.trim());
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            latitud = parseFloat(parts[0]);
            longitud = parseFloat(parts[1]);
            console.log(`Coordenadas manuales usadas: Lat=${latitud}, Lng=${longitud}`);
        } else {
            console.warn("Formato de coordenadas manuales inválido. Intentando geocodificación por dirección.");
        }
    }

    // PASO 2: SI NO HAY COORDENADAS VÁLIDAS, INTENTAR GEOCODIFICACIÓN
    if (latitud === null || longitud === null) {
        try {
            const coords = await geocodeAddress(direccion);
            if (coords) {
                latitud = coords.lat;
                longitud = coords.lng;
                console.log(`Coordenadas obtenidas por geocodificación: Lat=${latitud}, Lng=${longitud}`);
            } else {
                console.warn(`No se pudo obtener coordenadas ni manual ni automáticamente para: ${direccion}. Guardando sin coordenadas.`);
            }
        } catch (e) {
            console.error("Error durante la geocodificación:", e);
        }
    }
    
    // PASO 3: CREAR EL OBJETO A INSERTAR
    const newFarmacia = {
        nombre: nombre, 
        direccion: direccion,
        telefono: telefono,
        promociones_descuentos: promociones,
        latitud: latitud,
        longitud: longitud
    };

    try {
        const { error } = await supabaseClient
            .from('farmacia')
            .insert([newFarmacia]);

        if (error) throw error;
        
        // Recargar la lista y el mapa después de la inserción
        await loadAndDisplayPharmacies();

    } catch (error) {
        console.error("Error al guardar farmacia en backend:", error);
        // Relanza el error para que el frontend lo capture y muestre el mensaje
        throw error;
    }
}


// --- EXPOSICIÓN GLOBAL DE FUNCIONES ---
window.loadAndDisplayPharmacies = loadAndDisplayPharmacies;
window.saveNewPharmacy = saveNewPharmacy;