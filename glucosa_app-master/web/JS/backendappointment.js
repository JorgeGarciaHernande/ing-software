// --- SUPABASE CONFIG (reusar cliente global) ---
window.SUPABASE_URL = window.SUPABASE_URL || 'https://lxbjjvfrankabciuizsu.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
window.supabaseClient = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null);
const supabaseClient = window.supabaseClient;


/**
 * Carga los pacientes asociados a un doctor.
 * @param {string} doctorId - El ID del doctor.
 * @returns {Promise<Array>} Un array de objetos paciente.
 */
async function cargarPacientes(doctorId) {
    if (!supabaseClient) throw new Error('Supabase no inicializado');
    if (!doctorId) {
        throw new Error("ID de doctor no proporcionado.");
    }
    const docId = parseInt(doctorId);

    try {
        const { data: pacientes, error } = await supabaseClient
            .from('paciente')
            .select('id_paciente, nombre_completo')
            .eq('id_doctor', docId)
            .order('nombre_completo');

        if (error) throw error;

        return pacientes;
    } catch (error) {
        console.error("Error cargando pacientes en backend:", error);
        throw new Error("Fallo al obtener la lista de pacientes.");
    }
}

/**
 * Carga las citas futuras del doctor y llama a la función de UI para mostrarlas.
 * @param {string} doctorId - El ID del doctor.
 */
async function cargarYMostrarCitas(doctorId) {
    if (!supabaseClient) throw new Error('Supabase no inicializado');
    if (!doctorId) return;
    const docId = parseInt(doctorId);

    // Muestra mensaje de carga en la UI (asume el elemento global existe)
    const citasRegistradasContenidoUI = document.getElementById('citas-registradas-contenido');
    if (citasRegistradasContenidoUI) {
        citasRegistradasContenidoUI.innerHTML = '<p>Buscando citas...</p>';
    }

    const today = new Date();
    // Filtramos por fecha_cita >= hoy
    const todayISO = today.toISOString().split('T')[0];

    try {
        const { data: citas, error } = await supabaseClient
            .from('citas')
            .select(`
                id_cita,
                fecha_cita,
                hora_cita,
                paciente:id_paciente ( nombre_completo )
            `)
            .eq('id_doctor', docId)
            .gte('fecha_cita', todayISO)
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true });

        if (error) throw error;

        // Llama a la función de presentación de la UI (resuelta en runtime)
        const mostrarCitasUI = window.mostrarCitas;
        if (typeof mostrarCitasUI === 'function') {
            try { mostrarCitasUI(citas); } catch (e) { console.error('mostrarCitasUI error:', e); }
        }

    } catch (error) {
        console.error("Error al cargar citas del doctor en backend:", error);
        if (citasRegistradasContenidoUI) {
            citasRegistradasContenidoUI.innerHTML = `<p style="color:red;">Error al cargar citas: ${error.message}</p>`;
        }
    }
}

/**
 * Guarda una nueva cita en Supabase.
 * @param {string} doctorId - ID del doctor.
 * @param {string} pacienteId - ID del paciente.
 * @param {string} fecha - Fecha de la cita (YYYY-MM-DD).
 * @param {string} hora - Hora de la cita (HH:MM).
 */
async function guardarNuevaCita(doctorId, pacienteId, fecha, hora) {
    if (!supabaseClient) throw new Error('Supabase no inicializado');
    if (!doctorId || !pacienteId || !fecha || !hora) {
        throw new Error("Datos de cita incompletos.");
    }
    const docId = parseInt(doctorId);

    const nuevaCita = {
        id_doctor: docId,
        id_paciente: parseInt(pacienteId),
        fecha_cita: fecha,
        hora_cita: hora + ":00" // Formato necesario para la base de datos (HH:MM:SS)
    };

    try {
        const { data, error } = await supabaseClient
            .from('citas')
            .insert([nuevaCita])
            .select();

        if (error) {
            if (error.code === '23505') {
                throw new Error(`Ya existe una cita a esta hora para el paciente seleccionado. (${hora})`);
            } else {
                throw error;
            }
        }

        // Vuelve a cargar y mostrar la lista de citas en la UI
        cargarYMostrarCitas(doctorId);

        return data;

    } catch (error) {
        console.error("Error al guardar cita en backend:", error);
        // Re-lanza el error para que la función de manejo de UI lo capture
        throw error;
    }
}

/**
 * Elimina una cita de Supabase por su ID.
 * @param {string} idCita - El ID de la cita a eliminar.
 */
