/**
 * PdfExportService.js
 * 
 * Desacopla a lógica de formatação e exportação de relatórios em PDF.
 * Usa as bibliotecas globais jsPDF e jspdf-autotable nativamente caso injetadas.
 */

class PdfExportService {
    /**
     * Exporta os registros do dia atual.
     * @param {Array} dailyData - Dados diários (vindas da Store)
     * @param {String} diaAtivo - String do dia atual (ex: 'qui')
     * @param {String} moduleName - 'RESIDENCIAL' ou 'EMPRESARIAL'
     */
    static exportTurnReport(dailyData, diaAtivo, moduleName = "RESIDENCIAL") {
        if (typeof window.jspdf === 'undefined') {
            alert('A biblioteca jsPDF não foi carregada no sistema offline.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18); 
        doc.text(`GUARDIÃO KOMODO - RELATÓRIO ${moduleName}`, 14, 22);
        
        doc.setFontSize(12); 
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Dia: ${diaAtivo.toUpperCase()}`, 14, 32);
        
        const head = [['Hora', 'Nome', 'Unidade', 'Tipo/Parentesco', 'Placa', 'Alerta']];
        const body = [];
        
        // Garante a ordenação temporal
        const sortedData = [...dailyData].sort((a, b) => a.hora.localeCompare(b.hora));
        
        sortedData.forEach(item => {
            const parentescoStr = item.parentesco && item.parentesco !== '-' ? ` (${item.parentesco})` : '';
            const isAlert = item.alerta ? 'SIM (RISCO)' : 'NORMAL';
            body.push([
                item.hora, 
                item.nome, 
                item.unidade, 
                item.tipo + parentescoStr, 
                item.placa, 
                isAlert
            ]);
        });

        // Caso a biblioteca autoTable tenha sido injetada (plugin do jsPDF)
        if (typeof doc.autoTable === 'function') {
            doc.autoTable({ 
                startY: 40, 
                head: head, 
                body: body, 
                theme: 'grid', 
                headStyles: { fillColor: [194, 160, 87] } 
            });
        }

        doc.save(`komodo_${moduleName.toLowerCase()}_turno.pdf`);
    }

    /**
     * Exporta um relatório analítico avançado (Fase 6).
     * Inclui metadados oficiais, contagem de incidentes e exportação massiva.
     */
    static exportAdvancedReport(dataset, reportTitle = "Relatório Geral Analítico", moduleName = "GERAL") {
        if (typeof window.jspdf === 'undefined') {
            alert('A biblioteca jsPDF não foi carregada.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); // Landscape para caber mais dados
        
        // Cabeçalho Oficial
        doc.setFontSize(22);
        doc.setTextColor(194, 160, 87); // Dourado Komodo
        doc.text("GUARDIÃO KOMODO ENTERPRISE", 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(reportTitle.toUpperCase(), 14, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')} | Módulo: ${moduleName.toUpperCase()}`, 14, 38);
        
        // Totais e Incidentes
        const totalRegistros = dataset.length;
        const totalAlertas = dataset.filter(i => i.alerta === true || i.alerta === 1 || i.alerta === 'true' || i.alerta === '1').length;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Resumo: ${totalRegistros} Acessos Registrados | Incidentes / Alertas: ${totalAlertas}`, 14, 48);

        const head = [['Data', 'Hora', 'Nome', 'Unidade', 'Tipo/Parentesco', 'Placa', 'Alerta', 'Hitórico/Obs']];
        const body = [];
        
        dataset.forEach(item => {
            const parentescoStr = item.parentesco && item.parentesco !== '-' ? ` (${item.parentesco})` : '';
            const isAlert = (item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1') ? 'SIM (RISCO)' : 'NORMAL';
            const hist = item.historico ? item.historico.substring(0, 50) + (item.historico.length > 50 ? '...' : '') : '-';
            
            body.push([
                item.dia ? item.dia.toUpperCase() : 'N/A',
                item.hora || '00:00', 
                item.nome || '-', 
                item.unidade || '-', 
                (item.tipo || '-') + parentescoStr, 
                item.placa || '-', 
                isAlert,
                hist
            ]);
        });

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({ 
                startY: 55, 
                head: head, 
                body: body, 
                theme: 'grid', 
                headStyles: { fillColor: [194, 160, 87] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                styles: { fontSize: 9 }
            });
        }

        // Rodapé com assinatura
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Gerado por Guardião Komodo - Core Security Engine | Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`komodo_${moduleName.toLowerCase()}_relatorio_avancado.pdf`);
    }
}

window.PdfExportService = PdfExportService;
