// Nota: Este archivo fue refactorizado para permitir inicialización manual
// cuando la plantilla `mis_pacientes.html` se carga dinámicamente en el SPA.

// Colocar stubs en window para que otros scripts (backend) puedan referenciar
// las funciones incluso antes de que la vista se inicialice. Los stubs serán
// reemplazados por las implementaciones reales cuando se llame a initMisPacientes().
window.mostrarPacientesUI = window.mostrarPacientesUI || function () { console.warn('mostrarPacientesUI no inicializado aún'); };
window.llenarPerfilModalUI = window.llenarPerfilModalUI || function () { console.warn('llenarPerfilModalUI no inicializado aún'); };
window.mostrarErrorListaUI = window.mostrarErrorListaUI || function () { console.warn('mostrarErrorListaUI no inicializado aún'); };
window.limpiarYMostrarCargaModal = window.limpiarYMostrarCargaModal || function () { console.warn('limpiarYMostrarCargaModal no inicializado aún'); };
window.handleFilterChange = window.handleFilterChange || function () { console.warn('handleFilterChange no inicializado aún'); };
window.calcularEdad = window.calcularEdad || function () { console.warn('calcularEdad no inicializado aún'); return null; };
window.getEstadoGlucosaDetallado = window.getEstadoGlucosaDetallado || function () { console.warn('getEstadoGlucosaDetallado no inicializado aún'); return { texto: 'Desconocido', clase: '' }; };
window.formatearFechaSimple = window.formatearFechaSimple || function (d) { return d || 'N/A'; };
// Stub para el manejador global del cambio de estado (archivar/reactivar)
window.handleCambioEstado = window.handleCambioEstado || function () { console.warn('handleCambioEstado no inicializado aún'); };

