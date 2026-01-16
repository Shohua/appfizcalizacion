document.addEventListener("DOMContentLoaded", function() {
    const { jsPDF } = window.jspdf;
    const app = {
        datosGenerales: {},
        departamentos: [],
        departamentoActual: null,
        dormitorioActual: 1,
        preguntaActual: null,
        observaciones: [],
        imagenesTemporales: [],
        modalNoInstance: null,
        
        // ============================================
        // AQUÍ VA TU ESTRUCTURA DE PREGUNTAS
        
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
        // ============================================
        
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
        
        mostrarNotificacion: function(mensaje, tipo = "info") {
            const alerta = document.getElementById("alertaExito");
            alerta.className = `alert alert-${tipo}`;
            
            let icono = "✓";
            if (tipo === "warning") icono = "⚠";
            if (tipo === "danger") icono = "✗";
            if (tipo === "info") icono = "ℹ";
            
            alerta.innerHTML = `${icono} ${mensaje}`;
            alerta.style.display = "block";
            
            setTimeout(() => {
                alerta.style.display = "none";
            }, 3000);
        },
        
        iniciarInspeccion: function() {
            const numeroDepto = document.getElementById("numeroDepto").value;
            
            if (!numeroDepto) {
                this.mostrarNotificacion("Por favor ingresa un número de departamento", "warning");
                return;
            }
            
            if (this.departamentos.some(depto => depto.numero === numeroDepto)) {
                this.mostrarNotificacion("Este departamento ya ha sido inspeccionado", "warning");
                return;
            }
                
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
                
                document.getElementById("nombreObra").disabled = true;
                document.getElementById("comuna").disabled = true;
                document.getElementById("empresaContratista").disabled = true;
                document.getElementById("entidadPatrocinante").disabled = true;
                document.getElementById("supervisor").disabled = true;
                document.getElementById("directorObra").disabled = true;
                document.getElementById("cantidadDormitorios").disabled = true;
            }
            
            this.departamentoActual = {
                numero: numeroDepto,
                dormitorios: [],
                respuestas: {}
            };
            
            this.mostrarPreguntas();
            
            document.getElementById("datosGeneralesSection").style.display = "none";
            document.getElementById("selectorDeptoSection").style.display = "none";
            document.getElementById("finalizarContainer").style.display = "block";
            
            this.guardarAvance();
        },
        
        mostrarPreguntas: function() {
            const contenedor = document.getElementById("seccionesPreguntas");
            contenedor.innerHTML = "";
            
            const tituloDepto = document.createElement("h2");
            tituloDepto.className = "my-4";
            tituloDepto.textContent = `Departamento: ${this.departamentoActual.numero}`;
            contenedor.appendChild(tituloDepto);
            
            for (const [seccion, preguntas] of Object.entries(this.estructura)) {
                if (seccion !== "F. DORMITORIO" && seccion !== "OBSERVACIONES GENERALES") {
                    this.crearSeccionPreguntas(contenedor, seccion, preguntas);
                }
            }
            
            for (let i = 1; i <= this.datosGenerales.cantidadDormitorios; i++) {
                const dormitorioSection = document.createElement("div");
                dormitorioSection.className = "section";
                
                const tituloDormitorio = document.createElement("h3");
                tituloDormitorio.textContent = `F. DORMITORIO ${i}`;
                dormitorioSection.appendChild(tituloDormitorio);
                
                this.crearPreguntas(dormitorioSection, this.estructura["F. DORMITORIO"]);
                contenedor.appendChild(dormitorioSection);
            }
            
            this.crearSeccionPreguntas(contenedor, "OBSERVACIONES GENERALES", this.estructura["OBSERVACIONES GENERALES"]);
            
            document.getElementById("finalizarContainer").style.display = "block";
        },
        
        prepararNuevoDepartamento: function() {
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
        
            document.getElementById("numeroDepto").value = "";
            document.getElementById("seccionesPreguntas").innerHTML = "";
            document.getElementById("finalizarContainer").style.display = "none";
            document.getElementById("datosGeneralesSection").style.display = "none";
            document.getElementById("selectorDeptoSection").style.display = "block";
        
            this.guardarAvance();
            
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
                    const subContainer = document.createElement("div");
                    subContainer.className = "subpreguntas";
                    this.crearPreguntas(subContainer, subpreguntas, nivel + 1);
                    preguntaDiv.appendChild(subContainer);
                }
                
                sectionDiv.appendChild(preguntaDiv);
            }
        },
        
        mostrarModalNo: function() {
            document.getElementById("descripcionProblema").value = "";
            document.getElementById("alertaExito").style.display = "none";
            this.imagenesTemporales = [];
            
            document.getElementById("galeriaImagenes").style.display = "none";
            document.getElementById("thumbnails").innerHTML = "";
            this.actualizarContadorImagenes();
            
            if (!this.modalNoInstance) {
                this.modalNoInstance = new bootstrap.Modal(document.getElementById("modalNo"));
            }
            this.modalNoInstance.show();
            
            setTimeout(() => {
                document.getElementById("descripcionProblema").focus();
            }, 300);
        },
        
        cargarImagen: function(event) {
            const file = event.target.files[0];
            if (!file) return;

            event.target.value = '';

            const reader = new FileReader();
            reader.onload = (e) => {
                // Agregar imagen directamente
                this.imagenesTemporales.push(e.target.result);
                this.actualizarGaleria();
                //this.mostrarNotificacion("Imagen agregada correctamente", "success");
            };
            reader.readAsDataURL(file);
        },
        
        actualizarGaleria: function() {
            const galeria = document.getElementById("galeriaImagenes");
            const thumbnails = document.getElementById("thumbnails");
            
            if (this.imagenesTemporales.length > 0) {
                galeria.style.display = "block";
                thumbnails.innerHTML = "";
                
                this.imagenesTemporales.forEach((img, index) => {
                    const container = document.createElement("div");
                    container.className = "thumbnail-container";
                    
                    const thumbnail = document.createElement("img");
                    thumbnail.src = img;
                    thumbnail.className = "thumbnail-img";
                    thumbnail.title = "Click para ver en grande";
                    thumbnail.onclick = () => this.verImagenGrande(img);
                    
                    const btnEliminar = document.createElement("button");
                    btnEliminar.className = "btn-eliminar-img";
                    btnEliminar.innerHTML = "×";
                    btnEliminar.title = "Eliminar imagen";
                    btnEliminar.onclick = (e) => {
                        e.stopPropagation();
                        this.eliminarImagenTemporal(index);
                    };
                    
                    container.appendChild(thumbnail);
                    container.appendChild(btnEliminar);
                    thumbnails.appendChild(container);
                });
            } else {
                galeria.style.display = "none";
            }
            
            this.actualizarContadorImagenes();
        },
        
        actualizarContadorImagenes: function() {
            const contador = document.getElementById("contadorImagenes");
            contador.querySelector("strong").textContent = this.imagenesTemporales.length;
        },
        
        eliminarImagenTemporal: function(index) {
            if (confirm("¿Deseas eliminar esta imagen?")) {
                this.imagenesTemporales.splice(index, 1);
                this.actualizarGaleria();
                this.mostrarNotificacion("Imagen eliminada", "info");
            }
        },
        
        verImagenGrande: function(imgSrc) {
            const modalHTML = `
                <div class="modal fade" id="modalImagenGrande" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Vista de imagen</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                <img src="${imgSrc}" style="max-width: 100%; height: auto;">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalAnterior = document.getElementById("modalImagenGrande");
            if (modalAnterior) modalAnterior.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById("modalImagenGrande"));
            modal.show();
            
            document.getElementById("modalImagenGrande").addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        },
        
        guardarObservacion: function () {
            const descripcion = document.getElementById("descripcionProblema").value.trim();

            if (!descripcion) {
                this.mostrarNotificacion("Por favor ingresa una descripción del problema", "warning");
                return;
            }

            if (this.imagenesTemporales.length === 0) {
                this.mostrarNotificacion("Por favor agrega al menos una imagen", "warning");
                return;
            }

            const nuevaObservacion = {
                departamento: this.departamentoActual.numero,
                pregunta: this.preguntaActual,
                descripcion: descripcion,
                imagenes: [...this.imagenesTemporales],
                fecha: new Date().toISOString()
            };

            this.observaciones.push(nuevaObservacion);

            console.log("Observación guardada:", nuevaObservacion);
            console.log("Total observaciones:", this.observaciones.length);

            // 🔒 INTENTAR guardar, pero sin romper el flujo
            try {
                this.guardarAvance();
            } catch (e) {
                console.warn("Guardado parcial, continuando flujo");
            }

            // ✅ LIMPIAR ESTADO
            this.imagenesTemporales = [];
            document.getElementById("descripcionProblema").value = "";

            // ✅ CERRAR MODAL INMEDIATAMENTE
            if (this.modalNoInstance) {
                this.modalNoInstance.hide();
            }

            // ✅ NOTIFICACIÓN
            this.mostrarNotificacion(
                `✓ Observación guardada (${nuevaObservacion.imagenes.length} imagen(es))`,
                "success"
            );
        },

        
        guardarAvance: function () {
            try {
                if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                    this.departamentos.push({ ...this.departamentoActual });
                }

                const datos = {
                    datosGenerales: this.datosGenerales,
                    departamentos: this.departamentos,
                    departamentoActual: this.departamentoActual,
                    observaciones: this.observaciones
                };

                localStorage.setItem('fiscalizacionObra', JSON.stringify(datos));
                console.log("Avance guardado. Observaciones:", this.observaciones.length);

            } catch (error) {
                console.error("Error guardando en localStorage:", error);

                if (error.name === "QuotaExceededError") {
                    this.mostrarNotificacion(
                        "⚠️ Almacenamiento lleno. Las observaciones siguen en memoria y se incluirán en el PDF.",
                        "warning"
                    );
                }
            }
        },

        
        cargarAvance: function() {
            const datosGuardados = localStorage.getItem('fiscalizacionObra');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                this.datosGenerales = datos.datosGenerales || {};
                this.departamentos = datos.departamentos || [];
                this.departamentoActual = datos.departamentoActual || null;
                this.observaciones = datos.observaciones || [];
                
                console.log("Avance cargado. Observaciones:", this.observaciones.length);
                
                if (this.datosGenerales.nombreObra) {
                    document.getElementById("nombreObra").value = this.datosGenerales.nombreObra;
                    document.getElementById("comuna").value = this.datosGenerales.comuna;
                    document.getElementById("empresaContratista").value = this.datosGenerales.empresaContratista;
                    document.getElementById("entidadPatrocinante").value = this.datosGenerales.entidadPatrocinante;
                    document.getElementById("supervisor").value = this.datosGenerales.supervisor;
                    document.getElementById("directorObra").value = this.datosGenerales.directorObra;
                    document.getElementById("cantidadDormitorios").value = this.datosGenerales.cantidadDormitorios;
                    
                    document.getElementById("nombreObra").disabled = true;
                    document.getElementById("comuna").disabled = true;
                    document.getElementById("empresaContratista").disabled = true;
                    document.getElementById("entidadPatrocinante").disabled = true;
                    document.getElementById("supervisor").disabled = true;
                    document.getElementById("directorObra").disabled = true;
                    document.getElementById("cantidadDormitorios").disabled = true;
                }
                
                if (this.departamentoActual) {
                    this.mostrarPreguntas();
                    document.getElementById("datosGeneralesSection").style.display = "none";
                    document.getElementById("selectorDeptoSection").style.display = "none";
                    document.getElementById("finalizarContainer").style.display = "block";
                }
            }
        },
        
        generarExcel: function() {
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
            
            const wb = XLSX.utils.book_new();
            
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
            
            const respuestas = [["Departamento", "Sección", "Subsección", "Pregunta", "Respuesta", "Observación", "Cantidad Imágenes"]];
    
            this.departamentos.forEach(depto => {
                const obsDepto = this.observaciones.filter(obs => obs.departamento === depto.numero);
        
                for (const [seccion, subsecciones] of Object.entries(this.estructura)) {
                    this.procesarPreguntasParaExcel(respuestas, depto.numero, seccion, subsecciones, obsDepto);
                }
            });
    
            const wsRespuestas = XLSX.utils.aoa_to_sheet(respuestas);
            XLSX.utils.book_append_sheet(wb, wsRespuestas, "Respuestas");
    
            XLSX.writeFile(wb, `Fiscalizacion_${this.datosGenerales.nombreObra.replace(/ /g, "_")}.xlsx`);
        },
        
        procesarPreguntasParaExcel: function(respuestas, numeroDepto, seccion, items, obsDepto, subseccion = "") {
            for (const [item, preguntas] of Object.entries(items)) {
                if (preguntas === null) {
                    const observacion = obsDepto.find(obs => obs.pregunta === item);
                    
                    respuestas.push([
                        numeroDepto,
                        seccion,
                        subseccion,
                        item,
                        observacion ? "No" : "Sí",
                        observacion ? observacion.descripcion : "",
                        observacion && observacion.imagenes ? observacion.imagenes.length : 0
                    ]);
                } else {
                    this.procesarPreguntasParaExcel(respuestas, numeroDepto, seccion, preguntas, obsDepto, item);
                }
            }
        },
        
        generarPDF: function() {
            if (this.departamentoActual && !this.departamentos.some(d => d.numero === this.departamentoActual.numero)) {
                this.departamentos.push({...this.departamentoActual});
            }
            
            console.log("Generando PDF. Total observaciones:", this.observaciones.length);
        
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            
            doc.setFontSize(18);
            doc.text("Informe de Fiscalización de Obra", pageWidth / 2, 20, { align: "center" });
            
            doc.setFontSize(11);
            doc.text(`Obra: ${this.datosGenerales.nombreObra}`, margin, 35);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, 42);
            
            doc.setFontSize(13);
            doc.text("Datos Generales", margin, 55);
            doc.setFontSize(10);
            doc.text(`Nombre: ${this.datosGenerales.nombreObra}`, margin + 5, 63);
            doc.text(`Comuna: ${this.datosGenerales.comuna}`, margin + 5, 70);
            doc.text(`Contratista: ${this.datosGenerales.empresaContratista}`, margin + 5, 77);
            doc.text(`Patrocinante: ${this.datosGenerales.entidadPatrocinante}`, margin + 5, 84);
            doc.text(`Supervisor: ${this.datosGenerales.supervisor}`, margin + 5, 91);
            doc.text(`Director: ${this.datosGenerales.directorObra}`, margin + 5, 98);
        
            let yPosition = 110;
            const deptosOrdenados = [...this.departamentos].sort((a, b) => a.numero.localeCompare(b.numero));
        
            deptosOrdenados.forEach(depto => {
                const obsDepto = this.observaciones.filter(obs => obs.departamento === depto.numero);
                
                console.log(`Departamento ${depto.numero}: ${obsDepto.length} observaciones`);
                
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = margin;
                }
        
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`DEPARTAMENTO ${depto.numero}`, margin, yPosition);
                yPosition += 8;
                doc.setFont(undefined, 'normal');
        
                if (obsDepto.length > 0) {
                    const observacionesAgrupadas = this.agruparObservacionesPorJerarquia(obsDepto);
        
                    for (const [seccion, subsecciones] of Object.entries(observacionesAgrupadas)) {
                        if (yPosition > 240) {
                            doc.addPage();
                            yPosition = margin;
                        }
        
                        doc.setFontSize(11);
                        doc.setFont(undefined, 'bold');
                        doc.text(seccion, margin, yPosition);
                        yPosition += 7;
                        doc.setFont(undefined, 'normal');
        
                        for (const [subseccion, preguntas] of Object.entries(subsecciones)) {
                            if (subseccion && subseccion !== "null") {
                                if (yPosition > 235) {
                                    doc.addPage();
                                    yPosition = margin;
                                }
        
                                doc.setFontSize(10);
                                doc.text(subseccion, margin + 5, yPosition);
                                yPosition += 6;
                            }
        
                            for (const [pregunta, observaciones] of Object.entries(preguntas)) {
                                observaciones.forEach(obs => {
                                    if (yPosition > 230) {
                                        doc.addPage();
                                        yPosition = margin;
                                    }
        
                                    doc.setFontSize(10);
                                    const preguntaLines = doc.splitTextToSize(pregunta, pageWidth - margin * 2 - 10);
                                    doc.text(preguntaLines, margin + 10, yPosition);
                                    yPosition += 6 * preguntaLines.length;
        
                                    doc.setFontSize(9);
                                    const descripcionLines = doc.splitTextToSize(`Observación: ${obs.descripcion}`, pageWidth - margin * 2 - 15);
                                    doc.text(descripcionLines, margin + 15, yPosition);
                                    yPosition += 5 * descripcionLines.length + 3;
        
                                    if (obs.imagenes && obs.imagenes.length > 0) {
                                        obs.imagenes.forEach((imagen, imgIndex) => {
                                            try {
                                                const imgWidth = (pageWidth - margin * 2) * 0.7;
                                                const imgHeight = imgWidth * 0.75;
                                                const espacioNecesario = imgHeight + 20;

                                                if (yPosition + espacioNecesario > pageHeight - margin) {
                                                    doc.addPage();
                                                    yPosition = margin;
                                                }
                                                
                                                if (obs.imagenes.length > 1) {
                                                    doc.setFontSize(8);
                                                    doc.setTextColor(100, 100, 100);
                                                    doc.text(`Imagen ${imgIndex + 1} de ${obs.imagenes.length}`, margin + 15, yPosition);
                                                    yPosition += 5;
                                                }

                                                doc.addImage(imagen, "JPEG", 
                                                    (pageWidth - imgWidth) / 2,
                                                    yPosition, 
                                                    imgWidth, 
                                                    imgHeight);
                                                
                                                yPosition += imgHeight + 8;
                                                doc.setTextColor(0, 0, 0);
                                            } catch (e) {
                                                console.error("Error al agregar imagen:", e);
                                                doc.text("(Imagen no disponible)", margin + 15, yPosition);
                                                yPosition += 6;
                                            }
                                        });
                                    }
        
                                    yPosition += 8;
                                });
                            }
                        }
                    }
                } else {
                    doc.setFontSize(10);
                    doc.text("Sin observaciones", margin + 10, yPosition);
                    yPosition += 8;
                }
                
                yPosition += 10;
            });
        
            doc.save(`Informe_Fiscalizacion_${this.datosGenerales.nombreObra.replace(/ /g, "_")}.pdf`);
            this.generarExcel();
            this.resetearAplicacion();
        },
        
        agruparObservacionesPorJerarquia: function(observaciones) {
            const agrupadas = {};
            
            observaciones.forEach(obs => {
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
        
        encontrarJerarquiaDePregunta: function(preguntaBuscada) {
            for (const [seccion, subsecciones] of Object.entries(this.estructura)) {
                for (const [subseccion, preguntas] of Object.entries(subsecciones)) {
                    if (typeof preguntas === 'object' && preguntas !== null) {
                        for (const [pregunta] of Object.entries(preguntas)) {
                            if (pregunta === preguntaBuscada) {
                                return [seccion, subseccion];
                            }
                        }
                    } else if (subseccion === preguntaBuscada) {
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
            
            document.getElementById("nombreObra").value = "";
            document.getElementById("comuna").value = "";
            document.getElementById("empresaContratista").value = "";
            document.getElementById("entidadPatrocinante").value = "";
            document.getElementById("supervisor").value = "";
            document.getElementById("directorObra").value = "";
            document.getElementById("numeroDepto").value = "";
            
            document.getElementById("nombreObra").disabled = false;
            document.getElementById("comuna").disabled = false;
            document.getElementById("empresaContratista").disabled = false;
            document.getElementById("entidadPatrocinante").disabled = false;
            document.getElementById("supervisor").disabled = false;
            document.getElementById("directorObra").disabled = false;
            document.getElementById("cantidadDormitorios").disabled = false;
            
            document.getElementById("datosGeneralesSection").style.display = "block";
            document.getElementById("selectorDeptoSection").style.display = "block";
            document.getElementById("seccionesPreguntas").innerHTML = "";
            document.getElementById("finalizarContainer").style.display = "none";

            localStorage.removeItem('fiscalizacionObra');
            
            window.scrollTo(0, 0);
        }

    };
    
    app.init();
});

