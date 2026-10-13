/**
 * Events.js
 * 
 * Dicionário centralizado de Eventos do Sistema Guardião Komodo.
 * Elimina o uso de "Magic Strings" espalhadas pelo código.
 */

const SystemEvents = {
    // Eventos de UI
    UI_READY: 'UI_READY',
    UI_TAB_CHANGED: 'UI_TAB_CHANGED',
    UI_SAVE_CLICKED: 'UI_SAVE_CLICKED',
    
    // Eventos de Formulário
    FORM_DATA_EXTRACTED: 'FORM_DATA_EXTRACTED',
    FORM_VALIDATION_FAILED: 'FORM_VALIDATION_FAILED',
    FORM_VALIDATION_PASSED: 'FORM_VALIDATION_PASSED',
    FORM_CLEARED: 'FORM_CLEARED',
    
    // Eventos Cognitivos (IA)
    AI_FORM_FILL_REQUESTED: 'AI_FORM_FILL_REQUESTED',
    AI_CAPTURE_STARTED: 'AI_CAPTURE_STARTED',
    AI_ERROR: 'AI_ERROR',
    
    // Eventos de Domínio e Persistência
    DB_SAVE_REQUESTED: 'DB_SAVE_REQUESTED',
    DB_SAVE_SUCCESS: 'DB_SAVE_SUCCESS',
    DB_ERROR: 'DB_ERROR'
};

window.SystemEvents = SystemEvents;
