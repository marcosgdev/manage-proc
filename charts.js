/**
 * Módulo de Gráficos
 * Gerencia criação e atualização de gráficos com Chart.js
 */

import { CHART_COLORS, CHART_OPTIONS } from './config.js';
import { contarOcorrencias } from './utils.js';

class ChartManager {
    constructor() {
        this.charts = {};
    }

    /**
     * Destrói um gráfico existente
     */
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    /**
     * Cria gráfico de pizza
     */
    createPieChart(canvasId, labels, data, colors) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                ...CHART_OPTIONS,
                plugins: {
                    ...CHART_OPTIONS.plugins,
                    legend: {
                        ...CHART_OPTIONS.plugins.legend,
                        position: 'right'
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Cria gráfico de rosca (doughnut)
     */
    createDoughnutChart(canvasId, labels, data, colors) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                ...CHART_OPTIONS,
                cutout: '65%',
                plugins: {
                    ...CHART_OPTIONS.plugins,
                    legend: {
                        ...CHART_OPTIONS.plugins.legend,
                        position: 'right'
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Cria gráfico de barras
     */
    createBarChart(canvasId, labels, data, label, color) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: color,
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                ...CHART_OPTIONS,
                indexAxis: 'y',
                plugins: {
                    ...CHART_OPTIONS.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Cria gráfico de linha
     */
    createLineChart(canvasId, labels, datasets) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.color || Object.values(CHART_COLORS)[index],
                    backgroundColor: dataset.color || Object.values(CHART_COLORS)[index],
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: {
                ...CHART_OPTIONS,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    /**
     * Cria gráfico de área empilhada
     */
    createStackedAreaChart(canvasId, labels, datasets) {
        this.destroyChart(canvasId);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.color || Object.values(CHART_COLORS)[index],
                    backgroundColor: dataset.color || Object.values(CHART_COLORS)[index],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }))
            },
            options: {
                ...CHART_OPTIONS,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    }

    // ============ GRÁFICOS ESPECÍFICOS DO DASHBOARD ============

    /**
     * Gráfico de processos por tipo de cotação
     */
    renderChartTipoCotacao(processos) {
        const contagem = contarOcorrencias(processos, 'tipoCotacao');
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);
        const colors = [
            CHART_COLORS.primary,
            CHART_COLORS.secondary,
            CHART_COLORS.info,
            CHART_COLORS.warning
        ];

        return this.createDoughnutChart('chartTipoCotacao', labels, data, colors);
    }

    /**
     * Gráfico de processos por status
     */
    renderChartStatus(processos) {
        const contagem = contarOcorrencias(processos, 'status');
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);
        const colors = labels.map((_, i) => 
            Object.values(CHART_COLORS)[i % Object.keys(CHART_COLORS).length]
        );

        return this.createPieChart('chartStatus', labels, data, colors);
    }

    /**
     * Gráfico de evolução de processos ao longo do tempo
     */
    renderChartEvolucao(processosAndamento, processosFinalizados) {
        // Agrupa processos por mês
        const meses = [];
        const dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - 5);

        for (let i = 0; i < 6; i++) {
            const data = new Date(dataInicio);
            data.setMonth(dataInicio.getMonth() + i);
            meses.push(data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
        }

        const contarPorMes = (processos, campo, campoAlternativo = null) => {
            return meses.map(mes => {
                return processos.filter(p => {
                    const valorCampo = p[campo] || (campoAlternativo ? p[campoAlternativo] : null);
                    if (!valorCampo) return false;
                    const dataProcesso = new Date(valorCampo);
                    const mesProcesso = dataProcesso.toLocaleDateString('pt-BR', {
                        month: 'short',
                        year: 'numeric'
                    });
                    return mesProcesso === mes;
                }).length;
            });
        };

        const datasets = [
            {
                label: 'Iniciados',
                data: contarPorMes([...processosAndamento, ...processosFinalizados], 'dataInicio'),
                color: CHART_COLORS.primary
            },
            {
                label: 'Finalizados',
                data: contarPorMes(processosFinalizados, 'dataFinalizacao', 'dataEntrega'),
                color: CHART_COLORS.success
            }
        ];

        return this.createLineChart('chartEvolucao', meses, datasets);
    }

    /**
     * Gráfico de produtividade por responsável
     */
    renderChartProdutividade(processos) {
        const contagem = contarOcorrencias(processos, 'responsavel');
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);

        // Ordena por quantidade (decrescente)
        const sorted = labels
            .map((label, i) => ({ label, value: data[i] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10

        return this.createBarChart(
            'chartProdutividade',
            sorted.map(s => s.label),
            sorted.map(s => s.value),
            'Processos',
            CHART_COLORS.primary
        );
    }

    /**
     * Gráfico de complexidade dos processos
     */
    renderChartComplexidade(processos) {
        const contagem = contarOcorrencias(processos, 'grauComplexidade');
        const ordem = ['BAIXO', 'MÉDIO', 'ALTO', 'MUITO ALTO'];
        const labels = ordem.filter(o => contagem[o]);
        const data = labels.map(l => contagem[l]);
        const colors = [
            CHART_COLORS.success,
            CHART_COLORS.info,
            CHART_COLORS.warning,
            CHART_COLORS.danger
        ];

        return this.createDoughnutChart('chartComplexidade', labels, data, colors);
    }

    /**
     * Gráfico de processos por unidade executora
     */
    renderChartUnidade(processos) {
        const contagem = contarOcorrencias(processos, 'unidadeExecutora');
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);
        const colors = labels.map((_, i) => 
            Object.values(CHART_COLORS)[i % Object.keys(CHART_COLORS).length]
        );

        return this.createPieChart('chartUnidade', labels, data, colors);
    }

    /**
     * Gráfico de tipos de objeto
     */
    renderChartTipoObjeto(processos) {
        const contagem = contarOcorrencias(processos, 'tipoObjeto');
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);

        return this.createBarChart(
            'chartTipoObjeto',
            labels,
            data,
            'Quantidade',
            CHART_COLORS.secondary
        );
    }

    /**
     * Atualiza todos os gráficos do dashboard
     */
    updateDashboardCharts(processosAndamento, processosFinalizados) {
        const todosProcessos = [...processosAndamento, ...processosFinalizados];
        
        this.renderChartTipoCotacao(todosProcessos);
        this.renderChartStatus(processosAndamento);
        this.renderChartEvolucao(processosAndamento, processosFinalizados);
        this.renderChartProdutividade(todosProcessos);
        this.renderChartComplexidade(todosProcessos);
    }

    /**
     * Atualiza gráficos da seção de relatórios
     */
    updateReportCharts(processos) {
        this.renderChartUnidade(processos);
        this.renderChartTipoObjeto(processos);
    }

    /**
     * Destrói todos os gráficos
     */
    destroyAll() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }
}

// Exporta instância única
const chartManager = new ChartManager();
export default chartManager;
