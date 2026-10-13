/**
 * EventBus.js
 * 
 * Barramento central de comunicação da arquitetura desacoplada (Pub/Sub).
 * Nenhum módulo deve invocar funções de outro módulo diretamente.
 */

class EventBus {
    constructor() {
        this.listeners = {};
        this.history = []; // Para debug e observabilidade
    }

    /**
     * Inscreve um callback para escutar um evento específico.
     * @param {string} eventName - Nome do evento (usar SystemEvents.*)
     * @param {Function} callback - Função executada quando o evento ocorre
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Remove a inscrição de um callback.
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * Dispara um evento para todos os ouvintes inscritos.
     * @param {string} eventName - Nome do evento
     * @param {any} payload - Dados trafegados
     */
    emit(eventName, payload = null) {
        this.history.push({ event: eventName, time: new Date().getTime(), payload });
        
        // Debugging mode (Pode ser desligado em produção)
        console.log(`[EventBus] 🚀 Emitido: ${eventName}`, payload || '');

        if (!this.listeners[eventName]) {
            console.warn(`[EventBus] Nenhum listener para o evento: ${eventName}`);
            return;
        }

        this.listeners[eventName].forEach(callback => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`[EventBus] Erro ao processar evento ${eventName}:`, error);
            }
        });
    }

    // Auxiliar para telemetria/debugging
    getHistory() {
        return this.history;
    }
}

window.eventBus = new EventBus();
