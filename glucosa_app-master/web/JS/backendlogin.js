// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://lxbjjvfrankabciuizsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Maneja el proceso de autenticación del doctor contra Supabase.
 * Lanza un error si la autenticación falla.
 * @param {string} email - Correo electrónico del doctor.
 * @param {string} password - Contraseña ingresada.
 * @returns {Promise<object>} Los datos del doctor (id_doctor, nombre_completo).
 */
async function handleLogin(email, password) {
    
    // 1. Buscar el doctor por correo
    const { data: doctor, error } = await supabaseClient
        .from('doctor')
        .select('id_doctor, nombre_completo, password_hash')
        .eq('correo', email)
        .single();

    if (error || !doctor) {
        console.error('Error Supabase o doctor no encontrado:', error);
        throw new Error("Correo no encontrado. Verifícalo.");
    }

    // 2. Verificar la contraseña (Comparación simple con hash/password almacenado)
    if (doctor.password_hash === password) {
        
        // 3. Autenticación exitosa: Guardar datos en localStorage
        localStorage.setItem('doctorId', doctor.id_doctor);
        localStorage.setItem('doctorNombre', doctor.nombre_completo); 

        alert(`¡Bienvenido, ${doctor.nombre_completo}!`);
        
        return doctor; // Devuelve los datos para uso en el frontend (ej. la redirección)

    } else {
        // 4. Contraseña incorrecta
        throw new Error("Contraseña incorrecta.");
    }
}

// Expone la función de login al scope global (window) para que index.html pueda llamarla
window.handleLogin = handleLogin;