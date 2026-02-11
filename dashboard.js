/**
 * Módulo do Dashboard
 * Gerencia KPIs, gráficos e visualizações principais
 */

import dbManager from './database.js';
import chartManager from './charts.js';
import emailManager from './email.js';
import { DB_PATHS, OPCOES } from './config.js';
import {
    diasParaPrazo,
    formatarPrazo,
    truncar,
    calcularMedia,
    showLoading,
    hideLoading,
    showNotification
} from './utils.js';

class DashboardManager {
    constructor() {
        this.processosAndamento = [];
        this.processosFinalizados = [];
        this.funcionarios = [];
        this.filtros = {
            periodo: 30,
            unidade: '',
            tipoProcesso: '',
            responsavel: ''
        };
        this.filtrosPopulados = false;
    }

    /**
     * Inicializa o módulo
     */
    async initialize() {
        await this.carregarDados();
        this.setupEventListeners();
        this.popularFiltros();
        this.setupProdutividadeMensal();
        this.atualizarDados();

        // Verifica e envia alertas de prazo por email
        this.verificarAlertasPrazo();
    }

    /**
     * Verifica processos com prazo próximo e envia alertas por email
     */
    async verificarAlertasPrazo() {
        try {
            const alertasEnviados = await emailManager.verificarEEnviarAlertas();
            if (alertasEnviados > 0) {
                showNotification(`${alertasEnviados} alerta(s) de prazo enviado(s) por email`, 'info');
            }
        } catch (error) {
            console.warn('Erro ao verificar alertas de prazo:', error);
        }
    }

    /**
     * Carrega dados do Firebase
     */
    async carregarDados() {
        showLoading();
        try {
            const [andamento, finalizados, funcionarios] = await Promise.all([
                dbManager.getProcessosAndamento(),
                dbManager.getProcessosFinalizados(),
                dbManager.getFuncionarios()
            ]);

            if (andamento.success) {
                this.processosAndamento = andamento.data;
            }

            if (finalizados.success) {
                this.processosFinalizados = finalizados.data;
            }

            if (funcionarios.success) {
                this.funcionarios = funcionarios.data;
            }

            // Configura listeners em tempo real
            dbManager.listen(DB_PATHS.PROCESSOS_ANDAMENTO, (data) => {
                this.processosAndamento = data;
                this.atualizarFiltroResponsavel();
                this.atualizarDados();
            });

            dbManager.listen(DB_PATHS.PROCESSOS_FINALIZADOS, (data) => {
                this.processosFinalizados = data;
                this.atualizarFiltroResponsavel();
                this.atualizarDados();
            });

            dbManager.listen(DB_PATHS.FUNCIONARIOS, (data) => {
                this.funcionarios = data;
                this.atualizarDados();
            });

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        } finally {
            hideLoading();
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Filtro de período
        document.getElementById('filterPeriodo')?.addEventListener('change', (e) => {
            this.filtros.periodo = parseInt(e.target.value);
            this.atualizarSubtitulosKPI();
            this.atualizarDados();
        });

        // Filtro de unidade
        document.getElementById('filterUnidade')?.addEventListener('change', (e) => {
            this.filtros.unidade = e.target.value;
            this.atualizarDados();
        });

        // Filtro de tipo de processo
        document.getElementById('filterTipoProcesso')?.addEventListener('change', (e) => {
            this.filtros.tipoProcesso = e.target.value;
            this.atualizarDados();
        });

        // Filtro de responsável
        document.getElementById('filterResponsavel')?.addEventListener('change', (e) => {
            this.filtros.responsavel = e.target.value;
            this.atualizarDados();
        });
    }

    /**
     * Popula filtros de unidades e tipo de processo (só uma vez)
     */
    popularFiltros() {
        if (this.filtrosPopulados) return;

        // Filtro de unidade
        const selectUnidade = document.getElementById('filterUnidade');
        if (selectUnidade) {
            const unidades = OPCOES.UNIDADE_EXECUTORA || [];
            selectUnidade.innerHTML = '<option value="">Todas as Unidades</option>' +
                unidades.map(u => `<option value="${u}">${u}</option>`).join('');
        }

        // Filtro de tipo de processo
        const selectTipo = document.getElementById('filterTipoProcesso');
        if (selectTipo) {
            const tipos = OPCOES.TIPO_COTACAO || [];
            selectTipo.innerHTML = '<option value="">Todos os Tipos</option>' +
                tipos.map(t => `<option value="${t}">${t}</option>`).join('');
        }

        // Filtro de responsável (preenchido dinamicamente com dados dos processos)
        this.atualizarFiltroResponsavel();

        this.filtrosPopulados = true;
    }

    /**
     * Atualiza filtro de responsável com dados únicos dos processos
     */
    atualizarFiltroResponsavel() {
        const selectResponsavel = document.getElementById('filterResponsavel');
        if (!selectResponsavel) return;

        // Coleta responsáveis únicos de ambas as listas
        const todosProcessos = [...this.processosAndamento, ...this.processosFinalizados];
        const responsaveisUnicos = [...new Set(
            todosProcessos
                .map(p => p.responsavel)
                .filter(r => r && r.trim() !== '')
        )].sort();

        const valorAtual = selectResponsavel.value;
        selectResponsavel.innerHTML = '<option value="">Todos os Responsáveis</option>' +
            responsaveisUnicos.map(r => `<option value="${r}">${r}</option>`).join('');

        // Mantém o valor selecionado se ainda existir
        if (valorAtual && responsaveisUnicos.includes(valorAtual)) {
            selectResponsavel.value = valorAtual;
        }
    }

    /**
     * Atualiza subtítulos dos KPIs baseado no período selecionado
     */
    atualizarSubtitulosKPI() {
        const periodoTexto = {
            7: 'Últimos 7 dias',
            30: 'Últimos 30 dias',
            90: 'Últimos 90 dias',
            365: 'Último ano'
        };

        const texto = periodoTexto[this.filtros.periodo] || 'Período selecionado';

        // Atualiza subtítulo do KPI de finalizados
        const subtituloFinalizados = document.querySelector('#kpiFinalizados')?.closest('.kpi-content')?.querySelector('.kpi-subtitle');
        if (subtituloFinalizados) {
            subtituloFinalizados.textContent = texto;
        }
    }

    /**
     * Retorna a data limite para o filtro de período
     */
    getDataLimitePeriodo() {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - this.filtros.periodo);
        dataLimite.setHours(0, 0, 0, 0);
        return dataLimite;
    }

