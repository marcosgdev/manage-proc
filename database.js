/**
 * Módulo de Banco de Dados
 * Gerencia todas as operações com Firebase Realtime Database
 */

import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue,
    push,
    query,
    orderByChild
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { DB_PATHS } from './config.js';

class DatabaseManager {
    constructor() {
        this.db = null;
        this.listeners = {};
    }

    /**
     * Inicializa o banco de dados
     */
    initialize(database) {
        this.db = database;
        console.log('Database inicializado com sucesso');
    }

    /**
     * Cria um novo registro
     */
    async create(path, data) {
        try {
            const newRef = push(ref(this.db, path));
            const dataWithId = {
                ...data,
                id: newRef.key,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await set(newRef, dataWithId);
            return { success: true, id: newRef.key, data: dataWithId };
        } catch (error) {
            console.error('Erro ao criar registro:', error);
            return { success: false, error };
        }
    }

    /**
     * Lê todos os registros de um caminho
     */
    async getAll(path) {
        try {
            const snapshot = await get(ref(this.db, path));
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Preserva o ID de cada registro
                const dataWithIds = Object.entries(data).map(([id, value]) => ({
                    ...value,
                    id
                }));
                return {
                    success: true,
                    data: dataWithIds
                };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('Erro ao buscar registros:', error);
            return { success: false, error };
        }
    }

    /**
     * Lê um registro específico por ID
     */
    async getById(path, id) {
        try {
            const snapshot = await get(ref(this.db, `${path}/${id}`));
            if (snapshot.exists()) {
                return { success: true, data: snapshot.val() };
            }
            return { success: false, error: 'Registro não encontrado' };
        } catch (error) {
            console.error('Erro ao buscar registro:', error);
            return { success: false, error };
        }
    }

    /**
     * Atualiza um registro existente
     */
    async update(path, id, data) {
        try {
            const updates = {
                ...data,
                updatedAt: new Date().toISOString()
            };
            await update(ref(this.db, `${path}/${id}`), updates);
            return { success: true };
        } catch (error) {
            console.error('Erro ao atualizar registro:', error);
            return { success: false, error };
        }
    }

    /**
     * Deleta um registro
     */
    async delete(path, id) {
        try {
            await remove(ref(this.db, `${path}/${id}`));
            return { success: true };
        } catch (error) {
            console.error('Erro ao deletar registro:', error);
            return { success: false, error };
        }
    }

    /**
     * Escuta mudanças em tempo real em um caminho
     */
    listen(path, callback) {
        this.removeListener(path);
        const dbRef = ref(this.db, path);
        const unsubscribe = onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Preserva o ID de cada registro
                const dataWithIds = Object.entries(data).map(([id, value]) => ({
                    ...value,
                    id
                }));
                callback(dataWithIds);
            } else {
                callback([]);
            }
        });

        this.listeners[path] = unsubscribe;
        return unsubscribe;
    }

    /**
     * Remove um listener
     */
    removeListener(path) {
        if (this.listeners[path]) {
            this.listeners[path]();
            delete this.listeners[path];
        }
    }

    /**
     * Busca com query personalizada
     */
    async query(path, orderBy, value) {
        try {
            const dbRef = ref(this.db, path);
            const q = query(dbRef, orderByChild(orderBy));
            const snapshot = await get(q);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                return { success: true, data: Object.values(data) };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('Erro ao executar query:', error);
            return { success: false, error };
        }
    }

    // ============ MÉTODOS ESPECÍFICOS PARA PROCESSOS ============

    /**
     * Cria um novo processo em andamento
     */
    async createProcessoAndamento(processo) {
        return await this.create(DB_PATHS.PROCESSOS_ANDAMENTO, processo);
    }

    /**
     * Busca todos os processos em andamento
     */
    async getProcessosAndamento() {
        return await this.getAll(DB_PATHS.PROCESSOS_ANDAMENTO);
    }

    /**
     * Atualiza um processo em andamento
     */
    async updateProcessoAndamento(id, updates) {
        return await this.update(DB_PATHS.PROCESSOS_ANDAMENTO, id, updates);
    }

    /**
     * Move processo de andamento para finalizado
     */
    async finalizarProcesso(id) {
        try {
            const resultado = await this.getById(DB_PATHS.PROCESSOS_ANDAMENTO, id);
            if (!resultado.success) {
                return { success: false, error: 'Processo não encontrado' };
            }

            const processo = resultado.data;
            const dataFinalizacao = new Date().toISOString().split('T')[0];

            const processoFinalizado = {
                ...processo,
                dataFinalizacao,
                diasCorridos: this.calcularDiasCorridos(processo.dataInicio, dataFinalizacao),
                diasUteis: this.calcularDiasUteis(processo.dataInicio, dataFinalizacao),
                finalizadoEm: new Date().toISOString()
            };

            await this.create(DB_PATHS.PROCESSOS_FINALIZADOS, processoFinalizado);
            await this.delete(DB_PATHS.PROCESSOS_ANDAMENTO, id);

            return { success: true };
        } catch (error) {
            console.error('Erro ao finalizar processo:', error);
            return { success: false, error };
        }
    }

    /**
     * Busca todos os processos finalizados
     */
    async getProcessosFinalizados() {
        return await this.getAll(DB_PATHS.PROCESSOS_FINALIZADOS);
    }

    /**
     * Deleta um processo em andamento
     */
    async deleteProcessoAndamento(id) {
        return await this.delete(DB_PATHS.PROCESSOS_ANDAMENTO, id);
    }

    /**
     * Deleta um processo finalizado
     */
    async deleteProcessoFinalizado(id) {
        return await this.delete(DB_PATHS.PROCESSOS_FINALIZADOS, id);
    }

    /**
     * Atualiza as datas de um processo finalizado e recalcula dias
     */
    async atualizarDatasProcessoFinalizado(id, dataInicio, dataFinalizacao) {
        try {
            const updates = {
                dataInicio,
                dataFinalizacao,
                diasCorridos: this.calcularDiasCorridos(dataInicio, dataFinalizacao),
                diasUteis: this.calcularDiasUteis(dataInicio, dataFinalizacao)
            };

            return await this.update(DB_PATHS.PROCESSOS_FINALIZADOS, id, updates);
        } catch (error) {
            console.error('Erro ao atualizar datas do processo:', error);
            return { success: false, error };
        }
    }

    // ============ MÉTODOS ESPECÍFICOS PARA FUNCIONÁRIOS ============

    /**
     * Cria um novo funcionário
     */
    async createFuncionario(funcionario) {
        return await this.create(DB_PATHS.FUNCIONARIOS, funcionario);
    }

    /**
     * Busca todos os funcionários
     */
    async getFuncionarios() {
        return await this.getAll(DB_PATHS.FUNCIONARIOS);
    }

    /**
     * Atualiza um funcionário
     */
    async updateFuncionario(id, updates) {
        return await this.update(DB_PATHS.FUNCIONARIOS, id, updates);
    }

    /**
     * Deleta um funcionário
     */
    async deleteFuncionario(id) {
        return await this.delete(DB_PATHS.FUNCIONARIOS, id);
    }

    // ============ MÉTODOS AUXILIARES ============

    /**
     * Calcula dias corridos entre duas datas
     */
    calcularDiasCorridos(dataInicio, dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const diffTime = Math.abs(fim - inicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Calcula dias úteis entre duas datas (excluindo sábados e domingos)
     */
    calcularDiasUteis(dataInicio, dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        let diasUteis = 0;
        const atual = new Date(inicio);

        while (atual <= fim) {
            const diaSemana = atual.getDay();
            // 0 = domingo, 6 = sábado
            if (diaSemana !== 0 && diaSemana !== 6) {
                diasUteis++;
            }
            atual.setDate(atual.getDate() + 1);
        }

        return diasUteis;
    }

    /**
     * Calcula dias para o prazo
     */
    calcularDiasParaPrazo(dataFinal) {
        if (!dataFinal) return null;
        const hoje = new Date();
        const prazo = new Date(dataFinal);
        const diffTime = prazo - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Filtra processos por data
     */
    filtrarPorPeriodo(processos, dias) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        
        return processos.filter(processo => {
            const dataProcesso = new Date(processo.dataInicio);
            return dataProcesso >= dataLimite;
        });
    }

    /**
     * Agrupa processos por campo
     */
    agruparPor(processos, campo) {
        return processos.reduce((acc, processo) => {
            const valor = processo[campo] || 'Não Informado';
            acc[valor] = (acc[valor] || 0) + 1;
            return acc;
        }, {});
    }
}

// Exporta uma instância única (Singleton)
const dbManager = new DatabaseManager();
export default dbManager;
