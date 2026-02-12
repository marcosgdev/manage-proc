/**
 * Modulo de Backup Automatico
 * Gerencia backups automaticos e manuais do Firebase Realtime Database
 * para o Firebase Storage
 */

import {
    ref as storageRef,
    uploadString,
    getDownloadURL,
    deleteObject,
    getMetadata
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

import {
    ref,
    get,
    set
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { BACKUP_PATHS, BACKUP_CONFIG } from './config.js';
import authManager from './auth.js';

class BackupManager {
    constructor() {
        this.storage = null;
        this.db = null;
        this.initialized = false;
    }

    /**
     * Inicializa o BackupManager com Firebase Storage e Database
     */
    initialize() {
        this.storage = window.storage;
        this.db = window.database;

        if (this.storage && this.db) {
            this.initialized = true;
            console.log('BackupManager inicializado com sucesso');
        } else {
            console.warn('BackupManager: Firebase Storage ou Database nao disponivel');
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
     * Formata bytes para leitura humana
     */
    _formatFileSize(bytes) {
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
     * Cria um backup completo
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

            // 2. Cria o snapshot JSON
            const snapshot = {
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

            const jsonString = JSON.stringify(snapshot, null, 2);

            // 3. Upload para Firebase Storage
            const fileName = `backup_${today}_${Date.now()}.json`;
            const fileRef = storageRef(this.storage, `${BACKUP_CONFIG.STORAGE_FOLDER}/${fileName}`);

            await uploadString(fileRef, jsonString, 'raw', {
                contentType: 'application/json',
                customMetadata: {
                    createdBy: userEmail,
                    date: today,
                    automatic: String(isAutomatic)
                }
            });

            // 4. Obtem URL de download e tamanho
            const downloadURL = await getDownloadURL(fileRef);
            const metadata = await getMetadata(fileRef);
            const fileSize = metadata.size;

            // 5. Salva metadata no Realtime Database
            const backupMeta = {
                fileName,
                date: today,
                createdAt: timestamp,
                createdBy: userEmail,
                automatic: isAutomatic,
                fileSize,
                downloadURL
            };

            const metaKey = fileName.replace('.json', '');
            await set(ref(this.db, `${BACKUP_PATHS.METADATA}/${metaKey}`), backupMeta);

            // Atualiza registro do ultimo backup
            await set(ref(this.db, BACKUP_PATHS.LAST_BACKUP), {
                date: today,
                createdAt: timestamp,
                createdBy: userEmail,
                fileName
            });

            // 6. Limpa backups antigos
            await this.cleanupOldBackups();

            console.log(`Backup criado com sucesso: ${fileName}`);
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
                    // Remove do Firebase Storage
                    try {
                        const fileRef = storageRef(
                            this.storage,
                            `${BACKUP_CONFIG.STORAGE_FOLDER}/${backup.fileName}`
                        );
                        await deleteObject(fileRef);
                    } catch (storageErr) {
                        console.warn(`Arquivo ja removido do Storage: ${backup.fileName}`);
                    }

                    // Remove metadata do Realtime Database
                    const metaKey = backup.fileName.replace('.json', '');
                    await set(ref(this.db, `${BACKUP_PATHS.METADATA}/${metaKey}`), null);

                    console.log(`Backup antigo removido: ${backup.fileName}`);
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
