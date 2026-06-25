document.addEventListener("DOMContentLoaded", function() {
    const { jsPDF } = window.jspdf;
    
    const FiscalizadorApp = {
        // ============================================
        // CONSTANTES Y CONFIGURACIÓN
        // ============================================
        CONFIG: {
            MAX_IMAGE_SIZE: 800,
            JPEG_QUALITY: 0.7,
            CSV_URL: 'questions.csv',
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
            preguntas: [],
            preguntasOriginales: [],
            preguntasPersonalizadas: [],
            nombreArchivoPersonalizado: null,
            estructura: {},
            imagenesTemporales: [],
            preguntaActual: null,
            modalNoInstance: null
        },
        
        // ============================================
        // ESTADO DEL DICTADO POR VOZ
        // ============================================
        voz: {
            recognition: null,       // Instancia de SpeechRecognition
            activo: false,           // ¿Está grabando ahora?
            textoAcumulado: '',      // Texto transcrito en la sesión actual
            soportado: false,        // ¿El navegador soporta Web Speech API?
            // Manejo de doble-clic en botón de audífono (MediaSession / teclado)
            ultimoEventoTecla: 0,
            contadorClics: 0,
            timerDobleClick: null
        },
        
        // ============================================
        // INICIALIZACIÓN
        // ============================================
        async init() {
            this.setupEventListeners();
            this.inicializarVoz();
            await this.cargarPreguntasDesdeCSV();
            this.cargarAvance();
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
                this.estado.preguntas = this.estado.preguntasOriginales;
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
                    
                    this.estado.preguntasPersonalizadas = preguntas;
                    this.estado.nombreArchivoPersonalizado = file.name;
                    
                    localStorage.setItem('csvPersonalizado', csvText);
                    localStorage.setItem('nombreCsvPersonalizado', file.name);

                    this.estado.preguntas = this.estado.preguntasPersonalizadas;
                    this.construirEstructura();
                    
                    document.getElementById('cuestionarioPersonalizado').checked = true;
                    this.actualizarInfoArchivoPersonalizado();
                    
                    this.mostrarNotificacion(`Cuestionario '${file.name}' cargado con ${this.estado.preguntas.length} preguntas.`, 'success');
                } catch (error) {
                    console.error("Error al procesar CSV personalizado:", error);
                    this.mostrarNotificacion(error.message, 'danger');
                    this.revertirAPreguntasPorDefecto();
                } finally {
                    this.ocultarLoading();
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
            
            // Cuestionario
            document.querySelectorAll('input[name="cuestionarioOpcion"]').forEach(radio => {
                radio.addEventListener('change', () => this.gestionarOpcionesCuestionario());
            });
            document.getElementById('csvFileInput').addEventListener('change', (e) => this.cargarCSVCustom(e));
            document.getElementById('descargarCsvActual').addEventListener('click', () => this.descargarCSV());

            // Botón de dictado en el modal
            document.getElementById('btnDictadoVoz').addEventListener('click', () => this.toggleDictado());

            // Detener dictado al cerrar el modal
            document.getElementById('modalNo').addEventListener('hidden.bs.modal', () => {
                if (this.voz.activo) this.detenerDictado();
            });

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
        // DICTADO POR VOZ
        // ============================================
        inicializarVoz() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                console.warn('⚠️ Web Speech API no soportada en este navegador.');
                this.voz.soportado = false;
                // Ocultar botón si no hay soporte
                const btn = document.getElementById('btnDictadoVoz');
                if (btn) btn.style.display = 'none';
                return;
            }
            
            this.voz.soportado = true;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-CL';
            recognition.interimResults = true;  // Resultados parciales en tiempo real
            recognition.continuous = true;      // No parar automáticamente tras silencio breve
            recognition.maxAlternatives = 1;
            
            // Resultado parcial o final
            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Acumular texto final
                if (finalTranscript) {
                    this.voz.textoAcumulado += finalTranscript;
                }
                
                // Mostrar texto acumulado + parcial en el textarea
                const textarea = document.getElementById('descripcionProblema');
                if (textarea) {
                    textarea.value = this.voz.textoAcumulado + interimTranscript;
                }
            };
            
            recognition.onerror = (event) => {
                console.error('Error de reconocimiento de voz:', event.error);
                // No detenemos en "no-speech"; sí en errores críticos
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    this.mostrarNotificacion('Permiso de micrófono denegado. Actívalo en la configuración del navegador.', 'danger');
                    this.detenerDictado(false);
                } else if (event.error === 'aborted') {
                    // Abortado intencionalmente: no hacer nada
                } else {
                    console.warn('Error de voz (no crítico):', event.error);
                }
            };
            
            recognition.onend = () => {
                // Si aún está marcado como activo y no fue detenido manualmente,
                // reiniciar para mantener escucha continua (Chromium detiene tras ~60s)
                if (this.voz.activo) {
                    try { recognition.start(); } catch(e) { /* ya estaba arrancando */ }
                }
            };
            
            this.voz.recognition = recognition;
        },
        
        toggleDictado() {
            if (this.voz.activo) {
                this.detenerDictado(true);
            } else {
                this.iniciarDictado();
            }
        },
        
        iniciarDictado() {
            if (!this.voz.soportado) {
                this.mostrarNotificacion('Tu navegador no soporta dictado por voz. Usa Chrome en Android.', 'warning');
                return;
            }
            
            const textarea = document.getElementById('descripcionProblema');
            if (!textarea) return;
            
            // Tomar el texto ya existente en el textarea como base
            this.voz.textoAcumulado = textarea.value;
            // Añadir espacio si ya hay contenido y no termina en espacio
            if (this.voz.textoAcumulado && !this.voz.textoAcumulado.endsWith(' ')) {
                this.voz.textoAcumulado += ' ';
            }
            
            this.voz.activo = true;
            
            try {
                this.voz.recognition.start();
            } catch(e) {
                console.warn('recognition.start() error (puede que ya esté corriendo):', e);
            }
            
            // UI: botón en modo grabación
            const btn = document.getElementById('btnDictadoVoz');
            if (btn) {
                btn.classList.add('recording');
                btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
                btn.title = 'Detener dictado';
            }
            
            // Mostrar indicador global
            const indicator = document.getElementById('voice-indicator');
            if (indicator) {
                indicator.classList.add('active');
                document.getElementById('voice-indicator-text').textContent = 'Escuchando… hable ahora';
            }
            
            // Hacer foco en el textarea
            textarea.focus();
        },
        
        detenerDictado(guardarTexto = true) {
            this.voz.activo = false;
            
            try {
                this.voz.recognition.stop();
            } catch(e) { /* ya detenido */ }
            
            // Si guardamos el texto, dejarlo como está en el textarea
            // Si no (error crítico), no tocamos el campo
            
            // UI: botón normal
            const btn = document.getElementById('btnDictadoVoz');
            if (btn) {
                btn.classList.remove('recording');
                btn.innerHTML = '<i class="bi bi-mic-fill"></i>';
                btn.title = 'Activar/desactivar dictado por voz';
            }
            
            // Ocultar indicador global
            const indicator = document.getElementById('voice-indicator');
            if (indicator) {
                indicator.classList.remove('active');
            }
            
            if (guardarTexto) {
                const textarea = document.getElementById('descripcionProblema');
                if (textarea && textarea.value.trim()) {
                    this.mostrarNotificacion('Dictado finalizado. Texto guardado en el campo.', 'success');
                }
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
        // GESTIÓN DE OBSERVACIONES
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
                <div id="${alertId}" class="alert alert-${tipo} alert-dismissible fade show" role="alert" style="position:fixed; top:20px; right:20px; z-index:1050; max-width:320px;">
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

        // ============================================
        // MOSTRAR PREGUNTAS CON ACORDEÓN
        // ============================================
        mostrarPreguntas() {
            const contenedor = document.getElementById('seccionesPreguntas');
            contenedor.innerHTML = '';
            
            // Título del departamento
            const tituloDepto = document.createElement('div');
            tituloDepto.className = 'depto-titulo';
            tituloDepto.innerHTML = `<h2>Departamento: ${this.estado.departamentoActual.numero}</h2>`;
            contenedor.appendChild(tituloDepto);
            
            let primeraSeccion = true;

            // Mostrar secciones (excepto dormitorios y observaciones generales al final)
            Object.keys(this.estado.estructura).forEach(seccion => {
                if (!seccion.startsWith('F. DORMITORIO') && seccion !== 'OBSERVACIONES GENERALES') {
                    this.crearSeccionAcordeon(contenedor, seccion, null, primeraSeccion);
                    primeraSeccion = false;
                }
            });
            
            // Dormitorios según cantidad
            for (let i = 1; i <= this.estado.datosGenerales.cantidadDormitorios; i++) {
                this.crearSeccionAcordeon(contenedor, 'F. DORMITORIO', i, primeraSeccion);
                primeraSeccion = false;
            }
            
            // Observaciones generales
            this.crearSeccionAcordeon(contenedor, 'OBSERVACIONES GENERALES', null, false);
        },
        
        /**
         * Crea una sección como acordeón desplegable.
         * @param {HTMLElement} contenedor - Contenedor padre
         * @param {string} seccion - Nombre de la sección
         * @param {number|null} dormitorioNumero - Número de dormitorio (si aplica)
         * @param {boolean} expandida - Si debe estar expandida por defecto
         */
        crearSeccionAcordeon(contenedor, seccion, dormitorioNumero = null, expandida = false) {
            const subsecciones = this.estado.estructura[seccion];
            if (!subsecciones) return;

            // Wrapper del acordeón
            const accordionDiv = document.createElement('div');
            accordionDiv.className = 'section-accordion' + (expandida ? '' : ' collapsed');
            accordionDiv.dataset.seccion = seccion;
            if (dormitorioNumero) accordionDiv.dataset.dormitorio = dormitorioNumero;

            // Título de la sección
            const tituloTexto = (dormitorioNumero && seccion === 'F. DORMITORIO')
                ? `${seccion} ${dormitorioNumero}`
                : seccion;

            // Cabecera clickeable
            const header = document.createElement('div');
            header.className = 'section-accordion-header';
            header.innerHTML = `
                <h3>${tituloTexto}</h3>
                <div style="display:flex;align-items:center;">
                    <span class="section-badge" data-obs-badge="${seccion}${dormitorioNumero || ''}">0 obs.</span>
                    <span class="section-accordion-icon bi bi-chevron-down"></span>
                </div>
            `;
            header.addEventListener('click', () => {
                accordionDiv.classList.toggle('collapsed');
            });
            accordionDiv.appendChild(header);

            // Cuerpo del acordeón
            const body = document.createElement('div');
            body.className = 'section-accordion-body';

            // Subsecciones
            Object.keys(subsecciones).forEach((subseccion, subIdx) => {
                if (subseccion.trim()) {
                    // Subsección como acordeón anidado (expandida por defecto la primera)
                    const subAccordion = document.createElement('div');
                    subAccordion.className = 'subsection-accordion' + (subIdx === 0 ? '' : ' collapsed');

                    const subHeader = document.createElement('div');
                    subHeader.className = 'subsection-accordion-header';
                    subHeader.innerHTML = `
                        <h5>${subseccion}</h5>
                        <span class="subsection-accordion-icon bi bi-chevron-down"></span>
                    `;
                    subHeader.addEventListener('click', () => {
                        subAccordion.classList.toggle('collapsed');
                    });

                    const subBody = document.createElement('div');
                    subBody.className = 'subsection-accordion-body';
                    this.crearPreguntasDeSubseccion(subBody, seccion, subseccion, dormitorioNumero);

                    subAccordion.appendChild(subHeader);
                    subAccordion.appendChild(subBody);
                    body.appendChild(subAccordion);
                } else {
                    // Preguntas sin subsección, directamente en el body
                    this.crearPreguntasDeSubseccion(body, seccion, '', dormitorioNumero);
                }
            });

            accordionDiv.appendChild(body);
            contenedor.appendChild(accordionDiv);
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
                
                const label = document.createElement('div');
                label.className = 'pregunta-texto';
                label.textContent = pregunta.texto;
                preguntaDiv.appendChild(label);
                
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
            
            document.getElementById('preguntaSeccion').textContent = 
                `${this.estado.preguntaActual.seccion} ${this.estado.preguntaActual.dormitorio ? `- Dormitorio ${this.estado.preguntaActual.dormitorio}` : ''}`;
            document.getElementById('preguntaTexto').textContent = this.estado.preguntaActual.texto;
            
            document.getElementById('descripcionProblema').value = '';
            document.getElementById('alertaExito').style.display = 'none';
            this.estado.imagenesTemporales = [];
            this.voz.textoAcumulado = '';
            
            document.getElementById('galeriaImagenes').style.display = 'none';
            document.getElementById('thumbnails').innerHTML = '';
            this.actualizarContadorImagenes();
            
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
            
            // Detener dictado si estaba activo antes de guardar
            if (this.voz.activo) {
                this.detenerDictado(true);
            }
            
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
            
            // Actualizar badge de observaciones en la sección del acordeón correspondiente
            this.actualizarBadgeSeccion(nuevaObservacion.seccion, nuevaObservacion.dormitorio);
            
            try {
                this.guardarAvance();
            } catch (e) {
                console.warn('Guardado parcial, continuando flujo');
            }
            
            this.estado.imagenesTemporales = [];
            this.voz.textoAcumulado = '';
            document.getElementById('descripcionProblema').value = '';
            
            if (this.estado.modalNoInstance) {
                this.estado.modalNoInstance.hide();
            }
            
            this.mostrarNotificacion(
                `Observación guardada (${nuevaObservacion.imagenes.length} imagen(es))`,
                'success'
            );
        },

        /**
         * Actualiza el badge de observaciones en la cabecera del acordeón.
         */
        actualizarBadgeSeccion(seccion, dormitorioNumero) {
            const key = seccion + (dormitorioNumero || '');
            const badge = document.querySelector(`[data-obs-badge="${key}"]`);
            if (!badge) return;

            // Contar observaciones de esta sección
            const count = this.estado.observaciones.filter(obs => {
                const matchSeccion = obs.seccion === seccion;
                const matchDorm = dormitorioNumero ? obs.dormitorio == dormitorioNumero : true;
                return matchSeccion && matchDorm;
            }).length;

            badge.textContent = `${count} obs.`;
            if (count > 0) {
                badge.classList.add('has-obs');
            } else {
                badge.classList.remove('has-obs');
            }
        },
        
        // ============================================
        // PERSISTENCIA (LOCALSTORAGE)
        // ============================================
        guardarAvance() {
            try {
                if (this.estado.departamentoActual && 
                    !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero)) {
                    this.estado.departamentos.push({ ...this.estado.departamentoActual });
                }
                
                const datosParaGuardar = {
                    version: '2.0',
                    datosGenerales: this.estado.datosGenerales,
                    departamentos: this.estado.departamentos,
                    departamentoActual: this.estado.departamentoActual,
                    observaciones: this.estado.observaciones.map(obs => ({
                        ...obs,
                        imagenes: []
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
            
            document.getElementById('numeroDepto').value = '';
            document.getElementById('seccionesPreguntas').innerHTML = '';
            document.getElementById('finalizarContainer').style.display = 'none';
            document.getElementById('datosGeneralesSection').style.display = 'none';
            document.getElementById('selectorDeptoSection').style.display = 'block';
            document.getElementById('cuestionarioSection').style.display = 'block';

            this.guardarAvance();
            this.estado.departamentoActual = null;
            
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
            const wscols = [{wch: 30}, {wch: 40}];
            wsDatos['!cols'] = wscols;
            XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales');
            
            const encabezados = [
                'Departamento', 'Sección', 'Subsección', 'Dormitorio',
                'Pregunta', 'Descripción del Problema', 'Cantidad de Imágenes', 'Fecha'
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
            
            const wscolsObs = [
                {wch: 15}, {wch: 25}, {wch: 25}, {wch: 12}, 
                {wch: 40}, {wch: 50}, {wch: 18}, {wch: 15}
            ];
            wsObservaciones['!cols'] = wscolsObs;
            
            XLSX.utils.book_append_sheet(wb, wsObservaciones, 'Observaciones');
            
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
                    `Nombre de la Obra: ${this.estado.datosGenerales.nombreObra}`,
                    `Comuna: ${this.estado.datosGenerales.comuna}`,
                    `Empresa Contratista: ${this.estado.datosGenerales.empresaContratista}`,
                    `Entidad Patrocinante: ${this.estado.datosGenerales.entidadPatrocinante}`,
                    `Supervisor - FTO SERVIU: ${this.estado.datosGenerales.supervisor}`,
                    `Director de Obra: ${this.estado.datosGenerales.directorObra}`,
                    `Cantidad de Dormitorios: ${this.estado.datosGenerales.cantidadDormitorios}`
                ];
                
                datos.forEach(linea => {
                    if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = margin; }
                    doc.text(linea, margin + 5, yPosition);
                    yPosition += 7;
                });
                yPosition += 5;

                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('2. OBSERVACIONES REGISTRADAS', margin, yPosition);
                yPosition += 10;

                if (this.estado.observaciones.length === 0) {
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'normal');
                    doc.text('No se registraron observaciones.', margin + 5, yPosition);
                    yPosition += 10;
                } else {
                    for (const [index, obs] of this.estado.observaciones.entries()) {
                        if (yPosition > pageHeight - 60) {
                            doc.addPage();
                            yPosition = margin;
                        }

                        doc.setFontSize(12);
                        doc.setFont(undefined, 'bold');
                        const tituloObs = `Observación ${index + 1}: Depto ${obs.departamento}`;
                        doc.text(tituloObs, margin, yPosition);
                        yPosition += 7;

                        doc.setFontSize(10);
                        doc.setFont(undefined, 'normal');

                        let jerarquia = `Sección: ${obs.seccion}`;
                        if (obs.subseccion) jerarquia += ` > Subsección: ${obs.subseccion}`;
                        if (obs.dormitorio) jerarquia += ` > Dormitorio: ${obs.dormitorio}`;
                        doc.text(jerarquia, margin + 5, yPosition);
                        yPosition += 6;

                        doc.setFont(undefined, 'italic');
                        const preguntaLines = doc.splitTextToSize(`Pregunta: ${obs.preguntaTexto}`, pageWidth - margin * 3);
                        doc.text(preguntaLines, margin + 5, yPosition);
                        yPosition += preguntaLines.length * 5;

                        doc.setFont(undefined, 'bold');
                        doc.text('Descripción del Problema:', margin + 5, yPosition);
                        yPosition += 6;
                        
                        doc.setFont(undefined, 'normal');
                        const descLines = doc.splitTextToSize(obs.descripcion, pageWidth - margin * 3);
                        doc.text(descLines, margin + 5, yPosition);
                        yPosition += descLines.length * 5 + 4;

                        if (obs.imagenes && obs.imagenes.length > 0) {
                            doc.setFont(undefined, 'bold');
                            doc.text(`Evidencia Fotográfica (${obs.imagenes.length}):`, margin + 5, yPosition);
                            yPosition += 8;

                            for (const imgData of obs.imagenes) {
                                const imgProps = doc.getImageProperties(imgData);
                                const aspectRatio = imgProps.width / imgProps.height;
                                let imgWidth = 80;
                                let imgHeight = imgWidth / aspectRatio;

                                if (yPosition + imgHeight > pageHeight - 20) {
                                    doc.addPage();
                                    yPosition = margin;
                                }

                                doc.addImage(imgData, 'JPEG', margin + 10, yPosition, imgWidth, imgHeight);
                                yPosition += imgHeight + 8;
                            }
                        }

                        if (index < this.estado.observaciones.length - 1) {
                            yPosition += 5;
                            if (yPosition > pageHeight - 15) {
                                doc.addPage();
                                yPosition = margin;
                            }
                            doc.setLineDashPattern([1, 1], 0);
                            doc.line(margin, yPosition, pageWidth - margin, yPosition);
                            doc.setLineDashPattern([], 0);
                            yPosition += 10;
                        }
                    }
                }
                
                const nombrePDF = `Informe_Fiscalizacion_${this.estado.datosGenerales.nombreObra.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
                doc.save(nombrePDF);
                
                this.generarExcel();
                this.mostrarNotificacion('PDF y Excel generados correctamente', 'success');

                this.ocultarLoading();
                this.resetearAplicacion();
                
            } catch (error) {
                console.error('Error generando PDF:', error);
                this.mostrarNotificacion('Error al generar el PDF', 'danger');
                this.ocultarLoading();
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
            
            // Detener dictado si estaba activo
            if (this.voz.activo) this.detenerDictado(false);
            
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
