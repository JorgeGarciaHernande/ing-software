// --- CONFIG SUPABASE ---
// Reusar cliente global si ya fue inicializado por otro script.
window.SUPABASE_URL = window.SUPABASE_URL || 'https://lxbjjvfrankabciuizsu.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YmpqdmZyYW5rYWJjaXVpenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU3NDIsImV4cCI6MjA3NDI0MTc0Mn0.2ZFjxl3LAeCoTd6_Th96ob_CuoFgo-o307VRjg28Qmo';
window.supabaseClient = window.supabaseClient || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const supabaseClient = window.supabaseClient;

// --- PUENTES CON LA UI (wrappers perezosos para evitar dependencia del orden de carga) ---
// Antes el código capturaba `window.*` al cargar el archivo; eso falla si
// `script_pacientes.js` se ejecuta después (defer vs no-defer). Aquí exponemos
// funciones que delegan a `window` en tiempo de ejecución.
const mostrarPacientesUI = (...args) => {
    if (typeof window.mostrarPacientesUI === 'function') return window.mostrarPacientesUI(...args);
    console.warn('mostrarPacientesUI no inicializado aún');
};
const mostrarErrorListaUI = (...args) => {
    if (typeof window.mostrarErrorListaUI === 'function') return window.mostrarErrorListaUI(...args);
    console.warn('mostrarErrorListaUI no inicializado aún');
};
const llenarPerfilModalUI = (...args) => {
    if (typeof window.llenarPerfilModalUI === 'function') return window.llenarPerfilModalUI(...args);
    console.warn('llenarPerfilModalUI no inicializado aún');
};
const limpiarYMostrarCargaModalUI = (...args) => {
    if (typeof window.limpiarYMostrarCargaModal === 'function') return window.limpiarYMostrarCargaModal(...args);
    console.warn('limpiarYMostrarCargaModal no inicializado aún');
};

// Funciones auxiliares traídas del HTML para el modal (wrappers)
const calcularEdadUI = (...args) => {
    return (typeof window.calcularEdad === 'function') ? window.calcularEdad(...args) : null;
};
const getEstadoGlucosaDetalladoUI = (...args) => {
    return (typeof window.getEstadoGlucosaDetallado === 'function') ? window.getEstadoGlucosaDetallado(...args) : { texto: 'Desconocido', clase: '' };
};
const formatearFechaSimpleUI = (...args) => {
    return (typeof window.formatearFechaSimple === 'function') ? window.formatearFechaSimple(...args) : (args[0] || 'N/A');
};

// ------------------------------------------------------------------
// --- LÓGICA DE NEGOCIO Y ACCESO A DATOS (BACKEND) ---
// ------------------------------------------------------------------

async function iniciarCargaDePacientes(doctorId) {
    if (!doctorId) return;
    const docId = parseInt(doctorId);
    
    const pacientesContainerUI = window.pacientesContainer;
    const inactivosContainerUI = window.inactivosContainer;
    const loadingElementUI = window.loadingElement;
    const loadingInactivosUI = window.loadingInactivos;

    if (!pacientesContainerUI || !inactivosContainerUI) {
        console.error("Error: Elementos DOM de contenedores no encontrados.");
        return;
    }

    if (loadingElementUI) loadingElementUI.style.display = 'block';
    if (loadingInactivosUI) loadingInactivosUI.style.display = 'block';

    await Promise.all([
        cargarPacientes(pacientesContainerUI, false, docId), 
        cargarPacientes(inactivosContainerUI, true, docId)  
    ]).catch(err => {
        console.error("Fallo al cargar una o ambas listas de pacientes:", err);
    });
}

async function cargarPacientes(containerElement, loadInactive = false, doctorId) {
    if (!containerElement || !doctorId) return; 
    const docId = parseInt(doctorId);

    try {
        let query = supabaseClient
            .from('paciente')
            .select('id_paciente, nombre_completo, correo, ultima_medida_glucosa, activo')
            .eq('id_doctor', docId);

        if (loadInactive) {
            query = query.eq('activo', false); 
        } else {
            query = query.not('activo', 'eq', false); 
        }

        const { data: pacientes, error } = await query
            .order('nombre_completo', { ascending: true });

        if (error) { throw error; }
        
        mostrarPacientesUI(pacientes, containerElement, loadInactive);

    } catch (error) {
        console.error(`Error al cargar la lista ${loadInactive ? 'inactiva' : 'activa'} de pacientes:`, error);
        mostrarErrorListaUI(`Error al cargar pacientes: ${error.message}`, loadInactive);
    }
}