function initMisPacientes() {
    // --- DOM ELEMENTS ---
    const pacientesContainer = document.getElementById('pacientes-container');
    const loadingElement = document.getElementById('loading-message');
    const inactivosContainer = document.getElementById('inactivos-container');
    const loadingInactivos = document.getElementById('loading-inactivos');
    const profileModal = document.getElementById('patient-profile-modal');
    const closeProfileModalBtn = document.getElementById('close-profile-modal');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    // --- FUNCIONES DE LA UI: MOSTRAR/LIMPIAR/MANEJO DE EVENTOS (Expuestas a Window) ---
    function getEstadoGlucosaSimple(glucosa) {
        const detalle = getEstadoGlucosaDetallado(glucosa);
        if (detalle.clase === 'status-ok') return { texto: 'Normal', clase: detalle.clase };
        return detalle;
    }

    window.mostrarPacientesUI = function (pacientes, containerElement, loadInactive = false) {
        const loader = loadInactive ? loadingInactivos : loadingElement;
        if (loader) loader.style.display = 'none';

        if (!pacientes || pacientes.length === 0) {
            containerElement.innerHTML = `<p class="loading">${loadInactive ? 'No hay pacientes inactivos archivados.' : 'No tienes pacientes activos asignados.'}</p>`;
            return;
        }

        containerElement.innerHTML = '';

        pacientes.forEach(paciente => {
            const estadoInfo = getEstadoGlucosaSimple(paciente.ultima_medida_glucosa);
            const isActivo = paciente.activo === true || paciente.activo === null;

            const actionButtonText = isActivo ? 'Archivar' : 'Reactivar';
            const actionButtonClass = isActivo ? 'change-status-btn' : 'change-status-btn reactivate';

            const tarjetaHTML = `
                <div class="patient-card ${loadInactive ? 'inactive' : ''}" 
                    data-paciente-id="${paciente.id_paciente}">
                    <h3>${paciente.nombre_completo || 'N/A'}</h3>
                    <span class="btn-add-note" data-paciente-id="${paciente.id_paciente}">📝</span>
                    <p>Email: ${paciente.correo || 'N/A'}</p>
                    <p>Última medición:
                        <span class="data-highlight">
                            ${paciente.ultima_medida_glucosa ? paciente.ultima_medida_glucosa + ' mg/dL' : 'N/A'}
                        </span>
                    </p>
                    <p>Estado Glucosa: <span class="${estadoInfo.clase}">${estadoInfo.texto}</span></p>
                    
                    <div class="patient-actions">
                        <button class="${actionButtonClass}" 
                                        onclick="handleCambioEstado(${paciente.id_paciente}, ${isActivo})">
                            ${actionButtonText}
                        </button>
                        <button class="view-profile-btn" 
                                        onclick="mostrarPerfilModal(${paciente.id_paciente})">
                            Ver Perfil Completo
                        </button>
                    </div>
                </div>
            `;
            containerElement.innerHTML += tarjetaHTML;
        });
    }

    window.llenarPerfilModalUI = function (paciente) {
        limpiarYMostrarCargaModal(false);

        const edad = calcularEdad(paciente.fecha_nacimiento);
        const estadoGlucosaInfo = getEstadoGlucosaDetallado(paciente.ultima_medida_glucosa);

        document.getElementById('profile-paciente-id').value = paciente.id_paciente;
        document.getElementById('profile-nombre').textContent = paciente.nombre_completo || 'N/A';
        document.getElementById('profile-correo').textContent = paciente.correo || 'N/A';
        document.getElementById('profile-fecha-nacimiento').textContent = paciente.fecha_nacimiento ? formatearFechaSimple(paciente.fecha_nacimiento) : 'N/A';
        document.getElementById('profile-edad').textContent = edad !== null ? `${edad} años` : 'N/A';
        document.getElementById('profile-glucosa').textContent = paciente.ultima_medida_glucosa ? `${paciente.ultima_medida_glucosa} mg/dL` : 'Sin registro';

        const estadoEl = document.getElementById('profile-estado');
        estadoEl.textContent = estadoGlucosaInfo.texto;
        estadoEl.className = `profile-data-value ${estadoGlucosaInfo.clase}`;

        document.getElementById('profile-altura').textContent = paciente.altura ? `${(paciente.altura * 100).toFixed(0)} cm` : 'N/A';
        document.getElementById('profile-peso').textContent = paciente.peso ? `${paciente.peso} kg` : 'N/A';

        // Iniciar con un filtro por defecto (Última Semana)
        handleFilterChange('week');
        const fw = document.getElementById('filter-week'); if (fw) fw.checked = true;
    }

    window.mostrarErrorListaUI = function (mensaje, isInactiveSection = false) {
        const container = isInactiveSection ? inactivosContainer : pacientesContainer;
        const loader = isInactiveSection ? loadingInactivos : loadingElement;

        if (loader) loader.style.display = 'none';
        if (container) container.innerHTML = `<p class="error" style="color: red; grid-column: 1 / -1;">${mensaje}</p>`;
    }

    async function handleCambioEstado(pacienteId, esActivoActual) {
        const password = prompt("Ingresa la contraseña 'continuar' para cambiar el estado:");
        if (!password) return;

        if (password.toLowerCase() !== 'continuar') {
            alert("Contraseña incorrecta. Estado no cambiado.");
            return;
        }

        try {
            await cambiarEstadoPaciente(pacienteId, esActivoActual);

            alert(`✅ Estado del paciente ID ${pacienteId} cambiado.`);

        } catch (error) {
            console.error('Error al cambiar estado en la UI:', error);
            alert(`Error al cambiar el estado: ${error.message}`);
        }
    }

    // Exponer la función al scope global para que los botones con onclick inline la encuentren
    window.handleCambioEstado = handleCambioEstado;

    // --- LÓGICA DE INICIALIZACIÓN ---
    (function initSequence() {
        const currentDoctorId = localStorage.getItem('doctorId');

        if (!currentDoctorId) {
            mostrarErrorListaUI("Error: Sesión no válida. Inicia sesión de nuevo.");
            return;
        }

        // EXPOSICIÓN GLOBAL DE ELEMENTOS DOM PARA EL BACKEND
        window.pacientesContainer = pacientesContainer;
        window.inactivosContainer = inactivosContainer;
        window.profileModal = profileModal;
        window.loadingElement = loadingElement;
        window.loadingInactivos = loadingInactivos;

        // 🚨 EXPOSICIÓN de elementos para que el backend pueda ocultar/usar el contenedor 🚨
        window.glucoseChartCanvas = document.getElementById('glucoseChart');
        window.graphContainer = document.getElementById('graph-container');

        // Reintentos para esperar a que backendPacientes defina iniciarCargaDePacientes (SPA, orden de scripts)
        let attempts = 0;
        const maxAttempts = 10; // ~2s total (10 * 200ms)
        let dynamicLoadTried = false;

        function loadBackendScript(callback) {
            if (dynamicLoadTried) return; // evitar múltiples inyecciones
            dynamicLoadTried = true;
            const script = document.createElement('script');
            // Ruta relativa desde main_menu.html hacia backendPacientes.js
            script.src = '../JS/backendPacientes.js';
            script.async = true;
            script.onload = () => {
                console.log('[mis_pacientes] backendPacientes.js cargado dinámicamente.');
                if (typeof callback === 'function') callback();
            };
            script.onerror = () => {
                mostrarErrorListaUI('Error cargando backendPacientes.js dinámicamente.', false);
            };
            document.head.appendChild(script);
        }

        function tryInit() {
            attempts++;
            if (typeof window.iniciarCargaDePacientes === 'function') {
                console.log('[mis_pacientes] iniciarCargaDePacientes disponible en intento', attempts);
                window.iniciarCargaDePacientes(currentDoctorId);
                return;
            }

            if (attempts < maxAttempts) {
                // A mitad de los reintentos, probar carga dinámica si aún no existe
                if (attempts === Math.ceil(maxAttempts / 2) && !dynamicLoadTried) {
                    console.warn('[mis_pacientes] iniciarCargaDePacientes no encontrada; intentando carga dinámica de backendPacientes.js');
                    loadBackendScript(() => setTimeout(tryInit, 250));
                    return;
                }
                setTimeout(tryInit, 200);
            } else {
                // Último recurso: si nunca se definió tras carga dinámica
                if (!dynamicLoadTried) {
                    console.warn('[mis_pacientes] Último intento previo a carga dinámica forzada.');
                    loadBackendScript(() => setTimeout(() => {
                        if (typeof window.iniciarCargaDePacientes === 'function') {
                            window.iniciarCargaDePacientes(currentDoctorId);
                        } else {
                            mostrarErrorListaUI('Error de inicialización: backend no disponible incluso tras carga dinámica.', false);
                        }
                    }, 300));
                } else {
                    mostrarErrorListaUI('Error de inicialización: backend no disponible tras reintentos y carga dinámica.', false);
                }
            }
        }
        tryInit();

        // Configurar cierre del modal
        if (profileModal && closeProfileModalBtn) {
            closeProfileModalBtn.addEventListener('click', () => profileModal.close());
            profileModal.addEventListener('click', (event) => {
                if (event.target === profileModal) { profileModal.close(); }
            });
        }

        // CONEXIÓN DEL BOTÓN DE DESCARGA (ACTUALIZADO PARA INCLUIR FILTROS)
        if (downloadPdfBtn && typeof handleDescargarDatos === 'function') {
            downloadPdfBtn.addEventListener('click', async () => {
                const pacienteId = document.getElementById('profile-paciente-id').value;

                let startDate = '';
                let endDate = '';

                const selectedFilterEl = document.querySelector('input[name="date-range"]:checked');
                const selectedFilter = selectedFilterEl ? selectedFilterEl.value : 'week';

                if (selectedFilter === 'custom') {
                    startDate = document.getElementById('filter-start-date').value;
                    endDate = document.getElementById('filter-end-date').value;
                } else {
                    // Obtener las fechas del rango seleccionado (calculadas por handleFilterChange)
                    const dates = getRangeDates(selectedFilter);
                    startDate = dates.start;
                    endDate = dates.end;
                }

                if (pacienteId) {
                    // Se pasan los filtros de fecha al backend
                    await handleDescargarDatos(parseInt(pacienteId), startDate, endDate);
                } else {
                    alert("No se pudo obtener el ID del paciente para la descarga.");
                }
            });
        }

        // Inicializar los filtros al cargar la página (para evitar valores nulos al abrir el modal)
        handleFilterChange('week');
    })();

    // --- FUNCIONES DE LÓGICA DE FILTRADO DE FECHAS ---

        /**
         * Calcula las fechas de inicio y fin para un rango predefinido.
         * @param {string} range - 'week', 'month', 'year', 'all'.
         * @returns {{start: string, end: string}}
         */
        function getRangeDates(range) {
            const today = new Date();
            let startDate = null;
            const endIso = today.toISOString().split('T')[0];

            switch (range) {
                case 'week':
                    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    break;
                case 'year':
                    startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                    break;
                case 'all':
                    return { start: '', end: endIso };
                case 'custom':
                    // Para personalizado, no devolvemos fechas automáticas, se usan los inputs
                    return {
                        start: document.getElementById('filter-start-date').value,
                        end: document.getElementById('filter-end-date').value
                    };
                default:
                    return { start: '', end: endIso }; // Por defecto: Todo
            }

            // Formatear la fecha de inicio a ISO 8601 (YYYY-MM-DD)
            const startIso = startDate ? startDate.toISOString().split('T')[0] : '';
            return { start: startIso, end: endIso };
        }

        /**
         * Maneja el cambio del radio button del filtro.
         * Habilita/Deshabilita los campos de fecha según el rango seleccionado.
         * @param {string} range - El valor del radio button seleccionado.
         */
        window.handleFilterChange = function (range) {
            const startDateInput = document.getElementById('filter-start-date');
            const endDateInput = document.getElementById('filter-end-date');

            if (range === 'custom') {
                startDateInput.disabled = false;
                endDateInput.disabled = false;
                // Opcional: Establecer las fechas en blanco o la fecha actual
                endDateInput.value = new Date().toISOString().split('T')[0];
            } else {
                startDateInput.disabled = true;
                endDateInput.disabled = true;

                // Aplicar las fechas del rango rápido a los inputs (aunque estén deshabilitados, sirve para ver el rango aplicado)
                const dates = getRangeDates(range);
                startDateInput.value = dates.start;
                endDateInput.value = dates.end;
            }
        }

        // --- FUNCIONES AUXILIARES DE LÓGICA PURA ---
        function limpiarYMostrarCargaModal(mostrarCarga = true) {
            const contenidoModal = profileModal.querySelector('.profile-modal-content');
            if (!contenidoModal) return;
            document.getElementById('profile-paciente-id').value = '';
            document.getElementById('profile-nombre').textContent = mostrarCarga ? 'Cargando...' : '';
            document.getElementById('profile-correo').textContent = '...';
            document.getElementById('profile-fecha-nacimiento').textContent = '...';
            document.getElementById('profile-edad').textContent = '...';
            document.getElementById('profile-glucosa').textContent = '...';
            document.getElementById('profile-estado').textContent = '...';
            document.getElementById('profile-estado').className = 'profile-data-value';
            document.getElementById('profile-altura').textContent = '...';
            document.getElementById('profile-peso').textContent = '...';
            const existingError = contenidoModal.querySelector('#modal-load-error');
            if (existingError) existingError.remove();

            // Ocultar el contenedor de historial al limpiar
            if (window.graphContainer) window.graphContainer.style.display = 'none';

            // Limpiar y establecer la fecha por defecto de los filtros (Personalizado)
            document.getElementById('filter-start-date').value = '';
            document.getElementById('filter-end-date').value = new Date().toISOString().split('T')[0];

            // Seleccionar el filtro 'week' por defecto y actualizar UI
            document.getElementById('filter-week').checked = true;
            handleFilterChange('week');
        }

        function calcularEdad(fechaNacimiento) {
            if (!fechaNacimiento) return null; try { const hoy = new Date(); const cumple = new Date(fechaNacimiento); let edad = hoy.getFullYear() - cumple.getFullYear(); const mesDiff = hoy.getMonth() - cumple.getMonth(); if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < cumple.getDate())) { edad--; } return edad >= 0 ? edad : null; } catch (e) { console.error("Error calculando edad:", e); return null; }
        }
        function getEstadoGlucosaDetallado(glucosa) {
            const valor = (typeof glucosa === 'string') ? parseFloat(glucosa) : glucosa;
            if (valor === null || valor === undefined || isNaN(valor)) return { texto: 'Desconocido', clase: '' };
            if (valor < 70) return { texto: 'Bajo (Hipoglucemia)', clase: 'status-low' };
            if (valor <= 140) return { texto: 'Normal', clase: 'status-ok' };
            if (valor <= 180) return { texto: 'Elevado', clase: 'status-elevated' };
            return { texto: 'Alto (Hiperglucemia)', clase: 'status-high' };
        }
        function formatearFechaSimple(fechaISO) {
            if (!fechaISO || typeof fechaISO !== 'string') return 'N/A';
            try {
                const partes = fechaISO.split('-');
                if (partes.length === 3) {
                    return `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
                return fechaISO;
            } catch (e) {
                console.error("Error formateando fecha:", fechaISO, e);
                return fechaISO;
            }
        }
        
        window.limpiarYMostrarCargaModal = limpiarYMostrarCargaModal;
        window.calcularEdad = calcularEdad;
        window.getEstadoGlucosaDetallado = getEstadoGlucosaDetallado;
        window.formatearFechaSimple = formatearFechaSimple; 

        // Exponer init para que el SPA pueda inicializar esta vista después de inyectar el HTML
        window.initMisPacientes = initMisPacientes;

        // Auto inicializar cuando la página se carga de forma independiente (standalone)
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('pacientes-container')) {
                try { initMisPacientes(); } catch (e) { console.error('initMisPacientes error:', e); }
            }


        });
    }

