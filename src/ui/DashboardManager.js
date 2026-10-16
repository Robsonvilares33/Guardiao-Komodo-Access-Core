/**
 * DashboardManager.js
 * 
 * Controlador isolado para gerenciar as visualizações de Dashboard (Chart.js).
 * Escuta atualizações no AppStore para se manter em sincronia.
 */

class DashboardManager {
    constructor() {
        this.chartTiposInstance = null;
        this.chartHorariosInstance = null;
        this._bindEvents();
    }

    _bindEvents() {
        if (!window.eventBus || !window.SystemEvents) return;
        
        // Mantém os gráficos atualizados passivamente
        window.eventBus.on('STORE_VISITORS_UPDATED', (state) => {
            const overlay = document.getElementById('dashModalOverlay');
            // Só redesenha se o dashboard estiver aberto; o estado inicial agora vem de CSS externo.
            const isOpen = overlay && (overlay.tagName.toLowerCase() === 'komodo-modal'
                ? overlay.hasAttribute('open')
                : (typeof window.getComputedStyle === 'function'
                    ? window.getComputedStyle(overlay).display !== 'none'
                    : overlay.classList.contains('aberto')));
            if (isOpen) this.renderDashboard(state.dailyData);
        });
    }

    /**
     * Calcula as métricas matemáticas e engatilha o Chart.js
     * @param {Array} dataset - Dados analíticos completos
     */
    renderDashboard(dataset) {
        if (!dataset) return;
        
        const tiposCount = { 'Morador': 0, 'Visitante': 0, 'Prestador': 0, 'Delivery': 0, 'Outros': 0 };
        const horariosCount = { 'Manhã (06-12)': 0, 'Tarde (12-18)': 0, 'Noite (18-24)': 0 };
        const alertasCount = { 'Normal': 0, 'Alerta de Risco': 0 };
        const fluxosCount = {};

        dataset.forEach(item => {
            const t = (item.tipo || '').toLowerCase();
            if (t.includes('morador')) tiposCount['Morador']++;
            else if (t.includes('visitante')) tiposCount['Visitante']++;
            else if (t.includes('prestador') || t.includes('manutenção')) tiposCount['Prestador']++;
            else if (t.includes('delivery')) tiposCount['Delivery']++;
            else tiposCount['Outros']++;
            
            const horaStr = item.hora || '00:00';
            const h = parseInt(horaStr.split(':')[0]) || 0;
            
            if (h >= 6 && h < 12) horariosCount['Manhã (06-12)']++;
            else if (h >= 12 && h < 18) horariosCount['Tarde (12-18)']++;
            else horariosCount['Noite (18-24)']++;

            // Fase 6: Incidentes
            const isAlerta = (item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1');
            if (isAlerta) alertasCount['Alerta de Risco']++;
            else alertasCount['Normal']++;

            // Fase 6: Fluxo Semanal (agrupado por dia, se aplicável)
            const d = (item.dia || 'N/A').toUpperCase();
            if (!fluxosCount[d]) fluxosCount[d] = 0;
            fluxosCount[d]++;
        });

        if (this.chartTiposInstance) this.chartTiposInstance.destroy();
        if (this.chartHorariosInstance) this.chartHorariosInstance.destroy();
        if (this.chartAlertasInstance) this.chartAlertasInstance.destroy();
        if (this.chartFluxoInstance) this.chartFluxoInstance.destroy();
        
        if (typeof window.Chart !== 'undefined') {
            const Chart = window.Chart;
            Chart.defaults.color = '#a0a0a0'; 
            Chart.defaults.font.family = 'Poppins';
            
            const ctxTipos = document.getElementById('chartTipos');
            if (ctxTipos) {
                this.chartTiposInstance = new Chart(ctxTipos.getContext('2d'), { 
                    type: 'doughnut', 
                    data: { 
                        labels: Object.keys(tiposCount), 
                        datasets: [{ 
                            data: Object.values(tiposCount), 
                            backgroundColor: ['#22c55e', '#3b82f6', '#c2a057', '#eab308', '#a0a0a0'], 
                            borderWidth: 0 
                        }] 
                    }, 
                    options: { 
                        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Distribuição por Tipo', color: '#c2a057' } } 
                    } 
                });
            }
            
            const ctxHorarios = document.getElementById('chartHorarios');
            if (ctxHorarios) {
                this.chartHorariosInstance = new Chart(ctxHorarios.getContext('2d'), { 
                    type: 'bar', 
                    data: { 
                        labels: Object.keys(horariosCount), 
                        datasets: [{ 
                            label: 'Acessos', 
                            data: Object.values(horariosCount), 
                            backgroundColor: '#c2a057', 
                            borderRadius: 4 
                        }] 
                    }, 
                    options: { 
                        scales: { y: { beginAtZero: true, grid: { color: 'rgba(194,160,87,0.1)' } }, x: { grid: { display: false } } },
                        plugins: { legend: { display: false }, title: { display: true, text: 'Picos de Horários', color: '#c2a057' } } 
                    } 
                });
            }

            // Novo Gráfico de Incidentes (Alerta de Risco)
            const ctxAlertas = document.getElementById('chartAlertas');
            if (ctxAlertas) {
                this.chartAlertasInstance = new Chart(ctxAlertas.getContext('2d'), { 
                    type: 'pie', 
                    data: { 
                        labels: Object.keys(alertasCount), 
                        datasets: [{ 
                            data: Object.values(alertasCount), 
                            backgroundColor: ['#22c55e', '#ef4444'], 
                            borderWidth: 0 
                        }] 
                    }, 
                    options: { 
                        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Nível de Risco (Incidentes)', color: '#ef4444' } } 
                    } 
                });
            }

            // Novo Gráfico de Fluxo Semanal
            const ctxFluxo = document.getElementById('chartFluxo');
            if (ctxFluxo) {
                this.chartFluxoInstance = new Chart(ctxFluxo.getContext('2d'), { 
                    type: 'line', 
                    data: { 
                        labels: Object.keys(fluxosCount), 
                        datasets: [{ 
                            label: 'Volume de Tráfego', 
                            data: Object.values(fluxosCount), 
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.1)',
                            fill: true,
                            tension: 0.4
                        }] 
                    }, 
                    options: { 
                        scales: { y: { beginAtZero: true, grid: { color: 'rgba(59,130,246,0.1)' } }, x: { grid: { display: false } } },
                        plugins: { legend: { display: false }, title: { display: true, text: 'Fluxo por Dia (Tráfego)', color: '#3b82f6' } } 
                    } 
                });
            }

        } else {
            console.warn("Chart.js não carregado. Módulo Dashboard ignorado.");
        }
    }

