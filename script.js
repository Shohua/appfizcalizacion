document.addEventListener("DOMContentLoaded", function() {
    const { jsPDF } = window.jspdf;

    const FiscalizadorApp = {

        // ============================================
        // CONFIGURACIÓN
        // ============================================
        CONFIG: {
            MAX_IMAGE_SIZE: 800,
            JPEG_QUALITY: 0.7,
            CSV_URL: 'questions.csv',
            STORAGE_KEY: 'fiscalizacionObra_v2',
            SILENCIO_DICTADO_MS: 3500   // ms de silencio → guardar automáticamente
        },

        // ============================================
        // ESTADO
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
            modalNoInstance: null,
            bandejaVoz: [],               // observaciones dictadas sin sección clara
            ultimaSeccionActiva: null     // última sección expandida (contexto NLP)
        },

        // ============================================
        // ESTADO DE VOZ MANOS LIBRES
        // ============================================
        vozLibre: {
            recognition: null,
            soportado: false,
            // 'inactivo' | 'escuchando_comando' | 'dictando'
            estado: 'inactivo',
            textoAcumulado: '',
            silencioTimer: null,

            // ── Palabras clave para detectar secciones ──────────
            mapaKeywords: {
                secciones: {
                    'A. COCINA':            ['cocina','kitchen','cocineta','la cocina'],
                    'B. LOGIA':             ['logia','lavandería','lavanderia','patio de servicio','logia de'],
                    'C. ESTAR COMEDOR':     ['estar','comedor','living','sala','sala estar','estar comedor'],
                    'D. BAÑO':              ['baño','bano','toilette','wc','baño de'],
                    'E. PASILLO':           ['pasillo','hall','corredor','entrada','acceso'],
                    'F. DORMITORIO':        ['dormitorio','pieza','habitación','habitacion','cuarto','dorm'],
                    'OBSERVACIONES GENERALES': ['general','exterior','fachada','escalera','pasillo común','pasillo comun','común','comun']
                },
                subsecciones: {
                    'Muro':         ['muro','muralla','pared','tabique','muros'],
                    'Cielo':        ['cielo','techo','losa','plafón','plafon'],
                    'Piso':         ['piso','suelo','pavimento','solera','pisos'],
                    'Puerta':       ['puerta','marco','manilla','cerradura','puertas'],
                    'Ventana':      ['ventana','vidrio','cristal','marco ventana','ventanas'],
                    'Instalaciones':['tubería','tuberia','cañería','caneria','agua caliente','agua fría','gas','eléctrico','electrico','instalación','instalacion']
                }
            },

            // ── Comandos de voz ─────────────────────────────────
            comandos: {
                iniciar:  ['iniciar','comenzar','empezar','activar','grabar','nueva observación','nueva observacion','start'],
                detener:  ['detener','parar','terminar','finalizar','guardar','listo','fin','stop','eso es todo','guardarlo'],
                cancelar: ['cancelar','descartar','borrar','eliminar','borrarlo','olvidalo','olvídalo']
            }
        },

        // ── DICTADO MANUAL (para el modal) ─────────────────────
        vozModal: {
            recognition: null,
            activo: false,
            textoAcumulado: '',
            soportado: false
        },

        // ============================================
        // INICIALIZACIÓN
        // ============================================
        async init() {
            this.setupEventListeners();
            this.inicializarVozLibre();
            this.inicializarVozModal();
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
                console.log(`✅ ${this.estado.preguntas.length} preguntas cargadas`);
            } catch (error) {
                console.error('Error cargando CSV:', error);
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
                    const preguntas = this.parsearCSV(e.target.result);
                    if (preguntas.length === 0) throw new Error("CSV vacío o incorrecto.");
                    this.estado.preguntasPersonalizadas = preguntas;
                    this.estado.nombreArchivoPersonalizado = file.name;
                    localStorage.setItem('csvPersonalizado', e.target.result);
                    localStorage.setItem('nombreCsvPersonalizado', file.name);
                    this.estado.preguntas = preguntas;
                    this.construirEstructura();
                    document.getElementById('cuestionarioPersonalizado').checked = true;
                    this.actualizarInfoArchivoPersonalizado();
                    this.mostrarNotificacion(`Cuestionario '${file.name}' cargado con ${preguntas.length} preguntas.`, 'success');
                } catch (error) {
                    this.mostrarNotificacion(error.message, 'danger');
                    this.revertirAPreguntasPorDefecto();
                } finally {
                    this.ocultarLoading();
                    event.target.value = '';
                }
            };
            reader.onerror = () => { this.mostrarNotificacion('Error al leer el archivo.', 'danger'); this.ocultarLoading(); };
            reader.readAsText(file, 'UTF-8');
        },

        parsearCSV(csvText) {
            const lines = csvText.split(/\r?\n/);
            const preguntas = [];
            if (!lines.length) return preguntas;
            const headers = lines[0].split(';').map(h => h.trim());
            const required = ['id','section','subsection','question','order'];
            const missing = required.filter(h => !headers.includes(h));
            if (missing.length) throw new Error(`Columnas faltantes: ${missing.join(', ')}`);
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(';').map(v => v.trim());
                if (values.length < headers.length) continue;
                const p = {};
                headers.forEach((h, idx) => { p[h] = values[idx] || ''; });
                if (!p.id) p.id = `q${Date.now()}_${i}`;
                preguntas.push(p);
            }
            return preguntas;
        },

        actualizarInfoArchivoPersonalizado() {
            const el = document.getElementById('csvFileName');
            if (this.estado.nombreArchivoPersonalizado) {
                el.textContent = `Archivo cargado: ${this.estado.nombreArchivoPersonalizado}`;
                el.style.display = 'block';
            } else { el.style.display = 'none'; }
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
            const content = this.generarContenidoCSV(this.estado.preguntas);
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'cuestionario_actual.csv'; a.style.display = 'none';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        },

        generarContenidoCSV(preguntas) {
            if (!preguntas.length) return '';
            return [Object.keys(preguntas[0]).join(';'), ...preguntas.map(p => Object.values(p).join(';'))].join('\n');
        },

        construirEstructura() {
            this.estado.estructura = {};
            this.estado.preguntas.forEach(p => {
                const s = p.section || 'SIN SECCIÓN';
                const sub = p.subsection || 'SIN SUBSECCIÓN';
                if (!this.estado.estructura[s]) this.estado.estructura[s] = {};
                if (!this.estado.estructura[s][sub]) this.estado.estructura[s][sub] = [];
                this.estado.estructura[s][sub].push({ id: p.id, texto: p.question, orden: parseInt(p.order) || 999 });
            });
            Object.keys(this.estado.estructura).forEach(s =>
                Object.keys(this.estado.estructura[s]).forEach(sub =>
                    this.estado.estructura[s][sub].sort((a,b) => a.orden - b.orden)
                )
            );
        },

        // ============================================
        // EVENTOS
        // ============================================
        setupEventListeners() {
            document.getElementById('iniciarInspeccion').addEventListener('click', () => this.iniciarInspeccion());
            document.getElementById('subirImagenBtn').addEventListener('click', () => document.getElementById('imagenInput').click());
            document.getElementById('tomarFotoBtn').addEventListener('click', () => document.getElementById('fotoInput').click());
            document.getElementById('imagenInput').addEventListener('change', e => this.cargarImagen(e));
            document.getElementById('fotoInput').addEventListener('change', e => this.cargarImagen(e));
            document.getElementById('guardarObservacionBtn').addEventListener('click', () => this.guardarObservacion());
            document.getElementById('otroDepartamentoBtn')?.addEventListener('click', () => this.prepararNuevoDepartamento());
            document.getElementById('finalizarInspeccion')?.addEventListener('click', () => this.generarPDF());
            document.getElementById('guardarAvanceBtn')?.addEventListener('click', () => { this.guardarAvance(); this.mostrarBadgeGuardado(); });
            document.getElementById('generarExcelBtn')?.addEventListener('click', () => this.generarExcel());
            document.querySelectorAll('input[name="cuestionarioOpcion"]').forEach(r => r.addEventListener('change', () => this.gestionarOpcionesCuestionario()));
            document.getElementById('csvFileInput').addEventListener('change', e => this.cargarCSVCustom(e));
            document.getElementById('descargarCsvActual').addEventListener('click', () => this.descargarCSV());

            // Botón dictado en modal
            document.getElementById('btnDictadoVoz').addEventListener('click', () => this.toggleDictadoModal());
            document.getElementById('modalNo').addEventListener('hidden.bs.modal', () => {
                if (this.vozModal.activo) this.detenerDictadoModal();
            });

            // FAB voz libre
            document.getElementById('btnVozLibre').addEventListener('click', () => this.toggleVozLibre());

            // Botones del panel de voz
            document.getElementById('vozBtnIniciar').addEventListener('click', () => this._iniciarDictadoObservacion());
            document.getElementById('vozBtnGuardar').addEventListener('click', () => this._guardarObservacionVoz());
            document.getElementById('vozBtnCancelar').addEventListener('click', () => this._cancelarDictado());
            document.getElementById('vozBtnCerrar').addEventListener('click', () => this.desactivarVozLibre());

            window.addEventListener('beforeunload', e => {
                if (this.estado.departamentoActual || this.estado.departamentos.length > 0) {
                    e.preventDefault();
                    e.returnValue = 'Tienes datos no guardados. ¿Salir?';
                }
            });
        },

        gestionarOpcionesCuestionario() {
            const opcion = document.querySelector('input[name="cuestionarioOpcion"]:checked').value;
            const ctrl = document.getElementById('controlesPersonalizado');
            if (opcion === 'custom') {
                ctrl.style.display = 'block';
                if (this.estado.preguntasPersonalizadas.length > 0) {
                    this.estado.preguntas = this.estado.preguntasPersonalizadas;
                    this.construirEstructura();
                }
            } else {
                ctrl.style.display = 'none';
                this.estado.preguntas = this.estado.preguntasOriginales;
                this.construirEstructura();
            }
        },

        // ============================================
        // VOZ MANOS LIBRES — INICIALIZACIÓN
        // ============================================
        inicializarVozLibre() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) {
                console.warn('⚠️ Web Speech API no disponible en este navegador.');
                this.vozLibre.soportado = false;
                document.getElementById('btnVozLibre').title = 'Dictado no disponible en este navegador';
                return;
            }
            this.vozLibre.soportado = true;

            const rec = new SR();
            rec.lang = 'es-CL';
            rec.interimResults = true;
            rec.continuous = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => this._onVozLibreResult(event);
            rec.onerror  = (event) => this._onVozLibreError(event);
            rec.onend    = ()      => this._onVozLibreEnd();

            this.vozLibre.recognition = rec;
        },

        // ── Handlers internos de reconocimiento ─────────────────
        _onVozLibreResult(event) {
            let interim = '';
            let final   = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += t;
                else interim += t;
            }
            const textoCompleto = (final || interim).toLowerCase().trim();

            // ── MODO ESPERA: detectar "iniciar" ─────────────────
            if (this.vozLibre.estado === 'escuchando_comando') {
                if (final && this._matchComando(textoCompleto, 'iniciar')) {
                    this._iniciarDictadoObservacion();
                    return;
                }
                // Feedback visual de lo que escucha
                this._actualizarUIComando(interim || final);
                return;
            }

            // ── MODO DICTADO ────────────────────────────────────
            if (this.vozLibre.estado === 'dictando') {
                if (final && this._matchComando(textoCompleto, 'detener')) {
                    // Quitar la palabra de comando del texto
                    this.vozLibre.textoAcumulado = this._limpiarComandoDelTexto(
                        this.vozLibre.textoAcumulado, this.vozLibre.comandos.detener
                    );
                    this._guardarObservacionVoz();
                    return;
                }
                if (final && this._matchComando(textoCompleto, 'cancelar')) {
                    this._cancelarDictado();
                    return;
                }
                // Acumular texto normal
                if (final) {
                    this.vozLibre.textoAcumulado += final + ' ';
                    this._resetSilencioTimer();
                }
                // Mostrar texto en tiempo real
                this._actualizarUITexto(this.vozLibre.textoAcumulado + interim);
            }
        },

        _onVozLibreError(event) {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.mostrarNotificacion('Permiso de micrófono denegado. Actívalo en la configuración.', 'danger');
                this._detenerVozLibreInterno();
                const fab = document.getElementById('btnVozLibre');
                fab.classList.remove('activo');
                this._ocultarPanelVoz();
                return;
            }
            // Errores no críticos (no-speech, network, etc.) → continuar
            console.warn('Error voz (no crítico):', event.error);
        },

        _onVozLibreEnd() {
            // Si sigue activo, reiniciar (Chrome detiene tras ~60s de silencio)
            if (this.vozLibre.estado !== 'inactivo') {
                try { this.vozLibre.recognition.start(); } catch(e) {}
            }
        },

        // ── Activar / desactivar manos libres ───────────────────
        toggleVozLibre() {
            if (this.vozLibre.estado === 'inactivo') {
                this.activarVozLibre();
            } else {
                this.desactivarVozLibre();
            }
        },

        activarVozLibre() {
            if (!this.vozLibre.soportado) {
                this.mostrarNotificacion('Tu navegador no soporta dictado por voz. Usa Chrome en Android.', 'warning');
                return;
            }
            this.vozLibre.estado = 'escuchando_comando';
            this.vozLibre.textoAcumulado = '';

            try { this.vozLibre.recognition.start(); } catch(e) {}

            const fab = document.getElementById('btnVozLibre');
            fab.classList.add('activo');
            fab.textContent = '🔴';

            this._mostrarPanelVoz('espera');
        },

        desactivarVozLibre() {
            this._detenerVozLibreInterno();
            const fab = document.getElementById('btnVozLibre');
            fab.classList.remove('activo');
            fab.textContent = '🎙️';
            this._ocultarPanelVoz();
        },

        _detenerVozLibreInterno() {
            clearTimeout(this.vozLibre.silencioTimer);
            this.vozLibre.estado = 'inactivo';
            try { this.vozLibre.recognition.stop(); } catch(e) {}
        },

        // ── Iniciar dictado de observación ──────────────────────
        _iniciarDictadoObservacion() {
            this.vozLibre.estado = 'dictando';
            this.vozLibre.textoAcumulado = '';
            this._mostrarPanelVoz('dictando');
            this._resetSilencioTimer();
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        },

        // ── Timer de silencio → guardar automáticamente ─────────
        _resetSilencioTimer() {
            clearTimeout(this.vozLibre.silencioTimer);
            this.vozLibre.silencioTimer = setTimeout(() => {
                if (this.vozLibre.estado === 'dictando' && this.vozLibre.textoAcumulado.trim()) {
                    this._guardarObservacionVoz();
                }
            }, this.CONFIG.SILENCIO_DICTADO_MS);
        },

        // ── Cancelar dictado en curso ────────────────────────────
        _cancelarDictado() {
            clearTimeout(this.vozLibre.silencioTimer);
            this.vozLibre.textoAcumulado = '';
            this.vozLibre.estado = 'escuchando_comando';
            this._mostrarPanelVoz('espera');
            this.mostrarNotificacion('Dictado cancelado. Di "iniciar" para volver a grabar.', 'info');
            if (navigator.vibrate) navigator.vibrate(200);
        },

        // ── Guardar observación dictada ──────────────────────────
        _guardarObservacionVoz() {
            clearTimeout(this.vozLibre.silencioTimer);
            const texto = this.vozLibre.textoAcumulado.trim();

            if (!texto) { this._cancelarDictado(); return; }

            const clasif = this._clasificarTexto(texto);

            const obs = {
                id: `obs_voz_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
                departamento: this.estado.departamentoActual?.numero || '—',
                preguntaId: null,
                seccion:    clasif.seccion,
                subseccion: clasif.subseccion,
                dormitorio: clasif.dormitorioNum || null,
                preguntaTexto: clasif.subseccion
                    ? `Dictado voz: ${clasif.seccion} / ${clasif.subseccion}`
                    : `Dictado voz: ${clasif.seccion}`,
                descripcion: texto,
                imagenes: [],
                fecha: new Date().toISOString(),
                origen: 'voz',
                clasificadaAuto: clasif.confianza > 0
            };

            if (clasif.confianza > 0) {
                // ✅ Clasificada → va directo a observaciones
                this.estado.observaciones.push(obs);
                this.guardarAvance();
                this.actualizarBadgeSeccion(obs.seccion, obs.dormitorio);
                this._resaltarSeccionAcordeon(obs.seccion, obs.dormitorioNum);
                this.mostrarNotificacion(
                    `✅ Guardado en "${obs.seccion}"${obs.subseccion ? ' / ' + obs.subseccion : ''}`, 'success'
                );
            } else {
                // 📥 Sin sección detectada → bandeja de pendientes
                if (!this.estado.bandejaVoz) this.estado.bandejaVoz = [];
                this.estado.bandejaVoz.push(obs);
                this.guardarAvance();
                this.mostrarNotificacion('📥 Sin sección detectada. Observación en bandeja pendiente.', 'warning');
            }

            this._actualizarBandejaUI();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

            // Volver a modo espera
            this.vozLibre.textoAcumulado = '';
            this.vozLibre.estado = 'escuchando_comando';
            this._mostrarPanelVoz('espera');
        },

        // ── NLP por palabras clave ───────────────────────────────
        _clasificarTexto(texto) {
            const t = texto.toLowerCase();
            let seccion = null;
            let subseccion = '';
            let dormitorioNum = null;
            let confianza = 0;

            // 1. Detectar sección por keywords
            for (const [sec, kws] of Object.entries(this.vozLibre.mapaKeywords.secciones)) {
                if (kws.some(kw => t.includes(kw))) {
                    seccion = sec;
                    confianza = 1;
                    if (sec === 'F. DORMITORIO') {
                        const m = t.match(/(primer|segundo|tercer|cuarto|quinto|prim|seg|ter|cuar|quin|1|2|3|4|5)\w*\s*(dormitorio|pieza|habitaci)/);
                        const nums = {'primer':1,'prim':1,'1':1,'segundo':2,'seg':2,'2':2,'tercer':3,'ter':3,'3':3,'cuarto':4,'cuar':4,'4':4,'quinto':5,'quin':5,'5':5};
                        dormitorioNum = m ? (nums[m[1]] || 1) : 1;
                    }
                    break;
                }
            }

            // 2. Si no detectó por keywords, usar última sección activa (contexto)
            if (!seccion && this.estado.ultimaSeccionActiva) {
                seccion = this.estado.ultimaSeccionActiva.seccion;
                dormitorioNum = this.estado.ultimaSeccionActiva.dormitorio || null;
                confianza = 0.5;
            }

            // 3. Detectar subsección
            if (seccion) {
                for (const [sub, kws] of Object.entries(this.vozLibre.mapaKeywords.subsecciones)) {
                    if (kws.some(kw => t.includes(kw))) {
                        subseccion = sub;
                        break;
                    }
                }
                // Buscar también en subsecciones reales del cuestionario
                if (!subseccion) {
                    const subs = Object.keys(this.estado.estructura[seccion] || {}).filter(s => s.trim());
                    subseccion = subs.find(s => t.includes(s.toLowerCase())) || '';
                }
            }

            return {
                seccion:      seccion || 'OBSERVACIONES GENERALES',
                subseccion,
                dormitorioNum,
                confianza
            };
        },

        _matchComando(texto, tipo) {
            return this.vozLibre.comandos[tipo].some(cmd => texto.includes(cmd));
        },

        _limpiarComandoDelTexto(texto, comandos) {
            let r = texto;
            comandos.forEach(cmd => { r = r.replace(new RegExp(cmd, 'gi'), '').trim(); });
            return r;
        },

        // ── UI del panel flotante ────────────────────────────────
        _mostrarPanelVoz(modo) {
            const panel  = document.getElementById('vozPanel');
            const titulo = document.getElementById('vozTitulo');
            const sub    = document.getElementById('vozSubtitulo');
            const vivo   = document.getElementById('vozTextoVivo');
            const btnIni = document.getElementById('vozBtnIniciar');
            const btnGua = document.getElementById('vozBtnGuardar');
            const btnCan = document.getElementById('vozBtnCancelar');

            panel.style.display = 'flex';

            if (modo === 'espera') {
                panel.className = 'voz-panel voz-espera';
                document.getElementById('vozPanel').querySelector('.voz-icono').textContent = '🎙️';
                titulo.textContent = 'Escuchando comandos…';
                sub.textContent    = 'Di "iniciar" para grabar una observación';
                vivo.style.display = 'none';
                vivo.textContent   = '';
                btnIni.style.display = 'inline-block';
                btnGua.style.display = 'none';
                btnCan.style.display = 'none';
            } else if (modo === 'dictando') {
                panel.className = 'voz-panel voz-dictando';
                document.getElementById('vozPanel').querySelector('.voz-icono').textContent = '🔴';
                titulo.textContent = 'Grabando observación…';
                sub.textContent    = 'Di "guardar" o pausa para terminar · "cancelar" para borrar';
                vivo.style.display = 'block';
                vivo.textContent   = '…';
                btnIni.style.display = 'none';
                btnGua.style.display = 'inline-block';
                btnCan.style.display = 'inline-block';
            }
        },

        _ocultarPanelVoz() {
            document.getElementById('vozPanel').style.display = 'none';
        },

        _actualizarUIComando(texto) {
            const sub = document.getElementById('vozSubtitulo');
            if (sub && texto && texto.length > 1) {
                sub.textContent = `"${texto.slice(0,40)}" — Di "iniciar" para grabar`;
            }
        },

        _actualizarUITexto(texto) {
            const el = document.getElementById('vozTextoVivo');
            if (el) el.textContent = texto || '…';
        },

        _resaltarSeccionAcordeon(seccion, dormitorioNum) {
            const q = dormitorioNum
                ? `.section-accordion[data-seccion="${seccion}"][data-dormitorio="${dormitorioNum}"]`
                : `.section-accordion[data-seccion="${seccion}"]`;
            const el = document.querySelector(q);
            if (!el) return;
            el.classList.remove('collapsed');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'box-shadow 0.3s';
            el.style.boxShadow = '0 0 0 3px #27ae60';
            setTimeout(() => { el.style.boxShadow = ''; }, 2500);
        },

        // ── Bandeja de pendientes ────────────────────────────────
        _actualizarBandejaUI() {
            const bandeja  = this.estado.bandejaVoz || [];
            const section  = document.getElementById('bandejaPendientes');
            const contador = document.getElementById('bandejaCount');
            const lista    = document.getElementById('bandejaTarjetas');

            if (!section || !lista) return;

            if (bandeja.length > 0) {
                section.style.display = 'block';
                if (contador) contador.textContent = bandeja.length;
                lista.innerHTML = '';

                bandeja.forEach((obs, idx) => {
                    const secciones = Object.keys(this.estado.estructura || {});
                    const opciones  = secciones.map(s =>
                        `<option value="${s}" ${obs.seccion===s?'selected':''}>${s}</option>`
                    ).join('');

                    const card = document.createElement('div');
                    card.className = 'bandeja-card';
                    card.innerHTML = `
                        <div class="bandeja-texto">"${this._escaparHTML(obs.descripcion)}"</div>
                        <div class="bandeja-meta"><i class="bi bi-clock"></i> ${new Date(obs.fecha).toLocaleTimeString()} &nbsp;·&nbsp; Depto: ${obs.departamento}</div>
                        <div class="bandeja-acciones">
                            <select class="form-select form-select-sm bandeja-select-seccion">
                                <option value="">— Seleccionar sección —</option>
                                ${opciones}
                            </select>
                            <button class="btn btn-sm btn-success" data-idx="${idx}" data-accion="asignar">
                                <i class="bi bi-check2"></i> Asignar
                            </button>
                            <button class="btn btn-sm btn-danger" data-idx="${idx}" data-accion="eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `;

                    card.querySelector('[data-accion="asignar"]').addEventListener('click', () => {
                        const sel = card.querySelector('.bandeja-select-seccion').value;
                        if (!sel) { this.mostrarNotificacion('Selecciona una sección primero', 'warning'); return; }
                        this._asignarBandejaItem(idx, sel);
                    });
                    card.querySelector('[data-accion="eliminar"]').addEventListener('click', () => {
                        this._eliminarBandejaItem(idx);
                    });

                    lista.appendChild(card);
                });
            } else {
                section.style.display = 'none';
            }
        },

        _asignarBandejaItem(idx, seccion) {
            const item = this.estado.bandejaVoz[idx];
            if (!item) return;
            item.seccion = seccion;
            item.preguntaTexto = `Dictado voz: ${seccion}`;
            item.clasificadaAuto = false;
            this.estado.observaciones.push(item);
            this.estado.bandejaVoz.splice(idx, 1);
            this.guardarAvance();
            this._actualizarBandejaUI();
            this.actualizarBadgeSeccion(seccion, null);
            this.mostrarNotificacion(`✅ Observación asignada a "${seccion}"`, 'success');
        },

        _eliminarBandejaItem(idx) {
            if (!confirm('¿Eliminar esta observación de la bandeja?')) return;
            this.estado.bandejaVoz.splice(idx, 1);
            this.guardarAvance();
            this._actualizarBandejaUI();
        },

        _escaparHTML(str) {
            return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        },

        // ============================================
        // VOZ MODAL (dictado manual en el modal)
        // ============================================
        inicializarVozModal() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) { this.vozModal.soportado = false; return; }
            this.vozModal.soportado = true;
            const rec = new SR();
            rec.lang = 'es-CL';
            rec.interimResults = true;
            rec.continuous = true;
            rec.onresult = (event) => {
                let interim = '', final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) final += t;
                    else interim += t;
                }
                if (final) this.vozModal.textoAcumulado += final;
                const ta = document.getElementById('descripcionProblema');
                if (ta) ta.value = this.vozModal.textoAcumulado + interim;
            };
            rec.onerror = (e) => {
                if (e.error === 'not-allowed') this.mostrarNotificacion('Permiso de micrófono denegado.', 'danger');
            };
            rec.onend = () => {
                if (this.vozModal.activo) try { rec.start(); } catch(e) {}
            };
            this.vozModal.recognition = rec;
        },

        toggleDictadoModal() {
            if (!this.vozModal.soportado) { this.mostrarNotificacion('Dictado no disponible en este navegador.', 'warning'); return; }
            if (this.vozModal.activo) this.detenerDictadoModal();
            else this.iniciarDictadoModal();
        },

        iniciarDictadoModal() {
            const ta = document.getElementById('descripcionProblema');
            this.vozModal.textoAcumulado = ta ? ta.value : '';
            if (this.vozModal.textoAcumulado && !this.vozModal.textoAcumulado.endsWith(' '))
                this.vozModal.textoAcumulado += ' ';
            this.vozModal.activo = true;
            try { this.vozModal.recognition.start(); } catch(e) {}
            const btn = document.getElementById('btnDictadoVoz');
            btn.classList.add('recording');
            btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
            if (ta) ta.focus();
        },

        detenerDictadoModal() {
            this.vozModal.activo = false;
            try { this.vozModal.recognition.stop(); } catch(e) {}
            const btn = document.getElementById('btnDictadoVoz');
            btn.classList.remove('recording');
            btn.innerHTML = '<i class="bi bi-mic-fill"></i>';
        },

        // ============================================
        // LÓGICA DE INSPECCIÓN
        // ============================================
        iniciarInspeccion() {
            const num = document.getElementById('numeroDepto').value.trim();
            if (!num) { alert('Por favor ingresa un número de departamento'); return; }
            if (this.estado.departamentos.some(d => d.numero === num)) { alert('Este departamento ya fue inspeccionado'); return; }

            const opcion = document.querySelector('input[name="cuestionarioOpcion"]:checked').value;
            if (opcion === 'custom' && !this.estado.preguntasPersonalizadas.length) {
                alert('Por favor suba un CSV personalizado antes de iniciar.'); return;
            }

            this.estado.preguntas = opcion === 'custom' ? this.estado.preguntasPersonalizadas : this.estado.preguntasOriginales;
            this.construirEstructura();

            if (!this.estado.departamentos.length) {
                this.estado.datosGenerales = {
                    nombreObra: document.getElementById('nombreObra').value.trim(),
                    comuna: document.getElementById('comuna').value.trim(),
                    empresaContratista: document.getElementById('empresaContratista').value.trim(),
                    entidadPatrocinante: document.getElementById('entidadPatrocinante').value.trim(),
                    supervisor: document.getElementById('supervisor').value.trim(),
                    directorObra: document.getElementById('directorObra').value.trim(),
                    cantidadDormitorios: parseInt(document.getElementById('cantidadDormitorios').value)
                };
                ['nombreObra','comuna','empresaContratista','entidadPatrocinante','supervisor','directorObra','cantidadDormitorios','cuestionarioSection'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { el.disabled = true; if(id==='cuestionarioSection') el.style.pointerEvents='none'; }
                });
            }

            this.estado.departamentoActual = { numero: num, fechaInicio: new Date().toISOString(), respuestas: {} };
            this.mostrarPreguntas();

            document.getElementById('datosGeneralesSection').style.display = 'none';
            document.getElementById('selectorDeptoSection').style.display = 'none';
            document.getElementById('cuestionarioSection').style.display = 'none';
            document.getElementById('finalizarContainer').style.display = 'block';

            // Mostrar FAB de voz libre
            const fab = document.getElementById('btnVozLibre');
            fab.style.display = 'flex';
            if (this.vozLibre.soportado) {
                fab.title = 'Activar dictado manos libres';
            } else {
                fab.style.opacity = '0.4';
                fab.title = 'Dictado no disponible (usa Chrome en Android)';
            }

            this.guardarAvance();
        },

        obtenerPreguntaCompleta(id) {
            return this.estado.preguntas.find(p => p.id === id);
        },

        obtenerJerarquia(id) {
            const p = this.obtenerPreguntaCompleta(id);
            if (!p) return null;
            return { seccion: p.section, subseccion: p.subsection, preguntaId: p.id, preguntaTexto: p.question };
        },

        // ============================================
        // INTERFAZ DE USUARIO
        // ============================================
        mostrarLoading(texto = 'Procesando...') {
            document.getElementById('loadingText').textContent = texto;
            document.getElementById('loadingOverlay').style.display = 'flex';
        },

        ocultarLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        },

        mostrarBadgeGuardado() {
            const b = document.getElementById('savedBadge');
            b.style.display = 'block';
            setTimeout(() => { b.style.display = 'none'; }, 3000);
        },

        mostrarNotificacion(mensaje, tipo = 'info') {
            const id = `notif-${Date.now()}`;
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${id}" class="alert alert-${tipo} alert-dismissible fade show" role="alert"
                     style="position:fixed;top:20px;right:20px;z-index:4000;max-width:320px;font-size:0.88rem;">
                    ${mensaje}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `);
            const el = document.getElementById(id);
            setTimeout(() => { try { new bootstrap.Alert(el).close(); } catch(e) {} }, 5000);
        },

        // ============================================
        // SECCIONES CON ACORDEÓN
        // ============================================
        mostrarPreguntas() {
            const cont = document.getElementById('seccionesPreguntas');
            cont.innerHTML = '';

            const titulo = document.createElement('div');
            titulo.className = 'depto-titulo';
            titulo.innerHTML = `<h2>Departamento: ${this.estado.departamentoActual.numero}</h2>`;
            cont.appendChild(titulo);

            let primera = true;

            Object.keys(this.estado.estructura).forEach(s => {
                if (!s.startsWith('F. DORMITORIO') && s !== 'OBSERVACIONES GENERALES') {
                    this.crearSeccionAcordeon(cont, s, null, primera);
                    primera = false;
                }
            });

            for (let i = 1; i <= this.estado.datosGenerales.cantidadDormitorios; i++) {
                this.crearSeccionAcordeon(cont, 'F. DORMITORIO', i, primera);
                primera = false;
            }

            this.crearSeccionAcordeon(cont, 'OBSERVACIONES GENERALES', null, false);

            // Restaurar badges si hay observaciones previas
            this.estado.observaciones.forEach(obs => {
                this.actualizarBadgeSeccion(obs.seccion, obs.dormitorio);
            });
        },

        crearSeccionAcordeon(cont, seccion, dormitorioNum = null, expandida = false) {
            const subs = this.estado.estructura[seccion];
            if (!subs) return;

            const accordion = document.createElement('div');
            accordion.className = 'section-accordion' + (expandida ? '' : ' collapsed');
            accordion.dataset.seccion = seccion;
            if (dormitorioNum) accordion.dataset.dormitorio = dormitorioNum;

            const titulo = dormitorioNum && seccion === 'F. DORMITORIO'
                ? `${seccion} ${dormitorioNum}`
                : seccion;

            const badgeKey = seccion + (dormitorioNum || '');

            const header = document.createElement('div');
            header.className = 'section-accordion-header';
            header.innerHTML = `
                <h3>${titulo}</h3>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="section-badge" data-obs-badge="${badgeKey}">0 obs.</span>
                    <span class="section-accordion-icon bi bi-chevron-down"></span>
                </div>
            `;
            header.addEventListener('click', () => {
                accordion.classList.toggle('collapsed');
                // Actualizar última sección activa (para NLP contextual)
                if (!accordion.classList.contains('collapsed')) {
                    this.estado.ultimaSeccionActiva = { seccion, dormitorio: dormitorioNum };
                }
            });

            const body = document.createElement('div');
            body.className = 'section-accordion-body';

            Object.keys(subs).forEach((sub, subIdx) => {
                if (sub.trim()) {
                    const subAcc = document.createElement('div');
                    subAcc.className = 'subsection-accordion' + (subIdx === 0 ? '' : ' collapsed');

                    const subHdr = document.createElement('div');
                    subHdr.className = 'subsection-accordion-header';
                    subHdr.innerHTML = `<h5>${sub}</h5><span class="subsection-accordion-icon bi bi-chevron-down"></span>`;
                    subHdr.addEventListener('click', () => subAcc.classList.toggle('collapsed'));

                    const subBody = document.createElement('div');
                    subBody.className = 'subsection-accordion-body';
                    this.crearPreguntasDeSubseccion(subBody, seccion, sub, dormitorioNum);

                    subAcc.appendChild(subHdr);
                    subAcc.appendChild(subBody);
                    body.appendChild(subAcc);
                } else {
                    this.crearPreguntasDeSubseccion(body, seccion, '', dormitorioNum);
                }
            });

            accordion.appendChild(header);
            accordion.appendChild(body);
            cont.appendChild(accordion);
        },

        crearPreguntasDeSubseccion(container, seccion, subseccion, dormitorioNum) {
            const preguntas = this.estado.estructura[seccion]?.[subseccion] || [];
            preguntas.forEach(pregunta => {
                const div = document.createElement('div');
                div.className = 'question';
                div.dataset.preguntaId = pregunta.id;
                div.dataset.seccion = seccion;
                div.dataset.subseccion = subseccion;
                if (dormitorioNum) div.dataset.dormitorio = dormitorioNum;

                const label = document.createElement('div');
                label.className = 'pregunta-texto';
                label.textContent = pregunta.texto;
                div.appendChild(label);

                const sel = document.createElement('select');
                sel.className = 'form-select respuesta';
                sel.dataset.preguntaId = pregunta.id;
                ['Sí','No'].forEach((txt, i) => {
                    const opt = document.createElement('option');
                    opt.value = i === 0 ? 'si' : 'no';
                    opt.textContent = txt;
                    sel.appendChild(opt);
                });
                sel.addEventListener('change', e => {
                    if (e.target.value === 'no') {
                        this.estado.preguntaActual = {
                            id: pregunta.id, seccion, subseccion,
                            dormitorio: dormitorioNum, texto: pregunta.texto
                        };
                        this.mostrarModalNo();
                    }
                });

                div.appendChild(sel);
                container.appendChild(div);
            });
        },

        // ============================================
        // MODAL DE OBSERVACIÓN (modo manual)
        // ============================================
        mostrarModalNo() {
            if (!this.estado.preguntaActual) return;
            document.getElementById('preguntaSeccion').textContent =
                `${this.estado.preguntaActual.seccion}${this.estado.preguntaActual.dormitorio ? ' - Dormitorio '+this.estado.preguntaActual.dormitorio : ''}`;
            document.getElementById('preguntaTexto').textContent = this.estado.preguntaActual.texto;
            document.getElementById('descripcionProblema').value = '';
            document.getElementById('alertaExito').style.display = 'none';
            this.estado.imagenesTemporales = [];
            this.vozModal.textoAcumulado = '';
            document.getElementById('galeriaImagenes').style.display = 'none';
            document.getElementById('thumbnails').innerHTML = '';
            this.actualizarContadorImagenes();

            if (!this.estado.modalNoInstance)
                this.estado.modalNoInstance = new bootstrap.Modal(document.getElementById('modalNo'));
            this.estado.modalNoInstance.show();

            setTimeout(() => document.getElementById('descripcionProblema').focus(), 300);
        },

        async cargarImagen(event) {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
            if (file.size > 10 * 1024 * 1024) { this.mostrarNotificacion('Imagen demasiado grande (máx 10MB)', 'warning'); return; }
            this.mostrarLoading('Comprimiendo imagen...');
            try {
                const comp = await this.comprimirImagen(file);
                this.estado.imagenesTemporales.push(comp);
                this.actualizarGaleria();
                this.mostrarNotificacion('Imagen agregada y comprimida', 'success');
            } catch(e) {
                this.mostrarNotificacion('Error al procesar la imagen', 'danger');
            } finally {
                this.ocultarLoading();
            }
        },

        async comprimirImagen(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        const max = this.CONFIG.MAX_IMAGE_SIZE;
                        if (w > max || h > max) {
                            if (w > h) { h = Math.round(h*max/w); w = max; }
                            else { w = Math.round(w*max/h); h = max; }
                        }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', this.CONFIG.JPEG_QUALITY));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        actualizarGaleria() {
            const gal = document.getElementById('galeriaImagenes');
            const ths = document.getElementById('thumbnails');
            if (this.estado.imagenesTemporales.length > 0) {
                gal.style.display = 'block';
                ths.innerHTML = '';
                this.estado.imagenesTemporales.forEach((img, idx) => {
                    const cont = document.createElement('div');
                    cont.className = 'thumbnail-container';
                    const th = document.createElement('img');
                    th.src = img; th.className = 'thumbnail-img';
                    th.title = 'Ver en grande'; th.onclick = () => this.verImagenGrande(img);
                    const btn = document.createElement('button');
                    btn.className = 'btn-eliminar-img'; btn.innerHTML = '×';
                    btn.onclick = e => { e.stopPropagation(); this.eliminarImagenTemporal(idx); };
                    cont.appendChild(th); cont.appendChild(btn); ths.appendChild(cont);
                });
            } else { gal.style.display = 'none'; }
            this.actualizarContadorImagenes();
        },

        actualizarContadorImagenes() {
            const cnt = document.getElementById('contadorImagenes').querySelector('strong');
            const n = this.estado.imagenesTemporales.length;
            cnt.textContent = n;
            cnt.style.color = n === 0 ? 'inherit' : n >= 3 ? '#28a745' : '#007bff';
        },

        eliminarImagenTemporal(idx) {
            if (!confirm('¿Eliminar imagen?')) return;
            this.estado.imagenesTemporales.splice(idx, 1);
            this.actualizarGaleria();
        },

        verImagenGrande(src) {
            const prev = document.getElementById('modalImagenGrande');
            if (prev) prev.remove();
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="modalImagenGrande" tabindex="-1">
                    <div class="modal-dialog modal-xl modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">Vista previa</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                            <div class="modal-body text-center p-0">
                                <img src="${src}" class="imagen-preview" style="max-height:80vh;">
                            </div>
                        </div>
                    </div>
                </div>
            `);
            const m = new bootstrap.Modal(document.getElementById('modalImagenGrande'));
            m.show();
            document.getElementById('modalImagenGrande').addEventListener('hidden.bs.modal', function(){ this.remove(); });
        },

        async guardarObservacion() {
            if (!this.estado.preguntaActual) return;
            const desc = document.getElementById('descripcionProblema').value.trim();
            if (!desc) { this.mostrarNotificacion('Por favor ingresa una descripción', 'warning'); return; }
            if (this.vozModal.activo) this.detenerDictadoModal();

            const obs = {
                id: `obs_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                departamento: this.estado.departamentoActual.numero,
                preguntaId: this.estado.preguntaActual.id,
                seccion: this.estado.preguntaActual.seccion,
                subseccion: this.estado.preguntaActual.subseccion,
                dormitorio: this.estado.preguntaActual.dormitorio,
                preguntaTexto: this.estado.preguntaActual.texto,
                descripcion: desc,
                imagenes: [...this.estado.imagenesTemporales],
                fecha: new Date().toISOString(),
                origen: 'manual'
            };

            this.estado.observaciones.push(obs);
            this.actualizarBadgeSeccion(obs.seccion, obs.dormitorio);

            try { this.guardarAvance(); } catch(e) {}

            this.estado.imagenesTemporales = [];
            this.vozModal.textoAcumulado = '';
            document.getElementById('descripcionProblema').value = '';
            if (this.estado.modalNoInstance) this.estado.modalNoInstance.hide();
            this.mostrarNotificacion(`Observación guardada (${obs.imagenes.length} imagen(es))`, 'success');
        },

        actualizarBadgeSeccion(seccion, dormitorioNum) {
            const key = seccion + (dormitorioNum || '');
            const badge = document.querySelector(`[data-obs-badge="${key}"]`);
            if (!badge) return;
            const count = this.estado.observaciones.filter(o => {
                const mS = o.seccion === seccion;
                const mD = dormitorioNum ? String(o.dormitorio) === String(dormitorioNum) : true;
                return mS && mD;
            }).length;
            badge.textContent = `${count} obs.`;
            badge.classList.toggle('has-obs', count > 0);
        },

        // ============================================
        // PERSISTENCIA
        // ============================================
        guardarAvance() {
            try {
                if (this.estado.departamentoActual &&
                    !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero)) {
                    this.estado.departamentos.push({ ...this.estado.departamentoActual });
                }
                const data = {
                    version: '2.0',
                    datosGenerales: this.estado.datosGenerales,
                    departamentos: this.estado.departamentos,
                    departamentoActual: this.estado.departamentoActual,
                    observaciones: this.estado.observaciones.map(o => ({ ...o, imagenes: [] })),
                    bandejaVoz: (this.estado.bandejaVoz || []).map(o => ({ ...o, imagenes: [] }))
                };
                localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(data));
            } catch(e) {
                console.error('Error guardando:', e);
                if (e.name === 'QuotaExceededError')
                    this.mostrarNotificacion('⚠️ Almacenamiento lleno. Los datos siguen en memoria.', 'warning');
            }
        },

        cargarAvance() {
            const csvG = localStorage.getItem('csvPersonalizado');
            const csvN = localStorage.getItem('nombreCsvPersonalizado');
            if (csvG && csvN) {
                try {
                    const ps = this.parsearCSV(csvG);
                    if (ps.length) {
                        this.estado.preguntasPersonalizadas = ps;
                        this.estado.nombreArchivoPersonalizado = csvN;
                        document.getElementById('cuestionarioPersonalizado').checked = true;
                        this.gestionarOpcionesCuestionario();
                        this.actualizarInfoArchivoPersonalizado();
                    }
                } catch(e) {
                    localStorage.removeItem('csvPersonalizado');
                    localStorage.removeItem('nombreCsvPersonalizado');
                }
            }

            const raw = localStorage.getItem(this.CONFIG.STORAGE_KEY);
            if (!raw) return;
            try {
                const data = JSON.parse(raw);
                if (data.version !== '2.0') { localStorage.removeItem(this.CONFIG.STORAGE_KEY); return; }
                this.estado.datosGenerales   = data.datosGenerales || {};
                this.estado.departamentos    = data.departamentos || [];
                this.estado.departamentoActual = data.departamentoActual || null;
                this.estado.observaciones    = data.observaciones || [];
                this.estado.bandejaVoz       = data.bandejaVoz || [];

                if (this.estado.datosGenerales.nombreObra) this.restaurarCamposGenerales();

                if (this.estado.departamentoActual) {
                    this.mostrarPreguntas();
                    document.getElementById('datosGeneralesSection').style.display = 'none';
                    document.getElementById('selectorDeptoSection').style.display = 'none';
                    document.getElementById('cuestionarioSection').style.display = 'none';
                    document.getElementById('finalizarContainer').style.display = 'block';
                    document.getElementById('btnVozLibre').style.display = 'flex';
                }

                this._actualizarBandejaUI();
            } catch(e) {
                localStorage.removeItem(this.CONFIG.STORAGE_KEY);
            }
        },

        restaurarCamposGenerales() {
            ['nombreObra','comuna','empresaContratista','entidadPatrocinante','supervisor','directorObra'].forEach(k => {
                const el = document.getElementById(k);
                if (el && this.estado.datosGenerales[k]) { el.value = this.estado.datosGenerales[k]; el.disabled = true; }
            });
            if (this.estado.datosGenerales.cantidadDormitorios) {
                const el = document.getElementById('cantidadDormitorios');
                el.value = this.estado.datosGenerales.cantidadDormitorios;
                el.disabled = true;
            }
        },

        // ============================================
        // REPORTES
        // ============================================
        prepararNuevoDepartamento() {
            if (this.estado.departamentoActual &&
                !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero))
                this.estado.departamentos.push({ ...this.estado.departamentoActual });

            document.getElementById('numeroDepto').value = '';
            document.getElementById('seccionesPreguntas').innerHTML = '';
            document.getElementById('finalizarContainer').style.display = 'none';
            document.getElementById('datosGeneralesSection').style.display = 'none';
            document.getElementById('selectorDeptoSection').style.display = 'block';
            document.getElementById('cuestionarioSection').style.display = 'block';

            this.guardarAvance();
            this.estado.departamentoActual = null;

            document.getElementById('selectorDeptoSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('numeroDepto').focus();
        },

        generarExcel() {
            if (this.estado.departamentoActual &&
                !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero))
                this.estado.departamentos.push({ ...this.estado.departamentoActual });

            const wb = XLSX.utils.book_new();

            const wsDatos = XLSX.utils.aoa_to_sheet([
                ['INFORME DE FISCALIZACIÓN DE OBRA'],
                ['Fecha:', new Date().toLocaleDateString()],
                ['Hora:', new Date().toLocaleTimeString()],
                [],
                ['DATOS GENERALES'],
                ['Nombre de la Obra:', this.estado.datosGenerales.nombreObra],
                ['Comuna:', this.estado.datosGenerales.comuna],
                ['Empresa Contratista:', this.estado.datosGenerales.empresaContratista],
                ['Entidad Patrocinante:', this.estado.datosGenerales.entidadPatrocinante],
                ['Supervisor:', this.estado.datosGenerales.supervisor],
                ['Director de Obra:', this.estado.datosGenerales.directorObra],
                ['Dormitorios:', this.estado.datosGenerales.cantidadDormitorios],
                [],
                ['RESUMEN'],
                ['Departamentos:', this.estado.departamentos.length],
                ['Observaciones:', this.estado.observaciones.length]
            ]);
            wsDatos['!cols'] = [{wch:30},{wch:40}];
            XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales');

            const wsObs = XLSX.utils.aoa_to_sheet([
                ['Departamento','Sección','Subsección','Dormitorio','Pregunta','Descripción','Imágenes','Fecha','Origen'],
                ...this.estado.observaciones.map(o => [
                    o.departamento, o.seccion, o.subseccion, o.dormitorio||'N/A',
                    o.preguntaTexto, o.descripcion,
                    o.imagenes?.length||0, new Date(o.fecha).toLocaleDateString(),
                    o.origen||'manual'
                ])
            ]);
            wsObs['!cols'] = [{wch:15},{wch:25},{wch:25},{wch:12},{wch:40},{wch:50},{wch:10},{wch:15},{wch:10}];
            XLSX.utils.book_append_sheet(wb, wsObs, 'Observaciones');

            // Hoja de bandeja pendiente si existe
            if (this.estado.bandejaVoz?.length) {
                const wsBandeja = XLSX.utils.aoa_to_sheet([
                    ['Departamento','Descripción','Fecha'],
                    ...this.estado.bandejaVoz.map(o => [o.departamento, o.descripcion, new Date(o.fecha).toLocaleDateString()])
                ]);
                XLSX.utils.book_append_sheet(wb, wsBandeja, 'Pendientes Voz');
            }

            XLSX.writeFile(wb, `Fiscalizacion_${(this.estado.datosGenerales.nombreObra||'Obra').replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
            this.mostrarNotificacion('Excel generado correctamente', 'success');
        },

        async generarPDF() {
            this.mostrarLoading('Generando PDF...');
            if (this.estado.departamentoActual &&
                !this.estado.departamentos.some(d => d.numero === this.estado.departamentoActual.numero))
                this.estado.departamentos.push({ ...this.estado.departamentoActual });

            try {
                const doc = new jsPDF();
                const W = doc.internal.pageSize.getWidth();
                const H = doc.internal.pageSize.getHeight();
                const m = 15;
                let y = m;

                doc.setFontSize(22); doc.setFont(undefined,'bold');
                doc.text('INFORME DE FISCALIZACIÓN DE OBRA', W/2, 30, {align:'center'});
                doc.setFontSize(16);
                doc.text(this.estado.datosGenerales.nombreObra||'', W/2, 45, {align:'center'});
                doc.setFontSize(12); doc.setFont(undefined,'normal');
                doc.text(`Fecha: ${new Date().toLocaleDateString()}`, W/2, 60, {align:'center'});
                y = 85;
                doc.line(m, y, W-m, y); y += 10;

                doc.setFontSize(14); doc.setFont(undefined,'bold');
                doc.text('1. DATOS GENERALES', m, y); y += 10;
                doc.setFontSize(11); doc.setFont(undefined,'normal');
                [
                    `Nombre de la Obra: ${this.estado.datosGenerales.nombreObra}`,
                    `Comuna: ${this.estado.datosGenerales.comuna}`,
                    `Empresa Contratista: ${this.estado.datosGenerales.empresaContratista}`,
                    `Entidad Patrocinante: ${this.estado.datosGenerales.entidadPatrocinante}`,
                    `Supervisor FTO SERVIU: ${this.estado.datosGenerales.supervisor}`,
                    `Director de Obra: ${this.estado.datosGenerales.directorObra}`,
                    `Dormitorios: ${this.estado.datosGenerales.cantidadDormitorios}`
                ].forEach(l => {
                    if (y > H-20) { doc.addPage(); y = m; }
                    doc.text(l, m+5, y); y += 7;
                });
                y += 5;

                doc.setFontSize(14); doc.setFont(undefined,'bold');
                doc.text('2. OBSERVACIONES REGISTRADAS', m, y); y += 10;

                if (!this.estado.observaciones.length) {
                    doc.setFontSize(11); doc.setFont(undefined,'normal');
                    doc.text('No se registraron observaciones.', m+5, y); y += 10;
                } else {
                    for (const [i, obs] of this.estado.observaciones.entries()) {
                        if (y > H-60) { doc.addPage(); y = m; }
                        doc.setFontSize(12); doc.setFont(undefined,'bold');
                        doc.text(`Obs. ${i+1}: Depto ${obs.departamento} — ${obs.seccion}${obs.dormitorio?' Dorm.'+obs.dormitorio:''}`, m, y); y += 7;
                        doc.setFontSize(10); doc.setFont(undefined,'italic');
                        const pLines = doc.splitTextToSize(`Pregunta: ${obs.preguntaTexto}`, W-m*3);
                        doc.text(pLines, m+5, y); y += pLines.length*5;
                        doc.setFont(undefined,'bold'); doc.text('Descripción:', m+5, y); y += 6;
                        doc.setFont(undefined,'normal');
                        const dLines = doc.splitTextToSize(obs.descripcion, W-m*3);
                        doc.text(dLines, m+5, y); y += dLines.length*5+4;

                        if (obs.imagenes?.length) {
                            doc.setFont(undefined,'bold');
                            doc.text(`Evidencias (${obs.imagenes.length}):`, m+5, y); y += 8;
                            for (const img of obs.imagenes) {
                                const p = doc.getImageProperties(img);
                                const ratio = p.width/p.height;
                                let iw = 80, ih = iw/ratio;
                                if (y+ih > H-20) { doc.addPage(); y = m; }
                                doc.addImage(img, 'JPEG', m+10, y, iw, ih); y += ih+8;
                            }
                        }
                        if (i < this.estado.observaciones.length-1) {
                            y += 5;
                            if (y > H-15) { doc.addPage(); y = m; }
                            doc.setLineDashPattern([1,1],0);
                            doc.line(m, y, W-m, y);
                            doc.setLineDashPattern([],0); y += 10;
                        }
                    }
                }

                doc.save(`Informe_${(this.estado.datosGenerales.nombreObra||'Obra').replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
                this.generarExcel();
                this.mostrarNotificacion('PDF y Excel generados correctamente', 'success');
                this.ocultarLoading();
                this.resetearAplicacion();

            } catch(e) {
                console.error('Error PDF:', e);
                this.mostrarNotificacion('Error al generar el PDF', 'danger');
                this.ocultarLoading();
            }
        },

        // ============================================
        // RESET
        // ============================================
        resetearAplicacion() {
            const stats = { obs: this.estado.observaciones.length, deptos: this.estado.departamentos.length };

            if (this.vozLibre.estado !== 'inactivo') this.desactivarVozLibre();
            if (this.vozModal.activo) this.detenerDictadoModal();

            this.estado = {
                datosGenerales: {}, departamentos: [], departamentoActual: null,
                observaciones: [], preguntas: this.estado.preguntas,
                preguntasOriginales: this.estado.preguntasOriginales,
                preguntasPersonalizadas: [], nombreArchivoPersonalizado: null,
                estructura: this.estado.estructura, imagenesTemporales: [],
                preguntaActual: null, modalNoInstance: null,
                bandejaVoz: [], ultimaSeccionActiva: null
            };

            ['nombreObra','comuna','empresaContratista','entidadPatrocinante','supervisor','directorObra','numeroDepto'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.value = ''; el.disabled = false; }
            });
            document.getElementById('cantidadDormitorios').value = '1';
            document.getElementById('cantidadDormitorios').disabled = false;

            ['datosGeneralesSection','selectorDeptoSection','cuestionarioSection'].forEach(id => {
                document.getElementById(id).style.display = 'block';
            });
            document.getElementById('cuestionarioSection').style.pointerEvents = 'auto';
            document.getElementById('cuestionarioPorDefecto').checked = true;
            this.gestionarOpcionesCuestionario();
            this.actualizarInfoArchivoPersonalizado();
            document.getElementById('seccionesPreguntas').innerHTML = '';
            document.getElementById('finalizarContainer').style.display = 'none';
            document.getElementById('btnVozLibre').style.display = 'none';
            document.getElementById('bandejaPendientes').style.display = 'none';

            localStorage.removeItem(this.CONFIG.STORAGE_KEY);
            localStorage.removeItem('csvPersonalizado');
            localStorage.removeItem('nombreCsvPersonalizado');

            setTimeout(() => {
                this.mostrarNotificacion(
                    `✅ Finalizado: ${stats.deptos} departamentos, ${stats.obs} observaciones.`, 'success'
                );
            }, 800);
            window.scrollTo(0, 0);
        }
    };

    FiscalizadorApp.init();
});
