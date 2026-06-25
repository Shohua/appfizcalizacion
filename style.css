body {
    padding: 20px;
    font-family: Arial, sans-serif;
}
.card {
    margin-bottom: 20px;
}

.camera-container {
    width: 100%;
    max-height: 400px;
    overflow: hidden;
    border: 1px solid #ccc;
    margin-bottom: 10px;
}

#videoCamara {
    width: 100%;
    height: auto;
    display: block;
}

/* ============================================
   ACORDEÓN DE SECCIONES
   ============================================ */
.section-accordion {
    margin-bottom: 12px;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    overflow: hidden;
}

.section-accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    cursor: pointer;
    background: linear-gradient(135deg, #2c3e50, #3d5166);
    color: white;
    user-select: none;
    transition: background 0.2s;
}

.section-accordion-header:hover {
    background: linear-gradient(135deg, #3d5166, #2c3e50);
}

.section-accordion-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    border: none;
    padding: 0;
}

.section-accordion-icon {
    font-size: 1.2rem;
    transition: transform 0.25s ease;
    flex-shrink: 0;
    margin-left: 10px;
}

.section-accordion.collapsed .section-accordion-icon {
    transform: rotate(-90deg);
}

.section-accordion-body {
    padding: 20px;
    border-top: 2px solid #3498db;
    transition: none;
    display: block;
}

.section-accordion.collapsed .section-accordion-body {
    display: none;
}

/* Badge de progreso en cabecera del acordeón */
.section-badge {
    background: rgba(255,255,255,0.2);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.78rem;
    margin-left: 10px;
    white-space: nowrap;
    flex-shrink: 0;
}

.section-badge.has-obs {
    background: #e74c3c;
}

/* ============================================
   ACORDEÓN DE SUBSECCIONES (anidado)
   ============================================ */
.subsection-accordion {
    margin-bottom: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
}

.subsection-accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 15px;
    cursor: pointer;
    background: #f0f4f8;
    user-select: none;
    transition: background 0.2s;
}

.subsection-accordion-header:hover {
    background: #e2eaf3;
}

.subsection-accordion-header h5 {
    margin: 0;
    font-size: 0.9rem;
    color: #2c3e50;
}

.subsection-accordion-icon {
    font-size: 1rem;
    transition: transform 0.25s ease;
    color: #95a5a6;
    flex-shrink: 0;
    margin-left: 8px;
}

.subsection-accordion.collapsed .subsection-accordion-icon {
    transform: rotate(-90deg);
}

.subsection-accordion-body {
    padding: 15px;
}

.subsection-accordion.collapsed .subsection-accordion-body {
    display: none;
}

/* ============================================
   INDICADOR DE DICTADO POR VOZ
   ============================================ */
#voice-indicator {
    display: none;
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    background: rgba(231, 76, 60, 0.92);
    color: white;
    padding: 12px 22px;
    border-radius: 30px;
    font-size: 0.95rem;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    backdrop-filter: blur(4px);
    align-items: center;
    gap: 10px;
    pointer-events: none;
}

#voice-indicator.active {
    display: flex;
}

.voice-pulse {
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    animation: voicePulse 1s infinite;
    flex-shrink: 0;
}

@keyframes voicePulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.6; }
}

/* Botón de dictado por voz junto al textarea */
.voice-btn-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.voice-btn-wrapper textarea {
    flex: 1;
}

#btnDictadoVoz {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid #3498db;
    background: white;
    color: #3498db;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    margin-top: 0;
}

#btnDictadoVoz:hover {
    background: #3498db;
    color: white;
}

#btnDictadoVoz.recording {
    background: #e74c3c;
    border-color: #e74c3c;
    color: white;
    animation: recordingPulse 1.2s infinite;
}

@keyframes recordingPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.5); }
    50% { box-shadow: 0 0 0 8px rgba(231,76,60,0); }
}

/* Texto de ayuda bajo el textarea */
.voice-help-text {
    font-size: 0.78rem;
    color: #6c757d;
    margin-top: 4px;
}