async function eliminarCita(idCita) {
    if (!supabaseClient) throw new Error('Supabase no inicializado');
    if (!idCita) throw new Error("ID de cita no proporcionado.");

    try {
        const { error } = await supabaseClient
            .from('citas')
            .delete()
            .eq('id_cita', parseInt(idCita));

        if (error) throw error;

        // Vuelve a cargar y mostrar la lista de citas en la UI
        const currentDoctorId = localStorage.getItem('doctorId');
        if (currentDoctorId) {
            cargarYMostrarCitas(currentDoctorId);
        }

    } catch (error) {
        console.error("Error al eliminar cita en backend:", error);
        // Re-lanza el error para que la función de manejo de UI lo capture
        throw error;
    }
}

// Expone las funciones principales para que el archivo HTML/UI pueda llamarlas
window.cargarPacientes = cargarPacientes;
window.cargarYMostrarCitas = cargarYMostrarCitas;
window.guardarNuevaCita = guardarNuevaCita;
window.eliminarCita = eliminarCita;

// ---------------------------------------------------------------
// Renderizador UI y función de inicialización para SPA
// ---------------------------------------------------------------
/**
 * Renderiza la lista de citas en el contenedor correspondiente.
 * @param {Array} citas - Array de citas devuelto por Supabase.
 */
function mostrarCitas(citas) {
    const contenedor = document.getElementById('citas-registradas-contenido');
    if (!contenedor) return;

    if (!citas || citas.length === 0) {
        contenedor.innerHTML = '<p>No hay citas futuras.</p>';
        return;
    }

    const html = citas.map(c => {
        const fecha = c.fecha_cita;
        const hora = c.hora_cita?.substring(0, 5) || '';
        const pacienteNombre = c.paciente?.nombre_completo || 'Paciente';
        return `<div class="cita-item">\n     
                <div class="cita-info">\n    
                <span class="cita-fecha">📅 ${fecha}</span>\n               
                <span class="cita-hora">⏰ ${hora}</span>\n                
                <span class="cita-paciente">👤 ${pacienteNombre}</span>\n            
                </div>\n            
                    <button class="cita-delete-btn" data-id="${c.id_cita}">Eliminar</button>\n        
                </div>`;
    }).join('');

    contenedor.innerHTML = html;
}

window.mostrarCitas = mostrarCitas;

/**
 * Inicializa la vista de citas cuando se inyecta vía SPA.
 */
function initAppointment() {
    // Usar alias locales para evitar que otras vistas (mis pacientes) sobreescriban estas funciones globales.
    const cargarPacientesAlias = cargarPacientes; // permanece estable aunque window.cargarPacientes cambie
    const cargarYMostrarCitasAlias = cargarYMostrarCitas;
    const guardarNuevaCitaAlias = guardarNuevaCita;
    const eliminarCitaAlias = eliminarCita;

    const doctorId = localStorage.getItem('doctorId');
    const statusMsg = document.getElementById('appt-status-message');
    const pacientesSelect = document.getElementById('appt-paciente');
    const form = document.getElementById('new-appointment-form');

    if (!doctorId) {
        if (statusMsg) statusMsg.textContent = 'No se encontró el ID del doctor.';
        console.warn('doctorId faltante en localStorage');
        return;
    }

    // Cargar pacientes
    cargarPacientesAlias(doctorId)
        .then(pacientes => {
            if (pacientesSelect) {
                pacientesSelect.innerHTML = '<option value="">Seleccione paciente...</option>' +
                    pacientes.map(p => `<option value="${p.id_paciente}">${p.nombre_completo}</option>`).join('');
            }
        })
        .catch(err => {
            console.error('Error cargando pacientes (SPA):', err);
            if (pacientesSelect) {
                pacientesSelect.innerHTML = '<option value="">Error cargando pacientes</option>';
            }
        });

    // Cargar citas futuras
    cargarYMostrarCitasAlias(doctorId);

    // Manejo del submit del formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (statusMsg) statusMsg.textContent = '';

            const pacienteId = pacientesSelect?.value;
            const fecha = document.getElementById('appt-date')?.value;
            const hora = document.getElementById('appt-time')?.value;

            if (!pacienteId || !fecha || !hora) {
                if (statusMsg) statusMsg.textContent = 'Complete todos los campos.';
                return;
            }
            try {
                await guardarNuevaCitaAlias(doctorId, pacienteId, fecha, hora);
                if (statusMsg) statusMsg.textContent = 'Cita guardada correctamente.';
                form.reset();
            } catch (err) {
                if (statusMsg) statusMsg.textContent = err.message || 'Error al guardar cita.';
            }
        });
    }

    // Delegación para botones de eliminar
    const contenedorCitas = document.getElementById('citas-registradas-contenido');
    if (contenedorCitas) {
        contenedorCitas.addEventListener('click', async (e) => {
            const target = e.target;
            if (target && target.classList.contains('cita-delete-btn')) {
                const id = target.getAttribute('data-id');
                if (!id) return;
                try {
                    await eliminarCitaAlias(id);
                } catch (err) {
                    console.error('Error eliminando cita:', err);
                }
            }
        });
    }
}

window.initAppointment = initAppointment;