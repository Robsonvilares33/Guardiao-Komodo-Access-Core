/**
 * AppStore.js
 * 
 * Gerenciador Modular de Estado Local.
 * Atua como a Single Source of Truth do frontend.
 * Notifica automaticamente as mudanças de estado pelo EventBus.
 */

class AppStore {
    constructor() {
        // Separação por Domínios (Módulos)
        this.state = {
            ui: {
                activeTab: 'visitante',
                isLoading: false
            },
            auth: {
                currentUser: null
            },
            form: {
                currentData: {}
            },
            visitors: {
                diaAtivo: 'qui',
                dailyData: []
            }
        };
    }

    /**
     * Obtém uma cópia readonly do estado global ou de um domínio específico.
     */
    getState(domain = null) {
        const copy = JSON.parse(JSON.stringify(this.state));
        return domain ? copy[domain] : copy;
    }

    /**
     * Mutação segura do estado de UI.
     */
    setUiState(partialState) {
        this.state.ui = { ...this.state.ui, ...partialState };
        window.eventBus.emit('STORE_UI_UPDATED', this.state.ui);
    }

    /**
     * Mutação segura do estado de Formulários.
     */
    setFormState(partialState) {
        this.state.form = { ...this.state.form, ...partialState };
        window.eventBus.emit('STORE_FORM_UPDATED', this.state.form);
    }

    /**
     * Mutação segura do estado de Autenticação.
     */
    setAuthState(partialState) {
        this.state.auth = { ...this.state.auth, ...partialState };
        window.eventBus.emit('STORE_AUTH_UPDATED', this.state.auth);
    }

    /**
     * Mutação segura do estado de Visitantes (Substitui as variáveis globais).
     */
    setVisitorsState(partialState) {
        this.state.visitors = { ...this.state.visitors, ...partialState };
        window.eventBus.emit('STORE_VISITORS_UPDATED', this.state.visitors);
    }
}

window.appStore = new AppStore();
