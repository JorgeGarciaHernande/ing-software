document.addEventListener('DOMContentLoaded', () => {
    const currentDoctorId = localStorage.getItem('doctorId');

    if (!currentDoctorId) {
        console.error("No se pudo obtener el ID del doctor.");
        return; 
    }

    const TOUR_COMPLETED_KEY = `tour_completed_${currentDoctorId}`;
    const showTutorialBtn = document.getElementById('btn-open-tour');
    
    if (showTutorialBtn) {
        showTutorialBtn.addEventListener('click', () => {
            
            const confirmRestart = confirm("¿Deseas iniciar el Tour Guiado de nuevo?");
            
            if (confirmRestart) {
                startDoctorTour(TOUR_COMPLETED_KEY); 
            }
        });
    }

    const isTourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    
    if (!isTourCompleted) {
        setTimeout(() => {
            startDoctorTour(TOUR_COMPLETED_KEY); 
        }, 500); 
    }
});

/**
 * Define y ejecuta el tour guiado para el doctor.
 * @param {string} completionKey - La clave única de localStorage para guardar el estado.
 */
function startDoctorTour(completionKey) {
    const tourSteps = [
        {
            title: '¡Bienvenido(a) al Sistema de Gestión de Pacientes!',
            intro: 'Este es un tour rápido para mostrarte las funciones clave del sistema de gestión de pacientes.',
            position: 'center',
            tooltipClass: 'steeps-tooltip'
        },
        {
            element: document.getElementsByClassName('sidebar-toggle-btn')[0], 
            title: 'Navegación Lateral',
            intro: 'Presiona aquí para expandir y ver los nombres completos de todas las secciones.',
            position: 'right'
        },
        {
            element: document.getElementById('btn_home'),
            title: 'Página de Inicio',
            intro: 'Presiona aquí para regresar a la página de inicio en cualquier momento.',
            position: 'right'
        },
        {
            element: document.getElementById('btn-patient'), 
            title: 'Listado de Pacientes',
            intro: 'Aquí accedes a la lista de todos tus pacientes registrados para ver su estado de glucosa.',
            position: 'right'
        },
        {
            element: document.getElementById('btn-open-paciente-modal-sidebar'), 
            title: 'Registrar Nuevos Pacientes',
            intro: 'Usa esta opción para registrar pacientes en el sistema de forma rápida.',
            position: 'right'
        },
        {
            element: document.getElementById('btn-open-create-recipe'), 
            title: 'Crear Nueva Receta',
            intro: 'Usa esta opción para crear recetas médicas para tus pacientes.',
            position: 'right'
        },
        {
            element: document.getElementById('btn_dietas'), 
            title: 'Gestión de Dietas',
            intro: 'En esta sección puedes crear y asignar planes de dieta personalizados para tus pacientes.',
            position: 'right'
        },
        {
            element: document.getElementById('btn_convenios'), 
            title: 'Convenios Médicos',
            intro: 'En esta sección puedes gestionar los convenios médicos asociados.',
            position: 'right'
        },
        {
            element: document.getElementById('btn-appointments'), 
            title: 'Agenda y Citas',
            intro: 'Esta sección contiene el calendario y la herramienta para agendar revisiones de salud de tus pacientes.',
            position: 'right'
        },
        {
            element: document.getElementsByClassName('main-content')[0], 
            title: 'Área de Trabajo',
            intro: 'Todo el contenido, como el calendario o el historial de pacientes, se cargará en esta área central.',
            position: 'center'
        }
    ];

    const intro = introJs().setOptions({
        steps: tourSteps,
        prevLabel: '← Anterior',
        nextLabel: 'Siguiente →',
        skipLabel: 'Saltar Tour',
        doneLabel: 'Finalizar'
    });

    intro.oncomplete(function() {
        localStorage.setItem(completionKey, 'true');
        console.log("Tutorial marcado como completado.");
    });

    intro.onexit(function() {
        localStorage.setItem(completionKey, 'true');
        console.log("Tutorial marcado como saltado.");
    });
    
    intro.start();
}