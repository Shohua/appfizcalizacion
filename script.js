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
            preguntas: [], // Cargadas desde CSV
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
            this.cargarAvance();
        },
        
        // ============================================
        // CARGA DE PREGUNTAS DESDE CSV
        // ============================================
        async cargarPreguntasDesdeCSV() {
            this.mostrarLoading('Cargando preguntas desde CSV...');
            
            try {
                const response = await fetch(this.CONFIG.CSV_URL);
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                const csvText = await response.text();
                this.estado.preguntas = this.parsearCSV(csvText);
                this.construirEstructura();
                
                console.log(`✅ ${this.estado.preguntas.length} preguntas cargadas desde CSV`);
            } catch (error) {
                console.error('Error cargando CSV:', error);
                this.mostrarNotificacion('Error cargando preguntas. Usando preguntas por defecto.', 'danger');
                this.cargarPreguntasPorDefecto();
            } finally {
                this.ocultarLoading();
            }
        },
        
        parsearCSV(csvText) {
            const lines = csvText.split('\n');
            const preguntas = [];
            const headers = lines[0].split(';').map(h => h.trim());
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].split(';').map(v => v.trim());
                if (values.length < headers.length) continue;
                
                const pregunta = {};
                headers.forEach((header, index) => {
                    pregunta[header] = values[index] || '';
                });
                
                // Generar ID único si no existe
                if (!pregunta.id) {
                    pregunta.id = `q${Date.now()}_${i}`;
                }
                
                preguntas.push(pregunta);
            }
            
            return preguntas;
        },
        
        cargarPreguntasPorDefecto() {
            // Preguntas por defecto en caso de error
            this.estado.preguntas = [
                { id: 'A01', section: 'A. COCINA', subsection: '01. Muro', question: '¿Están nivelados los muros?', order: '1' },
                { id: 'A04', section: 'A. COCINA', subsection: '02. Tabiquería', question: '¿La tabiquería está correctamente instalada?', order: '1' },
                { id: 'B01', section: 'B. LOGIA', subsection: '01. Muro', question: '¿Los muros están nivelados y sin daños?', order: '1' },
                { id: 'F01', section: 'F. DORMITORIO', subsection: '01. Muro', question: '¿Los muros están en buen estado?', order: '1' },
                { id: 'O01', section: 'OBSERVACIONES GENERALES', subsection: '', question: '01. Observaciones adicionales', order: '1' }
            ];
            this.construirEstructura();
        },
        
        construirEstructura() {
            this.estado.estructura = {};
            
            this.estado.preguntas.forEach(pregunta => {
                const seccion = pregunta.section || 'SIN SECCIÓN';
                const subseccion = pregunta.subsection || 'SIN SUBSECCIÓN';
                
                if (!this.estado.estructura[seccion]) {
                    this.estado.estructura[seccion] = {};
                }
                
                if (!this.estado.estructura[seccion][subseccion]) {
                    this.estado.estructura[seccion][subseccion] = [];
                }
                
                this.estado.estructura[seccion][subseccion].push({
                    id: pregunta.id,
                    texto: pregunta.question,
                    orden: parseInt(pregunta.order) || 999
                });
            });
            
            // Ordenar preguntas dentro de cada subsección
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
            // Iniciar inspección
            document.getElementById('iniciarInspeccion').addEventListener('click', () => this.iniciarInspeccion());
            
            // Modal para respuestas "No"
            document.getElementById('subirImagenBtn').addEventListener('click', () => document.getElementById('imagenInput').click());
            document.getElementById('tomarFotoBtn').addEventListener('click', () => document.getElementById('fotoInput').click());
            document.getElementById('imagenInput').addEventListener('change', (e) => this.cargarImagen(e));
            document.getElementById('fotoInput').addEventListener('change', (e) => this.cargarImagen(e));
            document.getElementById('guardarObservacionBtn').addEventListener('click', () => this.guardarObservacion());
            
            // Botones finales
            document.getElementById('otroDepartamentoBtn')?.addEventListener('click', () => this.prepararNuevoDepartamento());
            document.getElementById('finalizarInspeccion')?.addEventListener('click', () => this.generarPDF());
            document.getElementById('guardarAvanceBtn')?.addEventListener('click', () => {
                this.guardarAvance();
                this.mostrarBadgeGuardado();
            });
            document.getElementById('generarExcelBtn')?.addEventListener('click', () => this.generarExcel());
            
            // Prevenir pérdida de datos
            window.addEventListener('beforeunload', (e) => {
                if (this.estado.departamentoActual || this.estado.departamentos.length > 0) {
                    e.preventDefault();
                    e.returnValue = 'Tienes datos no guardados. ¿Estás seguro de querer salir?';
                }
            });
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
            const alerta = document.getElementById('alertaExito');
            
            // Limpiar clases anteriores
            alerta.className = 'alert';
            
            // Agregar clase según tipo
            if (tipo === 'success') alerta.classList.add('alert-success');
            else if (tipo === 'warning') alerta.classList.add('alert-warning');
            else if (tipo === 'danger') alerta.classList.add('alert-danger');
            else alerta.classList.add('alert-info');
            
            // Agregar ícono
            let icono = 'ℹ️';
            if (tipo === 'success') icono = '✅';
            else if (tipo === 'warning') icono = '⚠️';
            else if (tipo === 'danger') icono = '❌';
            
            alerta.innerHTML = `${icono} ${mensaje}`;
            alerta.style.display = 'block';
            
            setTimeout(() => {
                alerta.style.display = 'none';
            }, 3000);
        },
        
        // ============================================
        // LÓGICA DE INSPECCIÓN
        // ============================================
        iniciarInspeccion() {
            const numeroDepto = document.getElementById('numeroDepto').value.trim();
            
            if (!numeroDepto) {
                this.mostrarNotificacion('Por favor ingresa un número de departamento', 'warning');
                return;
            }
            
            if (this.estado.departamentos.some(depto => depto.numero === numeroDepto)) {
                this.mostrarNotificacion('Este departamento ya ha sido inspeccionado', 'warning');
                return;
            }
            
            // Guardar datos generales si es el primer departamento
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
                
                // Deshabilitar campos
                ['nombreObra', 'comuna', 'empresaContratista', 'entidadPatrocinante', 'supervisor', 'directorObra', 'cantidadDormitorios'].forEach(id => {
                    document.getElementById(id).disabled = true;
                });
            }
            
            // Crear departamento actual
            this.estado.departamentoActual = {
                numero: numeroDepto,
                fechaInicio: new Date().toISOString(),
                respuestas: {}
            };
            
            // Mostrar preguntas
            this.mostrarPreguntas();
            
            // Actualizar UI
            document.getElementById('datosGeneralesSection').style.display = 'none';
            document.getElementById('selectorDeptoSection').style.display = 'none';
            document.getElementById('finalizarContainer').style.display = 'block';
            
            this.guardarAvance();
        },
        
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
            const preguntas = this.estado.estructura[seccion][subseccion] || [];
            
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
                strongElem.style.color = '#dc3545';
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
            
            if (this.estado.imagenesTemporales.length === 0) {
                this.mostrarNotificacion('Por favor agrega al menos una imagen', 'warning');
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
            const datosGuardados = localStorage.getItem(this.CONFIG.STORAGE_KEY);
            if (datosGuardados) {
                try {
                    const datos = JSON.parse(datosGuardados);
                    
                    // Verificar versión
                    if (datos.version === '2.0') {
                        this.estado.datosGenerales = datos.datosGenerales || {};
                        this.estado.departamentos = datos.departamentos || [];
                        this.estado.departamentoActual = datos.departamentoActual || null;
                        this.estado.observaciones = datos.observaciones || [];
                        
                        console.log('✅ Avance cargado:', {
                            departamentos: this.estado.departamentos.length,
                            observaciones: this.estado.observaciones.length
                        });
                        
                        // Restaurar UI si hay datos generales
                        if (this.estado.datosGenerales.nombreObra) {
                            this.restaurarCamposGenerales();
                        }
                        
                        // Si hay departamento actual, mostrar preguntas
                        if (this.estado.departamentoActual) {
                            this.mostrarPreguntas();
                            document.getElementById('datosGeneralesSection').style.display = 'none';
                            document.getElementById('selectorDeptoSection').style.display = 'none';
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
                {wch: 15}, // Departamento
                {wch: 25}, // Sección
                {wch: 25}, // Subsección
                {wch: 12}, // Dormitorio
                {wch: 40}, // Pregunta
                {wch: 50}, // Descripción
                {wch: 18}, // Cantidad de Imágenes
                {wch: 15}  // Fecha
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
                
                // ============================================
                // PORTADA
                // ============================================
                doc.setFontSize(22);
                doc.setFont(undefined, 'bold');
                doc.text('INFORME DE FISCALIZACIÓN DE OBRA', pageWidth / 2, 30, { align: 'center' });
                
                doc.setFontSize(16);
                doc.text(this.estado.datosGenerales.nombreObra, pageWidth / 2, 45, { align: 'center' });
                
                doc.setFontSize(12);
                doc.setFont(undefined, 'normal');
                doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, pageWidth / 2, 60, { align: 'center' });
                doc.text(`Hora: ${new Date().toLocaleTimeString()}`, pageWidth / 2, 68, { align: 'center' });
                
                yPosition = 85;
                
                // Línea separadora
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 10;
                
                // ============================================
                // DATOS GENERALES
                // ============================================
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('1. DATOS GENERALES DE LA OBRA', margin, yPosition);
                yPosition += 10;
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                
                const datos = [
                    `Nombre de la Obra: ${this.estado.datosGenerales.nombreObra}`,
                    `Comuna: ${this.estado.datosGenerales.comuna}`,
                    `Empresa Contratista: ${this.estado.datosGenerales.empresaContratista}`,
                    `Entidad Patrocinante: ${this.estado.datosGenerales.entidadPatrocinante}`,
                    `Supervisor - FTO SERVIU: ${this.estado.datosGenerales.supervisor}`,
                    `Director de Obra: ${this.estado.datosGenerales.directorObra}`,
                    `Cantidad de Dormitorios: ${this.estado.datosGenerales.cantidadDormitorios}`
                ];
                
                datos.forEach(linea => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(linea, margin + 5, yPosition);
                    yPosition += 7;
                });
                
                yPosition += 5;
                
                // ============================================
                // RESUMEN
                // ============================================
                if (yPosition > pageHeight - 30) {
                    doc.addPage();
                    yPosition = margin;
                }
                
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('2. RESUMEN DE INSPECCIÓN', margin, yPosition);
                yPosition += 10;
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                
                const resumen = [
                    `Total departamentos inspeccionados: ${this.estado.departamentos.length}`,
                    `Total observaciones registradas: ${this.estado.observaciones.length}`,
                    `Fecha de inicio: ${this.estado.departamentos[0]?.fechaInicio ? new Date(this.estado.departamentos[0].fechaInicio).toLocaleDateString() : 'N/A'}`,
                    `Fecha de término: ${new Date().toLocaleDateString()}`
                ];
                
                resumen.forEach(linea => {
                    doc.text(linea, margin + 5, yPosition);
                    yPosition += 7;
                });
                
                yPosition += 10;
                
                // ============================================
                // OBSERVACIONES POR DEPARTAMENTO
                // ============================================
                // Agrupar observaciones por departamento
                const observacionesPorDepto = {};
                this.estado.observaciones.forEach(obs => {
                    if (!observacionesPorDepto[obs.departamento]) {
                        observacionesPorDepto[obs.departamento] = [];
                    }
                    observacionesPorDepto[obs.departamento].push(obs);
                });
                
                // Ordenar departamentos
                const deptosOrdenados = Object.keys(observacionesPorDepto).sort();
                
                deptosOrdenados.forEach((depto, indexDepto) => {
                    if (yPosition > pageHeight - 40) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    
                    // Título del departamento
                    doc.setFontSize(16);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(40, 40, 40);
                    doc.text(`DEPARTAMENTO ${depto}`, margin, yPosition);
                    yPosition += 10;
                    
                    const observacionesDepto = observacionesPorDepto[depto];
                    
                    if (observacionesDepto.length === 0) {
                        doc.setFontSize(11);
                        doc.setFont(undefined, 'normal');
                        doc.text('Sin observaciones registradas.', margin + 5, yPosition);
                        yPosition += 15;
                        return;
                    }
                    
                    // Agrupar por sección
                    const porSeccion = {};
                    observacionesDepto.forEach(obs => {
                        const claveSeccion = obs.seccion + (obs.dormitorio ? ` - Dormitorio ${obs.dormitorio}` : '');
                        if (!porSeccion[claveSeccion]) {
                            porSeccion[claveSeccion] = [];
                        }
                        porSeccion[claveSeccion].push(obs);
                    });
                    
                    // Procesar cada sección
                    Object.keys(porSeccion).forEach(seccion => {
                        if (yPosition > pageHeight - 50) {
                            doc.addPage();
                            yPosition = margin;
                        }
                        
                        // Título de sección
                        doc.setFontSize(12);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(60, 60, 60);
                        doc.text(seccion, margin + 5, yPosition);
                        yPosition += 8;
                        
                        porSeccion[seccion].forEach(obs => {
                            if (yPosition > pageHeight - 100) {
                                doc.addPage();
                                yPosition = margin;
                            }
                            
                            // Subsección
                            if (obs.subseccion) {
                                doc.setFontSize(11);
                                doc.setFont(undefined, 'bold');
                                doc.setTextColor(80, 80, 80);
                                doc.text(obs.subseccion, margin + 10, yPosition);
                                yPosition += 6;
                            }
                            
                            // Pregunta
                            doc.setFontSize(10);
                            doc.setFont(undefined, 'bold');
                            doc.setTextColor(40, 40, 40);
                            
                            const preguntaLines = doc.splitTextToSize(`• ${obs.preguntaTexto}`, pageWidth - margin * 2 - 15);
                            doc.text(preguntaLines, margin + 15, yPosition);
                            yPosition += 6 * preguntaLines.length;
                            
                            // Descripción
                            doc.setFontSize(10);
                            doc.setFont(undefined, 'normal');
                            doc.setTextColor(60, 60, 60);
                            
                            const descLines = doc.splitTextToSize(`Observación: ${obs.descripcion}`, pageWidth - margin * 2 - 20);
                            doc.text(descLines, margin + 20, yPosition);
                            yPosition += 5 * descLines.length;
                            
                            // Imágenes (si existen)
                            if (obs.imagenes && obs.imagenes.length > 0) {
                                yPosition += 5;

                                obs.imagenes.forEach(imagen => {
                                    try {
                                        const imgWidth = (pageWidth - margin * 2) * 0.6;
                                        const imgHeight = imgWidth * 0.75;
                                        
                                        if (yPosition + imgHeight + 10 > pageHeight - margin) {
                                            doc.addPage();
                                            yPosition = margin;
                                        }
                                        
                                        doc.addImage(
                                            imagen,
                                            'JPEG',
                                            (pageWidth - imgWidth) / 2,
                                            yPosition,
                                            imgWidth,
                                            imgHeight
                                        );
                                        
                                        yPosition += imgHeight + 10;
                                        
                                    } catch (error) {
                                        console.error('Error agregando imagen al PDF:', error);
                                        doc.text('(Error al cargar imagen)', margin + 20, yPosition);
                                        yPosition += 6;
                                    }
                                });
                            }
                            
                            yPosition += 10;
                            doc.setTextColor(0, 0, 0);
                        });
                        
                        yPosition += 5;
                    });
                    
                    yPosition += 10;
                    
                    // Línea separadora entre departamentos
                    if (indexDepto < deptosOrdenados.length - 1) {
                        if (yPosition > pageHeight - 20) {
                            doc.addPage();
                            yPosition = margin;
                        }
                        
                        doc.setDrawColor(220, 220, 220);
                        doc.line(margin, yPosition, pageWidth - margin, yPosition);
                        yPosition += 15;
                    }
                });
                
                // ============================================
                // FIRMAS
                // ============================================
                if (yPosition > pageHeight - 80) {
                    doc.addPage();
                    yPosition = margin;
                }
                
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('FIRMAS', pageWidth / 2, yPosition, { align: 'center' });
                yPosition += 20;
                
                const firmas = [
                    { titulo: 'Fiscalizador', nombre: this.estado.datosGenerales.supervisor },
                    { titulo: 'Director de Obra', nombre: this.estado.datosGenerales.directorObra }
                ];
                
                const colWidth = (pageWidth - margin * 2) / firmas.length;
                
                firmas.forEach((firma, index) => {
                    const xPos = margin + (colWidth * index) + (colWidth / 2);
                    
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'normal');
                    doc.text(firma.titulo, xPos, yPosition, { align: 'center' });
                    
                    doc.setFontSize(10);
                    doc.text(firma.nombre, xPos, yPosition + 25, { align: 'center' });
                    
                    // Línea para firma
                    doc.setDrawColor(150, 150, 150);
                    doc.line(xPos - 40, yPosition + 40, xPos + 40, yPosition + 40);
                });
                
                // ============================================
                // PIE DE PÁGINA
                // ============================================
                const totalPages = doc.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(
                        `Página ${i} de ${totalPages} • Generado el ${new Date().toLocaleDateString()}`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                }
                
                // ============================================
                // GUARDAR PDF
                // ============================================
                const nombrePDF = `Informe_Fiscalizacion_${this.estado.datosGenerales.nombreObra.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
                doc.save(nombrePDF);
                
                // Generar Excel también
                this.generarExcel();
                
                this.mostrarNotificacion('PDF generado correctamente', 'success');
                
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
            // Guardar datos actuales temporalmente
            const datosTemporales = {
                datosGenerales: { ...this.estado.datosGenerales },
                observacionesCount: this.estado.observaciones.length,
                departamentosCount: this.estado.departamentos.length
            };
            
            // Resetear estado
            this.estado.datosGenerales = {};
            this.estado.departamentos = [];
            this.estado.departamentoActual = null;
            this.estado.observaciones = [];
            this.estado.imagenesTemporales = [];
            this.estado.preguntaActual = null;
            
            // Resetear UI
            const campos = [
                'nombreObra', 'comuna', 'empresaContratista',
                'entidadPatrocinante', 'supervisor', 'directorObra',
                'numeroDepto'
            ];
            
            campos.forEach(id => {
                const elem = document.getElementById(id);
                if (elem) {
                    elem.value = '';
                    elem.disabled = false;
                }
            });
            
            document.getElementById('cantidadDormitorios').value = '1';
            document.getElementById('cantidadDormitorios').disabled = false;
            
            document.getElementById('datosGeneralesSection').style.display = 'block';
            document.getElementById('selectorDeptoSection').style.display = 'block';
            document.getElementById('seccionesPreguntas').innerHTML = '';
            document.getElementById('finalizarContainer').style.display = 'none';
            
            // Limpiar localStorage
            localStorage.removeItem(this.CONFIG.STORAGE_KEY);
            
            // Mostrar resumen
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
