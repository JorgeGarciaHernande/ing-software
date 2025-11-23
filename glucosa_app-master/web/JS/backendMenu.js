// --- CONFIGURACIÓN DE SUPABASE ---
// Evitar redeclaraciones si otro script ya inicializó el cliente.
window.SUPABASE_URL = window.SUPABASE_URL || 'https://lxbjjvfrankabciuizsu.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
window.supabaseClient = window.supabaseClient || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const supabaseClient = window.supabaseClient;


// --- LÓGICA DE GESTIÓN DE PACIENTES ---

/**
 * Guarda un nuevo paciente en la base de datos.
 * @param {Object} nuevoPaciente - Objeto con todos los datos del paciente.
 */
export async function saveNewPatient(nuevoPaciente) {
    try {
        const { data, error } = await supabaseClient
            .from('paciente')
            .insert([nuevoPaciente])
            .select();

        if (error) {
            if (error.code === '23505') {
                throw new Error('Error: El correo ya existe (duplicado).');
            }
            throw error;
        }

        console.log("Paciente guardado:", data);
        return data;

    } catch (error) {
        console.error("Error al guardar paciente en DB:", error);
        throw error;
    }
}           

// --- LÓGICA DE GESTIÓN DE RECETAS ---

/**
 * Carga la lista de pacientes del doctor actual para llenar el <select>.
 */
async function loadPatientsForRecipeSelect() {
    // Usamos localStorage.getItem aquí, ya que currentDoctorId no es global en este script
    const doctorId = localStorage.getItem('doctorId');
    const pacienteSelectUI = document.getElementById('receta-paciente');
    
    if (!doctorId || !pacienteSelectUI) return;

    try {
        const { data: pacientes, error } = await supabaseClient
            .from('paciente')
            .select('id_paciente, nombre_completo')
            .eq('id_doctor', doctorId)
            .order('nombre_completo', { ascending: true });

        if (error) throw error;
        
        // Llama a la función del frontend para rellenar el select
        window.fillPatientSelectUI(pacientes); 

    } catch (error) {
        console.error("Error al cargar pacientes para el select:", error);
        pacienteSelectUI.innerHTML = '<option value="">Error al cargar pacientes</option>';
    }
}

/**
 * Guarda una nueva receta en la base de datos.
 * @param {Object} nuevaReceta - Objeto con los datos de la receta.
 */
async function saveNewRecipe(nuevaReceta) {
    try {
        const { data, error } = await supabaseClient
            .from('recetas') // Asegúrate de que el nombre de la tabla sea correcto
            .insert([nuevaReceta])
            .select();

        if (error) throw error;

        console.log("Receta guardada:", data);
        return data;

    } catch (error) {
        console.error("Error al guardar receta en DB:", error);
        throw error;
    }
}

// --- LÓGICA DE CITAS PRÓXIMAS ---

/**
 * Obtiene el ID del doctor desde localStorage
 */
function getDoctorId() {
    const doctorId = localStorage.getItem('doctorId');
    if (!doctorId) {
        console.error('No hay doctor logueado.');
        return null;
    }
    return parseInt(doctorId);
}

/**
 * Carga las citas próximas del doctor (hoy y próximos 7 días)
 */
async function loadUpcomingAppointments() {
    const doctorId = getDoctorId();
    if (!doctorId) return;

    try {
        // Obtener fecha actual y fecha dentro de 7 días
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const enUnaSemana = new Date();
        enUnaSemana.setDate(enUnaSemana.getDate() + 7);
        enUnaSemana.setHours(23, 59, 59, 999);

        // Buscar citas del doctor en el rango de fechas
        const { data: citas, error } = await supabaseClient
            .from('citas') // Nombre correcto de tu tabla
            .select(`
                id_cita,
                fecha_cita,
                hora_cita,
                paciente:id_paciente (
                    nombre_completo
                )
            `)
            .eq('id_doctor', doctorId)
            .gte('fecha_cita', hoy.toISOString().split('T')[0])
            .lte('fecha_cita', enUnaSemana.toISOString().split('T')[0])
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true })
            .limit(5); // Limitar a las 5 próximas citas

        if (error) throw error;

        // Mapear los datos para crear fecha_hora combinada
        const citasMapeadas = citas.map(cita => {
            // Combinar fecha_cita y hora_cita
            const fechaHoraCombinada = `${cita.fecha_cita}T${cita.hora_cita}`;
            
            return {
                id_cita: cita.id_cita,
                fecha_hora: fechaHoraCombinada,
                motivo: 'Consulta', // Tu tabla no tiene campo motivo, usamos valor por defecto
                estado: 'Programada', // Tu tabla no tiene campo estado, usamos valor por defecto
                nombre_paciente: cita.paciente?.nombre_completo || 'Paciente sin nombre'
            };
        });

        // Llamar a la función de UI para mostrar las citas
        if (window.displayUpcomingAppointments) {
            window.displayUpcomingAppointments(citasMapeadas);
        }

    } catch (error) {
        console.error('Error al cargar citas próximas:', error);
        // Si hay error, mostrar panel vacío
        if (window.displayUpcomingAppointments) {
            window.displayUpcomingAppointments([]);
        }
    }
}