    /**
     * Filtra processos em andamento
     */
    filtrarProcessosAndamento() {
        let processos = [...this.processosAndamento];
        const dataLimite = this.getDataLimitePeriodo();

        // Filtro de período - por data de início
        processos = processos.filter(p => {
            if (!p.dataInicio) return true; // Inclui se não tem data
            const dataProcesso = new Date(p.dataInicio);
            return dataProcesso >= dataLimite;
        });

        // Filtro de unidade
        if (this.filtros.unidade) {
            processos = processos.filter(p => p.unidadeExecutora === this.filtros.unidade);
        }

        // Filtro de tipo de processo
        if (this.filtros.tipoProcesso) {
            processos = processos.filter(p => p.tipoCotacao === this.filtros.tipoProcesso);
        }

        // Filtro de responsável
        if (this.filtros.responsavel) {
            processos = processos.filter(p => p.responsavel === this.filtros.responsavel);
        }

        return processos;
    }

    /**
     * Filtra processos finalizados
     */
    filtrarProcessosFinalizados() {
        let processos = [...this.processosFinalizados];
        const dataLimite = this.getDataLimitePeriodo();

        // Filtro de período - por data de finalização
        processos = processos.filter(p => {
            const dataFinalizacao = p.dataFinalizacao || p.dataEntrega || p.finalizadoEm;
            if (!dataFinalizacao) return false;
            const dataProcesso = new Date(dataFinalizacao);
            return dataProcesso >= dataLimite;
        });

        // Filtro de unidade
        if (this.filtros.unidade) {
            processos = processos.filter(p => p.unidadeExecutora === this.filtros.unidade);
        }

        // Filtro de tipo de processo
        if (this.filtros.tipoProcesso) {
            processos = processos.filter(p => p.tipoCotacao === this.filtros.tipoProcesso);
        }

        // Filtro de responsável
        if (this.filtros.responsavel) {
            processos = processos.filter(p => p.responsavel === this.filtros.responsavel);
        }

        return processos;
    }

