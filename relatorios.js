/**
 * Módulo de Relatórios
 * Gera relatórios e análises dos processos
 */

import dbManager from './database.js';
import chartManager from './charts.js';
import { 
    formatarData,
    exportarParaCSV,
    calcularMedia,
    contarOcorrencias,
    showLoading,
    hideLoading,
    showNotification
} from './utils.js';

class RelatoriosManager {
    constructor() {
        this.processosAndamento = [];
        this.processosFinalizados = [];
        this.filtroDataInicio = null;
        this.filtroDataFim = null;
    }

    /**
     * Inicializa o módulo
     */
    async initialize() {
        await this.carregarDados();
        this.setupEventListeners();
        this.setDatasPadrao();
    }

    /**
     * Carrega dados do Firebase
     */
    async carregarDados() {
        try {
            const [andamento, finalizados] = await Promise.all([
                dbManager.getProcessosAndamento(),
                dbManager.getProcessosFinalizados()
            ]);

            if (andamento.success) {
                this.processosAndamento = andamento.data;
            }

            if (finalizados.success) {
                this.processosFinalizados = finalizados.data;
            }
        } catch (error) {
            console.error('Erro ao carregar processos para relatórios:', error);
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão gerar relatório
        document.getElementById('btnGerarRelatorio')?.addEventListener('click', () => {
            this.gerarRelatorio();
        });

        // Botão exportar relatório CSV
        document.getElementById('btnExportarRelatorio')?.addEventListener('click', () => {
            this.exportarRelatorio();
        });

        // Botão exportar relatório PDF
        document.getElementById('btnExportarPDF')?.addEventListener('click', () => {
            this.exportarRelatorioPDF();
        });

        // Inputs de data
        document.getElementById('reportDateStart')?.addEventListener('change', (e) => {
            this.filtroDataInicio = e.target.value;
        });

        document.getElementById('reportDateEnd')?.addEventListener('change', (e) => {
            this.filtroDataFim = e.target.value;
        });
    }

    /**
     * Define datas padrão (último mês)
     */
    setDatasPadrao() {
        const hoje = new Date();
        const umMesAtras = new Date();
        umMesAtras.setMonth(hoje.getMonth() - 1);

        const inputInicio = document.getElementById('reportDateStart');
        const inputFim = document.getElementById('reportDateEnd');

        if (inputInicio) {
            inputInicio.value = umMesAtras.toISOString().split('T')[0];
            this.filtroDataInicio = inputInicio.value;
        }

        if (inputFim) {
            inputFim.value = hoje.toISOString().split('T')[0];
            this.filtroDataFim = inputFim.value;
        }
    }

    /**
     * Filtra processos por período
     */
    filtrarProcessosPorPeriodo() {
        if (!this.filtroDataInicio || !this.filtroDataFim) {
            return [...this.processosAndamento, ...this.processosFinalizados];
        }

        const dataInicio = new Date(this.filtroDataInicio);
        const dataFim = new Date(this.filtroDataFim);

        const todos = [...this.processosAndamento, ...this.processosFinalizados];

        return todos.filter(processo => {
            const dataProcesso = new Date(processo.dataInicio);
            return dataProcesso >= dataInicio && dataProcesso <= dataFim;
        });
    }

    /**
     * Gera relatório completo
     */
    async gerarRelatorio() {
        showLoading();
        try {
            await this.carregarDados();
            const processosFiltrados = this.filtrarProcessosPorPeriodo();

            this.renderSummary(processosFiltrados);
            chartManager.updateReportCharts(processosFiltrados);

            showNotification('Relatório gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showNotification('Erro ao gerar relatório', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Renderiza resumo do relatório
     */
    renderSummary(processos) {
        const container = document.getElementById('reportSummary');
        if (!container) return;

        if (processos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p class="empty-state-text">Nenhum processo encontrado no período selecionado</p>
                </div>
            `;
            return;
        }

        // Calcula estatísticas
        const totalProcessos = processos.length;
        const finalizados = processos.filter(p => 
            this.processosFinalizados.some(pf => pf.id === p.id)
        ).length;
        const emAndamento = totalProcessos - finalizados;

        // Tempo médio de conclusão
        const processosComTempo = this.processosFinalizados.filter(p => p.diasDecorridos);
        const tempoMedio = processosComTempo.length > 0 
            ? calcularMedia(processosComTempo, 'diasDecorridos')
            : 0;

        // Por tipo de cotação
        const porTipo = contarOcorrencias(processos, 'tipoCotacao');

        // Por unidade
        const porUnidade = contarOcorrencias(processos, 'unidadeExecutora');

        // Por complexidade
        const porComplexidade = contarOcorrencias(processos, 'grauComplexidade');

        const html = `
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-value">${totalProcessos}</span>
                    <span class="summary-label">Total de Processos</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value" style="color: #10b981;">${finalizados}</span>
                    <span class="summary-label">Finalizados</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value" style="color: #f59e0b;">${emAndamento}</span>
                    <span class="summary-label">Em Andamento</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">${tempoMedio}</span>
                    <span class="summary-label">Dias Médios de Conclusão</span>
                </div>
            </div>

            <div style="margin-top: 30px;">
                <h4 style="margin-bottom: 15px; color: var(--text-primary);">Distribuição por Tipo de Cotação</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${Object.entries(porTipo).map(([tipo, qtd]) => `
                        <div style="background: var(--bg-secondary); padding: 15px; border-radius: 10px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 5px;">
                                ${qtd}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${tipo}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top: 30px;">
                <h4 style="margin-bottom: 15px; color: var(--text-primary);">Principais Unidades Executoras</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${Object.entries(porUnidade)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([unidade, qtd]) => `
                        <div style="background: var(--bg-secondary); padding: 15px; border-radius: 10px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary-color); margin-bottom: 5px;">
                                ${qtd}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${unidade}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top: 30px;">
                <h4 style="margin-bottom: 15px; color: var(--text-primary);">Complexidade dos Processos</h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    ${['BAIXO', 'MÉDIO', 'ALTO', 'MUITO ALTO'].map(nivel => {
                        const qtd = porComplexidade[nivel] || 0;
                        const cores = {
                            'BAIXO': '#10b981',
                            'MÉDIO': '#3b82f6',
                            'ALTO': '#f59e0b',
                            'MUITO ALTO': '#ef4444'
                        };
                        return `
                            <div style="background: var(--bg-secondary); padding: 15px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 1.8rem; font-weight: 700; color: ${cores[nivel]}; margin-bottom: 5px;">
                                    ${qtd}
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                    ${nivel}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Exporta relatório para CSV
     */
    async exportarRelatorio() {
        showLoading();
        try {
            await this.carregarDados();
            const processos = this.filtrarProcessosPorPeriodo();

            if (processos.length === 0) {
                showNotification('Nenhum processo para exportar', 'warning');
                hideLoading();
                return;
            }

            // Prepara dados para exportação
            const dadosExport = processos.map(p => ({
                'Nº Processo': p.sigadoc,
                'Data Início': formatarData(p.dataInicio),
                'Data Final': formatarData(p.dataFinal),
                'Tipo Cotação': p.tipoCotacao,
                'Tipo Objeto': p.tipoObjeto,
                'Descrição': p.descricao,
                'Responsável': p.responsavel,
                'Complexidade': p.grauComplexidade,
                'Qtd Itens': p.quantidadeItens,
                'Unidade': p.unidadeExecutora,
                'Status': p.status || 'Finalizado',
                'Dias Decorridos': p.diasDecorridos || '-'
            }));

            const nomeArquivo = `relatorio_processos_${new Date().toISOString().split('T')[0]}`;
            exportarParaCSV(dadosExport, nomeArquivo);

        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            showNotification('Erro ao exportar relatório', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Exporta relatório para PDF
     */
    async exportarRelatorioPDF() {
        showLoading();
        try {
            await this.carregarDados();
            const processos = this.filtrarProcessosPorPeriodo();

            if (processos.length === 0) {
                showNotification('Nenhum processo para exportar', 'warning');
                hideLoading();
                return;
            }

            // Verifica se jsPDF está disponível
            if (!window.jspdf || !window.jspdf.jsPDF) {
                showNotification('Biblioteca PDF não carregada. Recarregue a página.', 'error');
                hideLoading();
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');

            // Título do relatório
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Relatório de Processos', 14, 20);

            // Período
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const periodo = `Período: ${formatarData(this.filtroDataInicio)} a ${formatarData(this.filtroDataFim)}`;
            doc.text(periodo, 14, 28);

            // Data de geração
            const dataGeracao = `Gerado em: ${formatarData(new Date().toISOString().split('T')[0])}`;
            doc.text(dataGeracao, 14, 34);

            // Resumo estatístico
            const totalProcessos = processos.length;
            const finalizados = processos.filter(p =>
                this.processosFinalizados.some(pf => pf.id === p.id)
            ).length;
            const emAndamento = totalProcessos - finalizados;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumo:', 14, 44);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Total: ${totalProcessos} | Finalizados: ${finalizados} | Em Andamento: ${emAndamento}`, 14, 50);

            // Prepara dados para a tabela
            const tableData = processos.map(p => [
                p.sigadoc || '-',
                (p.descricao || '').substring(0, 50) + ((p.descricao || '').length > 50 ? '...' : ''),
                p.tipoCotacao || '-',
                p.responsavel || '-',
                formatarData(p.dataInicio) || '-',
                p.status || 'Finalizado',
                p.grauComplexidade || '-'
            ]);

            // Cria tabela usando autoTable
            doc.autoTable({
                startY: 56,
                head: [['Nº Processo', 'Descrição', 'Tipo Cotação', 'Responsável', 'Data Início', 'Status', 'Complexidade']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 8
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 35 },
                    6: { cellWidth: 25 }
                },
                margin: { left: 14, right: 14 }
            });

            // Rodapé
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Página ${i} de ${pageCount} - Sistema de Gestão de Acervo Processual`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // Salva o PDF
            const nomeArquivo = `relatorio_processos_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(nomeArquivo);

            showNotification('Relatório PDF gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            showNotification('Erro ao gerar PDF: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    }
}

// Exporta instância única
const relatoriosManager = new RelatoriosManager();
export default relatoriosManager;
