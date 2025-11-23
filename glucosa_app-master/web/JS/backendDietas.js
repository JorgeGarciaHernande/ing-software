// --- CONFIGURACIÓN DE SUPABASE ---
// Reusar cliente global si ya fue inicializado por otro script.
window.SUPABASE_URL = window.SUPABASE_URL || 'https://lxbjjvfrankabciuizsu.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
window.supabaseClient = window.supabaseClient || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
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
 * Carga las dietas de un paciente específico
 * @param {number} pacienteId - ID del paciente
 */
async function loadDietasByPaciente(pacienteId) {
    try {
        const { data: dietas, error } = await supabaseClient
            .from('dietas')
            .select('id_dieta, id_paciente, id_doctor, fecha_asignacion, desayuno, comida, cena, created_at')
            .eq('id_paciente', pacienteId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Llamar a la función de UI para mostrar las dietas
        if (window.displayDietsUI) {
            window.displayDietsUI(dietas);
        }

    } catch (error) {
        console.error('Error al cargar dietas del paciente:', error);
        throw error;
    }
}

/**
 * Guarda un nuevo plan de dieta en Supabase
 * @param {number} pacienteId - ID del paciente
 * @param {string} dietName - Nombre del plan (no se guarda en BD, solo para UI)
 * @param {string} dietType - Tipo de dieta (no se guarda en BD, solo para UI)
 * @param {string} caloriesGoal - Meta de calorías diarias (no se guarda en BD, solo para UI)
 * @param {string} duration - Duración del plan (no se guarda en BD, solo para UI)
 * @param {string} breakfast - Alimentos del desayuno
 * @param {string} lunch - Alimentos de la comida
 * @param {string} dinner - Alimentos de la cena
 * @param {string} notes - Recomendaciones adicionales (se pueden agregar a alguno de los campos de comida)
 */
async function saveNewDiet(pacienteId, dietName, dietType, caloriesGoal, duration, breakfast, lunch, dinner, notes) {
    const doctorId = getDoctorId();
    if (!doctorId) return;

    // Preparar los datos de la dieta según la estructura de tu BD
    const newDiet = {
        id_paciente: parseInt(pacienteId),
        id_doctor: doctorId,
        fecha_asignacion: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
        desayuno: breakfast || '',
        comida: lunch || '',
        cena: dinner || ''
        // Nota: Los campos nombre_dieta, tipo_dieta, calorias_objetivo, duracion y recomendaciones
        // no existen en tu tabla actual. Si los necesitas, deberás agregar columnas a tu tabla.
    };

    try {
        const { data, error } = await supabaseClient
            .from('dietas')
            .insert([newDiet])
            .select();

        if (error) throw error;

        console.log('Dieta guardada exitosamente:', data);
        return data;

    } catch (error) {
        console.error('Error al guardar dieta:', error);
        throw error;
    }
}

// --- EXPOSICIÓN GLOBAL DE FUNCIONES ---
window.loadPacientesForDoctor = loadPacientesForDoctor;
window.loadDietasByPaciente = loadDietasByPaciente;
window.saveNewDiet = saveNewDiet;