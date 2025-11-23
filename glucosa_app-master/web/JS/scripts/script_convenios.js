// script_convenios.js
// UI logic for convenios view (map, list, form)

function initConvenios() {
    // DOM elements inside injected view
    const pharmacyListContent = document.getElementById('pharmacy-list-content');
    const newPharmacyForm = document.getElementById('new-pharmacy-form');
    const formMessage = document.getElementById('form-message');
    const savePharmacyBtn = document.getElementById('save-pharmacy-btn');
    const mapContainer = document.getElementById('map-container');

    // Map state
    let mapInstance = null;
    let markersCache = {};

    // Expose UI rendering functions expected by backendConvenios
    window.displayPharmaciesUI = function(farmacias) {
        if (!pharmacyListContent) return;
        if (!farmacias || farmacias.length === 0) {
            pharmacyListContent.innerHTML = '<li class="pharmacy-item">No hay farmacias registradas.</li>';
            return;
        }

        pharmacyListContent.innerHTML = '';
        farmacias.forEach(farmacia => {
            const promosText = farmacia.promociones_descuentos || '';
            const promosArray = promosText.split(',').map(p => p.trim()).filter(p => p.length > 0);
            let promosHtml = '';
            if (promosArray.length > 0) {
                promosHtml = '<ul class="promotions-list">';
                promosArray.forEach(promo => { promosHtml += `<li>${promo}</li>`; });
                promosHtml += '</ul>';
            } else {
                promosHtml = '<p class="no-promotions">Sin promociones registradas.</p>';
            }

            const listItem = `
                <li class="pharmacy-item" data-id="${farmacia.id_farmacia}" onclick="handlePharmacyClick(${farmacia.id_farmacia})">
                    <div class="pharmacy-info">
                        <strong>${farmacia.nombre || farmacia.direccion || 'Farmacia sin nombre'}</strong>
                        <p>Dirección: ${farmacia.direccion || 'No especificada'}</p>
                        <p>Teléfono: ${farmacia.telefono || 'No especificado'}</p>
                        ${promosHtml}
                    </div>
                </li>
            `;
            pharmacyListContent.insertAdjacentHTML('beforeend', listItem);
        });
    };

    window.setupMapUI = function(farmaciasConCoords) {
        if (!mapContainer) return;

        // destroy existing map if any
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
            markersCache = {};
        }

        if (typeof L === 'undefined') {
            console.error('Leaflet (L) no está disponible. Asegúrate de que el script de Leaflet esté cargado en main_menu.html');
            // Mostrar mensaje en el contenedor si es posible
            try {
                mapContainer.innerHTML = '<div style="padding:8px;color:red;">Error: Leaflet no cargado.</div>';
            } catch (e) {}
            return;
        }

        const defaultLat = 19.4326;
        const defaultLng = -99.1332;
        mapInstance = L.map('map-container').setView([defaultLat, defaultLng], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
        }).addTo(mapInstance);

        // Ícono más pequeño para los pines
        const smallIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [20, 32],      // ancho x alto (por defecto 25x41)
            iconAnchor: [10, 32],    // punto de anclaje en la base del pin
            popupAnchor: [0, -28],   // posición del popup respecto al icono
            shadowSize: [36, 36]
        });

        const markers = [];
        farmaciasConCoords.forEach(f => {
            if (f.coords) {
                const marker = L.marker([f.coords.lat, f.coords.lng], { icon: smallIcon })
                    .bindPopup(`<strong>${f.nombre || 'Farmacia'}</strong><br>${f.direccion || ''}`)
                    .addTo(mapInstance);
                markersCache[f.id_farmacia] = marker;
                markers.push(marker);
            }
        });

        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            mapInstance.fitBounds(group.getBounds());
        }
    };

    window.handlePharmacyClick = function(id) {
        const marker = markersCache[id];
        if (marker && mapInstance) {
            mapInstance.setView(marker.getLatLng(), 15);
            marker.openPopup();
            document.querySelectorAll('.pharmacy-item').forEach(el => el.style.backgroundColor = 'white');
            const clickedItem = document.querySelector(`.pharmacy-item[data-id="${id}"]`);
            if (clickedItem) clickedItem.style.backgroundColor = '#e3f2fd';
        }
    };

    async function handleNewPharmacySubmit(e) {
        e.preventDefault();
        if (!newPharmacyForm) return;
        formMessage.textContent = '';
        savePharmacyBtn.disabled = true;
        savePharmacyBtn.textContent = 'Guardando...';

        const nombre = document.getElementById('farmacia-nombre').value.trim();
        const direccion = document.getElementById('farmacia-direccion').value.trim();
        const coordenadas = document.getElementById('farmacia-coordenadas').value.trim();
        const telefono = document.getElementById('farmacia-telefono').value.trim();
        const promociones = document.getElementById('farmacia-promociones').value.trim();

        try {
            // Asegurar backend disponible antes de intentar guardar
            await (typeof ensureBackendConveniosReady === 'function' ? ensureBackendConveniosReady(['saveNewPharmacy']) : Promise.resolve());
            if (!window.saveNewPharmacy) throw new Error('saveNewPharmacy no disponible');
            await window.saveNewPharmacy(nombre, direccion, telefono, promociones, coordenadas);
            formMessage.style.color = 'green';
            formMessage.textContent = '✅ Farmacia registrada con éxito.';
            newPharmacyForm.reset();
        } catch (error) {
            console.error('Error al guardar farmacia en UI:', error);
            formMessage.style.color = 'red';
            formMessage.textContent = `Error al registrar: ${error.message}`;
        } finally {
            savePharmacyBtn.disabled = false;
            savePharmacyBtn.textContent = 'Guardar Farmacia';
        }
    }

    if (newPharmacyForm) {
        newPharmacyForm.removeEventListener('submit', handleNewPharmacySubmit);
        newPharmacyForm.addEventListener('submit', handleNewPharmacySubmit);
    }

    // Inicializar el mapa vacío primero para dar respuesta visual inmediata
    try { window.setupMapUI([]); } catch (e) { console.warn('setupMapUI inicial falló:', e); }

    // Fallback: definir backend mínimo si aún no existe (usa window.supabaseClient)
    function defineFallbackBackendIfNeeded() {
        const needLoad = typeof window.loadAndDisplayPharmacies !== 'function';
        const needSave = typeof window.saveNewPharmacy !== 'function';
        if (!needLoad && !needSave) return;

        const sb = window.supabaseClient || (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
            ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
            : null);
        if (!sb) {
            console.warn('[Convenios Fallback] Supabase no disponible para crear funciones de backend.');
            return;
        }

        // Helper geocode simple
        async function fallbackGeocodeAddress(direccion) {
            if (!direccion || direccion.length < 10) return null;
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`;
                const r = await fetch(url);
                if (!r.ok) return null;
                const d = await r.json();
                if (Array.isArray(d) && d.length) {
                    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
                }
            } catch (e) { /* ignore */ }
            return null;
        }

        if (needLoad) {
            window.loadAndDisplayPharmacies = async function() {
                if (pharmacyListContent) {
                    pharmacyListContent.innerHTML = '<li class="pharmacy-item">Cargando farmacias...</li>';
                }
                try {
                    const { data: farmacias, error } = await sb
                        .from('farmacia')
                        .select('id_farmacia, nombre, direccion, telefono, promociones_descuentos, latitud, longitud')
                        .order('nombre', { ascending: true });
                    if (error) throw error;
                    const farmaciasConCoords = (farmacias || []).map(f => ({
                        ...f,
                        coords: (f.latitud !== null && f.longitud !== null) ? { lat: f.latitud, lng: f.longitud } : null
                    }));
                    if (typeof window.displayPharmaciesUI === 'function') window.displayPharmaciesUI(farmaciasConCoords);
                    if (typeof window.setupMapUI === 'function') window.setupMapUI(farmaciasConCoords);
                } catch (err) {
                    console.error('[Convenios Fallback] Error al cargar:', err);
                    if (pharmacyListContent) {
                        pharmacyListContent.innerHTML = `<li class="pharmacy-item" style="color:red;">Error: ${err.message}</li>`;
                    }
                }
            };
        }

        if (needSave) {
            window.saveNewPharmacy = async function(nombre, direccion, telefono, promociones, coordenadasManuales) {
                let latitud = null, longitud = null;
                if (coordenadasManuales) {
                    const parts = coordenadasManuales.split(',').map(p => p.trim());
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        latitud = parseFloat(parts[0]);
                        longitud = parseFloat(parts[1]);
                    }
                }
                if (latitud === null || longitud === null) {
                    const gc = await fallbackGeocodeAddress(direccion);
                    if (gc) { latitud = gc.lat; longitud = gc.lng; }
                }

                const newFarmacia = { nombre, direccion, telefono, promociones_descuentos: promociones, latitud, longitud };
                const { error } = await sb.from('farmacia').insert([newFarmacia]);
                if (error) throw error;
                if (typeof window.loadAndDisplayPharmacies === 'function') await window.loadAndDisplayPharmacies();
            };
        }
    }

    defineFallbackBackendIfNeeded();

    // Helper para asegurar que el backend esté disponible (carga perezosa si hace falta)
    // requiredFns puede ser: ['loadAndDisplayPharmacies'] o ['saveNewPharmacy'] o ambas
    function ensureBackendConveniosReady(requiredFns = ['loadAndDisplayPharmacies', 'saveNewPharmacy']) {
        return new Promise((resolve, reject) => {
            const ready = () => requiredFns.every(name => typeof window[name] === 'function');

            if (ready()) return resolve(true);

            // ¿Ya existe un script inyectado previamente?
            let scriptEl = document.querySelector('script[data-backend-convenios]');
            const waitForReady = (attemptsLeft = 20) => {
                if (ready()) return resolve(true);
                if (attemptsLeft <= 0) {
                    const missing = requiredFns.filter(n => typeof window[n] !== 'function');
                    return reject(new Error(`Backend de convenios no disponible (faltan: ${missing.join(', ')})`));
                }
                setTimeout(() => waitForReady(attemptsLeft - 1), 200);
            };

            if (scriptEl) {
                // Ya se está cargando/cargó; esperar a disponibilidad
                return waitForReady();
            }

            // Inyectar script como último recurso (en SPA algunas veces el orden puede variar)
            scriptEl = document.createElement('script');
            scriptEl.src = '../JS/backendConvenios.js';
            scriptEl.async = true;
            scriptEl.setAttribute('data-backend-convenios', 'true');
            scriptEl.onload = () => waitForReady();
            scriptEl.onerror = () => reject(new Error('No se pudo cargar backendConvenios.js'));
            document.head.appendChild(scriptEl);
        });
    }

    ensureBackendConveniosReady(['loadAndDisplayPharmacies'])
        .then(() => {
            try { window.loadAndDisplayPharmacies(); } catch (e) { console.error('loadAndDisplayPharmacies error:', e); }
        })
        .catch((err) => {
            console.warn('Backend convenios no disponible:', err.message);
            if (pharmacyListContent) {
                pharmacyListContent.innerHTML = `<li class="pharmacy-item" style="color:#999;">No se pudo cargar el backend de convenios. ${err && err.message ? '('+err.message+')' : ''}</li>`;
            }
        });
}

// expose init for SPA
window.initConvenios = initConvenios;

// auto init when standalone page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pharmacy-list-content')) {
        try { initConvenios(); } catch (e) { console.error('initConvenios error:', e); }
    }
});