    /**
     * Atualiza todos os dados do dashboard
     */
    atualizarDados() {
        this.atualizarKPIs();
        this.atualizarGraficos();
        this.renderProcessosCriticos();
        this.atualizarFiltroMembros();
        this.renderProdutividadeMensal();
    }

    /**
     * Atualiza KPIs
     */
    atualizarKPIs() {
        const processosAndamentoFiltrados = this.filtrarProcessosAndamento();
        const processosFinalizadosFiltrados = this.filtrarProcessosFinalizados();

        // KPI: Processos em Andamento
        const kpiAndamento = document.getElementById('kpiAndamento');
        if (kpiAndamento) {
            this.animateValue(kpiAndamento, 0, processosAndamentoFiltrados.length, 800);
        }

        // KPI: Processos Finalizados
        const kpiFinalizados = document.getElementById('kpiFinalizados');
        if (kpiFinalizados) {
            this.animateValue(kpiFinalizados, 0, processosFinalizadosFiltrados.length, 800);
        }

        // KPI: Tempo Médio (usa diasCorridos ou diasDecorridos)
        const kpiTempoMedio = document.getElementById('kpiTempoMedio');
        if (kpiTempoMedio) {
            const processosComTempo = processosFinalizadosFiltrados.filter(p =>
                p.diasCorridos || p.diasDecorridos
            );
            let tempoMedio = 0;
            if (processosComTempo.length > 0) {
                const soma = processosComTempo.reduce((acc, p) =>
                    acc + (p.diasCorridos || p.diasDecorridos || 0), 0
                );
                tempoMedio = Math.round(soma / processosComTempo.length);
            }
            this.animateValue(kpiTempoMedio, 0, tempoMedio, 800);
        }

        // KPI: Equipe Ativa
        const kpiEquipe = document.getElementById('kpiEquipe');
        if (kpiEquipe) {
            // Conta responsáveis únicos com processos ativos
            const responsaveisAtivos = new Set(
                processosAndamentoFiltrados
                    .map(p => p.responsavel)
                    .filter(r => r)
            );
            this.animateValue(kpiEquipe, 0, responsaveisAtivos.size, 800);
        }
    }

    /**
     * Atualiza gráficos
     */
    atualizarGraficos() {
        const processosAndamentoFiltrados = this.filtrarProcessosAndamento();
        const processosFinalizadosFiltrados = this.filtrarProcessosFinalizados();

        chartManager.updateDashboardCharts(
            processosAndamentoFiltrados,
            processosFinalizadosFiltrados
        );
    }