// --- EXPOSICIÓN GLOBAL DE FUNCIONES ---
window.saveNewPatient = saveNewPatient;
window.loadPatientsForRecipeSelect = loadPatientsForRecipeSelect;
window.saveNewRecipe = saveNewRecipe;
window.loadUpcomingAppointments = loadUpcomingAppointments;


//-----------------------------------------------------------------
// --- LÓGICA DE GESTIÓN DE FARMACIAS --- (Estaba en main_menu.html)
//-----------------------------------------------------------------
// --- ESTADO GLOBAL (Doctor ID y Nombre) ---
let currentDoctorId = null;
let currentDoctorNombre = null;

// --- DOM ELEMENTS (Globales para la UI) ---
const pacienteDialog = document.getElementById('paciente-creation-dialog');
const newPacienteForm = document.getElementById('new-paciente-form');
const pacienteModalErrorMessage = document.getElementById('modal-error-message');
const savePacienteBtn = document.getElementById('save-paciente-btn');
const recetaDialog = document.getElementById('create-recipe-dialog');
const newRecetaForm = document.getElementById('new-recipe-form');
const recetaErrorMessage = document.getElementById('receta-error-message');
const pacienteSelect = document.getElementById('receta-paciente');
const saveRecipeBtn = document.getElementById('save-recipe-btn');
const settingsDialog = document.getElementById('settings-dialog');
const settingsForm = document.getElementById('settings-form');

// --- FUNCIÓN PARA CONFIGURAR LOS MODALES (Abrir/Cerrar) ---
function setupModalLogic() {
    const modals = {
        paciente: { openBtn: document.getElementById('btn-open-paciente-modal-sidebar'), closeBtn: document.getElementById('paciente-modal-close-dialog') },
        settings: { openBtn: document.getElementById('btn-open-settings'), closeBtn: document.getElementById('settings-close-dialog') },
        receta:   { openBtn: document.getElementById('btn-open-create-recipe'), closeBtn: document.getElementById('create-recipe-close-dialog') }
    };

    for (const key in modals) {
        const { openBtn, closeBtn } = modals[key];
        const dialog = document.getElementById(`${key}-creation-dialog`) || document.getElementById(`${key}-dialog`);
        
        if (!dialog) continue;

        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                dialog.showModal();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => dialog.close());
        }
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) dialog.close();
        });
    }
}

// --- MANEJO DEL ENVÍO DEL FORMULARIO PACIENTE ---
function setupPacienteForm() {

    if (!newPacienteForm) return;

    newPacienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        pacienteModalErrorMessage.textContent = '';

        if (!currentDoctorId) {
            pacienteModalErrorMessage.textContent = "Error: No se pudo identificar al doctor.";
            return;
        }

        const nombre = document.getElementById('modal-nombre').value;
        const apellido = document.getElementById('modal-apellido').value;
        const fechaNacimiento = document.getElementById('modal-fecha_nacimiento').value;
        const glucosaStr = document.getElementById('modal-glucosa').value;
        const alturaCmStr = document.getElementById('modal-altura').value;
        const pesoStr = document.getElementById('modal-peso').value;
        const email = document.getElementById('modal-email').value;
        const password = document.getElementById('modal-password').value;

        if (!nombre || !apellido || !fechaNacimiento || !email || !password) {
            pacienteModalErrorMessage.textContent = 'Completa los campos requeridos.';
            return;
        }
        if (password.length < 6) {
            pacienteModalErrorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        const alturaMetros = alturaCmStr ? parseFloat(alturaCmStr) / 100 : null;

        const nuevoPaciente = {
            nombre_completo: `${nombre} ${apellido}`,
            fecha_nacimiento: fechaNacimiento,
            correo: email,
            password_hash: password,
            ultima_medida_glucosa: glucosaStr ? parseFloat(glucosaStr) : null,
            altura: alturaMetros,
            peso: pesoStr ? parseFloat(pesoStr) : null,
            id_doctor: parseInt(currentDoctorId)
        };

        savePacienteBtn.textContent = 'Guardando...';
        savePacienteBtn.disabled = true;

        try {
            await saveNewPatient(nuevoPaciente);
            alert(`Paciente ${nombre} ${apellido} creado exitosamente.`);
            newPacienteForm.reset();
            pacienteDialog.close();
            await loadPatientsForRecipeSelect();

        } catch (error) {
            console.error("Error al guardar paciente:", error);
            pacienteModalErrorMessage.textContent = error.message;
        } finally {
            savePacienteBtn.textContent = 'Guardar Paciente';
            savePacienteBtn.disabled = false;
        }
    });
}

