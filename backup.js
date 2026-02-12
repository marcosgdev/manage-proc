/**
 * Modulo de Backup Automatico
 * Gerencia backups automaticos e manuais do Firebase Realtime Database
 * Armazena snapshots JSON diretamente no Realtime Database
 */

import {
    ref,
    get,
    set,
    remove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { BACKUP_PATHS, BACKUP_CONFIG } from './config.js';
import authManager from './auth.js';

class BackupManager {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    /**
     * Inicializa o BackupManager com Firebase Database
     */
    initialize() {
        this.db = window.database;

        if (this.db) {
            this.initialized = true;
            console.log('BackupManager inicializado com sucesso');
        } else {
            console.warn('BackupManager: Firebase Database nao disponivel');
        }
    }

    /**
     * Retorna a data de hoje no formato YYYY-MM-DD
     */
    _getTodayString() {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const dia = String(now.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    /**
     * Formata tamanho de string para leitura humana
     */
    _formatSize(str) {
        const bytes = new Blob([str]).size;
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Verifica se o backup automatico ja foi feito hoje
     */
    async hasBackupToday() {
        try {
            const snapshot = await get(ref(this.db, BACKUP_PATHS.LAST_BACKUP));
            if (snapshot.exists()) {
                const lastDate = snapshot.val().date;
                return lastDate === this._getTodayString();
            }
            return false;
        } catch (error) {
            console.error('Erro ao verificar ultimo backup:', error);
            return false;
        }
    }

    /**
     * Coleta todos os dados dos caminhos configurados
     * Usa get() raw para preservar a estrutura exata (chaves Firebase)
     */
    async collectAllData() {
        const data = {};

        for (const path of BACKUP_CONFIG.PATHS_TO_BACKUP) {
            try {
                const snapshot = await get(ref(this.db, path));
                data[path] = snapshot.exists() ? snapshot.val() : null;
            } catch (error) {
                console.error(`Erro ao coletar dados de ${path}:`, error);
                data[path] = null;
            }
        }

        return data;
    }

    /**
     * Cria um backup completo armazenado no Realtime Database
     * @param {boolean} isAutomatic - Se e um backup automatico ou manual
     */
    async createBackup(isAutomatic = false) {
        if (!this.initialized) {
            return { success: false, error: 'BackupManager nao inicializado' };
        }

        try {
            const today = this._getTodayString();
            const timestamp = new Date().toISOString();
            const userEmail = authManager.currentUser?.email || 'desconhecido';

            // 1. Coleta todos os dados
            const data = await this.collectAllData();

            // 2. Cria o snapshot
            const backupData = {
                metadata: {
                    createdAt: timestamp,
                    createdBy: userEmail,
                    date: today,
                    automatic: isAutomatic,
                    version: '1.0',
                    paths: BACKUP_CONFIG.PATHS_TO_BACKUP
                },
                data: data
            };

            // Calcula tamanho aproximado
            const jsonString = JSON.stringify(backupData);
            const size = this._formatSize(jsonString);

            // 3. Gera chave unica para o backup
            const backupKey = `backup_${today}_${Date.now()}`;

            // 4. Salva snapshot completo no Realtime Database
            await set(ref(this.db, `${BACKUP_PATHS.DATA}/${backupKey}`), backupData);

            // 5. Salva metadata resumido (para listagem rapida sem carregar dados completos)
            const backupMeta = {
                key: backupKey,
                date: today,
                createdAt: timestamp,
                createdBy: userEmail,
                automatic: isAutomatic,
                size: size
            };

            await set(ref(this.db, `${BACKUP_PATHS.METADATA}/${backupKey}`), backupMeta);

            // 6. Atualiza registro do ultimo backup
            await set(ref(this.db, BACKUP_PATHS.LAST_BACKUP), {
                date: today,
                createdAt: timestamp,
                createdBy: userEmail,
                key: backupKey
            });

            // 7. Limpa backups antigos
            await this.cleanupOldBackups();

            console.log(`Backup criado com sucesso: ${backupKey}`);
            return { success: true, data: backupMeta };

        } catch (error) {
            console.error('Erro ao criar backup:', error);
            return { success: false, error: error.message || 'Erro ao criar backup' };
        }
    }

    /**
     * Executa backup automatico se necessario (apenas para gestor, 1x ao dia)
     */
    async autoBackupIfNeeded() {
        if (!this.initialized) return;
        if (!authManager.isGestor()) return;

        const alreadyDone = await this.hasBackupToday();
        if (alreadyDone) {
            console.log('Backup automatico ja realizado hoje');
            return;
        }

        console.log('Iniciando backup automatico diario...');
        const result = await this.createBackup(true);

        if (result.success) {
            console.log('Backup automatico concluido com sucesso');
        } else {
            console.error('Falha no backup automatico:', result.error);
        }
    }

    /**
     * Lista todos os backups disponiveis a partir dos metadados no DB
     */
    async listBackups() {
        try {
            const snapshot = await get(ref(this.db, BACKUP_PATHS.METADATA));
            if (!snapshot.exists()) return [];

            const backups = [];
            const data = snapshot.val();

            for (const [key, value] of Object.entries(data)) {
                backups.push(value);
            }

            // Ordena por data decrescente (mais recente primeiro)
            backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return backups;

        } catch (error) {
            console.error('Erro ao listar backups:', error);
            return [];
        }
    }

    /**
     * Retorna informacoes do ultimo backup
     */
    async getLastBackupInfo() {
        try {
            const snapshot = await get(ref(this.db, BACKUP_PATHS.LAST_BACKUP));
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (error) {
            console.error('Erro ao obter info do ultimo backup:', error);
            return null;
        }
    }

    /**
     * Baixa um backup como arquivo JSON
     */
    async downloadBackup(backupKey) {
        try {
            const snapshot = await get(ref(this.db, `${BACKUP_PATHS.DATA}/${backupKey}`));
            if (!snapshot.exists()) {
                console.error('Backup nao encontrado:', backupKey);
                return;
            }

            const backupData = snapshot.val();
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${backupKey}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao baixar backup:', error);
        }
    }

    /**
     * Remove backups com mais de RETENTION_DAYS dias
     */
    async cleanupOldBackups() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - BACKUP_CONFIG.RETENTION_DAYS);
            const cutoffString = cutoffDate.toISOString();

            const backups = await this.listBackups();

            for (const backup of backups) {
                if (backup.createdAt < cutoffString) {
                    // Remove dados do backup
                    await remove(ref(this.db, `${BACKUP_PATHS.DATA}/${backup.key}`));

                    // Remove metadata
                    await remove(ref(this.db, `${BACKUP_PATHS.METADATA}/${backup.key}`));

                    console.log(`Backup antigo removido: ${backup.key}`);
                }
            }
        } catch (error) {
            console.error('Erro na limpeza de backups antigos:', error);
        }
    }
}

// Singleton
const backupManager = new BackupManager();
export default backupManager;