    /**
     * Renderiza processos críticos (próximos do prazo)
     */
    renderProcessosCriticos() {
        const container = document.getElementById('processosCriticos');
        if (!container) return;

        // Aplica filtros aos processos críticos também
        let processosBase = [...this.processosAndamento];
        if (this.filtros.unidade) {
            processosBase = processosBase.filter(p => p.unidadeExecutora === this.filtros.unidade);
        }
        if (this.filtros.tipoProcesso) {
            processosBase = processosBase.filter(p => p.tipoCotacao === this.filtros.tipoProcesso);
        }
        if (this.filtros.responsavel) {
            processosBase = processosBase.filter(p => p.responsavel === this.filtros.responsavel);
        }

        // Filtra processos com prazo próximo (<=5 dias) ou vencido
        const processosCriticos = processosBase
            .map(p => ({
                ...p,
                diasPrazo: diasParaPrazo(p.dataFinal)
            }))
            .filter(p => p.diasPrazo !== null && p.diasPrazo <= 5)
            .sort((a, b) => a.diasPrazo - b.diasPrazo)
            .slice(0, 10); // Top 10

        if (processosCriticos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p class="empty-state-text">Nenhum processo crítico no momento${this.filtros.unidade || this.filtros.tipoProcesso || this.filtros.responsavel ? ' para os filtros selecionados' : ''}</p>
                </div>
            `;
            return;
        }

        const html = processosCriticos.map(p => {
            const prazoClass = p.diasPrazo < 0 ? 'danger' : 'warning';

            return `
                <div class="processo-critico-item">
                    <div class="processo-critico-info">
                        <div class="processo-critico-sigadoc">${p.sigadoc}</div>
                        <div class="processo-critico-desc">${truncar(p.descricao, 60)}</div>
                        <div class="processo-critico-responsavel">👤 ${p.responsavel}</div>
                    </div>
                    <div class="processo-critico-prazo ${prazoClass}">
                        ${formatarPrazo(p.diasPrazo)}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Anima transição de valores numéricos
     */
    animateValue(element, start, end, duration) {
        // Cancela animação anterior se existir
        if (element._animationTimer) {
            clearInterval(element._animationTimer);
        }

        const range = end - start;
        if (range === 0) {
            element.textContent = end;
            return;
        }

        const increment = range / (duration / 16); // 60 FPS
        let current = start;

        element._animationTimer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(element._animationTimer);
                element._animationTimer = null;
            }
            element.textContent = Math.round(current);
        }, 16);
    }

    /**
     * Configura filtros de produtividade mensal
     */
    setupProdutividadeMensal() {
        const selectAno = document.getElementById('filterAno');
        const selectMembro = document.getElementById('filterMembro');

        if (!selectAno) return;

        // Popula anos (últimos 3 anos + atual)
        const anoAtual = new Date().getFullYear();
        selectAno.innerHTML = '';
        for (let ano = anoAtual; ano >= anoAtual - 2; ano--) {
            selectAno.innerHTML += `<option value="${ano}" ${ano === anoAtual ? 'selected' : ''}>${ano}</option>`;
        }

        // Event listeners
        selectAno.addEventListener('change', () => this.renderProdutividadeMensal());
        selectMembro?.addEventListener('change', () => this.renderProdutividadeMensal());

        // Atualiza lista de membros
        this.atualizarFiltroMembros();
    }

    /**
     * Atualiza filtro de membros para produtividade mensal
     */
    atualizarFiltroMembros() {
        const selectMembro = document.getElementById('filterMembro');
        if (!selectMembro) return;

        const todosProcessos = [...this.processosAndamento, ...this.processosFinalizados];
        const membrosUnicos = [...new Set(
            todosProcessos
                .map(p => p.responsavel)
                .filter(r => r && r.trim() !== '')
        )].sort();

        const valorAtual = selectMembro.value;
        selectMembro.innerHTML = '<option value="">Todos os Membros</option>' +
            membrosUnicos.map(m => `<option value="${m}">${m}</option>`).join('');

        if (valorAtual && membrosUnicos.includes(valorAtual)) {
            selectMembro.value = valorAtual;
        }
    }

    /**
     * Renderiza tabela de produtividade mensal
     */
    renderProdutividadeMensal() {
        const tbody = document.getElementById('tbodyProdutividade');
        if (!tbody) return;

        const anoSelecionado = parseInt(document.getElementById('filterAno')?.value) || new Date().getFullYear();
        const membroSelecionado = document.getElementById('filterMembro')?.value || '';

        // Coleta todos os processos
        const todosProcessos = [...this.processosAndamento, ...this.processosFinalizados];

        // Agrupa por responsável
        const membros = this.agruparPorResponsavel(todosProcessos, anoSelecionado, membroSelecionado);

        if (Object.keys(membros).length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="cell-empty" style="padding: 2rem; text-align: center;">
                        Nenhum dado encontrado para ${anoSelecionado}${membroSelecionado ? ` - ${membroSelecionado}` : ''}
                    </td>
                </tr>
            `;
            return;
        }

        // Calcula totais por mês (para linha de totais)
        const totaisMes = Array(12).fill(null).map(() => ({ finalizados: 0, andamento: 0 }));
        let totalGeralFinalizados = 0;
        let totalGeralAndamento = 0;

        // Gera linhas da tabela
        let html = '';
        Object.entries(membros).sort((a, b) => a[0].localeCompare(b[0])).forEach(([nome, dados]) => {
            html += `<tr>`;
            html += `<td class="member-name">${nome}</td>`;

            let totalMembro = { finalizados: 0, andamento: 0 };

            for (let mes = 0; mes < 12; mes++) {
                const dadosMes = dados.meses[mes] || { finalizados: 0, andamento: 0 };
                totaisMes[mes].finalizados += dadosMes.finalizados;
                totaisMes[mes].andamento += dadosMes.andamento;
                totalMembro.finalizados += dadosMes.finalizados;
                totalMembro.andamento += dadosMes.andamento;

                if (dadosMes.finalizados === 0 && dadosMes.andamento === 0) {
                    html += `<td class="cell-empty">-</td>`;
                } else {
                    html += `<td class="cell-value">`;
                    if (dadosMes.finalizados > 0) {
                        html += `<span class="finalizados">${dadosMes.finalizados}</span>`;
                    }
                    if (dadosMes.andamento > 0) {
                        html += `<span class="andamento">(${dadosMes.andamento})</span>`;
                    }
                    html += `</td>`;
                }
            }

            totalGeralFinalizados += totalMembro.finalizados;
            totalGeralAndamento += totalMembro.andamento;

            html += `<td class="total-cell cell-value">`;
            html += `<span class="finalizados">${totalMembro.finalizados}</span>`;
            if (totalMembro.andamento > 0) {
                html += `<span class="andamento">(${totalMembro.andamento})</span>`;
            }
            html += `</td>`;
            html += `</tr>`;
        });

        // Linha de totais
        html += `<tr class="row-total">`;
        html += `<td>TOTAL</td>`;
        for (let mes = 0; mes < 12; mes++) {
            if (totaisMes[mes].finalizados === 0 && totaisMes[mes].andamento === 0) {
                html += `<td>-</td>`;
            } else {
                html += `<td class="cell-value">`;
                html += `<span class="finalizados">${totaisMes[mes].finalizados}</span>`;
                if (totaisMes[mes].andamento > 0) {
                    html += `<span class="andamento">(${totaisMes[mes].andamento})</span>`;
                }
                html += `</td>`;
            }
        }
        html += `<td class="total-cell cell-value">`;
        html += `<span class="finalizados">${totalGeralFinalizados}</span>`;
        if (totalGeralAndamento > 0) {
            html += `<span class="andamento">(${totalGeralAndamento})</span>`;
        }
        html += `</td>`;
        html += `</tr>`;

        tbody.innerHTML = html;
    }

    /**
     * Agrupa processos por responsável e mês
     */
    agruparPorResponsavel(processos, ano, membroFiltro) {
        const membros = {};

        processos.forEach(p => {
            if (!p.responsavel || p.responsavel.trim() === '') return;
            if (membroFiltro && p.responsavel !== membroFiltro) return;

            // Determina a data relevante e se está finalizado
            let dataRelevante = null;
            let finalizado = false;

            // Verifica se está na lista de finalizados
            const estaFinalizado = this.processosFinalizados.some(pf => pf.id === p.id);

            if (estaFinalizado) {
                // Para finalizados, usa data de finalização
                dataRelevante = p.dataFinalizacao || p.dataEntrega || p.finalizadoEm || p.dataFinal;
                finalizado = true;
            } else {
                // Para em andamento, usa data de início
                dataRelevante = p.dataInicio;
                finalizado = false;
            }

            if (!dataRelevante) return;

            const data = new Date(dataRelevante);
            if (isNaN(data.getTime())) return;
            if (data.getFullYear() !== ano) return;

            const mes = data.getMonth();
            const nome = p.responsavel;

            if (!membros[nome]) {
                membros[nome] = { meses: {} };
            }

            if (!membros[nome].meses[mes]) {
                membros[nome].meses[mes] = { finalizados: 0, andamento: 0 };
            }

            if (finalizado) {
                membros[nome].meses[mes].finalizados++;
            } else {
                membros[nome].meses[mes].andamento++;
            }
        });

        return membros;
    }
}

// Exporta instância única
const dashboardManager = new DashboardManager();

// Disponibiliza globalmente para outros módulos
window.dashboardManager = dashboardManager;

export default dashboardManager;
