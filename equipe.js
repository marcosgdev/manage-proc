/**
 * Módulo de Equipe
 * Gerencia CRUD e exibição de funcionários e performance
 */

import dbManager from './database.js';
import authManager from './auth.js';
import { OPCOES, MESSAGES, DB_PATHS } from './config.js';
import { 
    gerarIniciais,
    gerarCorPorString,
    showLoading,
    hideLoading,
    showNotification
} from './utils.js';

class EquipeManager {
    constructor() {
        this.funcionarios = [];
        this.funcionarioEditando = null;
    }

    /**
     * Inicializa o módulo
     */
    async initialize() {
        await this.carregarDados();
        this.setupEventListeners();
        this.renderEquipe();
    }

    /**
     * Carrega dados do Firebase
     */
    async carregarDados() {
        showLoading();
        try {
            const resultado = await dbManager.getFuncionarios();
            if (resultado.success) {
                this.funcionarios = resultado.data;
            }

            // Configura listener em tempo real
            dbManager.listen(DB_PATHS.FUNCIONARIOS, (data) => {
                this.funcionarios = data;
                this.renderEquipe();
            });

        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            showNotification(MESSAGES.ERROR.LOAD, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão novo funcionário
        document.getElementById('btnNovoFuncionario')?.addEventListener('click', () => {
            this.abrirModalFuncionario();
        });

        // Formulário funcionário
        document.getElementById('formFuncionario')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarFuncionario();
        });

        // Botão cancelar
        document.getElementById('btnCancelarFunc')?.addEventListener('click', () => {
            this.fecharModalFuncionario();
        });

        // Event listeners dos cards de equipe (delegação)
        const teamGrid = document.getElementById('teamGrid');
        if (teamGrid) {
            teamGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-icon');
                if (!btn) return;

                const card = btn.closest('.team-card');
                if (!card) return;

                const id = card.dataset.id;
                const action = btn.dataset.action;
                const funcionario = this.funcionarios.find(f => f.id === id);

                if (!funcionario) return;

                switch (action) {
                    case 'edit':
                        this.abrirModalFuncionario(funcionario);
                        break;
                    case 'delete':
                        this.deletarFuncionario(id);
                        break;
                }
            });
        }
    }

    /**
     * Abre modal para novo/editar funcionário
     */
    abrirModalFuncionario(funcionario = null) {
        this.funcionarioEditando = funcionario;
        const modal = document.getElementById('modalFuncionario');
        const form = document.getElementById('formFuncionario');

        if (funcionario) {
            document.getElementById('inputNome').value = funcionario.nome || '';
            document.getElementById('inputContato').value = funcionario.contato || '';
            document.getElementById('inputVinculo').value = funcionario.vinculo || '';
        } else {
            form.reset();
        }

        modal.classList.add('active');
    }

    /**
     * Fecha modal de funcionário
     */
    fecharModalFuncionario() {
        const modal = document.getElementById('modalFuncionario');
        modal.classList.remove('active');
        this.funcionarioEditando = null;
        document.getElementById('formFuncionario').reset();
    }

    /**
     * Salva funcionário (novo ou edição)
     */
    async salvarFuncionario() {
        const dados = {
            nome: document.getElementById('inputNome').value,
            contato: document.getElementById('inputContato').value,
            vinculo: document.getElementById('inputVinculo').value
        };

        showLoading();
        try {
            let resultado;
            if (this.funcionarioEditando) {
                resultado = await dbManager.updateFuncionario(this.funcionarioEditando.id, dados);
            } else {
                resultado = await dbManager.createFuncionario(dados);
            }

            if (resultado.success) {
                showNotification(MESSAGES.SUCCESS.SAVE, 'success');
                this.fecharModalFuncionario();
                await this.carregarDados();
            } else {
                showNotification(MESSAGES.ERROR.SAVE, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            showNotification(MESSAGES.ERROR.SAVE, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Deleta um funcionário
     */
    async deletarFuncionario(id) {
        if (!confirm(MESSAGES.CONFIRM.DELETE)) return;

        showLoading();
        try {
            const resultado = await dbManager.deleteFuncionario(id);
            if (resultado.success) {
                showNotification(MESSAGES.SUCCESS.DELETE, 'success');
                await this.carregarDados();
            } else {
                showNotification(MESSAGES.ERROR.DELETE, 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar funcionário:', error);
            showNotification(MESSAGES.ERROR.DELETE, 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Renderiza grid de equipe
     */
    renderEquipe() {
        this.renderTeamGrid();
        this.renderPerformanceTable();
    }

    /**
     * Renderiza cards da equipe
     */
    async renderTeamGrid() {
        const container = document.getElementById('teamGrid');
        if (!container) return;

        if (this.funcionarios.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p class="empty-state-text">Nenhum membro da equipe cadastrado</p>
                </div>
            `;
            return;
        }

        // Busca estatísticas de processos
        const processosAndamento = await dbManager.getProcessosAndamento();
        const processosFinalizados = await dbManager.getProcessosFinalizados();
        
        const todosProcessos = [
            ...(processosAndamento.success ? processosAndamento.data : []),
            ...(processosFinalizados.success ? processosFinalizados.data : [])
        ];

        const html = this.funcionarios.map(func => {
            const iniciais = gerarIniciais(func.nome);
            const cor = gerarCorPorString(func.nome);
            
            // Conta processos do funcionário
            const processosFunc = todosProcessos.filter(p => p.responsavel === func.nome);
            const emAndamento = processosFunc.filter(p => 
                !processosFinalizados.data?.find(pf => pf.id === p.id)
            ).length;
            const finalizados = processosFunc.filter(p => 
                processosFinalizados.data?.find(pf => pf.id === p.id)
            ).length;

            return `
                <div class="team-card" data-id="${func.id}">
                    <div class="team-avatar" style="background: ${cor}">
                        ${iniciais}
                    </div>
                    <h3 class="team-name">${func.nome}</h3>
                    <p class="team-contact">${func.contato}</p>
                    <span class="team-vinculo">${func.vinculo}</span>
                    
                    <div class="team-stats">
                        <div class="team-stat">
                            <span class="team-stat-value">${emAndamento}</span>
                            <span class="team-stat-label">Em Andamento</span>
                        </div>
                        <div class="team-stat">
                            <span class="team-stat-value">${finalizados}</span>
                            <span class="team-stat-label">Finalizados</span>
                        </div>
                    </div>
                    
                    ${authManager.isGestor() ? `
                    <div class="table-actions" style="justify-content: center; margin-top: 15px;">
                        <button class="btn-icon btn-edit" data-action="edit" title="Editar">✏️</button>
                        <button class="btn-icon btn-delete" data-action="delete" title="Excluir">🗑️</button>
                    </div>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Renderiza tabela de performance
     */
    async renderPerformanceTable() {
        const container = document.getElementById('performanceTable');
        if (!container) return;

        // Busca processos
        const processosAndamento = await dbManager.getProcessosAndamento();
        const processosFinalizados = await dbManager.getProcessosFinalizados();
        
        if (!processosAndamento.success || !processosFinalizados.success) {
            return;
        }

        // Calcula estatísticas por funcionário
        const stats = this.funcionarios.map(func => {
            const processosFunc = [
                ...processosAndamento.data.filter(p => p.responsavel === func.nome),
                ...processosFinalizados.data.filter(p => p.responsavel === func.nome)
            ];

            const finalizados = processosFinalizados.data.filter(p => p.responsavel === func.nome);
            const emAndamento = processosAndamento.data.filter(p => p.responsavel === func.nome);

            // Calcula tempo médio
            let tempoMedio = 0;
            if (finalizados.length > 0) {
                const somaTempos = finalizados.reduce((acc, p) => {
                    return acc + (p.diasDecorridos || 0);
                }, 0);
                tempoMedio = Math.round(somaTempos / finalizados.length);
            }

            return {
                nome: func.nome,
                total: processosFunc.length,
                finalizados: finalizados.length,
                emAndamento: emAndamento.length,
                tempoMedio,
                taxaConclusao: processosFunc.length > 0 
                    ? Math.round((finalizados.length / processosFunc.length) * 100)
                    : 0
            };
        });

        // Ordena por total de processos
        stats.sort((a, b) => b.total - a.total);

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Responsável</th>
                        <th>Total de Processos</th>
                        <th>Em Andamento</th>
                        <th>Finalizados</th>
                        <th>Tempo Médio (dias)</th>
                        <th>Taxa de Conclusão</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.map(s => `
                        <tr>
                            <td><strong>${s.nome}</strong></td>
                            <td>${s.total}</td>
                            <td><span class="badge badge-warning">${s.emAndamento}</span></td>
                            <td><span class="badge badge-success">${s.finalizados}</span></td>
                            <td>${s.tempoMedio || '-'}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="flex: 1; background: #e2e8f0; border-radius: 10px; height: 8px; overflow: hidden;">
                                        <div style="width: ${s.taxaConclusao}%; background: linear-gradient(90deg, #10b981, #059669); height: 100%;"></div>
                                    </div>
                                    <span style="font-weight: 600; color: #10b981;">${s.taxaConclusao}%</span>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }
}

// Exporta instância única
const equipeManager = new EquipeManager();
export default equipeManager;
