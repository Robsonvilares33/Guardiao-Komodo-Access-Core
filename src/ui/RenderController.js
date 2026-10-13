/**
 * RenderController.js
 * 
 * Camada de visualização reativa (Fase 4).
 * Escuta os eventos do AppStore e desenha a UI automaticamente,
 * eliminando a necessidade de chamadas diretas como renderDaily().
 */

class RenderController {
    constructor() {
        this._bindEvents();
        this.updateCalendarUI();
    }

    updateCalendarUI() {
        const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const today = new Date();
        const monthEl = document.querySelector('.month-title');
        if (monthEl) monthEl.innerText = monthNames[today.getMonth()];

        const currentDay = today.getDay(); 
        const diff = today.getDate() - currentDay + (currentDay == 0 ? -6 : 1); 
        const monday = new Date(today.setDate(diff));

        const tabMapping = {
            'seg': 0, 'ter': 1, 'qua': 2, 'qui': 3, 'sex': 4, 'sab': 5, 'dom': 6
        };

        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            const diaStr = tab.getAttribute('data-dia');
            if (tabMapping[diaStr] !== undefined) {
                const dateOfTab = new Date(monday);
                dateOfTab.setDate(monday.getDate() + tabMapping[diaStr]);
                
                const originalText = tab.innerText.split(' ')[0]; // pega 'Segunda', etc.
                const dayNum = dateOfTab.getDate().toString().padStart(2, '0');
                tab.innerText = `${originalText} ${dayNum}`;
            }
        });
    }

    _bindEvents() {
        if (!window.eventBus || !window.SystemEvents) return;

        // Quando o repositório salva com sucesso, mandamos a Store recarregar
        window.eventBus.on(window.SystemEvents.DB_SAVE_SUCCESS, async () => {
            await this.reloadDailyData();
        });

        // Quando a Store notifica mudança de visitantes, renderizamos a tela
        window.eventBus.on('STORE_VISITORS_UPDATED', (state) => {
            if (typeof window.renderDaily === 'function') {
                // A função legado renderDaily será chamada passando os dados do Store
                window.renderDaily(state.dailyData);
            }
        });
    }

    /**
     * Recarrega os dados do dia ativo e atualiza a Store.
     * Pode ser chamado ao inicializar a página ou ao trocar a aba do dia.
     */
    async reloadDailyData(diaStr = null, modulo = null) {
        if (!window.appStore || !window.VisitorRepository) return;
        
        let visitorsState = window.appStore.getState('visitors');
        
        if (diaStr) {
            visitorsState.diaAtivo = diaStr;
        }

        // Tenta inferir o módulo caso não passado (fallback para a fase 5)
        if (!modulo) {
            modulo = window.location.pathname.includes('index') ? 'empresarial' : 'residencial';
        }

        try {
            // Em vez de banco direto, usa o Repositorio criado na Fase 2
            const rows = await window.VisitorRepository.getAllDaily(visitorsState.diaAtivo, modulo);
            
            // Atualiza a store, que por sua vez disparará o evento de renderização
            window.appStore.setVisitorsState({
                diaAtivo: visitorsState.diaAtivo,
                dailyData: rows
            });
        } catch(e) {
            console.error("Falha ao recarregar dados diários: ", e);
        }
    }
}

// Inicializa o Controller global
window.renderController = new RenderController();
