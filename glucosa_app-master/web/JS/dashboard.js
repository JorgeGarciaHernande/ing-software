/**
 * Carga el contenido de una ruta (archivo HTML) y lo inyecta.
 * @param {string} routeFile - El nombre del archivo HTML a cargar.
 * @param {Function} afterLoadCallback - Función de inicialización a ejecutar después de la inyección.
 */
function navigateTo(routeFile, afterLoadCallback = null) {
    const contentArea = document.getElementById('app-content-area');
    if (!contentArea) {
        console.error("No se encontró el contenedor principal #app-content-area");
        return;
    }
    fetch(routeFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se pudo cargar la ruta: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            contentArea.innerHTML = html;

                if (afterLoadCallback && typeof afterLoadCallback === 'function') {
                    try { afterLoadCallback(); } catch (e) { console.error('afterLoadCallback error:', e); }
                }

                // Auto-inicializadores por ruta (soporta SPA sin cambiar listeners individuales)
                try {
                    if (routeFile && routeFile.includes('mis_pacientes') && typeof window.initMisPacientes === 'function') {
                        window.initMisPacientes();
                    }
                    if (routeFile && routeFile.includes('recipe') && typeof window.initRecipe === 'function') {
                        window.initRecipe();
                    }
                } catch (e) {
                    console.error('Error ejecutando inicializadores automáticos:', e);
                }
        })
        .catch(error => {
            console.error("Error al cargar la vista SPA:", error);
            contentArea.innerHTML = `<p class="error-msg">Error al cargar: ${routeFile}</p>`;
        });
}

// ----------------------------------------------------------------------
// Conexión de Event Listeners del Sidebar
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    
const pacientesBtn = document.getElementById('btn-patient');

   if (pacientesBtn) {
        pacientesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('mis_pacientes.html', () => {
                if (typeof window.initMisPacientes === 'function') {
                    window.initMisPacientes();
                }
            });
        });
    }
    const dietasBtn = document.getElementById('btn_dietas');
    if (dietasBtn) {
        dietasBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('dietas.html', () => {
                if (typeof window.initDietas === 'function') {
                    try { window.initDietas(); } catch (err) { console.error('initDietas error:', err); }
                }
            }); 
        });
    }
    const conveniosBtn = document.getElementById('btn_convenios');
    if (conveniosBtn) {
        conveniosBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('convenios.html', () => {
                if (typeof window.initConvenios === 'function') {
                    try { window.initConvenios(); } catch (err) { console.error('initConvenios error:', err); }
                }
            });
        });
    }
    const appointmentsBtn = document.getElementById('btn-appointments');
    if (appointmentsBtn) {
        appointmentsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('appointment.html', () => {
                if (typeof window.initAppointment === 'function') {
                    try { window.initAppointment(); } catch (err) { console.error('initAppointment error:', err); }
                }
            });
        });
    }
    const recetaBtn = document.getElementById('btn-open-create-recipe');
    if (recetaBtn) {
        recetaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('recipe.html', () => {
                if (typeof window.initRecipe === 'function') window.initRecipe();
            });
        });
    }

    // Cargar por defecto la vista de citas si el área está vacío
    const contentArea = document.getElementById('app-content-area');
    if (contentArea && contentArea.innerHTML.trim() === '') {
        navigateTo('appointment.html', () => {
            if (typeof window.initAppointment === 'function') {
                try { window.initAppointment(); } catch (err) { console.error('initAppointment auto error:', err); }
            }
        });
    }

});