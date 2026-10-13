/**
 * FormManager.js
 * 
 * Camada responsável por abstrair manipulação de formulários da interface HTML.
 * O FormManager usa atributos "data-field" para serializar e preencher formulários.
 * Assina e despacha eventos no EventBus, desacoplando completamente da I.A e Regras de Negócio.
 */

class FormManager {
    constructor() {
        this._bindEvents();
    }

    /**
     * Assina os eventos globais
     */
    _bindEvents() {
        if (window.eventBus && window.SystemEvents) {
            window.eventBus.on(window.SystemEvents.AI_FILL_FORM, (data) => {
                // Preenchemos o formulário genérico de visitante
                // Futuramente pode haver um payload.formId, por hora fixamos 'form-visitante'
                this.fill('form-visitante', data);
            });
        }
    }

    /**
     * Serializa um form html para um DTO baseado nos atributos data-field
     * @param {string} formId 
     * @returns {Object} DTO com chave=valor
     */
    serialize(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const fields = form.querySelectorAll('[data-field]');
        const dto = {};

        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            dto[fieldName] = field.value ? field.value.trim() : '';
        });

        return dto;
    }

    /**
     * Preenche um formulário html a partir de um DTO
     * @param {string} formId 
     * @param {Object} dto Chave=valor
     */
    fill(formId, dto) {
        const form = document.getElementById(formId);
        if (!form || !dto) return;

        const fields = form.querySelectorAll('[data-field]');
        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            if (dto[fieldName] !== undefined && dto[fieldName] !== null) {
                field.value = dto[fieldName];
                
                // Dispara o evento de input para triggers visuais (Mascara, Validação em Tempo Real)
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    /**
     * Limpa os campos de um formulário
     * @param {string} formId 
     */
    clear(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const fields = form.querySelectorAll('[data-field]');
        fields.forEach(field => {
            field.value = '';
        });
    }
}

// Inicializa a instância Global do FormManager
window.formManager = new FormManager();