async function cambiarEstadoPaciente(pacienteId, esActivoActual) {
    const nuevoEstado = !esActivoActual; 
    const doctorId = parseInt(localStorage.getItem('doctorId'));

    try {
        const { error } = await supabaseClient
            .from('paciente')
            .update({ activo: nuevoEstado })
            .eq('id_paciente', pacienteId);

        if (error) { throw error; }

        await iniciarCargaDePacientes(doctorId); 

    } catch (error) {
        console.error('Error al cambiar estado del paciente en DB:', error);
        throw new Error(`Fallo en la base de datos al cambiar el estado: ${error.message}`);
    }
}

/**
 * Muestra el modal de perfil de un paciente. Solo carga datos, no grafica.
 */
async function mostrarPerfilModal(pacienteId) { 
    const profileModalUI = window.profileModal;
    const graphContainer = window.graphContainer;
    
    if (!profileModalUI) return;
    
    limpiarYMostrarCargaModalUI(true);
    profileModalUI.showModal();
    
    const currentDoctorId = localStorage.getItem('doctorId');

    try {
        // Carga datos del paciente
        const { data: paciente, error: pacienteError } = await supabaseClient
            .from('paciente')
            .select('id_paciente, nombre_completo, fecha_nacimiento, correo, ultima_medida_glucosa, altura, peso, id_doctor, activo')
            .eq('id_paciente', pacienteId)
            .single();

        if (pacienteError) { throw pacienteError; }
        if (!paciente || paciente.id_doctor != currentDoctorId) {
            throw new Error("Paciente no encontrado o acceso no autorizado.");
        }
        
        // Rellena la UI con los datos del paciente
        llenarPerfilModalUI(paciente);
        
        // Ocultar el contenedor del gráfico ya que usaremos tablas en el PDF
        if (graphContainer) graphContainer.style.display = 'none';

    } catch (error) {
        console.error("Error al cargar perfil en modal:", error);
        if (graphContainer) graphContainer.style.display = 'none';
        
        profileModalUI.querySelector('#profile-nombre').textContent = 'Error al Cargar';
        const errorP = document.createElement('p');
        errorP.textContent = `Error: ${error.message}`;
        errorP.style.color = 'red';
        errorP.id = 'modal-load-error';
        const modalContent = profileModalUI.querySelector('.profile-modal-content');
        if(modalContent) modalContent.appendChild(errorP);
    }
}

// ------------------------------------------------------------------
// --- FUNCIÓN PARA DESCARGAR PDF (Implementando AutoTable con estilo) ---
// ------------------------------------------------------------------

/**
 * Descarga los datos de un paciente en formato PDF, incluyendo la tabla de mediciones filtrada.
 * @param {number} pacienteId - ID del paciente.
 * @param {string} startDate - Fecha de inicio del filtro (YYYY-MM-DD o '').
 * @param {string} endDate - Fecha de fin del filtro (YYYY-MM-DD o '').
 */
