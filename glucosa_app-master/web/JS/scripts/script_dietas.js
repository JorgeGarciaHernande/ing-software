// script_dietas.js
// Lógica de la vista Dietas extraída de dietas.html para uso en SPA

function initDietas() {
    // --- DOM ELEMENTS (dentro de la vista inyectada) ---
    const patientsSelect = document.getElementById('patients-options');
    const newDietForm = document.getElementById('new-diet-form');
    const saveDietBtn = document.getElementById('save-diet-btn');
    const formMessage = document.getElementById('form-message');
    const dietList = document.getElementById('diet-list');

    if (!patientsSelect || !newDietForm) {
        console.warn('initDietas: elementos del DOM no encontrados (¿vista no inyectada?).');
        return;
    }

    // --- UI helpers expuestos globalmente ---
    window.displayPatientsUI = function(pacientes) {
        patientsSelect.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
        pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id_paciente;
            option.textContent = `${paciente.nombre_completo} - ${paciente.correo || 'Sin correo'}`;
            patientsSelect.appendChild(option);
        });
    };

    window.displayDietsUI = function(dietas) {
        if (!dietas || dietas.length === 0) {
            dietList.innerHTML = `\n                    <li class="empty-state">\n                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">\n                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" \n                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>\n                        </svg>\n                        <p>No hay planes de dieta registrados para este paciente</p>\n                    </li>\n                `;
            return;
        }

        dietList.innerHTML = '';
        dietas.forEach(dieta => {
            const fecha = dieta.fecha_asignacion ? 
                new Date(dieta.fecha_asignacion).toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }) : 'Fecha no disponible';

            const listItem = `
                <li class="diet-item">
                    <div class="diet-header">
                        <span class="diet-title">🍎 Plan de Dieta</span>
                        <span class="diet-date">${fecha}</span>
                    </div>
                    <div class="meal-info">
                        ${dieta.desayuno ? `<p><strong>🌅 Desayuno:</strong> ${dieta.desayuno}</p>` : ''}
                        ${dieta.comida ? `<p><strong>🍽️ Comida:</strong> ${dieta.comida}</p>` : ''}
                        ${dieta.cena ? `<p><strong>🌙 Cena:</strong> ${dieta.cena}</p>` : ''}
                    </div>
                </li>
            `;
            dietList.insertAdjacentHTML('beforeend', listItem);
        });
    };

    // --- Event handlers ---
    patientsSelect.addEventListener('change', async (e) => {
        const pacienteId = e.target.value;
        if (!pacienteId) {
            dietList.innerHTML = '<li class="loading">Seleccione un paciente para ver sus dietas...</li>';
            return;
        }

        dietList.innerHTML = '<li class="loading">Cargando dietas...</li>';
        try {
            if (window.loadDietasByPaciente) {
                await window.loadDietasByPaciente(pacienteId);
            } else {
                throw new Error('loadDietasByPaciente no disponible');
            }
        } catch (error) {
            console.error('Error al cargar dietas:', error);
            dietList.innerHTML = '<li class="empty-state" style="color: red;">Error al cargar las dietas</li>';
        }
    });

    newDietForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pacienteId = patientsSelect.value;
        if (!pacienteId) {
            showMessage('Por favor seleccione un paciente primero', 'error');
            return;
        }

        formMessage.style.display = 'none';
        saveDietBtn.disabled = true;
        saveDietBtn.textContent = '⏳ Guardando...';

        const breakfast = document.getElementById('breakfast').value.trim();
        const lunch = document.getElementById('lunch').value.trim();
        const dinner = document.getElementById('dinner').value.trim();

        try {
            if (!window.saveNewDiet) throw new Error('saveNewDiet no disponible');
            await window.saveNewDiet(pacienteId, null, null, null, null, breakfast, lunch, dinner, null);
            showMessage('✅ Plan de dieta guardado exitosamente', 'success');
            newDietForm.reset();
            await window.loadDietasByPaciente(pacienteId);
        } catch (error) {
            console.error('Error al guardar dieta:', error);
            showMessage(`❌ Error: ${error.message}`, 'error');
        } finally {
            saveDietBtn.disabled = false;
            saveDietBtn.textContent = '💾 Guardar Plan de Dieta';
        }
    });

    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `message ${type}`;
        formMessage.style.display = 'block';
        setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
    }

    // Inicialización: solicitar la lista de pacientes desde el backend
    if (window.loadPacientesForDoctor) {
        try { window.loadPacientesForDoctor(); } catch (e) { console.error('loadPacientesForDoctor error:', e); }
    }
}

// Exponer init para el SPA
window.initDietas = initDietas;

// Auto inicializar cuando la página se carga de forma independiente (standalone)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patients-options')) {
        try { initDietas(); } catch (e) { console.error('initDietas error:', e); }
    }
});