    async openDashboard() {
        // UX fase 1: Chart.js só é baixado ao abrir o dashboard.
        if (window.KacVendor) { try { await window.KacVendor.chart(); } catch (e) { console.warn('Chart.js indisponível:', e.message); } }
        // Mostra overlay primeiro com carregamento
        const overlay = document.getElementById('dashModalOverlay') || document.querySelector('#dashModalOverlay');
        if (overlay) {
            if (overlay.tagName.toLowerCase() === 'komodo-modal') {
                overlay.setAttribute('open', '');
            } else {
                overlay.classList.add('aberto');
                overlay.style.display = 'flex';
            }
        }
        
        // Fase 6: Ao invés de puxar apenas o dailyData do Store, busca os dados agregados globais do Repositório
        if (window.VisitorRepository) {
            try {
                const moduloAtual = window.location.pathname.includes('index') ? 'empresarial' : 'residencial';
                this.currentGlobalData = await window.VisitorRepository.getAllByModule(moduloAtual);
                this.currentModulo = moduloAtual;
                this.renderDashboard(this.currentGlobalData);
            } catch (e) {
                console.error("Erro ao carregar métricas analíticas:", e);
            }
        }
    }

    // Exporta os dados atuais do Dashboard
    async exportCurrentData() {
        if (!this.currentGlobalData || !window.PdfExportService) return;
        if (window.KacVendor) { try { await window.KacVendor.pdf(); } catch (e) { alert('Não foi possível carregar o módulo de PDF. Verifique a conexão.'); return; } }
        window.PdfExportService.exportAdvancedReport(this.currentGlobalData, "Relatório Analítico Completo", this.currentModulo.toUpperCase());
    }
}

window.dashboardManager = new DashboardManager();
window.exportAdvancedDashboardReport = () => {
    if (window.dashboardManager) {
        window.dashboardManager.exportCurrentData();
    }
};
