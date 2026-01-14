document.addEventListener("DOMContentLoaded", function() {
    const { jsPDF } = window.jspdf;
    const app = {
        datosGenerales: {},
        departamentos: [],
        departamentoActual: null,
        dormitorioActual: 1,
        preguntaActual: null,
        dibujando: false,
        observaciones: [],
        streamCamara: null,
        zoomLevel: 1,
        panning: false,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        imagenActual: null,
        planosPorDepartamento: {},
        
        // Estructura de preguntas anidadas
        estructura: {
            "A. COCINA": {
                "01. Muro": {
                    "¿Están nivelados los muros?": null,
                    "¿Presentan grietas o fisuras?": null,
                    "¿El acabado es uniforme y sin imperfecciones?": null
                },
                "02. Tabiquería": {
                    "¿La tabiquería está correctamente instalada?": null,
                    "¿Hay daños visibles en la tabiquería?": null,
                    "¿Presenta alineación correcta?": null
                },
                "03. Cielo": {
                    "¿El cielo presenta grietas o imperfecciones?": null,
                    "¿Está nivelado y uniforme?": null
                },
                "04. Corniza": {
                    "¿La corniza está bien instalada y nivelada?": null,
                    "¿Presenta daños o faltantes?": null
                },
                "05. Pintura Esmalte Cielo - Muro": {
                    "¿La pintura está uniforme sin manchas o faltantes?": null,
                    "¿El color es el especificado?": null
                },
                "06. Cerámica - Frague Muro": {
                    "¿Las cerámicas están correctamente instaladas?": null,
                    "¿El fragüe es uniforme y completo?": null,
                },
                "07. Cerámica - Frague Piso": {
                    "¿Las cerámicas del piso están bien instaladas?": null,
                    "¿El fragüe es uniforme y sin faltantes?": null,
                },
                "08. Enchufes - Interruptores": {
                    "¿Los enchufes funcionan correctamente?": null,
                    "¿Los interruptores operan bien?": null,
                },
                "09. Puerta y marco": {
                    "¿El marco está bien instalado?": null,
                    "¿La pintura de la puerta está bien aplicada?": null,
                    "¿Las bisagras 3x3 funcionan correctamente?": null,
                    "¿La cerradura funciona bien?": null,
                    "¿La celosia está bien instalada?": null,
                    "¿El tope de puerta está instalado?": null,
                    "¿El burlete esta bien instalado?": null,
                },
                "10. Centro de Luz": {
                    "¿El centro de luz funciona correctamente?": null,
                    "¿Está bien instalado y seguro?": null,
                    "¿las Tapa ciegas estan correctamente instaladas?": null,
                },
                "11. Extractor": {
                    "¿El extractor funciona correctamente?": null,
                    "¿Está bien instalado y sin fugas?": null
                },
                "12. Mueble - Lavaplatos": {
                    "¿El sello del lavaplatos está completo y sin fugas?": null,
                    "¿El lavaplatos está bien instalado?": null,
                },
                "13. Grifería Lavaplatos": {
                    "¿La grifería funciona correctamente sin fugas?": null
                },
                "14. Sifón Lavaplatos": {
                    "¿El sifón está bien instalado y sin fugas?": null
                },
                "16. Llave de Corte": {
                    "¿La llave de corte funciona correctamente?": null
                },
                "17 . Red de Gas": {
                    "¿La instalación de gas está correcta y sin fugas?": null
                },
                "18. Limpieza": {
                    "¿El área está completamente limpia?": null
                },
                "19. Otros": {
                    "¿Hay otros aspectos a señalar en esta área?": null
                }
            },
            "B. LOGIA": {
                "01. Muro": {
                    "¿Los muros están nivelados y sin daños?": null
                },
                "02. Tabiquería": {
                    "¿La tabiquería está correctamente instalada?": null
                },
                "03. Cielo": {
                    "¿El cielo está en buen estado?": null
                },
                "04. Corniza": {
                    "¿La corniza está bien instalada?": null
                },
                "06. Cerámica - Frague Muro": {
                    "¿Las cerámicas están bien instaladas?": null,
                    "¿El fragüe es uniforme y completo?": null,
                },
                "07. Cerámica - Frague Piso": {
                    "¿El piso cerámico está en buen estado?": null,
                    "¿El fragüe es uniforme y sin faltantes?": null,
                },
                "08. Enchufes - Interruptores": {
                    "¿Los enchufes funcionan bien?": null,
                    "¿Los interruptores operan bien?": null,
                },
                "09. Centro de Luz": {
                    "¿El centro de luz funciona correctamente?": null
                },
                "16. Lavadero - Sello": {
                    "¿El sello del lavadero está completo?": null
                },
                "17. Llaves Lavadero AF - AC": {
                    "¿Las llaves funcionan correctamente?": null
                },
                "18. Sifon Lavadero": {
                    "¿El sifón está bien instalado?": null
                },
                "19. Llaves Lavadora AF - AC": {
                    "¿Las llaves funcionan correctamente?": null
                },
                "20. Descarga Lavadora": {
                    "¿La descarga funciona bien?": null
                },
                "21. Llave de Corte": {
                    "¿La llave de corte funciona?": null
                },
                "22. Calefont": {
                    "¿El calefont funciona correctamente?": null
                },
                "23. Red de Gas": {
                    "¿La instalación de gas está correcta?": null
                },
                "25. Limpieza": {
                    "¿El área está limpia?": null
                },
                "26. Otros": {
                    "¿Hay otros aspectos a señalar?": null
                }
            },
            "C. ESTAR COMEDOR": {
                "01. Muro": {
                    "¿Los muros están en buen estado?": null
                },
                "02. Tabiquería": {
                    "¿La tabiquería está correcta?": null
                },
                "03. Cielo": {
                    "¿El cielo está en buen estado?": null
                },
                "04. Piso - Recubrimiento": {
                    "¿El piso está en buen estado?": null
                },
                "05. Corniza": {
                    "¿La corniza está bien instalada?": null
                },
                "06. Ventanal": {
                    "¿El ventanal está bien sellado?": null,
                    "¿El burlete esta bien instalado?": null,
                },
                "09. Puerta y marco": {
                    "¿El marco está bien instalado?": null,
                    "¿La pintura de la puerta está bien aplicada?": null,
                    "¿Las bisagras 3x3 funcionan correctamente?": null,
                    "¿La cerradura funciona bien?": null,
                    "¿La celosia está bien instalada?": null,
                    "¿El tope de puerta está instalado?": null,
                    "¿El burlete esta bien instalado?": null,    
                },
                "15. Enchufes - Interruptores": {
                    "¿Los enchufes funcionan bien?": null,
                    "¿Los interruptores operan bien?": null,
                },
                "16. Centro de Luz": {
                    "¿El centro de luz funciona?": null,
                    "¿las Tapa ciegas estan correctamente instaladas?": null,
                },
                "17. Tablero Eléctrico": {
                    "¿El tablero eléctrico está correcto?": null
                },
                "18. Limpieza": {
                    "¿El área está limpia?": null
                },
                "19. Otros": {
                    "¿Hay otros aspectos a señalar?": null
                }
            },
            "D. TERRAZA": {
                "01. Muro": {
                    "¿El muro esta en buen estado?": null
                },
                "02. Tabiquería": {
                    "¿La tabiquería está correcta?": null
                },
                "03. Cielo": {
                    "¿El cielo está en buen estado?": null
                },
                "04. Cerámica Piso": {
                    "¿El piso cerámico está bien instalado?": null
                },
                "16. Centro de Luz": {
                    "¿El centro de luz funciona?": null,
                    "¿las Tapa ciegas estan correctamente instaladas?": null,
                },
                "07. Pintura Muro": {
                    "¿La pintura está bien aplicada?": null
                },
                "08. Baranda": {
                    "¿La baranda está bien instalada y segura?": null
                },
                "18. Limpieza": {
                    "¿El área está limpia?": null
                },
                "19. Otros": {
                    "¿Hay otros aspectos a señalar?": null
                }
            },
            "E. BAÑO": {
                "01. Muro": {
                    "¿Los muros están en buen estado?": null
                },
                "02. Tabiquería": {
                    "¿La tabiquería está correcta?": null
                },
                "03. Cielo": {
                    "¿El cielo está en buen estado?": null
                },
                "04. Corniza": {
                    "¿La corniza está bien instalada?": null
                },
                "05. Pintura Esmalte Cielo - Muro": {
                    "¿La pintura está bien aplicada?": null
                },
                "06. Cerámica - Frague Muro": {
                    "¿Las cerámicas están correctamente instaladas?": null,
                    "¿El fragüe es uniforme y completo?": null,
                },
                "07. Cerámica - Frague Piso": {
                    "¿Las cerámicas del piso están bien instaladas?": null,
                    "¿El fragüe es uniforme y sin faltantes?": null,
                },
                "09. Puerta y marco": {
                    "¿La puerta con celosia funciona correctamente?": null,
                    "¿El marco está bien instalado?": null,
                    "¿La pintura de la puerta está bien aplicada?": null,
                    "¿Las bisagras 3x3 funcionan correctamente?": null,
                    "¿La cerradura funciona bien?": null,
                    "¿La celosia está bien instalada?": null,
                    "¿El tope de puerta está instalado?": null,
                    "¿El burlete esta bien instalado?": null,
                },
                "15. Enchufe - Interruptor": {
                    "¿Los enchufes funcionan?": null,
                    "¿Los interruptores operan bien?": null,
                },
                "16. Centro de Luz": {
                    "¿El centro de luz funciona?": null
                },
                "17. Extractor": {
                    "¿El extractor funciona correctamente?": null
                },
                "18. Tina": {
                    "¿La tina está bien sellada?": null,
                    "¿esta bien instalada la celosia?": null,
                    "¿La grifería funciona sin fugas?": null,
                },
                "20. WC": {
                    "¿El WC está bien sellado?": null,
                    "¿La llave angular funciona?": null,
                },
                "22. Lavamanos": {
                    "¿El lavamanos está bien sellado?": null,
                    "¿La llave de corte funciona?": null,
                    "¿La grifería funciona sin fugas?": null,
                },
                "23. Accesorios - Toallero - Jabonera - Porta Papel": {
                    "¿Los accesorios están bien instalados?": null
                },
                "24. Celosia": {
                    "¿La celosía funciona correctamente?": null
                },
                "26. Limpieza": {
                    "¿El baño está completamente limpio?": null
                },
                "27. Otros": {
                    "¿Hay otros aspectos a señalar?": null
                }
            },
            "F. DORMITORIO": {
                "01. Muro": {
                    "¿Los muros están en buen estado?": null
                },
                "02. Tabiquería": {
                    "¿La tabiquería está correcta?": null
                },
                "03. Cielo": {
                    "¿El cielo está en buen estado?": null
                },
                "04. Piso": {
                    "¿El piso está en buen estado?": null
                },
                "05. Corniza": {
                    "¿La corniza está bien instalada?": null
                },
                "06. Ventana": {
                    "¿La ventana está bien sellada?": null
                },
                "09. Puerta y marco": {
                    "¿La puerta funciona correctamente?": null,
                    "¿El marco está bien instalado?": null,
                    "¿Las bisagras 3x3 funcionan correctamente?": null,
                    "¿La cerradura funciona bien?": null,
                    "¿El tope de puerta está instalado?": null,
                },
                "13. Ventilación Jonas": {
                    "¿La ventilación funciona correctamente?": null
                },
                "14. Enchufes - Interruptor": {
                    "¿Los enchufes funcionan?": null,
                    "¿Los interruptores operan bien?": null,
                },
                "15. Centro de Luz": {
                    "¿El centro de luz funciona?": null
                },
                "16. Limpieza": {
                    "¿El dormitorio está completamente limpio?": null
                },
                "17. Otros": {
                    "¿Hay otros aspectos a señalar?": null
                }
            },
            "OBSERVACIONES GENERALES": {
                "01. Observaciones adicionales": null,
                "02. Comentarios finales": null
            }
        },
        
        init: function() {
            this.setupEventListeners();
            this.cargarAvance();
        },
        
        setupEventListeners: function() {
            // Iniciar inspección
            document.getElementById("iniciarInspeccion").addEventListener("click", () => this.iniciarInspeccion());
            
            // Modal para respuestas "No"
            document.getElementById("subirImagenBtn").addEventListener("click", () => document.getElementById("imagenInput").click());
            document.getElementById("tomarFotoBtn").addEventListener("click", () => document.getElementById("fotoInput").click());
            document.getElementById("imagenInput").addEventListener("change", (e) => this.cargarImagen(e));
            document.getElementById("fotoInput").addEventListener("change", (e) => this.cargarImagen(e));
            document.getElementById("guardarObservacionBtn").addEventListener("click", () => this.guardarObservacion());
            
            // Herramientas de dibujo
            const canvas = document.getElementById("imagenCanvas");
            const ctx = canvas.getContext("2d");
            
            document.getElementById("dibujarBtn").addEventListener("click", () => {
                this.dibujando = true;
                canvas.style.cursor = "crosshair";
            });
            
            document.getElementById("borrarBtn").addEventListener("click", () => {
                this.dibujando = false;
                canvas.style.cursor = "default";
            });
            
            document.getElementById("limpiarBtn").addEventListener("click", () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (this.imagenActual) {
                    ctx.drawImage(this.imagenActual, 0, 0, canvas.width, canvas.height);
                }
            });
            
            // Zoom
            document.getElementById("zoomInBtn").addEventListener("click", () => this.zoom(1.2));
            document.getElementById("zoomOutBtn").addEventListener("click", () => this.zoom(0.8));
            document.getElementById("resetZoomBtn").addEventListener("click", () => this.resetZoom());
            
            // Eventos de dibujo
            canvas.addEventListener("mousedown", (e) => this.iniciarDibujo(e, canvas, ctx));
            canvas.addEventListener("mousemove", (e) => this.dibujar(e, canvas, ctx));
            canvas.addEventListener("mouseup", () => this.terminarDibujo());
            canvas.addEventListener("mouseout", () => this.terminarDibujo());
            canvas.addEventListener("wheel", (e) => {
                e.preventDefault();
                this.zoom(e.deltaY > 0 ? 0.8 : 1.2, e.offsetX, e.offsetY);
            });
            
            // Eventos para pantalla táctil
            canvas.addEventListener("touchstart", (e) => this.iniciarDibujoTouch(e, canvas, ctx));
            canvas.addEventListener("touchmove", (e) => this.dibujarTouch(e, canvas, ctx));
            canvas.addEventListener("touchend", () => this.terminarDibujo());
            
            // Botones finales
            document.getElementById("otroDepartamentoBtn")?.addEventListener("click", () => this.prepararNuevoDepartamento());
            document.getElementById("finalizarInspeccion")?.addEventListener("click", () => this.generarPDF());
            document.getElementById("guardarAvanceBtn")?.addEventListener("click", () => {
                this.guardarAvance();
                this.mostrarBadgeGuardado();
            });
            document.getElementById("generarExcelBtn")?.addEventListener("click", () => this.generarExcel());
            
            // Prevenir pérdida de datos al salir
            window.addEventListener("beforeunload", (e) => {
                if (this.departamentoActual || this.departamentos.length > 0) {
                    e.preventDefault();
                    e.returnValue = "Tienes datos no guardados. ¿Estás seguro de querer salir?";
                }

            
            });
        },
        
        mostrarBadgeGuardado: function() {
            const badge = document.getElementById("savedBadge");
            badge.style.display = "block";
            setTimeout(() => {
                badge.style.display = "none";
            }, 3000);
        },
        
        iniciarInspeccion: function() {
            const numeroDepto = document.getElementById("numeroDepto").value;
            
            if (!numeroDepto) {
                alert("Por favor ingresa un número de departamento");
                return;
            }
            
            // Validar si el departamento ya existe
            if (this.departamentos.some(depto => depto.numero === numeroDepto)) {
                alert("Este departamento ya ha sido inspeccionado");
                return;
            }
                
            // Solo guardar datos generales si es el primer departamento
            if (this.departamentos.length === 0) {
                this.datosGenerales = {
                    nombreObra: document.getElementById("nombreObra").value,
                    comuna: document.getElementById("comuna").value,
                    empresaContratista: document.getElementById("empresaContratista").value,
                    entidadPatrocinante: document.getElementById("entidadPatrocinante").value,
                    supervisor: document.getElementById("supervisor").value,
                    directorObra: document.getElementById("directorObra").value,
                    cantidadDormitorios: parseInt(document.getElementById("cantidadDormitorios").value)
                };
                
                // Bloquear campos de datos generales
                document.getElementById("nombreObra").disabled = true;
                document.getElementById("comuna").disabled = true;
                document.getElementById("empresaContratista").disabled = true;
                document.getElementById("entidadPatrocinante").disabled = true;
                document.getElementById("supervisor").disabled = true;
                document.getElementById("directorObra").disabled = true;
                document.getElementById("cantidadDormitorios").disabled = true;
            }
            
            // Crear nuevo departamento
            this.departamentoActual = {
                numero: numeroDepto,
                dormitorios: [],
                respuestas: {}
            };
            
            // Mostrar preguntas
            this.mostrarPreguntas();
            
            // Ocultar sección inicial y mostrar botón finalizar
            document.getElementById("datosGeneralesSection").style.display = "none";
            document.getElementById("selectorDeptoSection").style.display = "none";
            document.getElementById("finalizarContainer").style.display = "block";
            
            // Guardar avance
            this.guardarAvance();
        },
        
        mostrarPreguntas: function() {
            const contenedor = document.getElementById("seccionesPreguntas");
            contenedor.innerHTML = "";
            
            // Título del departamento
            const tituloDepto = document.createElement("h2");
            tituloDepto.className = "my-4";
            tituloDepto.textContent = `Departamento: ${this.departamentoActual.numero}`;
            contenedor.appendChild(tituloDepto);
            
            // Mostrar todas las secciones excepto dormitorios
            for (const [seccion, preguntas] of Object.entries(this.estructura)) {
                if (seccion !== "F. DORMITORIO" && seccion !== "OBSERVACIONES GENERALES") {
                    this.crearSeccionPreguntas(contenedor, seccion, preguntas);
                }
            }
            
            // Mostrar dormitorios según cantidad
            for (let i = 1; i <= this.datosGenerales.cantidadDormitorios; i++) {
                const dormitorioSection = document.createElement("div");
                dormitorioSection.className = "section";
                
                const tituloDormitorio = document.createElement("h3");
                tituloDormitorio.textContent = `F. DORMITORIO ${i}`;
                dormitorioSection.appendChild(tituloDormitorio);
                
                this.crearPreguntas(dormitorioSection, this.estructura["F. DORMITORIO"]);
                contenedor.appendChild(dormitorioSection);
            }
            
            // Mostrar observaciones generales
            this.crearSeccionPreguntas(contenedor, "OBSERVACIONES GENERALES", this.estructura["OBSERVACIONES GENERALES"]);
            
            // Mostrar el contenedor de botones finales
            document.getElementById("finalizarContainer").style.display = "block";
        },
        
        prepararNuevoDepartamento: function() {
            // Guardar departamento
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
        
            // Resetear interfaz
            document.getElementById("numeroDepto").value = "";
            document.getElementById("seccionesPreguntas").innerHTML = "";
            document.getElementById("finalizarContainer").style.display = "none";
            document.getElementById("datosGeneralesSection").style.display = "none";
            document.getElementById("selectorDeptoSection").style.display = "block";
        
            // Guardar avance
            this.guardarAvance();
            
            // Scroll y focus
            document.getElementById("selectorDeptoSection").scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            document.getElementById("numeroDepto").focus();
        },
        
        crearSeccionPreguntas: function(contenedor, seccion, preguntas) {
            const sectionDiv = document.createElement("div");
            sectionDiv.className = "section";
            
            const titulo = document.createElement("h3");
            titulo.textContent = seccion;
            sectionDiv.appendChild(titulo);
            
            this.crearPreguntas(sectionDiv, preguntas);
            contenedor.appendChild(sectionDiv);
        },
        
        crearPreguntas: function(sectionDiv, preguntas, nivel = 0) {
            for (const [pregunta, subpreguntas] of Object.entries(preguntas)) {
                const preguntaDiv = document.createElement("div");
                preguntaDiv.className = "question";
                preguntaDiv.style.marginLeft = `${nivel * 20}px`;
                
                const label = document.createElement("label");
                label.className = "form-label";
                label.textContent = pregunta;
                preguntaDiv.appendChild(label);
                
                if (subpreguntas === null) {
                    // Pregunta normal con select
                    const select = document.createElement("select");
                    select.className = "form-select respuesta";
                    select.dataset.pregunta = pregunta;
                    
                    const opcionSi = document.createElement("option");
                    opcionSi.value = "si";
                    opcionSi.textContent = "Sí";
                    
                    const opcionNo = document.createElement("option");
                    opcionNo.value = "no";
                    opcionNo.textContent = "No";
                    
                    select.appendChild(opcionSi);
                    select.appendChild(opcionNo);
                    
                    select.addEventListener("change", (e) => {
                        if (e.target.value === "no") {
                            this.preguntaActual = pregunta;
                            this.mostrarModalNo();
                        }
                    });
                    
                    preguntaDiv.appendChild(select);
                } else {
                    // Contenedor de subpreguntas
                    const subContainer = document.createElement("div");
                    subContainer.className = "subpreguntas";
                    this.crearPreguntas(subContainer, subpreguntas, nivel + 1);
                    preguntaDiv.appendChild(subContainer);
                }
                
                sectionDiv.appendChild(preguntaDiv);
            }
        },
        
        mostrarModalNo: function() {
            // Resetear y preparar el modal completamente
            document.getElementById("descripcionProblema").value = "";
            
            // Configurar el área de imagen
            const canvas = document.getElementById("imagenCanvas");
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Mostrar el área de preview de imagen
            document.getElementById("photoPreview").style.display = "block";
            
            // Cargar plano existente si hay uno
            this.cargarPlanoDepartamento();
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById("modalNo"));
            modal.show();
            
            // Enfocar el primer campo del modal
            document.getElementById("descripcionProblema").focus();
        },
        
        cargarPlanoDepartamento: function() {
            const canvas = document.getElementById("imagenCanvas");
            const ctx = canvas.getContext("2d");
            
            if (this.planosPorDepartamento[this.departamentoActual.numero]) {
                const img = new Image();
                img.onload = () => {
                    // Ajustar tamaño manteniendo relación de aspecto
                    const container = canvas.parentElement;
                    const containerWidth = container.clientWidth;
                    const containerHeight = container.clientHeight;
                    const ratio = Math.min(
                        containerWidth / img.width,
                        containerHeight / img.height
                    );
                    
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    this.imagenActual = img;
                };
                img.src = this.planosPorDepartamento[this.departamentoActual.numero];
            }
        },
        
        cargarImagen: function(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Resetear el input para permitir cargar la misma imagen otra vez
            event.target.value = '';

            const reader = new FileReader();
            reader.onload = (e) => {
                const canvas = document.getElementById("imagenCanvas");
                const ctx = canvas.getContext("2d");
                const container = canvas.parentElement;
                
                this.imagenActual = new Image();
                this.imagenActual.onload = () => {
                    // Ajustar tamaño manteniendo relación de aspecto
                    const containerWidth = container.clientWidth;
                    const containerHeight = container.clientHeight;
                    const ratio = Math.min(
                        containerWidth / this.imagenActual.width,
                        containerHeight / this.imagenActual.height
                    );
                    
                    canvas.width = this.imagenActual.width * ratio;
                    canvas.height = this.imagenActual.height * ratio;
                    
                    ctx.drawImage(this.imagenActual, 0, 0, canvas.width, canvas.height);
                    
                    document.getElementById("photoPreview").style.display = "block";
                    this.resetZoom();
                };
                this.imagenActual.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        
    
        
        zoom: function(scaleFactor, pivotX, pivotY) {
            const canvas = document.getElementById("imagenCanvas");
            
            // Calcular nuevo zoom
            this.zoomLevel *= scaleFactor;
            this.zoomLevel = Math.max(0.5, Math.min(this.zoomLevel, 3)); // Limitar zoom
            
            // Ajustar offset para zoom centrado en posición del mouse
            if (pivotX && pivotY) {
                this.offsetX = pivotX - (pivotX - this.offsetX) * scaleFactor;
                this.offsetY = pivotY - (pivotY - this.offsetY) * scaleFactor;
            }
            
            this.applyImageTransform();
        },
        
        resetZoom: function() {
            this.zoomLevel = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.applyImageTransform();
        },
        
        applyImageTransform: function() {
            const canvas = document.getElementById("imagenCanvas");
            canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.zoomLevel})`;
        },
        
        iniciarDibujo: function(e, canvas, ctx) {
            if (!this.dibujando) {
                this.panning = true;
                this.startX = e.offsetX;
                this.startY = e.offsetY;
                canvas.style.cursor = "grabbing";
                return;
            }
            
            this.dibujando = true;
            this.ultimoX = e.offsetX / this.zoomLevel - this.offsetX / this.zoomLevel;
            this.ultimoY = e.offsetY / this.zoomLevel - this.offsetY / this.zoomLevel;
            
            ctx.beginPath();
            ctx.strokeStyle = document.getElementById("colorPicker").value;
            ctx.lineWidth = 3 / this.zoomLevel;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.moveTo(this.ultimoX, this.ultimoY);
        },
        
        dibujar: function(e, canvas, ctx) {
            if (this.panning) {
                this.offsetX += e.offsetX - this.startX;
                this.offsetY += e.offsetY - this.startY;
                this.startX = e.offsetX;
                this.startY = e.offsetY;
                this.applyImageTransform();
                return;
            }
            
            if (!this.dibujando) return;
            
            const x = e.offsetX / this.zoomLevel - this.offsetX / this.zoomLevel;
            const y = e.offsetY / this.zoomLevel - this.offsetY / this.zoomLevel;
            
            ctx.lineTo(x, y);
            ctx.stroke();
            this.ultimoX = x;
            this.ultimoY = y;
        },
        
        terminarDibujo: function() {
            this.dibujando = false;
            this.panning = false;
            const canvas = document.getElementById("imagenCanvas");
            canvas.style.cursor = this.dibujando ? "crosshair" : "grab";
        },
        
        iniciarDibujoTouch: function(e, canvas, ctx) {
            if (!this.dibujando) return;
            e.preventDefault();
            
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            
            this.ultimoX = (touch.clientX - rect.left) / this.zoomLevel - this.offsetX / this.zoomLevel;
            this.ultimoY = (touch.clientY - rect.top) / this.zoomLevel - this.offsetY / this.zoomLevel;
            
            ctx.beginPath();
            ctx.strokeStyle = document.getElementById("colorPicker").value;
            ctx.lineWidth = 3 / this.zoomLevel;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.moveTo(this.ultimoX, this.ultimoY);
        },
        
        dibujarTouch: function(e, canvas, ctx) {
            if (!this.dibujando) return;
            e.preventDefault();
            
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = (touch.clientX - rect.left) / this.zoomLevel - this.offsetX / this.zoomLevel;
            const y = (touch.clientY - rect.top) / this.zoomLevel - this.offsetY / this.zoomLevel;
            
            ctx.lineTo(x, y);
            ctx.stroke();
            this.ultimoX = x;
            this.ultimoY = y;
        },
        
        guardarObservacion: function() {
            const descripcion = document.getElementById("descripcionProblema").value;
            const canvas = document.getElementById("imagenCanvas");
            
            if (!descripcion) {
                alert("Por favor ingresa una descripción del problema");
                return;
            }
            
            if (!this.imagenActual) {
                alert("Por favor captura o sube una imagen del problema");
                return;
            }
            
            // Guardar imagen con anotaciones
            const imagenConAnotaciones = canvas.toDataURL("image/png");
            
            // Guardar plano para este departamento
            this.planosPorDepartamento[this.departamentoActual.numero] = imagenConAnotaciones;
            
            // Agregar a observaciones
            this.observaciones.push({
                departamento: this.departamentoActual.numero,
                pregunta: this.preguntaActual,
                descripcion: descripcion,
                imagen: imagenConAnotaciones
            });
            
            // Guardar avance
            this.guardarAvance();
            
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById("modalNo")).hide();
            
            // Mostrar confirmación
            alert("Observación guardada con éxito.");
        },
        
        guardarAvance: function() {
            // Asegurarnos de incluir el departamento actual
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
            
            const datos = {
                datosGenerales: this.datosGenerales,
                departamentos: this.departamentos,
                departamentoActual: this.departamentoActual,
                observaciones: this.observaciones,
                planosPorDepartamento: this.planosPorDepartamento
            };
            localStorage.setItem('fiscalizacionObra', JSON.stringify(datos));
            
            this.mostrarBadgeGuardado();
        },
        
        cargarAvance: function() {
            const datosGuardados = localStorage.getItem('fiscalizacionObra');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                this.datosGenerales = datos.datosGenerales || {};
                this.departamentos = datos.departamentos || [];
                this.departamentoActual = datos.departamentoActual || null;
                this.observaciones = datos.observaciones || [];
                this.planosPorDepartamento = datos.planosPorDepartamento || {};
                
                // Restaurar datos generales en el formulario
                if (this.datosGenerales.nombreObra) {
                    document.getElementById("nombreObra").value = this.datosGenerales.nombreObra;
                    document.getElementById("comuna").value = this.datosGenerales.comuna;
                    document.getElementById("empresaContratista").value = this.datosGenerales.empresaContratista;
                    document.getElementById("entidadPatrocinante").value = this.datosGenerales.entidadPatrocinante;
                    document.getElementById("supervisor").value = this.datosGenerales.supervisor;
                    document.getElementById("directorObra").value = this.datosGenerales.directorObra;
                    document.getElementById("cantidadDormitorios").value = this.datosGenerales.cantidadDormitorios;
                    
                    // Bloquear campos de datos generales
                    document.getElementById("nombreObra").disabled = true;
                    document.getElementById("comuna").disabled = true;
                    document.getElementById("empresaContratista").disabled = true;
                    document.getElementById("entidadPatrocinante").disabled = true;
                    document.getElementById("supervisor").disabled = true;
                    document.getElementById("directorObra").disabled = true;
                    document.getElementById("cantidadDormitorios").disabled = true;
                }
                
                // Si hay departamento actual, cargar preguntas
                if (this.departamentoActual) {
                    this.mostrarPreguntas();
                    document.getElementById("datosGeneralesSection").style.display = "none";
                    document.getElementById("selectorDeptoSection").style.display = "none";
                    document.getElementById("finalizarContainer").style.display = "block";
                }
            }
        },
        
        generarExcel: function() {
            // Asegurarnos de incluir el departamento actual
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
            
            // Crear hoja de cálculo
            const wb = XLSX.utils.book_new();
            
            // Hoja de datos generales
            const datosGenerales = [
                ["Nombre de la Obra", this.datosGenerales.nombreObra],
                ["Comuna", this.datosGenerales.comuna],
                ["Empresa Contratista", this.datosGenerales.empresaContratista],
                ["Entidad Patrocinante", this.datosGenerales.entidadPatrocinante],
                ["Supervisor", this.datosGenerales.supervisor],
                ["Director de Obra", this.datosGenerales.directorObra],
                ["Cantidad de Dormitorios", this.datosGenerales.cantidadDormitorios],
                ["Fecha de Inspección", new Date().toLocaleDateString()]
            ];
            const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales);
            XLSX.utils.book_append_sheet(wb, wsDatos, "Datos Generales");
            
            // Hoja de respuestas
            const respuestas = [["Departamento", "Sección", "Subsección", "Pregunta", "Respuesta", "Observación"]];
    
            // Procesar todos los departamentos
            this.departamentos.forEach(depto => {
                // Obtener todas las observaciones para este departamento
                const obsDepto = this.observaciones.filter(obs => obs.departamento === depto.numero);
        
                // Recorrer la estructura de preguntas para encontrar respuestas
                for (const [seccion, subsecciones] of Object.entries(this.estructura)) {
                    this.procesarPreguntasParaExcel(respuestas, depto.numero, seccion, subsecciones, obsDepto);
                }
            });
    
                const wsRespuestas = XLSX.utils.aoa_to_sheet(respuestas);
                XLSX.utils.book_append_sheet(wb, wsRespuestas, "Respuestas");
    
                 // Generar archivo
                XLSX.writeFile(wb, `Fiscalizacion_${this.datosGenerales.nombreObra.replace(/ /g, "_")}.xlsx`);
        },
        
        procesarPreguntasParaExcel: function(respuestas, numeroDepto, seccion, items, obsDepto, subseccion = "") {
            for (const [item, preguntas] of Object.entries(items)) {
                if (preguntas === null) {
                    // Es una pregunta final
                    const observacion = obsDepto.find(obs => obs.pregunta === item);
                    
                    respuestas.push([
                        numeroDepto,
                        seccion,
                        subseccion,
                        item,
                        observacion ? "No" : "Sí",
                        observacion ? observacion.descripcion : ""
                    ]);
                } else {
                    // Es una subsección, procesar recursivamente
                    this.procesarPreguntasParaExcel(
                        respuestas,
                        numeroDepto,
                        seccion,
                        preguntas,
                        obsDepto,
                        item // Nueva subsección
                    );
                }
            }
        },
        
        generarPDF: function() {
            // 1. Asegurarnos de incluir el departamento actual
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
        
            // 2. Crear nuevo documento PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 8;
            
            // 3. Encabezado y datos generales (solo en primera página)
            doc.setFontSize(18);
            doc.text("Informe de Fiscalización de Obra", pageWidth / 2, 15, { align: "center" });
            doc.setFontSize(12);
            doc.text(`Obra: ${this.datosGenerales.nombreObra}`, margin, 25);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, 35);
            
            doc.setFontSize(14);
            doc.text("1. Datos Generales de la Obra", margin, 45);
            doc.setFontSize(12);
            doc.text(`- Nombre: ${this.datosGenerales.nombreObra}`, margin + 6, 55);
            doc.text(`- Comuna: ${this.datosGenerales.comuna}`, margin + 6, 65);
            doc.text(`- Contratista: ${this.datosGenerales.empresaContratista}`, margin + 6, 75);
            doc.text(`- Patrocinante: ${this.datosGenerales.entidadPatrocinante}`, margin + 6, 85);
            doc.text(`- Supervisor: ${this.datosGenerales.supervisor}`, margin + 6, 95);
            doc.text(`- Director Obra: ${this.datosGenerales.directorObra}`, margin + 6, 105);
        
            // 4. Procesar todos los departamentos
            let yPosition = 115;
            const numerosVistos = new Set();
        
            // Ordenar departamentos por número (opcional)
            const deptosOrdenados = [...this.departamentos].sort((a, b) => a.numero.localeCompare(b.numero));
        
            deptosOrdenados.forEach(depto => {
                if (!numerosVistos.has(depto.numero)) {
                    numerosVistos.add(depto.numero);
        
                    // Nueva página si es necesario
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = margin;
                    }
        
                    // Título del departamento
                    doc.setFontSize(11);
                    doc.setTextColor(0, 0, 0); // Negro
                    doc.text(`DEPARTAMENTO ${depto.numero}:`, margin, yPosition);
                    yPosition += 6;
        
                    // Filtrar observaciones de este departamento
                    const obsDepto = this.observaciones.filter(obs => 
                        obs.departamento === depto.numero
                    );
        
                    if (obsDepto.length > 0) {
                        // Agrupar observaciones por sección y subsección
                        const observacionesAgrupadas = this.agruparObservacionesPorJerarquia(obsDepto);
        
                        // Procesar cada grupo
                        for (const [seccion, subsecciones] of Object.entries(observacionesAgrupadas)) {
                            // Nueva página si es necesario
                            if (yPosition > 220) {
                                doc.addPage();
                                yPosition = margin;
                            }
        
                            // Sección
                            doc.setFontSize(11);
                            doc.setTextColor(0, 0, 0); // negro
                            doc.text(seccion, margin, yPosition);
                            yPosition += 6;
        
                            for (const [subseccion, preguntas] of Object.entries(subsecciones)) {
                                // Subsección (si existe)
                                if (subseccion && subseccion !== "null") {
                                    if (yPosition > 240) {
                                        doc.addPage();
                                        yPosition = margin;
                                    }
        
                                    doc.setFontSize(11);
                                    doc.setTextColor(0, 0, 0); // negro oscuro
                                    doc.text(subseccion, margin, yPosition);
                                    yPosition += 6;
                                }
        
                                // Preguntas y observaciones
                                for (const [pregunta, observaciones] of Object.entries(preguntas)) {
                                    observaciones.forEach(obs => {
                                        if (yPosition > 240) {
                                            doc.addPage();
                                            yPosition = margin;
                                        }
        
                                        // Pregunta
                                        doc.setFontSize(11);
                                        doc.setTextColor(0, 0, 0); // Negro
                                        doc.text(`${pregunta}`, margin, yPosition);
                                        yPosition += 6;
        
                                        // Observación
                                        doc.setFontSize(11);
                                        doc.setTextColor(0, 0, 0); // Rojo oscuro
                                        const descripcionLines = doc.splitTextToSize(`    Observación: ${obs.descripcion}`, pageWidth - margin * 2 - (subseccion ? 40 : 30));
                                        doc.text(descripcionLines, margin, yPosition);
                                        yPosition += 6 * descripcionLines.length;
        
                                        // Imagen
                                        try {
                                            //if (yPosition > 150) { // Si no hay espacio para la imagen
                                                //doc.addPage();
                                                //yPosition = margin;
                                            //}
        
                                            const imgWidth = (pageWidth - margin * 2) / 1.5;
                                            const imgHeight = imgWidth * 0.75; // Relación 4:3
                                            const espacioNecesario = imgHeight + 20; // Altura + margen

                                            // Verificar si hay espacio suficiente en la página actual
                                            if (yPosition + espacioNecesario > doc.internal.pageSize.getHeight() - margin) {
                                                doc.addPage();
                                                yPosition = margin;
                                            }

                                            
                                            doc.addImage(obs.imagen, "PNG", 
                                                (pageWidth - imgWidth) / 2, // Centrado horizontal
                                                yPosition, 
                                                imgWidth, 
                                                imgHeight);
                                            
                                            yPosition += imgHeight + 10;
                                        } catch (e) {
                                            console.error("Error al agregar imagen:", e);
                                            doc.setTextColor(0, 0, 0);
                                            doc.text("(Imagen no disponible)", margin + (subseccion ? 40 : 30), yPosition);
                                            yPosition += 8;
                                        }
        
                                        yPosition += 10; // Espacio entre observaciones
                                    });
                                }
                            }
                        }
                    } else {
                        doc.setFontSize(12);
                        doc.setTextColor(0, 0, 0);
                        doc.text("No se registraron observaciones", margin + 10, yPosition);
                        yPosition += 8;
                    }
                    
                    yPosition += 10; // Espacio entre departamentos
                }
            });
        
            // 5. Guardar PDF
            doc.save(`Informe_Fiscalizacion_${this.datosGenerales.nombreObra.replace(/ /g, "_")}.pdf`);
            
            // Generar Excel automáticamente
            this.generarExcel();
            
            // 6. Resetear aplicación
            this.resetearAplicacion();
        },
        
        // Nueva función para agrupar observaciones por jerarquía
        agruparObservacionesPorJerarquia: function(observaciones) {
            const agrupadas = {};
            
            observaciones.forEach(obs => {
                // Buscar en la estructura la jerarquía completa de la pregunta
                const jerarquia = this.encontrarJerarquiaDePregunta(obs.pregunta);
                
                if (jerarquia) {
                    const [seccion, subseccion] = jerarquia;
                    
                    if (!agrupadas[seccion]) {
                        agrupadas[seccion] = {};
                    }
                    
                    const subseccionKey = subseccion || "null";
                    
                    if (!agrupadas[seccion][subseccionKey]) {
                        agrupadas[seccion][subseccionKey] = {};
                    }
                    
                    if (!agrupadas[seccion][subseccionKey][obs.pregunta]) {
                        agrupadas[seccion][subseccionKey][obs.pregunta] = [];
                    }
                    
                    agrupadas[seccion][subseccionKey][obs.pregunta].push(obs);
                }
            });
            
            return agrupadas;
        },
        
        // Nueva función para encontrar la jerarquía de una pregunta
        encontrarJerarquiaDePregunta: function(preguntaBuscada) {
            for (const [seccion, subsecciones] of Object.entries(this.estructura)) {
                for (const [subseccion, preguntas] of Object.entries(subsecciones)) {
                    if (typeof preguntas === 'object' && preguntas !== null) {
                        // Es un objeto de preguntas
                        for (const [pregunta] of Object.entries(preguntas)) {
                            if (pregunta === preguntaBuscada) {
                                return [seccion, subseccion];
                            }
                        }
                    } else if (subseccion === preguntaBuscada) {
                        // Es una pregunta directa
                        return [seccion, null];
                    }
                }
            }
            return null;
        },

        
        
        resetearAplicacion: function() {
            this.datosGenerales = {};
            this.departamentos = [];
            this.departamentoActual = null;
            this.observaciones = [];
            this.planosPorDepartamento = {};
            
            // Resetear formularios
            document.getElementById("nombreObra").value = "";
            document.getElementById("comuna").value = "";
            document.getElementById("empresaContratista").value = "";
            document.getElementById("entidadPatrocinante").value = "";
            document.getElementById("supervisor").value = "";
            document.getElementById("directorObra").value = "";
            document.getElementById("numeroDepto").value = "";
            
            // Habilitar campos de datos generales
            document.getElementById("nombreObra").disabled = false;
            document.getElementById("comuna").disabled = false;
            document.getElementById("empresaContratista").disabled = false;
            document.getElementById("entidadPatrocinante").disabled = false;
            document.getElementById("supervisor").disabled = false;
            document.getElementById("directorObra").disabled = false;
            document.getElementById("cantidadDormitorios").disabled = false;
            
            // Mostrar secciones iniciales
            document.getElementById("datosGeneralesSection").style.display = "block";
            document.getElementById("selectorDeptoSection").style.display = "block";
            document.getElementById("seccionesPreguntas").innerHTML = "";
            document.getElementById("finalizarContainer").style.display = "none";

            // Limpiar localStorage
            localStorage.removeItem('fiscalizacionObra');
            
            // Scroll al inicio
            window.scrollTo(0, 0);
        }

    };
    
    app.init();
});
