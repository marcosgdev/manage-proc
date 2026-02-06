/**
 * Módulo de Processos
 * Gerencia CRUD e exibição de processos (andamento e finalizados)
 */

import dbManager from './database.js';
import authManager from './auth.js';
import { OPCOES, MESSAGES, DB_PATHS } from './config.js';
import { 
    formatarData, 
    diasParaPrazo, 
    formatarPrazo, 
    getClassePrazo,
    truncar,
    showLoading,
    hideLoading,
    showNotification,
    filtrarPorTexto,
    isoParaInputDate
} from './utils.js';

class ProcessosManager {
    constructor() {
        this.processosAndamento = [];
        this.processosFinalizados = [];
        this.processoEditando = null;
        this.filtros = {
            busca: '',
            tipoCotacao: '',
            responsavel: ''
        };
    }

    /**
     * Inicializa o módulo
     */
    async initialize() {
        await this.carregarDados();
        this.setupEventListeners();
        this.popularSelects();
        this.renderTabelas();
    }

    /**
     * Carrega dados do Firebase
     */
    async carregarDados() {
        showLoading();
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

            // Configura listeners em tempo real
            dbManager.listen(DB_PATHS.PROCESSOS_ANDAMENTO, (data) => {
                this.processosAndamento = data;
                this.renderTabelas();
                this.atualizarDashboard();
            });

            dbManager.listen(DB_PATHS.PROCESSOS_FINALIZADOS, (data) => {
                this.processosFinalizados = data;
                this.renderTabelas();
                this.atualizarDashboard();
            });

        } catch (error) {
            console.error('Erro ao carregar processos:', error);
            showNotification(MESSAGES.ERROR.LOAD, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão novo processo
        document.getElementById('btnNovoProcesso')?.addEventListener('click', () => {
            this.abrirModalProcesso();
        });

        // Formulário processo
        document.getElementById('formProcesso')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarProcesso();
        });

        // Botão cancelar
        document.getElementById('btnCancelar')?.addEventListener('click', () => {
            this.fecharModalProcesso();
        });

