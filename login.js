/**
 * Módulo de Tela de Login
 * Controla o overlay de login/cadastro e a transição para o app
 */

import authManager from './auth.js';

let appStarted = false;

/**
 * Tenta iniciar o app — chama window.startApp() apenas uma vez
 */
async function tryStartApp() {
    if (appStarted) return;
    if (!window.startApp) return;
    appStarted = true;

    // Oculta overlay e inicia o app
    document.getElementById('loginOverlay')?.classList.add('hidden');
    await window.startApp();
}

/**
 * Mostra mensagem de erro no formulário
 */
function showError(message) {
    const el = document.getElementById('loginError');
    if (el) {
        el.textContent = message;
        el.classList.add('visible');
    }
}

/**
 * Limpa mensagem de erro
 */
function clearError() {
    const el = document.getElementById('loginError');
    if (el) {
        el.textContent = '';
        el.classList.remove('visible');
    }
}

/**
 * Alterna entre modo Login e Cadastro
 */
function setMode(mode) {
    const formLogin = document.getElementById('formLogin');
    const formSignup = document.getElementById('formSignup');
    const title = document.getElementById('loginTitle');
    const linkCadastro = document.getElementById('linkCadastro');
    const linkLogin = document.getElementById('linkLogin');

    clearError();

    if (mode === 'login') {
        formLogin.style.display = 'block';
        formSignup.style.display = 'none';
        title.textContent = 'Faça seu Login';
        if (linkCadastro) linkCadastro.parentElement.innerHTML =
            'Não tem conta? <a id="linkCadastro">Cadastre-se</a>';
        // Re-bind após innerHTML
        document.getElementById('linkCadastro')?.addEventListener('click', () => setMode('signup'));
    } else {
        formLogin.style.display = 'none';
        formSignup.style.display = 'block';
        title.textContent = 'Criar Conta';
        if (linkLogin || linkCadastro) {
            const container = (linkLogin || linkCadastro).parentElement;
            container.innerHTML = 'Já tem conta? <a id="linkLogin">Faça login</a>';
            document.getElementById('linkLogin')?.addEventListener('click', () => setMode('login'));
        }
    }
}

/**
 * Monta os event listeners dos formulários
 */
function setupForms() {
    // Formulário de Login
    document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();
        const email = document.getElementById('loginEmail').value.trim();
        const senha = document.getElementById('loginSenha').value;

        const resultado = await authManager.login(email, senha);
        if (!resultado.success) {
            showError(resultado.error);
        }
        // Se sucesso, onAuthStateChanged dispara e tryStartApp é chamado pelo callback
    });

    // Formulário de Cadastro
    document.getElementById('formSignup')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();
        const email = document.getElementById('signupEmail').value.trim();
        const senha = document.getElementById('signupSenha').value;

        const resultado = await authManager.signup(email, senha);
        if (!resultado.success) {
            showError(resultado.error);
        }
        // Se sucesso, onAuthStateChanged dispara e tryStartApp é chamado pelo callback
    });

    // Link para trocar de modo
    document.getElementById('linkCadastro')?.addEventListener('click', () => setMode('signup'));
}

/**
 * Poleia até que Firebase esteja disponível e inicia o fluxo de auth
 */
const waitForFirebase = setInterval(async () => {
    if (window.database && window.auth) {
        clearInterval(waitForFirebase);

        // Configura formulários
        setupForms();

        // Registra callback: quando auth resolver, tenta iniciar app
        authManager.onAuthChange((user) => {
            if (user) {
                tryStartApp();
            }
        });

        // Inicializa auth (dispara onAuthStateChanged uma vez imediatamente)
        await authManager.initialize(window.database, window.auth);
    }
}, 100);

// Timeout: se Firebase não aparecer em 10s, mostra erro
setTimeout(() => {
    if (!window.database || !window.auth) {
        clearInterval(waitForFirebase);
        document.getElementById('loginOverlay')?.remove();
        document.body.innerHTML = `
            <div style="
                display:flex; flex-direction:column; align-items:center;
                justify-content:center; height:100vh; padding:20px;
                background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                color:white; font-family:'Inter',sans-serif; text-align:center;">
                <div style="background:white;color:#1e293b;padding:40px;border-radius:20px;
                    box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:500px;">
                    <div style="font-size:4rem;margin-bottom:20px;">🔥</div>
                    <h1 style="margin-bottom:15px;">Firebase Não Configurado</h1>
                    <p style="color:#64748b;">Verifique as credenciais no arquivo index.html.</p>
                    <button onclick="location.reload()" style="margin-top:20px;background:linear-gradient(135deg,#2563eb,#1e40af);
                        color:white;border:none;padding:12px 30px;border-radius:10px;font-weight:600;cursor:pointer;font-size:1rem;">
                        🔄 Recarregar
                    </button>
                </div>
            </div>`;
    }
}, 10000);