async function handleDescargarDatos(pacienteId, startDate, endDate) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert("🚨 Error: La librería jsPDF no está cargada. Asegúrate de incluirla en el HTML.");
        console.error("jsPDF no definido.");
        return;
    }

    try {
        // 1. Cargar datos del paciente
        const { data: paciente, error: pacienteError } = await supabaseClient
            .from('paciente')
            .select('nombre_completo, fecha_nacimiento, correo, ultima_medida_glucosa, altura, peso, activo')
            .eq('id_paciente', pacienteId)
            .single();

        if (pacienteError) { throw pacienteError; }
        if (!paciente) { throw new Error("Paciente no encontrado."); }

        // 2. Cargar historial de mediciones, APLICANDO FILTROS DE FECHA
        let queryMediciones = supabaseClient
            .from('mediciones')
            .select('glucosa, peso, fecha_registro')
            .eq('id_paciente', pacienteId)
            .order('fecha_registro', { ascending: false });

        let filtroTexto = "TODO EL HISTORIAL";

        if (startDate) {
            queryMediciones = queryMediciones.gte('fecha_registro', startDate);
            filtroTexto = `DESDE ${formatearFechaSimpleUI(startDate)}`;
        }
        
        if (endDate) {
            // Se debe incluir la fecha de fin completa, por lo que a la fecha se le añade la hora de fin del día (23:59:59)
            queryMediciones = queryMediciones.lte('fecha_registro', `${endDate}T23:59:59`);
            if (filtroTexto !== "TODO EL HISTORIAL") {
                filtroTexto += ` HASTA ${formatearFechaSimpleUI(endDate)}`;
            } else {
                filtroTexto = `HASTA ${formatearFechaSimpleUI(endDate)}`;
            }
        }
        
        const { data: mediciones, error: medicionesError } = await queryMediciones;

        if (medicionesError) { 
            console.warn("Advertencia: No se pudo cargar el historial de mediciones con filtro.", medicionesError);
        }

        // 3. Inicializar PDF
        const doc = new window.jspdf.jsPDF(); 
        let y = 15; 

        // Generación de Datos Estáticos
        const edad = calcularEdadUI(paciente.fecha_nacimiento);
        const estadoGlucosaInfo = getEstadoGlucosaDetalladoUI(paciente.ultima_medida_glucosa);
        const fechaNacimientoFormateada = paciente.fecha_nacimiento ? formatearFechaSimpleUI(paciente.fecha_nacimiento) : 'N/A';
        const fechaActual = formatearFechaSimpleUI(new Date().toISOString().split('T')[0]);

        doc.setFontSize(22); doc.text("Reporte de Paciente", 105, y, null, null, 'center'); y += 10;
        doc.setFontSize(16); doc.text(paciente.nombre_completo || 'Paciente Desconocido', 105, y, null, null, 'center'); y += 10;
        doc.setFontSize(10); doc.text(`Generado el: ${fechaActual}`, 105, y, null, null, 'center'); y += 15;
        doc.line(20, y - 5, 190, y - 5); 
        
        // Datos Personales
        doc.setFontSize(14); doc.text("Datos Personales", 20, y); y += 7;
        doc.setFontSize(12);
        doc.text("ID Paciente:", 20, y); doc.text(pacienteId.toString(), 65, y); y += 6;
        doc.text("Correo Electrónico:", 20, y); doc.text(paciente.correo || 'N/A', 65, y); y += 6;
        doc.text("Fecha Nacimiento:", 20, y); doc.text(fechaNacimientoFormateada, 65, y); y += 6;
        doc.text("Edad:", 20, y); doc.text(edad !== null ? `${edad} años` : 'N/A', 65, y); y += 6;
        doc.line(20, y - 5, 190, y - 5); 
        
        // Datos Médicos / Físicos
        doc.setFontSize(14); doc.text("Datos Médicos y Físicos", 20, y); y += 7;
        doc.setFontSize(12);
        doc.text("Estado:", 20, y); doc.text(paciente.activo === false ? 'INACTIVO (Archivado)' : 'ACTIVO', 65, y); y += 6;
        
        // CORRECCIÓN DE ESPACIO
        doc.text("ÚLTIMA Glucosa (Paciente):", 20, y); doc.text(paciente.ultima_medida_glucosa ? `${paciente.ultima_medida_glucosa} mg/dL` : 'Sin registro', 90, y); y += 6; 
        
        doc.text("Estado Glucosa:", 20, y); doc.text(estadoGlucosaInfo.texto, 65, y); y += 6;
        doc.text("Altura:", 20, y); doc.text(paciente.altura ? `${(paciente.altura * 100).toFixed(0)} cm` : 'N/A', 65, y); y += 6;
        doc.text("Peso:", 20, y); doc.text(paciente.peso ? `${paciente.peso} kg` : 'N/A', 65, y); y += 15;

        // IMPLEMENTACIÓN DE AUTOTABLE PARA EL HISTORIAL
        const medicionesFiltradas = mediciones || [];
        
        doc.setFontSize(14); 
        doc.text("HISTORIAL DE MEDICIONES", 20, y); y += 7;
        doc.setFontSize(10); 
        doc.text(`Filtro Aplicado: ${filtroTexto} (${medicionesFiltradas.length} registros)`, 20, y); y += 5;


        if (medicionesFiltradas.length > 0) {
            
            const tableData = medicionesFiltradas.map(m => {
                const estado = getEstadoGlucosaDetalladoUI(m.glucosa);
                return [
                    m.fecha_registro ? formatearFechaSimpleUI(m.fecha_registro.split('T')[0]) + ' ' + m.fecha_registro.split('T')[1].substring(0, 5) : 'N/A', // Fecha y Hora
                    `${m.glucosa} mg/dL`,
                    m.peso ? `${m.peso} kg` : 'N/A',
                    estado.texto
                ];
            });

            doc.autoTable({
                startY: y + 5,
                head: [['Fecha y Hora', 'Glucosa', 'Peso', 'Estado']],
                body: tableData,
                theme: 'striped', 
                headStyles: { 
                    fillColor: [30, 144, 255], 
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold'
                },
                alternateRowStyles: { 
                    fillColor: [240, 248, 255] 
                },
                styles: {
                    cellPadding: 3,
                    fontSize: 10,
                    valign: 'middle',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 45 }, 
                    1: { cellWidth: 35 }, 
                    2: { cellWidth: 25 }, 
                    3: { cellWidth: 45 }  
                },
                margin: { left: 20, right: 20 },
                didDrawPage: (data) => {
                    y = data.cursor.y; 
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) { 
                        const estadoTexto = data.cell.text[0]; 
                        if (estadoTexto.includes('Bajo')) {
                            data.cell.styles.textColor = [0, 0, 255]; 
                        } else if (estadoTexto.includes('Normal')) {
                            data.cell.styles.textColor = [34, 139, 34]; 
                        } else if (estadoTexto.includes('Elevado')) {
                            data.cell.styles.textColor = [255, 165, 0]; 
                        } else if (estadoTexto.includes('Alto')) {
                            data.cell.styles.textColor = [255, 0, 0]; 
                        }
                        data.cell.styles.fontStyle = 'bold'; 
                    }
                }
            });
            y = doc.autoTable.previous.finalY + 10; 
        } else {
            doc.setFontSize(12);
            doc.text("No se encontró historial de mediciones para el rango de fechas seleccionado.", 20, y);
            y += 10;
        }

        // 4. Guardar el PDF (inicia la descarga)
        const fileName = `Reporte_${paciente.nombre_completo.replace(/\s/g, '_')}_${pacienteId}.pdf`;
        doc.save(fileName);
        alert(`✅ Se está descargando el archivo: ${fileName}`);

    } catch (error) {
        console.error("Error al generar o descargar el PDF:", error);
        alert(`❌ Error al intentar descargar el PDF: ${error.message}.`);
    }
}


