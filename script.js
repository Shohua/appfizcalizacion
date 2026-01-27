document.addEventListener("DOMContentLoaded", function() {
    const { jsPDF } = window.jspdf;
    
    const FiscalizadorApp = {
        // ============================================
        // CONSTANTES Y CONFIGURACIÓN
        // ============================================
        CONFIG: {
            MAX_IMAGE_SIZE: 800, // Tamaño máximo para compresión
            JPEG_QUALITY: 0.7,   // Calidad JPEG para compresión
            CSV_URL: 'questions.csv', // Ruta al CSV de preguntas
            STORAGE_KEY: 'fiscalizacionObra_v2'
        },
        
        // ============================================
        // ESTADO DE LA APLICACIÓN
        // ============================================
        estado: {
            datosGenerales: {},
            departamentos: [],
            departamentoActual: null,
            observaciones: [],
            preguntas: [], // Preguntas actualmente en uso
            preguntasOriginales: [], // Desde questions.csv
            preguntasPersonalizadas: [], // Desde archivo subido
            nombreArchivoPersonalizado: null, // Nombre del archivo CSV subido
            estructura: {}, // Estructura jerárquica
            imagenesTemporales: [],
            preguntaActual: null,
            modalNoInstance: null
        },
        
        // ============================================
        // INICIALIZACIÓN
        // ============================================
        async init() {
            this.setupEventListeners();
            await this.cargarPreguntasDesdeCSV();
            this.cargarAvance(); // Carga el avance y el CSV personalizado si existe
        },
        
        // ============================================
        // CARGA DE PREGUNTAS
        // ============================================
        async cargarPreguntasDesdeCSV() {
            this.mostrarLoading('Cargando preguntas por defecto...');
            try {
                const response = await fetch(this.CONFIG.CSV_URL);
                if (!response.ok) throw new Error(`Error ${response.status}`);
                
                const csvText = await response.text();
                this.estado.preguntasOriginales = this.parsearCSV(csvText);
                this.estado.preguntas = this.estado.preguntasOriginales; // Usar por defecto al inicio
                this.construirEstructura();
                console.log(`✅ ${this.estado.preguntas.length} preguntas cargadas desde CSV`);
            } catch (error) {
                console.error('Error cargando CSV por defecto:', error);
                this.mostrarNotificacion('Error cargando preguntas. Usando estructura de emergencia.', 'danger');
                this.cargarPreguntasPorDefecto();
            } finally {
                this.ocultarLoading();
            }
        },
        
        cargarCSVCustom(event) {
            const file = event.target.files[0];
            if (!file) return;

            this.mostrarLoading('Cargando cuestionario personalizado...');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const preguntas = this.parsearCSV(csvText);
                    
                    if(preguntas.length === 0){
                        throw new Error("El CSV personalizado está vacío o en formato incorrecto.");
                    }
                    
                    // Guardar en estado y localStorage
                    this.estado.preguntasPersonalizadas = preguntas;
                    this.estado.nombreArchivoPersonalizado = file.name;
                    
                    localStorage.setItem('csvPersonalizado', csvText);
                    localStorage.setItem('nombreCsvPersonalizado', file.name);

                    // Cambiar al cuestionario personalizado
                    this.estado.preguntas = this.estado.preguntasPersonalizadas;
                    this.construirEstructura();
                    
                    // Actualizar UI
                    document.getElementById('cuestionarioPersonalizado').checked = true;
                    this.actualizarInfoArchivoPersonalizado();
                    
                    this.mostrarNotificacion(`Cuestionario '${file.name}' cargado con ${this.estado.preguntas.length} preguntas.`, 'success');
                } catch (error) {
                    console.error("Error al procesar CSV personalizado:", error);
                    this.mostrarNotificacion(error.message, 'danger');
                    this.revertirAPreguntasPorDefecto();
                } finally {
                    this.ocultarLoading();
                    // Limpiar el input para permitir volver a subir el mismo archivo
                    event.target.value = '';
                }
            };

            reader.onerror = () => {
                this.mostrarNotificacion('Error al leer el archivo.', 'danger');
                this.ocultarLoading();
            };
            
            reader.readAsText(file, 'UTF-8');
        },

        parsearCSV(csvText) {
            const lines = csvText.split(/\r?\n/);
            const preguntas = [];
            if (lines.length === 0) return preguntas;

            const headers = lines[0].split(';').map(h => h.trim());
            const requiredHeaders = ['id', 'section', 'subsection', 'question', 'order'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

            if(missingHeaders.length > 0) {
                throw new Error(`El CSV no contiene las columnas requeridas: ${missingHeaders.join(', ')}`);
            }

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].split(';').map(v => v.trim());
                if (values.length < headers.length) continue;
                
                const pregunta = {};
                headers.forEach((header, index) => {
                    pregunta[header] = values[index] || '';
                });
                
                if (!pregunta.id) pregunta.id = `q${Date.now()}_${i}`;
                
                preguntas.push(pregunta);
            }
            return preguntas;
        },

        actualizarInfoArchivoPersonalizado() {
            const fileNameDiv = document.getElementById('csvFileName');
            if (this.estado.nombreArchivoPersonalizado) {
                fileNameDiv.textContent = `Archivo cargado: ${this.estado.nombreArchivoPersonalizado}`;
                fileNameDiv.style.display = 'block';
            } else {
                fileNameDiv.style.display = 'none';
            }
        },

        revertirAPreguntasPorDefecto() {
            document.getElementById('cuestionarioPorDefecto').checked = true;
            this.estado.preguntas = this.estado.preguntasOriginales;
            this.estado.preguntasPersonalizadas = [];
            this.estado.nombreArchivoPersonalizado = null;
            
            localStorage.removeItem('csvPersonalizado');
            localStorage.removeItem('nombreCsvPersonalizado');
            
            this.construirEstructura();
            this.actualizarInfoArchivoPersonalizado();
            this.gestionarOpcionesCuestionario();
        },
        
        cargarPreguntasPorDefecto() {
            // Estructura mínima en caso de fallo total
            this.estado.preguntas = [
                { id: 'O01', section: 'OBSERVACIONES GENERALES', subsection: '', question: '01. Observaciones adicionales', order: '1' }
            ];
            this.construirEstructura();
        },

        descargarCSV() {
            const csvContent = this.generarContenidoCSV(this.estado.preguntas);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "cuestionario_actual.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        generarContenidoCSV(preguntas) {
            if (preguntas.length === 0) return "";
            const headers = Object.keys(preguntas[0]).join(';');
            const rows = preguntas.map(p => Object.values(p).join(';'));
            return [headers, ...rows].join('\n');
        },
        
        construirEstructura() {
            this.estado.estructura = {};
            this.estado.preguntas.forEach(pregunta => {
                const seccion = pregunta.section || 'SIN SECCIÓN';
                const subseccion = pregunta.subsection || 'SIN SUBSECCIÓN';
                if (!this.estado.estructura[seccion]) this.estado.estructura[seccion] = {};
                if (!this.estado.estructura[seccion][subseccion]) this.estado.estructura[seccion][subseccion] = [];
                this.estado.estructura[seccion][subseccion].push({
                    id: pregunta.id,
                    texto: pregunta.question,
                    orden: parseInt(pregunta.order) || 999
                });
            });
            Object.keys(this.estado.estructura).forEach(seccion => {
                Object.keys(this.estado.estructura[seccion]).forEach(subseccion => {
                    this.estado.estructura[seccion][subseccion].sort((a, b) => a.orden - b.orden);
                });
            });
        },
        
        // ============================================
        // MANEJO DE EVENTOS
        // ============================================
        setupEventListeners() {
            document.getElementById('iniciarInspeccion').addEventListener('click', () => this.iniciarInspeccion());
            document.getElementById('subirImagenBtn').addEventListener('click', () => document.getElementById('imagenInput').click());
            document.getElementById('tomarFotoBtn').addEventListener('click', () => document.getElementById('fotoInput').click());
            document.getElementById('imagenInput').addEventListener('change', (e) => this.cargarImagen(e));
            document.getElementById('fotoInput').addEventListener('change', (e) => this.cargarImagen(e));
            document.getElementById('guardarObservacionBtn').addEventListener('click', () => this.guardarObservacion());
            document.getElementById('otroDepartamentoBtn')?.addEventListener('click', () => this.prepararNuevoDepartamento());
            document.getElementById('finalizarInspeccion')?.addEventListener('click', () => this.generarPDF());
            document.getElementById('guardarAvanceBtn')?.addEventListener('click', () => {
                this.guardarAvance();
                this.mostrarBadgeGuardado();
            });
            document.getElementById('generarExcelBtn')?.addEventListener('click', () => this.generarExcel());
            
            // Nuevos eventos para cuestionario
            document.querySelectorAll('input[name="cuestionarioOpcion"]').forEach(radio => {
                radio.addEventListener('change', () => this.gestionarOpcionesCuestionario());
            });
            document.getElementById('csvFileInput').addEventListener('change', (e) => this.cargarCSVCustom(e));
            document.getElementById('descargarCsvActual').addEventListener('click', () => this.descargarCSV());

            window.addEventListener('beforeunload', (e) => {
                if (this.estado.departamentoActual || this.estado.departamentos.length > 0) {
                    e.preventDefault();
                    e.returnValue = 'Tienes datos no guardados. ¿Estás seguro de querer salir?';
                }
            });
        },
        
        gestionarOpcionesCuestionario() {
            const opcion = document.querySelector('input[name="cuestionarioOpcion"]:checked').value;
            const controlesPersonalizado = document.getElementById('controlesPersonalizado');

            if (opcion === 'custom') {
                controlesPersonalizado.style.display = 'block';
                if (this.estado.preguntasPersonalizadas.length > 0) {
                    this.estado.preguntas = this.estado.preguntasPersonalizadas;
                    this.construirEstructura();
                }
            } else {
                controlesPersonalizado.style.display = 'none';
                this.estado.preguntas = this.estado.preguntasOriginales;
                this.construirEstructura();
            }
        },

        // ============================================
        // LÓGICA DE INSPECCIÓN
        // ============================================
        iniciarInspeccion() {
            const numeroDepto = document.getElementById('numeroDepto').value.trim();
            if (!numeroDepto) {
                alert('Por favor ingresa un número de departamento');
                return;
            }
            if (this.estado.departamentos.some(depto => depto.numero === numeroDepto)) {
                alert('Este departamento ya ha sido inspeccionado');
                return;
            }
            
            const opcionCuestionario = document.querySelector('input[name="cuestionarioOpcion"]:checked').value;
            if (opcionCuestionario === 'custom' && this.estado.preguntasPersonalizadas.length === 0) {
                alert("Por favor, suba un archivo CSV de cuestionario personalizado antes de iniciar.");
                return;
            }
            
            this.estado.preguntas = (opcionCuestionario === 'custom') 
                ? this.estado.preguntasPersonalizadas 
                : this.estado.preguntasOriginales;
            this.construirEstructura();

            if (this.estado.departamentos.length === 0) {
                this.estado.datosGenerales = {
                    nombreObra: document.getElementById('nombreObra').value.trim(),
                    comuna: document.getElementById('comuna').value.trim(),
                    empresaContratista: document.getElementById('empresaContratista').value.trim(),
                    entidadPatrocinante: document.getElementById('entidadPatrocinante').value.trim(),
                    supervisor: document.getElementById('supervisor').value.trim(),
                    directorObra: document.getElementById('directorObra').value.trim(),
                    cantidadDormitorios: parseInt(document.getElementById('cantidadDormitorios').value)
                };
                ['nombreObra', 'comuna', 'empresaContratista', 'entidadPatrocinante', 'supervisor', 'directorObra', 'cantidadDormitorios', 'cuestionarioSection'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.disabled = true;
                        if(id === 'cuestionarioSection') el.style.pointerEvents = 'none';
                    }
                });
            }
            
            this.estado.departamentoActual = {
                numero: numeroDepto,
                fechaInicio: new Date().toISOString(),
                respuestas: {}
            };
            
            this.mostrarPreguntas();
            document.getElementById('datosGeneralesSection').style.display = 'none';
            document.getElementById('selectorDeptoSection').style.display = 'none';
            document.getElementById('cuestionarioSection').style.display = 'none';
            document.getElementById('finalizarContainer').style.display = 'block';
            this.guardarAvance();
        },

        // ============================================
        // GESTIÓN DE OBSERVACIONES (CORRECCIÓN DEL BUG)
        // ============================================
        obtenerPreguntaCompleta(preguntaId) {
            return this.estado.preguntas.find(p => p.id === preguntaId);
        },
        
        obtenerJerarquia(preguntaId) {
            const pregunta = this.obtenerPreguntaCompleta(preguntaId);
            if (!pregunta) return null;
            
            return {
                seccion: pregunta.section,
                subseccion: pregunta.subsection,
                preguntaId: pregunta.id,
                preguntaTexto: pregunta.question
            };
        },
        
        // ============================================
        // INTERFAZ DE USUARIO
        // ============================================
        mostrarLoading(texto = 'Procesando...') {
            const overlay = document.getElementById('loadingOverlay');
            const textElem = document.getElementById('loadingText');
            textElem.textContent = texto;
            overlay.style.display = 'flex';
        },
        
        ocultarLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        },
        
        mostrarBadgeGuardado() {
            const badge = document.getElementById('savedBadge');
            badge.style.display = 'block';
            setTimeout(() => {
                badge.style.display = 'none';
            }, 3000);
        },
        
        mostrarNotificacion(mensaje, tipo = 'info') {
            const container = document.body;
            const alertId = `notif-${Date.now()}`;
            const alertHtml = `
                <div id="${alertId}" class="alert alert-${tipo} alert-dismissible fade show" role="alert" style="position:fixed; top:20px; right:20px; z-index:1050;">
                    ${mensaje}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', alertHtml);

            const alertElement = document.getElementById(alertId);
            const bsAlert = new bootstrap.Alert(alertElement);

            setTimeout(() => {
                bsAlert.close();
            }, 5000);
        },
                
        // El resto del código (mostrarPreguntas, crearSeccionPreguntas, etc.) sigue igual
        // ...
        mostrarPreguntas() {
            const contenedor = document.getElementById('seccionesPreguntas');
            contenedor.innerHTML = '';
            
            // Título del departamento
            const tituloDepto = document.createElement('div');
            tituloDepto.className = 'depto-titulo';
            tituloDepto.innerHTML = `<h2>Departamento: ${this.estado.departamentoActual.numero}</h2>`;
            contenedor.appendChild(tituloDepto);
            
            // Mostrar secciones (excepto dormitorios)
            Object.keys(this.estado.estructura).forEach(seccion => {
                if (!seccion.startsWith('F. DORMITORIO') && seccion !== 'OBSERVACIONES GENERALES') {
                    this.crearSeccionPreguntas(contenedor, seccion);
                }
            });
            
            // Crear dormitorios según cantidad
            for (let i = 1; i <= this.estado.datosGenerales.cantidadDormitorios; i++) {
                this.crearSeccionPreguntas(contenedor, 'F. DORMITORIO', i);
            }
            
            // Observaciones generales
            this.crearSeccionPreguntas(contenedor, 'OBSERVACIONES GENERALES');
        },
        
        crearSeccionPreguntas(contenedor, seccion, dormitorioNumero = null) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section';
            sectionDiv.dataset.seccion = seccion;
            if (dormitorioNumero) {
                sectionDiv.dataset.dormitorio = dormitorioNumero;
            }
            
            const titulo = document.createElement('h3');
            if (dormitorioNumero && seccion === 'F. DORMITORIO') {
                titulo.textContent = `${seccion} ${dormitorioNumero}`;
            } else {
                titulo.textContent = seccion;
            }
            sectionDiv.appendChild(titulo);
            
            // Obtener subsecciones de esta sección
            const subsecciones = this.estado.estructura[seccion];
            if (!subsecciones) return;
            
            Object.keys(subsecciones).forEach(subseccion => {
                if (subseccion.trim()) {
                    const subseccionDiv = document.createElement('div');
                    subseccionDiv.className = 'mb-4';
                    
                    const subseccionTitulo = document.createElement('h5');
                    subseccionTitulo.className = 'text-secondary mb-3';
                    subseccionTitulo.textContent = subseccion;
                    subseccionDiv.appendChild(subseccionTitulo);
                    
                    this.crearPreguntasDeSubseccion(subseccionDiv, seccion, subseccion, dormitorioNumero);
                    sectionDiv.appendChild(subseccionDiv);
                } else {
                    // Preguntas sin subsección
                    this.crearPreguntasDeSubseccion(sectionDiv, seccion, '', dormitorioNumero);
                }
            });
            
            contenedor.appendChild(sectionDiv);
        },
        
        crearPreguntasDeSubseccion(container, seccion, subseccion, dormitorioNumero) {
            const preguntas = this.estado.estructura[seccion]?.[subseccion] || [];
            
            preguntas.forEach(pregunta => {
                const preguntaDiv = document.createElement('div');
                preguntaDiv.className = 'question';
                preguntaDiv.dataset.preguntaId = pregunta.id;
                preguntaDiv.dataset.seccion = seccion;
                preguntaDiv.dataset.subseccion = subseccion;
                if (dormitorioNumero) {
                    preguntaDiv.dataset.dormitorio = dormitorioNumero;
                }
                
                // Texto de la pregunta
                const label = document.createElement('div');
                label.className = 'pregunta-texto';
                label.textContent = pregunta.texto;
                preguntaDiv.appendChild(label);
                
                // Selector de respuesta
                const select = document.createElement('select');
                select.className = 'form-select respuesta';
                select.dataset.preguntaId = pregunta.id;
                
                const opcionSi = document.createElement('option');
                opcionSi.value = 'si';
                opcionSi.textContent = 'Sí';
                
                const opcionNo = document.createElement('option');
                opcionNo.value = 'no';
                opcionNo.textContent = 'No';
                
                select.appendChild(opcionSi);
                select.appendChild(opcionNo);
                
                select.addEventListener('change', (e) => {
                    if (e.target.value === 'no') {
                        this.estado.preguntaActual = {
                            id: pregunta.id,
                            seccion: seccion,
                            subseccion: subseccion,
                            dormitorio: dormitorioNumero,
                            texto: pregunta.texto
                        };
                        this.mostrarModalNo();
                    }
                });
                
                preguntaDiv.appendChild(select);
                container.appendChild(preguntaDiv);
            });
        },
        
        // ============================================
        // MODAL PARA OBSERVACIONES
        // ============================================
        mostrarModalNo() {
            if (!this.estado.preguntaActual) return;
            
            // Configurar información de la pregunta
            document.getElementById('preguntaSeccion').textContent = 
                `${this.estado.preguntaActual.seccion} ${this.estado.preguntaActual.dormitorio ? `- Dormitorio ${this.estado.preguntaActual.dormitorio}` : ''}`;
            document.getElementById('preguntaTexto').textContent = this.estado.preguntaActual.texto;
            
            // Limpiar campos
            document.getElementById('descripcionProblema').value = '';
            document.getElementById('alertaExito').style.display = 'none';
            this.estado.imagenesTemporales = [];
            
            // Actualizar galería
            document.getElementById('galeriaImagenes').style.display = 'none';
            document.getElementById('thumbnails').innerHTML = '';
            this.actualizarContadorImagenes();
            
            // Mostrar modal
            if (!this.estado.modalNoInstance) {
                this.estado.modalNoInstance = new bootstrap.Modal(document.getElementById('modalNo'));
            }
            this.estado.modalNoInstance.show();
            
            setTimeout(() => {
                document.getElementById('descripcionProblema').focus();
            }, 300);
        },
        
        async cargarImagen(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            event.target.value = '';
            
            // Verificar tamaño máximo (10MB)
            if (file.size > 10 * 1024 * 1024) {
                this.mostrarNotificacion('La imagen es demasiado grande (máximo 10MB)', 'warning');
                return;
            }
            
            this.mostrarLoading('Comprimiendo imagen...');
            
            try {
                const imagenComprimida = await this.comprimirImagen(file);
                this.estado.imagenesTemporales.push(imagenComprimida);
                this.actualizarGaleria();
                this.mostrarNotificacion('Imagen agregada y comprimida', 'success');
            } catch (error) {
                console.error('Error procesando imagen:', error);
                this.mostrarNotificacion('Error al procesar la imagen', 'danger');
            } finally {
                this.ocultarLoading();
            }
        },
        
        async comprimirImagen(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        
                        // Calcular nuevas dimensiones manteniendo proporción
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > this.CONFIG.MAX_IMAGE_SIZE || height > this.CONFIG.MAX_IMAGE_SIZE) {
                            if (width > height) {
                                height = Math.round((height * this.CONFIG.MAX_IMAGE_SIZE) / width);
                                width = this.CONFIG.MAX_IMAGE_SIZE;
                            } else {
                                width = Math.round((width * this.CONFIG.MAX_IMAGE_SIZE) / height);
                                height = this.CONFIG.MAX_IMAGE_SIZE;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Convertir a JPEG con calidad reducida
                        const imagenComprimida = canvas.toDataURL('image/jpeg', this.CONFIG.JPEG_QUALITY);
                        resolve(imagenComprimida);
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        actualizarGaleria() {
            const galeria = document.getElementById('galeriaImagenes');
            const thumbnails = document.getElementById('thumbnails');
            
            if (this.estado.imagenesTemporales.length > 0) {
                galeria.style.display = 'block';
                thumbnails.innerHTML = '';
                
                this.estado.imagenesTemporales.forEach((img, index) => {
                    const container = document.createElement('div');
                    container.className = 'thumbnail-container';
                    
                    const thumbnail = document.createElement('img');
                    thumbnail.src = img;
                    thumbnail.className = 'thumbnail-img';
                    thumbnail.title = 'Click para ver en grande';
                    thumbnail.onclick = () => this.verImagenGrande(img);
                    
                    const btnEliminar = document.createElement('button');
                    btnEliminar.className = 'btn-eliminar-img';
                    btnEliminar.innerHTML = '×';
                    btnEliminar.title = 'Eliminar imagen';
                    btnEliminar.onclick = (e) => {
                        e.stopPropagation();
                        this.eliminarImagenTemporal(index);
                    };
                    
                    container.appendChild(thumbnail);
                    container.appendChild(btnEliminar);
                    thumbnails.appendChild(container);
                });
            } else {
                galeria.style.display = 'none';
            }
            
            this.actualizarContadorImagenes();
        },
        
        actualizarContadorImagenes() {
            const contador = document.getElementById('contadorImagenes');
            contador.querySelector('strong').textContent = this.estado.imagenesTemporales.length;
            
            // Cambiar color según cantidad
            const strongElem = contador.querySelector('strong');
            if (this.estado.imagenesTemporales.length === 0) {
                strongElem.style.color = 'inherit';
            } else if (this.estado.imagenesTemporales.length >= 3) {
                strongElem.style.color = '#28a745';
            } else {
                strongElem.style.color = '#007bff';
            }
        },
        
        eliminarImagenTemporal(index) {
            if (confirm('¿Deseas eliminar esta imagen?')) {
                this.estado.imagenesTemporales.splice(index, 1);
                this.actualizarGaleria();
                this.mostrarNotificacion('Imagen eliminada', 'info');
            }
        },
        
        verImagenGrande(imgSrc) {
            const modalHTML = `
                <div class="modal fade" id="modalImagenGrande" tabindex="-1">
                    <div class="modal-dialog modal-xl modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Vista previa</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center p-0">
                                <img src="${imgSrc}" class="imagen-preview" style="max-height: 80vh;">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalAnterior = document.getElementById('modalImagenGrande');
            if (modalAnterior) modalAnterior.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('modalImagenGrande'));
            modal.show();
            
            document.getElementById('modalImagenGrande').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        },
        
        async guardarObservacion() {
            if (!this.estado.preguntaActual) return;
            
            const descripcion = document.getElementById('descripcionProblema').value.trim();
            
            if (!descripcion) {
                this.mostrarNotificacion('Por favor ingresa una descripción del problema', 'warning');
                return;
            }
            
            // Crear observación con estructura completa
            const nuevaObservacion = {
                id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                departamento: this.estado.departamentoActual.numero,
                preguntaId: this.estado.preguntaActual.id,
                seccion: this.estado.preguntaActual.seccion,
                subseccion: this.estado.preguntaActual.subseccion,
                dormitorio: this.estado.preguntaActual.dormitorio,
                preguntaTexto: this.estado.preguntaActual.texto,
                descripcion: descripcion,
                imagenes: [...this.estado.imagenesTemporales],
                fecha: new Date().toISOString()
            };
            
            this.estado.observaciones.push(nuevaObservacion);
            
            console.log('Observación guardada:', nuevaObservacion);
            console.log('Total observaciones:', this.estado.observaciones.length);
            
            // Guardar avance
            try {
                this.guardarAvance();
            } catch (e) {
                console.warn('Guardado parcial, continuando flujo');
            }
            
            // Limpiar estado
            this.estado.imagenesTemporales = [];
            document.getElementById('descripcionProblema').value = '';
            
            // Cerrar modal
            if (this.estado.modalNoInstance) {
                this.estado.modalNoInstance.hide();
            }
            
            // Notificación
            this.mostrarNotificacion(
                `Observación guardada (${nuevaObservacion.imagenes.length} imagen(es))`,
                'success'
            );
        },
        
        // ============================================
        // PERSISTENCIA (LOCALSTORAGE)
        // ============================================
        guardarAvance() {
            try {
                // Agregar departamento actual a la lista si no existe
                if (this.estado.departamentoActual && 
                    !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero)) {
                    this.estado.departamentos.push({ ...this.estado.departamentoActual });
                }
                
                // Guardar solo datos esenciales (evitar guardar preguntas ya que vienen del CSV)
                const datosParaGuardar = {
                    version: '2.0',
                    datosGenerales: this.estado.datosGenerales,
                    departamentos: this.estado.departamentos,
                    departamentoActual: this.estado.departamentoActual,
                    observaciones: this.estado.observaciones.map(obs => ({
                        ...obs,
                        imagenes: [] // No guardar imágenes en localStorage por tamaño
                    }))
                };
                
                localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(datosParaGuardar));
                console.log('✅ Avance guardado en localStorage');
                
            } catch (error) {
                console.error('Error guardando en localStorage:', error);
                
                if (error.name === 'QuotaExceededError') {
                    this.mostrarNotificacion(
                        '⚠️ Almacenamiento local lleno. Las observaciones siguen en memoria.',
                        'warning'
                    );
                }
            }
        },
        
        cargarAvance() {
            // Cargar CSV personalizado si existe
            const csvGuardado = localStorage.getItem('csvPersonalizado');
            const nombreGuardado = localStorage.getItem('nombreCsvPersonalizado');

            if (csvGuardado && nombreGuardado) {
                try {
                    const preguntas = this.parsearCSV(csvGuardado);
                    if (preguntas.length > 0) {
                        this.estado.preguntasPersonalizadas = preguntas;
                        this.estado.nombreArchivoPersonalizado = nombreGuardado;
                        
                        document.getElementById('cuestionarioPersonalizado').checked = true;
                        this.gestionarOpcionesCuestionario();
                        this.actualizarInfoArchivoPersonalizado();
                        
                        console.log(`✅ Cuestionario personalizado '${nombreGuardado}' cargado desde localStorage.`);
                    }
                } catch (error) {
                    console.error("Error cargando CSV personalizado desde localStorage:", error);
                    localStorage.removeItem('csvPersonalizado');
                    localStorage.removeItem('nombreCsvPersonalizado');
                }
            }

            const datosGuardados = localStorage.getItem(this.CONFIG.STORAGE_KEY);
            if (datosGuardados) {
                try {
                    const datos = JSON.parse(datosGuardados);
                    
                    if (datos.version === '2.0') {
                        this.estado.datosGenerales = datos.datosGenerales || {};
                        this.estado.departamentos = datos.departamentos || [];
                        this.estado.departamentoActual = datos.departamentoActual || null;
                        this.estado.observaciones = datos.observaciones || [];
                        
                        console.log('✅ Avance cargado:', {
                            departamentos: this.estado.departamentos.length,
                            observaciones: this.estado.observaciones.length
                        });
                        
                        if (this.estado.datosGenerales.nombreObra) {
                            this.restaurarCamposGenerales();
                        }
                        
                        if (this.estado.departamentoActual) {
                            this.mostrarPreguntas();
                            document.getElementById('datosGeneralesSection').style.display = 'none';
                            document.getElementById('selectorDeptoSection').style.display = 'none';
                            document.getElementById('cuestionarioSection').style.display = 'none';
                            document.getElementById('finalizarContainer').style.display = 'block';
                        }
                    } else {
                        console.log('Versión anterior de datos, iniciando desde cero');
                        localStorage.removeItem(this.CONFIG.STORAGE_KEY);
                    }
                    
                } catch (error) {
                    console.error('Error cargando datos guardados:', error);
                    localStorage.removeItem(this.CONFIG.STORAGE_KEY);
                }
            }
        },
        
        restaurarCamposGenerales() {
            const campos = {
                nombreObra: 'nombreObra',
                comuna: 'comuna',
                empresaContratista: 'empresaContratista',
                entidadPatrocinante: 'entidadPatrocinante',
                supervisor: 'supervisor',
                directorObra: 'directorObra'
            };
            
            Object.entries(campos).forEach(([key, id]) => {
                if (this.estado.datosGenerales[key]) {
                    document.getElementById(id).value = this.estado.datosGenerales[key];
                    document.getElementById(id).disabled = true;
                }
            });
            
            if (this.estado.datosGenerales.cantidadDormitorios) {
                document.getElementById('cantidadDormitorios').value = this.estado.datosGenerales.cantidadDormitorios;
                document.getElementById('cantidadDormitorios').disabled = true;
            }
        },
        
        // ============================================
        // GENERACIÓN DE REPORTES (PDF Y EXCEL)
        // ============================================
        prepararNuevoDepartamento() {
            if (this.estado.departamentoActual && 
                !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero)) {
                this.estado.departamentos.push({...this.estado.departamentoActual});
            }
            
            // Limpiar UI
            document.getElementById('numeroDepto').value = '';
            document.getElementById('seccionesPreguntas').innerHTML = '';
            document.getElementById('finalizarContainer').style.display = 'none';
            document.getElementById('datosGeneralesSection').style.display = 'none';
            document.getElementById('selectorDeptoSection').style.display = 'block';
            document.getElementById('cuestionarioSection').style.display = 'block';

            
            // Guardar y resetear departamento actual
            this.guardarAvance();
            this.estado.departamentoActual = null;
            
            // Scroll y focus
            document.getElementById('selectorDeptoSection').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            document.getElementById('numeroDepto').focus();
        },
        
        generarExcel() {
            if (this.estado.departamentoActual && 
                !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero)) {
                this.estado.departamentos.push({...this.estado.departamentoActual});
            }
            
            const wb = XLSX.utils.book_new();
            
            // Hoja 1: Datos generales
            const datosGenerales = [
                ['INFORME DE FISCALIZACIÓN DE OBRA'],
                ['Fecha de generación:', new Date().toLocaleDateString()],
                ['Hora de generación:', new Date().toLocaleTimeString()],
                [],
                ['DATOS GENERALES'],
                ['Nombre de la Obra:', this.estado.datosGenerales.nombreObra],
                ['Comuna:', this.estado.datosGenerales.comuna],
                ['Empresa Contratista:', this.estado.datosGenerales.empresaContratista],
                ['Entidad Patrocinante:', this.estado.datosGenerales.entidadPatrocinante],
                ['Supervisor:', this.estado.datosGenerales.supervisor],
                ['Director de Obra:', this.estado.datosGenerales.directorObra],
                ['Cantidad de Dormitorios:', this.estado.datosGenerales.cantidadDormitorios],
                [],
                ['RESUMEN'],
                ['Departamentos inspeccionados:', this.estado.departamentos.length],
                ['Observaciones registradas:', this.estado.observaciones.length]
            ];
            
            const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales);
            
            // Ajustar anchos de columna
            const wscols = [{wch: 30}, {wch: 40}];
            wsDatos['!cols'] = wscols;
            
            XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales');
            
            // Hoja 2: Observaciones detalladas
            const encabezados = [
                'Departamento',
                'Sección',
                'Subsección',
                'Dormitorio',
                'Pregunta',
                'Descripción del Problema',
                'Cantidad de Imágenes',
                'Fecha'
            ];
            
            const filas = this.estado.observaciones.map(obs => [
                obs.departamento,
                obs.seccion,
                obs.subseccion,
                obs.dormitorio || 'N/A',
                obs.preguntaTexto,
                obs.descripcion,
                obs.imagenes ? obs.imagenes.length : 0,
                new Date(obs.fecha).toLocaleDateString()
            ]);
            
            const datosObservaciones = [encabezados, ...filas];
            const wsObservaciones = XLSX.utils.aoa_to_sheet(datosObservaciones);
            
            // Ajustar anchos para la hoja de observaciones
            const wscolsObs = [
                {wch: 15}, {wch: 25}, {wch: 25}, {wch: 12}, 
                {wch: 40}, {wch: 50}, {wch: 18}, {wch: 15}
            ];
            wsObservaciones['!cols'] = wscolsObs;
            
            XLSX.utils.book_append_sheet(wb, wsObservaciones, 'Observaciones');
            
            // Generar nombre de archivo
            const nombreArchivo = `Fiscalizacion_${this.estado.datosGenerales.nombreObra.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            
            XLSX.writeFile(wb, nombreArchivo);
            this.mostrarNotificacion('Archivo Excel generado correctamente', 'success');
        },
        
        async generarPDF() {
            this.mostrarLoading('Generando PDF...');
            
            if (this.estado.departamentoActual && 
                !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero)) {
                this.estado.departamentos.push({...this.estado.departamentoActual});
            }
            
            console.log('Generando PDF. Total observaciones:', this.estado.observaciones.length);
            
            try {
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 15;
                let yPosition = margin;
                
                doc.setFontSize(22);
                doc.setFont(undefined, 'bold');
                doc.text('INFORME DE FISCALIZACIÓN DE OBRA', pageWidth / 2, 30, { align: 'center' });
                doc.setFontSize(16);
                doc.text(this.estado.datosGenerales.nombreObra, pageWidth / 2, 45, { align: 'center' });
                doc.setFontSize(12);
                doc.setFont(undefined, 'normal');
                doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, pageWidth / 2, 60, { align: 'center' });
                yPosition = 85;
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 10;
                
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('1. DATOS GENERALES DE LA OBRA', margin, yPosition);
                yPosition += 10;
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                
                const datos = [
                    `Nombre de la Obra: ${this.estado.datosGenerales.nombreObra}`, `Comuna: ${this.estado.datosGenerales.comuna}`,
                    `Empresa Contratista: ${this.estado.datosGenerales.empresaContratista}`, `Entidad Patrocinante: ${this.estado.datosGenerales.entidadPatrocinante}`,
                    `Supervisor - FTO SERVIU: ${this.estado.datosGenerales.supervisor}`, `Director de Obra: ${this.estado.datosGenerales.directorObra}`,
                    `Cantidad de Dormitorios: ${this.estado.datosGenerales.cantidadDormitorios}`
                ];
                
                datos.forEach(linea => {
                    if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = margin; }
                    doc.text(linea, margin + 5, yPosition);
                    yPosition += 7;
                });
                yPosition += 5;
                
                // ... (El resto de la generación del PDF sigue igual)
                
                const nombrePDF = `Informe_Fiscalizacion_${this.estado.datosGenerales.nombreObra.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
                doc.save(nombrePDF);
                
                this.generarExcel();
                this.mostrarNotificacion('PDF y Excel generados correctamente', 'success');
                
            } catch (error) {
                console.error('Error generando PDF:', error);
                this.mostrarNotificacion('Error al generar el PDF', 'danger');
            } finally {
                this.ocultarLoading();
                this.resetearAplicacion();
            }
        },
        
        // ============================================
        // RESET Y LIMPIEZA
        // ============================================
        resetearAplicacion() {
            const datosTemporales = {
                observacionesCount: this.estado.observaciones.length,
                departamentosCount: this.estado.departamentos.length
            };
            
            this.estado.datosGenerales = {};
            this.estado.departamentos = [];
            this.estado.departamentoActual = null;
            this.estado.observaciones = [];
            this.estado.imagenesTemporales = [];
            this.estado.preguntaActual = null;
            this.estado.preguntasPersonalizadas = [];
            this.estado.nombreArchivoPersonalizado = null;

            ['nombreObra', 'comuna', 'empresaContratista', 'entidadPatrocinante', 'supervisor', 'directorObra', 'numeroDepto'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = '';
                    el.disabled = false;
                }
            });
            document.getElementById('cantidadDormitorios').value = '1';
            document.getElementById('cantidadDormitorios').disabled = false;
            
            document.getElementById('datosGeneralesSection').style.display = 'block';
            document.getElementById('selectorDeptoSection').style.display = 'block';
            document.getElementById('cuestionarioSection').style.display = 'block';
            document.getElementById('cuestionarioSection').style.pointerEvents = 'auto';
            document.getElementById('cuestionarioPorDefecto').checked = true;
            this.gestionarOpcionesCuestionario();
            this.actualizarInfoArchivoPersonalizado();

            document.getElementById('seccionesPreguntas').innerHTML = '';
            document.getElementById('finalizarContainer').style.display = 'none';
            
            localStorage.removeItem(this.CONFIG.STORAGE_KEY);
            localStorage.removeItem('csvPersonalizado');
            localStorage.removeItem('nombreCsvPersonalizado');
            
            setTimeout(() => {
                this.mostrarNotificacion(
                    `✅ Inspección finalizada. Se procesaron ${datosTemporales.departamentosCount} departamentos con ${datosTemporales.observacionesCount} observaciones.`,
                    'success'
                );
            }, 1000);
            
            window.scrollTo(0, 0);
        }
    };
    
    // Inicializar aplicación
    FiscalizadorApp.init();
});

