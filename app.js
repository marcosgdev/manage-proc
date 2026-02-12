/**
 * Arquivo Principal da Aplicação
 * Inicializa todos os módulos e gerencia navegação
 */

import dbManager from './database.js';
import authManager from './auth.js';
import dashboardManager from './dashboard.js';
import processosManager from './processos.js';
import equipeManager from './equipe.js';
import relatoriosManager from './relatorios.js';
import emailManager from './email.js';
import backupManager from './backup.js';
import { hideLoading, showNotification } from './utils.js';

class App {
    constructor() {
        this.currentSection = 'dashboard';
        this.isInitialized = false;
    }

    /**
     * Inicializa a aplicação
     */
    async initialize() {
        try {
            console.log('🚀 Iniciando aplicação...');

            // Inicializa o banco de dados
            if (window.database) {
                dbManager.initialize(window.database);
                console.log('✅ Database conectado');
            } else {
                throw new Error('Firebase não inicializado. Verifique as credenciais.');
            }

            // Inicializa módulos
            await Promise.all([
                dashboardManager.initialize(),
                processosManager.initialize(),
                equipeManager.initialize(),
                relatoriosManager.initialize()
            ]);

            console.log('✅ Módulos inicializados');

            // Configura navegação
            this.setupNavigation();

            // Configura logout
            this.setupLogout();

            // Atualiza perfil no header e aplica permissões por papel
            this.updateHeaderProfile();
            this.applyRolePermissions();

            // Configura seção de usuários (só para gestor)
            this.setupUsuarios();

            // Inicializa e configura email
            await emailManager.initialize();
            this.setupEmailConfig();
            this.updateEmailStatus();

            // Inicializa e configura backup
            backupManager.initialize();
            this.setupBackup();
            this.updateBackupStatus();

            // Backup automatico (nao-bloqueante)
            backupManager.autoBackupIfNeeded().then(() => {
                this.updateBackupStatus();
            });

            // Mostra seção inicial
            this.showSection('dashboard');

            this.isInitialized = true;
            hideLoading();

            showNotification('Sistema carregado com sucesso!', 'success');
            console.log('✅ Aplicação inicializada com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação:', error);
            hideLoading();
            this.showError(error);
        }
    }

    /**
     * Configura navegação entre seções
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Bloqueia navegação se o botão estiver desabilitado
                if (btn.classList.contains('disabled')) {
                    e.preventDefault();
                    return;
                }

                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });
    }

    /**
     * Mostra uma seção específica
     */
    showSection(sectionId) {
        // Atualiza botões de navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

        // Atualiza seções
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');

        this.currentSection = sectionId;

        // Atualiza dados da seção se necessário
        this.refreshSection(sectionId);
    }

    /**
     * Atualiza dados da seção ativa
     */
    refreshSection(sectionId) {
        switch (sectionId) {
            case 'dashboard':
                dashboardManager.atualizarDados();
                break;
            case 'processos':
                processosManager.renderTabelas();
                break;
            case 'equipe':
                equipeManager.renderEquipe();
                break;
            case 'relatorios':
                // Relatórios são gerados sob demanda
                break;
            case 'usuarios':
                this.renderUsuarios();
                break;
        }
    }