        // Fechar modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.mudarTab(tab);
            });
        });

        // Filtros
        document.getElementById('searchProcesso')?.addEventListener('input', (e) => {
            this.filtros.busca = e.target.value;
            this.aplicarFiltros();
        });

        document.getElementById('filterTipoCotacao')?.addEventListener('change', (e) => {
            this.filtros.tipoCotacao = e.target.value;
            this.aplicarFiltros();
        });

        document.getElementById('filterResponsavel')?.addEventListener('change', (e) => {
            this.filtros.responsavel = e.target.value;
            this.aplicarFiltros();
        });
    }

    /**
     * Popula selects do formulário
     */
    async popularSelects() {
        // Tipo de Cotação
        const selectTipoCotacao = document.getElementById('inputTipoCotacao');
        if (selectTipoCotacao) {
            selectTipoCotacao.innerHTML = '<option value="">Selecione...</option>' +
                OPCOES.TIPO_COTACAO
                    .map(opt => `<option value="${opt}">${opt}</option>`)
                    .join('');
        }

        // Tipo de Objeto
        const selectTipoObjeto = document.getElementById('inputTipoObjeto');
        if (selectTipoObjeto) {
            selectTipoObjeto.innerHTML = '<option value="">Selecione...</option>' +
                OPCOES.TIPO_OBJETO
                    .map(opt => `<option value="${opt}">${opt}</option>`)
                    .join('');
        }

        // Status
        const selectStatus = document.getElementById('inputStatus');
        if (selectStatus) {
            selectStatus.innerHTML = '<option value="">Selecione...</option>' +
                OPCOES.STATUS
                    .map(opt => `<option value="${opt}">${opt}</option>`)
                    .join('');
        }

        // Unidade Executora
        const selectUnidadeExecutora = document.getElementById('inputUnidadeExecutora');
        if (selectUnidadeExecutora) {
            selectUnidadeExecutora.innerHTML = '<option value="">Selecione...</option>' +
                OPCOES.UNIDADE_EXECUTORA
                    .map(opt => `<option value="${opt}">${opt}</option>`)
                    .join('');
        }

        // Responsável (busca do Firebase)
        const resultFuncionarios = await dbManager.getFuncionarios();
        if (resultFuncionarios.success) {
            const selectResponsavel = document.getElementById('inputResponsavel');
            if (selectResponsavel) {
                selectResponsavel.innerHTML = '<option value="">Selecione...</option>' +
                    resultFuncionarios.data
                        .map(f => `<option value="${f.nome}">${f.nome}</option>`)
                        .join('');
            }

            // Popula filtro de responsável também
            const filterResponsavel = document.getElementById('filterResponsavel');
            if (filterResponsavel) {
                filterResponsavel.innerHTML = '<option value="">Todos os Responsáveis</option>' +
                    resultFuncionarios.data
                        .map(f => `<option value="${f.nome}">${f.nome}</option>`)
                        .join('');
            }
        }

        // Popula filtro de tipo de cotação
        const filterTipoCotacao = document.getElementById('filterTipoCotacao');
        if (filterTipoCotacao) {
            filterTipoCotacao.innerHTML = '<option value="">Todos os Tipos</option>' +
                OPCOES.TIPO_COTACAO
                    .map(opt => `<option value="${opt}">${opt}</option>`)
                    .join('');
        }
    }

    /**
     * Abre modal para novo/editar processo
     */
    abrirModalProcesso(processo = null) {
        this.processoEditando = processo;
        const modal = document.getElementById('modalProcesso');
        const form = document.getElementById('formProcesso');
        const title = document.getElementById('modalTitle');

        if (processo) {
            title.textContent = 'Editar Processo';
            // Preenche formulário
            document.getElementById('inputSigadoc').value = processo.sigadoc || '';
            document.getElementById('inputLink').value = processo.link || '';
            document.getElementById('inputDataInicio').value = isoParaInputDate(processo.dataInicio) || '';
            document.getElementById('inputDataFinal').value = isoParaInputDate(processo.dataFinal) || '';
            document.getElementById('inputTipoCotacao').value = processo.tipoCotacao || '';
            document.getElementById('inputTipoObjeto').value = processo.tipoObjeto || '';
            document.getElementById('inputDescricao').value = processo.descricao || '';
            document.getElementById('inputResponsavel').value = processo.responsavel || '';
            document.getElementById('inputComplexidade').value = processo.grauComplexidade || '';
            document.getElementById('inputQuantidadeItens').value = processo.quantidadeItens || '';
            document.getElementById('inputUnidadeExecutora').value = processo.unidadeExecutora || '';
            document.getElementById('inputStatus').value = processo.status || '';
        } else {
            title.textContent = 'Novo Processo';
            form.reset();
        }

        modal.classList.add('active');
    }

    /**
     * Fecha modal de processo
     */
    fecharModalProcesso() {
        const modal = document.getElementById('modalProcesso');
        modal.classList.remove('active');
        this.processoEditando = null;
        document.getElementById('formProcesso').reset();
    }

    /**
     * Salva processo (novo ou edição)
     */
    async salvarProcesso() {
        const dados = {
            sigadoc: document.getElementById('inputSigadoc').value,
            link: document.getElementById('inputLink').value,
            dataInicio: document.getElementById('inputDataInicio').value,
            dataFinal: document.getElementById('inputDataFinal').value || null,
            tipoCotacao: document.getElementById('inputTipoCotacao').value,
            tipoObjeto: document.getElementById('inputTipoObjeto').value,
            descricao: document.getElementById('inputDescricao').value,
            responsavel: document.getElementById('inputResponsavel').value,
            grauComplexidade: document.getElementById('inputComplexidade').value,
            quantidadeItens: parseInt(document.getElementById('inputQuantidadeItens').value),
            unidadeExecutora: document.getElementById('inputUnidadeExecutora').value,
            status: document.getElementById('inputStatus').value
        };

        showLoading();
        try {
            let resultado;
            if (this.processoEditando) {
                resultado = await dbManager.updateProcessoAndamento(this.processoEditando.id, dados);
            } else {
                resultado = await dbManager.createProcessoAndamento(dados);
            }

            if (resultado.success) {
                showNotification(MESSAGES.SUCCESS.SAVE, 'success');
                this.fecharModalProcesso();
                await this.carregarDados();
            } else {
                showNotification(MESSAGES.ERROR.SAVE, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar processo:', error);
            showNotification(MESSAGES.ERROR.SAVE, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Finaliza um processo
     */
    async finalizarProcesso(id) {
        if (!confirm('Deseja finalizar este processo? A data de finalização será registrada automaticamente.')) return;

        showLoading();
        try {
            const resultado = await dbManager.finalizarProcesso(id);
            if (resultado.success) {
                showNotification('Processo finalizado com sucesso!', 'success');
                await this.carregarDados();
            } else {
                showNotification(MESSAGES.ERROR.UPDATE, 'error');
            }
        } catch (error) {
            console.error('Erro ao finalizar processo:', error);
            showNotification(MESSAGES.ERROR.UPDATE, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Edita as datas de um processo finalizado (início e finalização)
     */
    async editarDataFinalizacao(processo) {
        if (!processo) {
            showNotification('Processo não encontrado', 'error');
            return;
        }

        // Data de início
        const dataInicioAtual = processo.dataInicio || '';
        const novaDataInicio = prompt('Data de Início (YYYY-MM-DD):', dataInicioAtual);
        if (novaDataInicio === null) return;

        // Valida formato da data de início
        if (novaDataInicio && !/^\d{4}-\d{2}-\d{2}$/.test(novaDataInicio)) {
            showNotification('Formato de data de início inválido. Use YYYY-MM-DD', 'error');
            return;
        }

        // Data de finalização
        const dataFinalizacaoAtual = processo.dataFinalizacao || processo.dataEntrega || new Date().toISOString().split('T')[0];
        const novaDataFinalizacao = prompt('Data de Finalização (YYYY-MM-DD):', dataFinalizacaoAtual);
        if (novaDataFinalizacao === null) return;

        // Valida formato da data de finalização
        if (!/^\d{4}-\d{2}-\d{2}$/.test(novaDataFinalizacao)) {
            showNotification('Formato de data de finalização inválido. Use YYYY-MM-DD', 'error');
            return;
        }

        const dataInicioFinal = novaDataInicio || dataInicioAtual;

        showLoading();
        try {
            const resultado = await dbManager.atualizarDatasProcessoFinalizado(
                processo.id,
                dataInicioFinal,
                novaDataFinalizacao
            );
            if (resultado.success) {
                showNotification('Datas atualizadas com sucesso!', 'success');
                await this.carregarDados();
            } else {
                showNotification(resultado.error || MESSAGES.ERROR.UPDATE, 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar datas:', error);
            showNotification(MESSAGES.ERROR.UPDATE, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Deleta um processo
     */
    async deletarProcesso(id, finalizado = false) {
        if (!confirm(MESSAGES.CONFIRM.DELETE)) return;

        showLoading();
        try {
            const resultado = finalizado
                ? await dbManager.deleteProcessoFinalizado(id)
                : await dbManager.deleteProcessoAndamento(id);

            if (resultado.success) {
                showNotification(MESSAGES.SUCCESS.DELETE, 'success');
                await this.carregarDados();
            } else {
                showNotification(MESSAGES.ERROR.DELETE, 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar processo:', error);
            showNotification(MESSAGES.ERROR.DELETE, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Muda de tab (andamento/finalizados)
     */
    mudarTab(tab) {
        // Atualiza botões
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

        // Atualiza conteúdo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab)?.classList.add('active');
    }

    /**
     * Aplica filtros aos processos
     */
    aplicarFiltros() {
        this.renderTabelas();
    }

    /**
     * Renderiza tabelas de processos
     */
    renderTabelas() {
        this.renderTabelaAndamento();
        this.renderTabelaFinalizados();
    }

    /**
     * Renderiza tabela de processos em andamento
     */
    renderTabelaAndamento() {
        const container = document.getElementById('processosAndamentoTable');
        if (!container) return;

        let processos = [...this.processosAndamento];

        // Aplica filtros
        if (this.filtros.busca) {
            processos = filtrarPorTexto(processos, this.filtros.busca, 
                ['sigadoc', 'descricao', 'responsavel']);
        }
        if (this.filtros.tipoCotacao) {
            processos = processos.filter(p => p.tipoCotacao === this.filtros.tipoCotacao);
        }
        if (this.filtros.responsavel) {
            processos = processos.filter(p => p.responsavel === this.filtros.responsavel);
        }

        if (processos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p class="empty-state-text">Nenhum processo em andamento encontrado</p>
                </div>
            `;
            return;
        }

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nº Processo</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Responsável</th>
                        <th>Data Início</th>
                        <th>Prazo</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${processos.map(p => this.renderLinhaProcesso(p, false)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
        this.setupTabelaEventListeners(false);
    }

    /**
     * Renderiza tabela de processos finalizados
     */
    renderTabelaFinalizados() {
        const container = document.getElementById('processosFinalizadosTable');
        if (!container) return;

        let processos = [...this.processosFinalizados];

        // Aplica filtros
        if (this.filtros.busca) {
            processos = filtrarPorTexto(processos, this.filtros.busca, 
                ['sigadoc', 'descricao', 'responsavel']);
        }
        if (this.filtros.tipoCotacao) {
            processos = processos.filter(p => p.tipoCotacao === this.filtros.tipoCotacao);
        }
        if (this.filtros.responsavel) {
            processos = processos.filter(p => p.responsavel === this.filtros.responsavel);
        }

        if (processos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p class="empty-state-text">Nenhum processo finalizado encontrado</p>
                </div>
            `;
            return;
        }

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nº Processo</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Responsável</th>
                        <th>Data Início</th>
                        <th>Finalizado Em</th>
                        <th>Dias Corridos</th>
                        <th>Dias Úteis</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${processos.map(p => this.renderLinhaProcesso(p, true)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
        this.setupTabelaEventListeners(true);
    }

    /**
     * Renderiza uma linha da tabela
     */
    renderLinhaProcesso(processo, finalizado) {
        const dias = diasParaPrazo(processo.dataFinal);
        const classePrazo = getClassePrazo(dias);

        const isGestor = authManager.isGestor();

        if (finalizado) {
            return `
                <tr data-id="${processo.id}">
                    <td><strong>${processo.sigadoc}</strong></td>
                    <td>${truncar(processo.descricao, 40)}</td>
                    <td><span class="badge badge-info">${processo.tipoCotacao}</span></td>
                    <td>${processo.responsavel}</td>
                    <td>${formatarData(processo.dataInicio)}</td>
                    <td>${formatarData(processo.dataFinalizacao || processo.dataEntrega)}</td>
                    <td>${processo.diasCorridos || processo.diasDecorridos || '-'}</td>
                    <td>${processo.diasUteis || '-'}</td>
                    <td class="table-actions">
                        <button class="btn-icon btn-view" data-action="view" title="Visualizar">👁️</button>
                        ${isGestor ? `
                            <button class="btn-icon btn-edit" data-action="editDate" title="Ajustar Datas">📅</button>
                            <button class="btn-icon btn-delete" data-action="delete" title="Excluir">🗑️</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }

        return `
            <tr data-id="${processo.id}">
                <td><strong>${processo.sigadoc}</strong></td>
                <td>${truncar(processo.descricao, 40)}</td>
                <td><span class="badge badge-info">${processo.tipoCotacao}</span></td>
                <td>${processo.responsavel}</td>
                <td>${formatarData(processo.dataInicio)}</td>
                <td><span class="badge ${classePrazo}">${formatarPrazo(dias)}</span></td>
                <td><span class="badge badge-warning">${processo.status}</span></td>
                <td class="table-actions">
                    <button class="btn-icon btn-view" data-action="view" title="Visualizar">👁️</button>
                    ${isGestor ? `
                        <button class="btn-icon btn-edit" data-action="edit" title="Editar">✏️</button>
                        <button class="btn-icon btn-edit" data-action="finish" title="Finalizar">✅</button>
                        <button class="btn-icon btn-delete" data-action="delete" title="Excluir">🗑️</button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    /**
     * Configura event listeners das tabelas
     */
    setupTabelaEventListeners(finalizado) {
        const selector = finalizado 
            ? '#processosFinalizadosTable .data-table' 
            : '#processosAndamentoTable .data-table';
        
        const tabela = document.querySelector(selector);
        if (!tabela) return;

        tabela.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;

            const row = btn.closest('tr');
            const id = row.dataset.id;
            const action = btn.dataset.action;
            const processo = finalizado
                ? this.processosFinalizados.find(p => p.id === id)
                : this.processosAndamento.find(p => p.id === id);

            switch (action) {
                case 'view':
                    this.visualizarProcesso(processo);
                    break;
                case 'edit':
                    this.abrirModalProcesso(processo);
                    break;
                case 'finish':
                    this.finalizarProcesso(id);
                    break;
                case 'editDate':
                    this.editarDataFinalizacao(processo);
                    break;
                case 'delete':
                    this.deletarProcesso(id, finalizado);
                    break;
            }
        });
    }

    /**
     * Visualiza o processo abrindo o link em uma nova aba
     */
    visualizarProcesso(processo) {
        if (!processo) {
            showNotification('Processo não encontrado', 'error');
            return;
        }

        if (!processo.link || processo.link.trim() === '') {
            showNotification('Este processo não possui link cadastrado', 'warning');
            return;
        }

        window.open(processo.link, '_blank');
    }

    /**
     * Callback para atualizar dashboard (será implementado no módulo dashboard)
     */
    atualizarDashboard() {
        // Será chamado pelo módulo dashboard
        if (window.dashboardManager) {
            window.dashboardManager.atualizarDados();
        }
    }
}

// Exporta instância única
const processosManager = new ProcessosManager();
export default processosManager;
