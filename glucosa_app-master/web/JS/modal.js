import { saveNewPatient } from './backendMenu.js';

document.addEventListener('DOMContentLoaded', () => {
    const openRecetaBtn = document.getElementById('btn-open-create-recipe');
    const recetaDialog = document.getElementById('create-recipe-dialog');
    const closeRecetaBtn = document.getElementById('create-recipe-close-dialog');

    const openBtn = document.getElementById('btn-open-paciente-modal-sidebar');
    const dialog = document.getElementById('paciente-creation-dialog');
    const closeBtn = document.getElementById('paciente-modal-close-dialog');

    const openSettingsBtn = document.getElementById('btn-open-settings');
    const settingsDialog = document.getElementById('settings-dialog');
    const closeSettingsBtn = document.getElementById('settings-close-dialog');

    if (openBtn && dialog) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            dialog.showModal(); 
        });
    }

    if (closeBtn && dialog) {
        closeBtn.addEventListener('click', () => {
            dialog.close(); 
        });
    }


    //Para el modal de recetas
    // 1. Abrir Modal
    if (openRecetaBtn && recetaDialog) {
        openRecetaBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            recetaDialog.showModal(); // Usa el método nativo
        });
    }

    // 2. Cerrar Modal con la 'X'
    if (closeRecetaBtn && recetaDialog) {
        closeRecetaBtn.addEventListener('click', () => {
            recetaDialog.close(); 
        });
    }
    
    // 3. Manejar el Envío del Formulario (Guardado de Receta)
    const newRecetaForm = document.getElementById('new-recipe-form');
    if (newRecetaForm) {
        newRecetaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Aquí iría la lógica para guardar la receta (temporalmente en localStorage, etc.)
            console.log('Nueva receta guardada.'); 
            
            // Cierra el modal y limpia el formulario
            recetaDialog.close(); 
            newRecetaForm.reset(); 
        });
    }

    // Para el modal de configuraciones
    if (openSettingsBtn && settingsDialog) {
        openSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            settingsDialog.showModal(); 
        });
    }

    if (closeSettingsBtn && settingsDialog) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsDialog.close(); 
        });
    }

});