    /**
     * Configura logout
     */
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    /**
     * Realiza logout (limpa listeners e devolve para tela de login)
     */
    async logout() {
        if (!confirm('Deseja realmente sair do sistema?')) return;

        // Remove listeners do Firebase
        Object.keys(dbManager.listeners).forEach(path => {
            dbManager.removeListener(path);
        });

        await authManager.logout();
        showNotification('Logout realizado com sucesso!', 'info');

        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    /**
     * Atualiza nome e badge de papel no header
     */
    updateHeaderProfile() {
        const nameEl = document.querySelector('.user-name');
        if (!nameEl) return;

        const email = authManager.currentUser?.email || '';
        const nome = email.split('@')[0];
        const role = authManager.currentRole || 'usuario';

        nameEl.textContent = nome;
        // Remove badge anterior se existir
        const oldBadge = nameEl.nextElementSibling;
        if (oldBadge && oldBadge.classList.contains('role-badge')) {
            oldBadge.remove();
        }
        const badge = document.createElement('span');
        badge.className = `role-badge ${role}`;
        badge.textContent = role === 'gestor' ? 'Gestor' : 'Usuário';
        nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
    }

    /**
     * Aplica permissões de papel nos elementos estáticos
     */
    applyRolePermissions() {
        const isGestor = authManager.isGestor();

        // Esconde elementos exclusivos de gestor
        document.querySelectorAll('.gestor-only').forEach(el => {
            el.classList.toggle('hidden', !isGestor);
        });

        // Desabilita botões de navegação restritos para não-gestores
        document.querySelectorAll('.nav-btn.nav-restricted').forEach(btn => {
            btn.classList.toggle('disabled', !isGestor);
        });
    }

    /**
     * Configura event listener para a tabela de usuários (delegação)
     */
    setupUsuarios() {
        const container = document.getElementById('usuariosTable');
        if (!container) return;

        // Handler para mudança de papel
        container.addEventListener('change', async (e) => {
            const select = e.target;
            if (!select.classList.contains('role-select')) return;

            const uid = select.dataset.uid;
            const newRole = select.value;

            if (!confirm(`Alterar papel para "${newRole === 'gestor' ? 'Gestor' : 'Usuário'}"?`)) {
                // Revertendo select ao valor anterior
                select.value = select.dataset.currentRole;
                return;
            }

            const resultado = await authManager.updateUserRole(uid, newRole);
            if (resultado.success) {
                select.dataset.currentRole = newRole;
                showNotification('Papel atualizado com sucesso!', 'success');
            } else {
                select.value = select.dataset.currentRole;
                showNotification('Erro ao atualizar papel.', 'error');
            }
        });

        // Handler para ações de usuário (editar e deletar)
        container.addEventListener('click', async (e) => {
            // Editar usuário
            const btnEdit = e.target.closest('.btn-edit-user');
            if (btnEdit) {
                const uid = btnEdit.dataset.uid;
                const nomeAtual = btnEdit.dataset.nome;
                const emailAtual = btnEdit.dataset.email;
                const isCurrentUser = uid === authManager.currentUser?.uid;

                const novoNome = prompt('Nome do usuário:', nomeAtual || emailAtual.split('@')[0]);
                if (novoNome === null) return;

                const novoEmail = prompt('Email do usuário:', emailAtual);
                if (novoEmail === null) return;

                if (!novoEmail || !novoEmail.includes('@')) {
                    showNotification('Email inválido', 'error');
                    return;
                }

                // Senha - só pode alterar para o próprio usuário
                let novaSenha = null;
                if (isCurrentUser) {
                    novaSenha = prompt('Nova senha (deixe em branco para manter a atual):');
                    if (novaSenha === null) return;

                    if (novaSenha && novaSenha.length < 6) {
                        showNotification('A senha deve ter no mínimo 6 caracteres', 'error');
                        return;
                    }
                }

                const resultado = await authManager.updateUser(uid, {
                    nome: novoNome,
                    email: novoEmail,
                    senha: novaSenha || undefined
                });

                if (resultado.success) {
                    showNotification('Usuário atualizado com sucesso!', 'success');
                    this.renderUsuarios();
                } else {
                    showNotification(resultado.error || 'Erro ao atualizar usuário.', 'error');
                }
                return;
            }

            // Deletar usuário
            const btnDelete = e.target.closest('.btn-delete-user');
            if (btnDelete) {
                const uid = btnDelete.dataset.uid;
                const email = btnDelete.dataset.email;

                if (!confirm(`Tem certeza que deseja excluir o usuário "${email}"?\n\nEsta ação não pode ser desfeita.`)) {
                    return;
                }

                const resultado = await authManager.deleteUser(uid);
                if (resultado.success) {
                    showNotification('Usuário excluído com sucesso!', 'success');
                    this.renderUsuarios();
                } else {
                    showNotification(resultado.error || 'Erro ao excluir usuário.', 'error');
                }
            }
        });
    }

    /**
     * Renderiza tabela de usuários
     */
    async renderUsuarios() {
        const container = document.getElementById('usuariosTable');
        if (!container) return;

        const usuarios = await authManager.getAllUsers();
        if (!usuarios || usuarios.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <p class="empty-state-text">Nenhum usuário encontrado</p>
                </div>
            `;
            return;
        }

        const currentUid = authManager.currentUser?.uid;

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Email</th>
                        <th>Papel</th>
                        <th>Criado Em</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${usuarios.map(u => `
                        <tr>
                            <td><strong>${u.nome || u.email.split('@')[0]}</strong>${u.uid === currentUid ? ' <span style="color:#64748b;font-size:0.85rem;">(Você)</span>' : ''}</td>
                            <td>${u.email}</td>
                            <td>
                                <select class="role-select" data-uid="${u.uid}" data-current-role="${u.role}" ${u.uid === currentUid ? 'disabled' : ''}>
                                    <option value="gestor" ${u.role === 'gestor' ? 'selected' : ''}>Gestor</option>
                                    <option value="usuario" ${u.role === 'usuario' ? 'selected' : ''}>Usuário</option>
                                </select>
                            </td>
                            <td>${u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : '-'}</td>
                            <td class="table-actions">
                                <button class="btn-icon btn-edit-user" data-uid="${u.uid}" data-nome="${u.nome || ''}" data-email="${u.email}" title="Editar usuário">✏️</button>
                                ${u.uid !== currentUid ? `<button class="btn-icon btn-delete-user" data-uid="${u.uid}" data-email="${u.email}" title="Excluir usuário">🗑️</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    /**
     * Configura handlers para configuração de email
     */
    setupEmailConfig() {
        const btnConfigurar = document.getElementById('btnConfigurarEmail');
        const btnTestar = document.getElementById('btnTestarEmail');
        const btnCancelar = document.getElementById('btnCancelarEmail');
        const btnLimpar = document.getElementById('btnLimparEmail');
        const formEmail = document.getElementById('formEmail');
        const modalEmail = document.getElementById('modalEmail');
        const modalClose = modalEmail?.querySelector('.modal-close');

        // Abrir modal de configuração
        btnConfigurar?.addEventListener('click', () => {
            this.preencherFormEmail();
            modalEmail?.classList.add('active');
        });

        // Fechar modal
        btnCancelar?.addEventListener('click', () => {
            modalEmail?.classList.remove('active');
        });

        modalClose?.addEventListener('click', () => {
            modalEmail?.classList.remove('active');
        });

        // Limpar configuração
        btnLimpar?.addEventListener('click', () => {
            if (confirm('Deseja realmente limpar a configuração de email?')) {
                emailManager.limparConfiguracao();
                this.updateEmailStatus();
                modalEmail?.classList.remove('active');
                showNotification('Configuração de email removida', 'info');
            }
        });

        // Salvar configuração
        formEmail?.addEventListener('submit', (e) => {
            e.preventDefault();

            const serviceId = document.getElementById('inputEmailServiceId').value.trim();
            const publicKey = document.getElementById('inputEmailPublicKey').value.trim();
            const templateId = document.getElementById('inputTemplateId').value.trim();

            emailManager.configurar(serviceId, publicKey, templateId);
            this.updateEmailStatus();
            modalEmail?.classList.remove('active');
            showNotification('Configuração de email salva com sucesso!', 'success');
        });

        // Testar envio de email
        btnTestar?.addEventListener('click', async () => {
            if (!emailManager.isConfigured()) {
                showNotification('Configure o EmailJS primeiro', 'warning');
                return;
            }

            btnTestar.disabled = true;
            btnTestar.textContent = 'Enviando...';

            try {
                const resultado = await emailManager.enviarEmail(
                    {
                        tipo_notificacao: '🧪 TESTE',
                        assunto: 'Teste de Configuração - Gestão Processual',
                        mensagem_principal: 'Este é um email de teste do sistema.',
                        numero_processo: 'TESTE-001',
                        descricao: 'Verificação de configuração do EmailJS',
                        tipo_cotacao: 'DISPENSA DE LICITAÇÃO',
                        responsavel: 'Sistema',
                        data_info: new Date().toLocaleDateString('pt-BR'),
                        prazo_info: '',
                        unidade: 'Teste',
                        info_extra: 'Configuração funcionando corretamente!',
                        link_sistema: window.location.origin
                    },
                    authManager.currentUser?.email || 'teste@teste.com'
                );

                if (resultado.success) {
                    showNotification('Email de teste enviado com sucesso!', 'success');
                } else {
                    showNotification('Erro ao enviar email: ' + resultado.error, 'error');
                }
            } catch (error) {
                showNotification('Erro ao enviar email de teste', 'error');
            }

            btnTestar.disabled = false;
            btnTestar.textContent = 'Testar Envio';
        });
    }

    /**
     * Preenche form de email com valores salvos
     */
    preencherFormEmail() {
        document.getElementById('inputEmailServiceId').value = emailManager.serviceId || '';
        document.getElementById('inputEmailPublicKey').value = emailManager.publicKey || '';
        document.getElementById('inputTemplateId').value = emailManager.templateId || '';
    }

    /**
     * Atualiza status de configuração de email na interface
     */
    updateEmailStatus() {
        const statusBadge = document.getElementById('emailStatus');
        const btnTestar = document.getElementById('btnTestarEmail');
        const isConfigured = emailManager.isConfigured();

        if (statusBadge) {
            statusBadge.textContent = isConfigured ? 'Configurado' : 'Não configurado';
            statusBadge.classList.toggle('status-active', isConfigured);
            statusBadge.classList.toggle('status-inactive', !isConfigured);
        }

        if (btnTestar) {
            btnTestar.disabled = !isConfigured;
        }
    }

    /**
     * Configura event handlers para a secao de backup
     */
    setupBackup() {
        const btnManual = document.getElementById('btnBackupManual');
        const btnListar = document.getElementById('btnListarBackups');

        btnManual?.addEventListener('click', async () => {
            if (!authManager.isGestor()) {
                showNotification('Apenas gestores podem realizar backups', 'warning');
                return;
            }

            btnManual.disabled = true;
            btnManual.textContent = 'Realizando backup...';

            const result = await backupManager.createBackup(false);

            if (result.success) {
                showNotification('Backup realizado com sucesso!', 'success');
                this.updateBackupStatus();
            } else {
                showNotification('Erro ao realizar backup: ' + result.error, 'error');
            }

            btnManual.disabled = false;
            btnManual.textContent = 'Realizar Backup Agora';
        });

        btnListar?.addEventListener('click', async () => {
            const container = document.getElementById('backupListContainer');

            if (container.style.display === 'none') {
                container.style.display = 'block';
                btnListar.textContent = 'Ocultar Backups';
                await this.renderBackupList();
            } else {
                container.style.display = 'none';
                btnListar.textContent = 'Ver Backups Disponíveis';
            }
        });

        // Event delegation para botoes de download na lista
        const listContainer = document.getElementById('backupList');
        listContainer?.addEventListener('click', async (e) => {
            const btnDownload = e.target.closest('.btn-download-backup');
            if (btnDownload) {
                const backupKey = btnDownload.dataset.key;
                btnDownload.disabled = true;
                btnDownload.textContent = 'Baixando...';

                await backupManager.downloadBackup(backupKey);
                showNotification('Download iniciado!', 'info');

                btnDownload.disabled = false;
                btnDownload.textContent = 'Baixar';
            }
        });
    }

    /**
     * Atualiza informacoes do ultimo backup na interface
     */
    async updateBackupStatus() {
        const statusBadge = document.getElementById('backupStatus');
        const infoCard = document.getElementById('backupLastInfo');
        const dateEl = document.getElementById('backupLastDate');
        const sizeEl = document.getElementById('backupLastSize');
        const userEl = document.getElementById('backupLastUser');

        const lastBackup = await backupManager.getLastBackupInfo();

        if (lastBackup && statusBadge) {
            statusBadge.textContent = `Ultimo: ${new Date(lastBackup.createdAt).toLocaleDateString('pt-BR')}`;
            statusBadge.classList.remove('status-inactive');
            statusBadge.classList.add('status-active');
        }

        if (lastBackup && infoCard) {
            infoCard.style.display = 'block';

            if (dateEl) {
                dateEl.textContent = new Date(lastBackup.createdAt).toLocaleString('pt-BR');
            }
            if (sizeEl) {
                const backups = await backupManager.listBackups();
                const latest = backups[0];
                sizeEl.textContent = latest ? latest.size : '-';
            }
            if (userEl) {
                userEl.textContent = lastBackup.createdBy || '-';
            }
        }
    }

    /**
     * Renderiza a lista de backups disponiveis
     */
    async renderBackupList() {
        const container = document.getElementById('backupList');
        if (!container) return;

        container.innerHTML = '<p style="color:var(--text-tertiary);">Carregando...</p>';

        const backups = await backupManager.listBackups();

        if (backups.length === 0) {
            container.innerHTML = `
                <div style="padding:20px; text-align:center;">
                    <p style="color:var(--text-tertiary);">Nenhum backup encontrado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="overflow-x:auto;">
                <table class="data-table" style="min-width:600px;">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Tamanho</th>
                            <th>Realizado por</th>
                            <th>Acao</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${backups.map(b => `
                            <tr>
                                <td>${new Date(b.createdAt).toLocaleString('pt-BR')}</td>
                                <td>
                                    <span class="status-badge ${b.automatic ? 'status-inactive' : 'status-active'}">
                                        ${b.automatic ? 'Automatico' : 'Manual'}
                                    </span>
                                </td>
                                <td>${b.size || '-'}</td>
                                <td>${b.createdBy}</td>
                                <td>
                                    <button class="btn-secondary btn-download-backup"
                                        data-key="${b.key}"
                                        style="padding:4px 12px; font-size:0.85rem;"
                                        title="Baixar backup">
                                        Baixar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Mostra erro de inicialização
     */
    showError(error) {
        const errorMessage = error.message || 'Erro desconhecido';
        
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                padding: 20px;
                text-align: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-family: 'Inter', sans-serif;
            ">
                <div style="
                    background: white;
                    color: #1e293b;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 500px;
                ">
                    <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
                    <h1 style="margin-bottom: 15px;">Erro ao Carregar Sistema</h1>
                    <p style="color: #64748b; margin-bottom: 25px;">
                        ${errorMessage}
                    </p>
                    <div style="
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 10px;
                        margin-bottom: 25px;
                        text-align: left;
                        font-size: 0.9rem;
                        color: #475569;
                    ">
                        <strong>Passos para resolver:</strong><br>
                        1. Verifique as credenciais do Firebase no arquivo index.html<br>
                        2. Certifique-se de que o Firebase Realtime Database está ativo<br>
                        3. Verifique as regras de segurança do Firebase<br>
                        4. Verifique a conexão com a internet
                    </div>
                    <button onclick="location.reload()" style="
                        background: linear-gradient(135deg, #2563eb, #1e40af);
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 10px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 1rem;
                    ">
                        🔄 Recarregar Página
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Verifica conexão com Firebase
     */
    async checkConnection() {
        try {
            const result = await dbManager.getAll('test');
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Expõe startApp globalmente — chamado pelo login.js após autenticação
window.startApp = async () => {
    const app = new App();
    window.app = app;
    await app.initialize();
};

// Tratamento de erros globais
window.addEventListener('error', (event) => {
    console.error('❌ Erro global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejeitada:', event.reason);
});

// Exporta App para testes
export default App;
