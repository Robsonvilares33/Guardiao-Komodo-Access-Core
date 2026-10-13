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
        const KD = window.KomodoDate;
        if (!KD) return;
        const today = KD.todayParts();
        const week = KD.weekDates();
        const monthEl = document.querySelector('.month-title');
        const refMonth = KD.getReference() ? Number(KD.getReference().slice(5, 7)) : today.month;
        if (monthEl) monthEl.innerText = monthNames[refMonth - 1];

        document.querySelectorAll('.tab').forEach(tab => {
            const diaStr = tab.getAttribute('data-dia');
            const info = week[diaStr];
            if (!info) return;
            const originalText = tab.innerText.split(' ')[0];
            tab.innerText = `${originalText} ${String(info.day).padStart(2, '0')}`;
            const isToday = KD.toISO(info) === KD.todayISO();
            if (!KD.getReference()) tab.classList.toggle('active', isToday);
            tab.classList.toggle('today', isToday);
        });
    }

    static currentModule() {
        return window.location.pathname.includes('residencial') ? 'residencial' : 'empresarial';
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
            modulo = RenderController.currentModule();
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
