// --- CONFIGURACIÓN DE SUPABASE (reusa cliente global si existe) ---
const SUPABASE_URL = window.SUPABASE_URL || 'https://lxbjjvfrankabciuizsu.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.supabaseClient = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
const supabaseClient = window.supabaseClient;

/**
 * Obtiene el ID del doctor desde localStorage (debe estar guardado en el login)
 * @returns {number|null} ID del doctor o null si no está logueado
 */
function getDoctorId() {
    const doctorId = localStorage.getItem('doctorId');
    if (!doctorId) {
        console.error('No hay doctor logueado. Redirigiendo al login...');
        alert('Sesión no encontrada. Por favor inicie sesión.');
        window.location.href = '../index.html';
        return null;
    }
    return parseInt(doctorId);
}

/**
 * Carga los pacientes asociados al doctor logueado
 */
async function loadPacientesForDoctor() {
    const doctorId = getDoctorId();
    if (!doctorId) return;

    try {
        if (!supabaseClient) throw new Error('Supabase no inicializado');
        const { data: pacientes, error } = await supabaseClient
            .from('paciente')
            .select('id_paciente, nombre_completo, correo')
            .eq('id_doctor', doctorId)
            .order('nombre_completo', { ascending: true });

        if (error) throw error;

        // Llamar a la función de UI para mostrar los pacientes
        if (window.displayPatientsUI) {
            window.displayPatientsUI(pacientes);
        }

    } catch (error) {
        console.error('Error al cargar pacientes:', error);
        alert('Error al cargar la lista de pacientes: ' + error.message);
    }
}

/**
 * Carga las recetas de un paciente específico
 * @param {number} pacienteId - ID del paciente
 */
async function loadRecetasByPaciente(pacienteId) {
    try {
        if (!supabaseClient) throw new Error('Supabase no inicializado');
        const { data: recetas, error } = await supabaseClient
            .from('receta_medica')
            .select('id_receta, nombre_medicamento, ordenes_toma, tiempo_tratamiento, created_at')
            .eq('id_paciente', pacienteId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Llamar a la función de UI para mostrar las recetas
        if (window.displayRecipesUI) {
            window.displayRecipesUI(recetas);
        }

    } catch (error) {
        console.error('Error al cargar recetas del paciente:', error);
        throw error;
    }
}

/**
 * Guarda una nueva receta médica en Supabase
 * @param {number} pacienteId - ID del paciente
 * @param {string} medicationName - Nombre del medicamento
 * @param {string} medicationType - Tipo de medicamento (Pastilla, Cápsula, etc.)
 * @param {string} dosage - Dosis del medicamento
 * @param {string} frequency - Frecuencia de toma
 * @param {string} duration - Duración del tratamiento
 * @param {string} notes - Notas adicionales
 */
async function saveNewReceta(pacienteId, medicationName, medicationType, dosage, frequency, duration, notes) {
    const doctorId = getDoctorId();
    if (!doctorId) return;

    // Preparar los datos de la receta
    // Nota: Ajusta los nombres de columnas según tu schema de Supabase
    const newReceta = {
        id_paciente: parseInt(pacienteId),
        id_doctor: doctorId,
        nombre_medicamento: medicationName,
        ordenes_toma: `${medicationType} - ${frequency} - ${dosage}`, // Combino varios campos
        tiempo_tratamiento: duration,
        // Si tienes una columna separada para notas, agrégala aquí
        // notas_adicionales: notes
    };

    try {
        if (!supabaseClient) throw new Error('Supabase no inicializado');
        const { data, error } = await supabaseClient
            .from('receta_medica')
            .insert([newReceta])
            .select();

        if (error) throw error;

        console.log('Receta guardada exitosamente:', data);
        return data;

    } catch (error) {
        console.error('Error al guardar receta:', error);
        throw error;
    }
}

// --- EXPOSICIÓN GLOBAL DE FUNCIONES ---
window.loadPacientesForDoctor = loadPacientesForDoctor;
window.loadRecetasByPaciente = loadRecetasByPaciente;
window.saveNewReceta = saveNewReceta;






