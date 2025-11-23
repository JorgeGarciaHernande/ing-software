// UI para recipe.html extraída del HTML y adaptada para SPA

// Stubs seguros para que el backend pueda llamar sin errores
window.displayPatientsUI = window.displayPatientsUI || function () { console.warn('displayPatientsUI no inicializado aún'); };
window.displayRecipesUI = window.displayRecipesUI || function () { console.warn('displayRecipesUI no inicializado aún'); };

function initRecipe() {
    // DOM elements
    const patientsSelect = document.getElementById('patients-options');
    const newRecipeForm = document.getElementById('new-recipe-form');
    const saveRecipeBtn = document.getElementById('save-recipe-btn');
    const formMessage = document.getElementById('form-message');
    const recipeList = document.getElementById('recipe-list');

    if (!patientsSelect || !newRecipeForm || !saveRecipeBtn || !recipeList) {
        console.warn('initRecipe: elementos del DOM no encontrados. ¿Se inyectó correctamente recipe.html?');
        return;
    }

    // --- UI functions ---
    window.displayPatientsUI = function(pacientes) {
        patientsSelect.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
        pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id_paciente;
            option.textContent = `${paciente.nombre_completo} - ${paciente.correo || 'Sin correo'}`;
            patientsSelect.appendChild(option);
        });
    };

    window.displayRecipesUI = function(recetas) {
        if (!recipeList) return;
        if (!recetas || recetas.length === 0) {
            recipeList.innerHTML = `\n                <li class="empty-state">\n                    <p>No hay recetas registradas para este paciente</p>\n                </li>\n            `;
            return;
        }

        recipeList.innerHTML = '';
        recetas.forEach(receta => {
            const fecha = receta.created_at ? new Date(receta.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            const listItem = `
                <li class="recipe-item">
                    <div class="recipe-header">
                        <span class="recipe-medication">💊 ${receta.nombre_medicamento}</span>
                        <span class="recipe-date">${fecha}</span>
                    </div>
                    <div class="recipe-details">
                        <p><strong>Tipo:</strong> ${receta.ordenes_toma || 'No especificado'}</p>
                        <p><strong>Dosis:</strong> ${receta.tiempo_tratamiento || 'No especificada'}</p>
                    </div>
                    ${receta.nombre_medicamento ? `<div class="recipe-notes">📝 ${receta.nombre_medicamento}</div>` : ''}
                </li>
            `;
            recipeList.insertAdjacentHTML('beforeend', listItem);
        });
    };

    // --- Event listeners ---
    patientsSelect.addEventListener('change', async (e) => {
        const pacienteId = e.target.value;
        if (!pacienteId) {
            recipeList.innerHTML = '<li class="loading">Seleccione un paciente para ver sus recetas...</li>';
            return;
        }

        recipeList.innerHTML = '<li class="loading">Cargando recetas...</li>';
        try {
            if (typeof window.loadRecetasByPaciente === 'function') {
                await window.loadRecetasByPaciente(pacienteId);
            } else {
                console.warn('loadRecetasByPaciente no definido en backend.');
            }
        } catch (err) {
            console.error('Error al cargar recetas:', err);
            recipeList.innerHTML = '<li class="empty-state" style="color: red;">Error al cargar las recetas</li>';
        }
    });

    newRecipeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pacienteId = patientsSelect.value;
        if (!pacienteId) {
            showMessage('Por favor seleccione un paciente primero', 'error');
            return;
        }

        formMessage.style.display = 'none';
        saveRecipeBtn.disabled = true;
        saveRecipeBtn.textContent = '⏳ Guardando...';

        const medicationName = document.getElementById('medication-name').value.trim();
        const medicationType = document.getElementById('medication-type').value.trim();
        const dosage = document.getElementById('dosage').value.trim();
        const frequency = document.getElementById('frequency').value.trim();
        const duration = document.getElementById('duration').value.trim();
        const notes = document.getElementById('additional-notes').value.trim();

        try {
            if (typeof window.saveNewReceta === 'function') {
                await window.saveNewReceta(pacienteId, medicationName, medicationType, dosage, frequency, duration, notes);
            } else {
                console.warn('saveNewReceta no definido en backend.');
            }

            showMessage('✅ Receta guardada exitosamente', 'success');
            newRecipeForm.reset();
            if (typeof window.loadRecetasByPaciente === 'function') await window.loadRecetasByPaciente(pacienteId);

        } catch (error) {
            console.error('Error al guardar receta:', error);
            showMessage(`❌ Error: ${error.message}`, 'error');
        } finally {
            saveRecipeBtn.disabled = false;
            saveRecipeBtn.textContent = '💾 Guardar Receta';
        }
    });

    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `message ${type}`;
        formMessage.style.display = 'block';
        setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
    }

    // --- Inicialización por defecto ---
    // Si existe una función global para cargar pacientes desde backend, la llamamos
    if (typeof window.loadPacientesForDoctor === 'function') {
        try { window.loadPacientesForDoctor(); } catch (e) { console.error('loadPacientesForDoctor error:', e); }
    }
}

// Exponer init al SPA y autoinit cuando sea página independiente
window.initRecipe = initRecipe;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patients-options')) {
        try { initRecipe(); } catch (e) { console.error('initRecipe auto error:', e); }
    }
});
