/**
 * Módulo de Autenticação
 * Gerencia login, signup, logout e controle de papel (gestor/usuario)
 */

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updatePassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { ref, get, set, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { DB_PATHS } from './config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.currentRole = null;
        this.db = null;
        this.auth = null;
        this.callbacks = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o gerenciador de auth.
     * Recebe o banco de dados (window.database) e o auth (window.auth).
     * Retorna Promise que resolve após o primeiro onAuthStateChanged.
     */
    initialize(db, auth) {
        this.db = db;
        this.auth = auth;

        return new Promise((resolve) => {
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.currentUser = user;
                    await this._ensureUserRecord(user);
                } else {
                    this.currentUser = null;
                    this.currentRole = null;
                }

                // Notifica callbacks registrados
                this.callbacks.forEach(cb => cb(this.currentUser));

                if (!this.isInitialized) {
                    this.isInitialized = true;
                    resolve(this.currentUser);
                }
            });
        });
    }

    /**
     * Garante que o registro usuarios/{uid} existe no banco.
     * Se não existe, cria com role baseado em se há outros usuários.
     */
    async _ensureUserRecord(user) {
        const snapshot = await get(ref(this.db, `${DB_PATHS.USUARIOS}/${user.uid}`));
        if (snapshot.exists()) {
            this.currentRole = snapshot.val().role || 'usuario';
        } else {
            // Usuário existe no Auth mas não no DB — cria registro
            const allUsers = await get(ref(this.db, DB_PATHS.USUARIOS));
            const role = allUsers.exists() ? 'usuario' : 'gestor';
            await set(ref(this.db, `${DB_PATHS.USUARIOS}/${user.uid}`), {
                email: user.email,
                nome: user.email.split('@')[0],
                role: role,
                criadoEm: new Date().toISOString()
            });
            this.currentRole = role;
        }
    }

    /**
     * Registra callback para mudanças de estado de auth
     */
    onAuthChange(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Login com email e senha
     */
    async login(email, senha) {
        try {
            await signInWithEmailAndPassword(this.auth, email, senha);
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Cadastro com email e senha.
     * Primeiro usuário registrado automaticamente vira gestor.
     */
    async signup(email, senha) {
        try {
            const { user } = await createUserWithEmailAndPassword(this.auth, email, senha);

            // Verifica se há outros usuários no banco
            const allUsers = await get(ref(this.db, DB_PATHS.USUARIOS));
            const role = allUsers.exists() ? 'usuario' : 'gestor';

            await set(ref(this.db, `${DB_PATHS.USUARIOS}/${user.uid}`), {
                email: email,
                nome: email.split('@')[0],
                role: role,
                criadoEm: new Date().toISOString()
            });

            this.currentUser = user;
            this.currentRole = role;

            return { success: true, role };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await signOut(this.auth);
            this.currentUser = null;
            this.currentRole = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Erro ao realizar logout' };
        }
    }

    /**
     * Retorna true se o usuário atual é gestor
     */
    isGestor() {
        return this.currentRole === 'gestor';
    }

    /**
     * Busca todos os usuários cadastrados
     */
    async getAllUsers() {
        try {
            const snapshot = await get(ref(this.db, DB_PATHS.USUARIOS));
            if (snapshot.exists()) {
                return Object.entries(snapshot.val()).map(([uid, data]) => ({
                    uid,
                    ...data
                }));
            }
            return [];
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    }

    /**
     * Atualiza o papel de um usuário (só gestor pode chamar)
     */
    async updateUserRole(uid, role) {
        if (!this.isGestor()) {
            return { success: false, error: 'Sem permissão' };
        }
        try {
            await update(ref(this.db, `${DB_PATHS.USUARIOS}/${uid}`), { role });
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Erro ao atualizar papel' };
        }
    }

    /**
     * Remove um usuário do banco de dados (só gestor pode chamar).
     * Nota: Remove apenas o registro do DB, não a conta no Firebase Auth.
     */
    async deleteUser(uid) {
        if (!this.isGestor()) {
            return { success: false, error: 'Sem permissão' };
        }
        if (uid === this.currentUser?.uid) {
            return { success: false, error: 'Você não pode excluir a si mesmo' };
        }
        try {
            await remove(ref(this.db, `${DB_PATHS.USUARIOS}/${uid}`));
            return { success: true };
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            return { success: false, error: 'Erro ao excluir usuário' };
        }
    }

    /**
     * Atualiza dados de um usuário (nome e senha)
     * Senha no Auth só pode ser alterada para o próprio usuário
     * Nota: Email no Auth não é alterado (requer verificação), apenas no DB para exibição
     */
    async updateUser(uid, dados) {
        if (!this.isGestor()) {
            return { success: false, error: 'Sem permissão' };
        }

        const isCurrentUser = uid === this.currentUser?.uid;

        try {
            // Atualiza senha no Firebase Auth (apenas para o próprio usuário)
            if (isCurrentUser && dados.senha) {
                await updatePassword(this.currentUser, dados.senha);
            }

            // Atualiza dados no banco de dados (nome e email para exibição)
            const updates = {};
            if (dados.nome !== undefined) updates.nome = dados.nome;
            if (dados.email !== undefined) updates.email = dados.email;

            await update(ref(this.db, `${DB_PATHS.USUARIOS}/${uid}`), updates);
            return { success: true };
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            const errorMsg = this.getErrorMessage(error.code) || 'Erro ao atualizar usuário';
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Traduz códigos de erro do Firebase para mensagens em PT-BR
     */
    getErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'Usuário não encontrado.',
            'auth/wrong-password': 'Senha incorreta.',
            'auth/invalid-credential': 'Email ou senha incorretos.',
            'auth/email-already-in-use': 'Este email já está cadastrado.',
            'auth/invalid-email': 'Email inválido.',
            'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
            'auth/operation-not-allowed': 'Operação não permitida.',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.'
        };
        return messages[code] || 'Erro de autenticação. Tente novamente.';
    }
}

// Singleton
const authManager = new AuthManager();
export default authManager;