// ------------------------------------------------------------------
// --- EXPOSICIÓN GLOBAL (Para que mis_pacientes.html pueda llamarlas) ---
// ------------------------------------------------------------------
window.iniciarCargaDePacientes = iniciarCargaDePacientes;
window.cambiarEstadoPaciente = cambiarEstadoPaciente;
window.mostrarPerfilModal = mostrarPerfilModal;
// EXPOSICIÓN DE LA FUNCIÓN ACTUALIZADA
window.handleDescargarDatos = handleDescargarDatos;


//Para el modal de notas en pacientes.html
document.addEventListener('DOMContentLoaded', async () => {
    // ... (tus referencias existentes) ...
    const notesModal = document.getElementById('notes-modal-dialog');
    const closeNotesBtn = notesModal ? notesModal.querySelector('.close-btn-dialog') : null;
    const notesForm = notesModal ? document.getElementById('notes-form') : null;
    const notesTitle = notesModal ? document.getElementById('notes-modal-title') : null;
    const pacientesContainer = document.getElementById('pacientes-container'); // Contenedor padre

    // ----------------------------------------------------
    // FUNCIÓN DE CONTROL DEL MODAL DE NOTAS
    // ----------------------------------------------------

    function openNotesModal(pacienteId, pacienteNombre) {
        if (notesModal && notesModal.showModal) {
            if (notesTitle) {
                notesTitle.textContent = `Notas para ${pacienteNombre}`;
            }
            notesModal.setAttribute('data-current-patient-id', pacienteId); 
            notesModal.showModal();
            // ... (limpiar y enfocar el formulario) ...
        }
    }

    function closeNotesModal() {
        if (notesModal && notesModal.close) {
            notesModal.close();
        }
    }

    // ----------------------------------------------------
    // 1. SOLUCIÓN CLAVE: DELEGACIÓN DE EVENTOS EN EL CONTENEDOR
    // ----------------------------------------------------

    if (pacientesContainer && notesModal) {
        // Escuchamos los clics en el contenedor padre que existe desde el inicio.
        pacientesContainer.addEventListener('click', (e) => {
            // Buscamos si el elemento clickeado o su padre más cercano tiene la clase del botón de notas
            const addNoteBtn = e.target.closest('.btn-add-note');

            if (addNoteBtn) {
                e.preventDefault();
                
                // Obtenemos el ID y el nombre directamente del botón o de la tarjeta padre
                // Asumimos que el ID está en la tarjeta o en el botón (por tu ajuste)
                const patientId = addNoteBtn.getAttribute('data-paciente-id'); 
                const tarjetaPadre = addNoteBtn.closest('.patient-card');
                
                // El nombre completo está en el <h3>
                const nombreCompleto = tarjetaPadre ? tarjetaPadre.querySelector('h3').textContent : 'Paciente Desconocido'; 

                // Si el ID se obtuvo correctamente, abrimos el modal
                if (patientId) {
                    openNotesModal(patientId, nombreCompleto);
                } else {
                    console.error("No se pudo obtener el ID del paciente.");
                }
            }
        });
    }

    // 2. Listener para cerrar el modal de notas
    if (closeNotesBtn) {
        closeNotesBtn.addEventListener('click', closeNotesModal);
    }
    
    // 3. Listener para el envío del formulario (Cerrar después de guardar)
    if (notesForm) {
        notesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Simulando guardar nota...");
            closeNotesModal(); 
        });
    }
});