// --- MANEJO DEL ENVÍO DEL FORMULARIO RECETA ---
async function setupRecetaForm() {
    if (!newRecetaForm || !pacienteSelect) return;

    await loadPatientsForRecipeSelect();

    newRecetaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        recetaErrorMessage.textContent = '';

        if (!currentDoctorId) {
            recetaErrorMessage.textContent = "Error: ID de doctor no encontrado.";
            return;
        }

        const idPacienteSeleccionado = pacienteSelect.value;
        const medicamento = document.getElementById('receta-medicamento').value;
        const indicaciones = document.getElementById('receta-indicaciones').value;

        if (!idPacienteSeleccionado || !medicamento || !indicaciones) {
            recetaErrorMessage.textContent = 'Completa todos los campos de la receta.';
            return;
        }

        const nuevaReceta = {
            id_paciente: parseInt(idPacienteSeleccionado),
            id_doctor: parseInt(currentDoctorId),
            medicamento: medicamento,
            indicaciones: indicaciones
        };

        saveRecipeBtn.textContent = 'Guardando...';
        saveRecipeBtn.disabled = true;

        try {
            await saveNewRecipe(nuevaReceta);
            alert("Receta guardada exitosamente.");
            newRecetaForm.reset();
            recetaDialog.close();

        } catch (error) {
            console.error("Error al guardar receta:", error);
            recetaErrorMessage.textContent = error.message;
        } finally {
            saveRecipeBtn.textContent = 'Guardar Receta';
            saveRecipeBtn.disabled = false;
        }
    });
}

// --- Ajustes (solo UI/localStorage) ---
function setupSettingsForm() {
    if (!settingsForm || !settingsDialog) return;

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tema = document.getElementById('theme').value;
        localStorage.setItem('userTheme', tema);
        alert("Ajustes guardados (simulación).");
        settingsDialog.close();
    });
}

// --- Llenar Select de Pacientes desde Backend ---
window.fillPatientSelectUI = function(pacientes) {
    if (!pacienteSelect) return;
    pacienteSelect.innerHTML = '<option value="">Selecciona un paciente...</option>';
    pacientes.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id_paciente;
        option.textContent = p.nombre_completo;
        pacienteSelect.appendChild(option);
    });
};

// --- Inicio página ---
document.addEventListener('DOMContentLoaded', async () => {
    currentDoctorId = localStorage.getItem('doctorId');
    currentDoctorNombre = localStorage.getItem('doctorNombre');
    const doctorNombreDisplay = document.getElementById('doctor-nombre-display');

    if (!currentDoctorId) {
        console.error("No se encontró ID de doctor. Redirigiendo al login.");
        if (doctorNombreDisplay) doctorNombreDisplay.textContent = "Error";
        window.location.href = '../index.html';
        return;
    }

    if (doctorNombreDisplay && currentDoctorNombre) {
        doctorNombreDisplay.textContent = `Dr(a). ${currentDoctorNombre.split(' ')[0]}`;
    }

    setupModalLogic();
    setupPacienteForm();

    await setupRecetaForm();
    setupSettingsForm();
    
    // Cargar citas próximas
    loadUpcomingAppointments();
    
    // Actualizar citas cada 5 minutos
    setInterval(loadUpcomingAppointments, 5 * 60 * 1000);
});