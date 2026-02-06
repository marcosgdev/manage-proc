/**
 * Script de Seed — popula Firebase com dados de teste
 * Exporta a função runSeed() para ser chamada pela página seed.html
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------
const USUARIOS = [
    { email: 'marcosgalvao.adv@gmail.com', nome: 'Marcos Galvão', role: 'gestor', senha: 'Marcos@300' },
    { email: 'usuario1@empresa.com',       nome: 'Ana Oliveira',  role: 'usuario' },
    { email: 'usuario2@empresa.com',       nome: 'Pedro Santos',  role: 'usuario' }
];

const SENHA_PADRAO = 'Senha123!';

const FUNCIONARIOS = [
    { nome: 'Ana Oliveira',     contato: 'ana.oliveira@empresa.com',     vinculo: 'Servidor'      },
    { nome: 'Pedro Santos',     contato: 'pedro.santos@empresa.com',    vinculo: 'Colaborador'   },
    { nome: 'Mariana Costa',    contato: 'mariana.costa@empresa.com',   vinculo: 'Estagiário'    },
    { nome: 'Lucas Ferreira',   contato: 'lucas.ferreira@empresa.com',  vinculo: 'Terceirizado'  },
    { nome: 'Fernanda Almeida', contato: 'fernanda.almeida@empresa.com', vinculo: 'Servidor'     }
];

const PROCESSOS_ANDAMENTO = [
    {
        sigadoc: '20240187',
        link: '',
        dataInicio: '2025-11-10',
        dataFinal: '2026-03-15',
        tipoCotacao: 'LICITAÇÃO',
        tipoObjeto: 'SERVIÇO',
        descricao: 'Contratação de serviços de manutenção predial para o bloco administrativo central.',
        responsavel: 'Ana Oliveira',
        grauComplexidade: 'ALTO',
        quantidadeItens: 12,
        unidadeExecutora: 'Diretoria de Gestão',
        status: 'Em Andamento'
    },
    {
        sigadoc: '20240234',
        link: '',
        dataInicio: '2025-11-22',
        dataFinal: '2026-02-28',
        tipoCotacao: 'DISPENSA',
        tipoObjeto: 'MATERIAL',
        descricao: 'Aquisição de materiais de expediente para todos os departamentos.',
        responsavel: 'Pedro Santos',
        grauComplexidade: 'BAIXO',
        quantidadeItens: 45,
        unidadeExecutora: 'Setor de Compras',
        status: 'Aguardando Aprovação'
    },
    {
        sigadoc: '20240301',
        link: '',
        dataInicio: '2025-12-05',
        dataFinal: '2026-04-10',
        tipoCotacao: 'LICITAÇÃO',
        tipoObjeto: 'OBRA',
        descricao: 'Reforma e ampliação da sala de reuniões do bloco B.',
        responsavel: 'Mariana Costa',
        grauComplexidade: 'MUITO ALTO',
        quantidadeItens: 8,
        unidadeExecutora: 'Engenharia Civil',
        status: 'Em Elaboração'
    },
    {
        sigadoc: '20240378',
        link: '',
        dataInicio: '2025-12-18',
        dataFinal: '2026-05-02',
        tipoCotacao: 'AJUSTES CONTRATUAIS',
        tipoObjeto: 'EQUIPAMENTO',
        descricao: 'Reajuste contratual para fornecimento de equipamentos de informática.',
        responsavel: 'Lucas Ferreira',
        grauComplexidade: 'MÉDIO',
        quantidadeItens: 20,
        unidadeExecutora: 'TI — Tecnologia da Informação',
        status: 'Validação Orçamento'
    },
    {
        sigadoc: '20240412',
        link: '',
        dataInicio: '2026-01-08',
        dataFinal: '2026-03-30',
        tipoCotacao: 'DISPENSA',
        tipoObjeto: 'SERVIÇO',
        descricao: 'Contratação de consultoria jurídica para análise de contratos pendentes.',
        responsavel: 'Fernanda Almeida',
        grauComplexidade: 'ALTO',
        quantidadeItens: 3,
        unidadeExecutora: 'Diretoria Jurídica',
        status: 'Em Análise Jurídica'
    },
    {
        sigadoc: '20240456',
        link: '',
        dataInicio: '2026-01-20',
        dataFinal: '2026-04-25',
        tipoCotacao: 'LEVANTAMENTO',
        tipoObjeto: 'MATERIAL',
        descricao: 'Levantamento e aquisição de materiais para renovação do laboratório.',
        responsavel: 'Ana Oliveira',
        grauComplexidade: 'MÉDIO',
        quantidadeItens: 30,
        unidadeExecutora: 'Laboratório Central',
        status: 'Em Andamento'
    }
];

const PROCESSOS_FINALIZADOS = [
    {
        sigadoc: '20231892',
        link: '',
        dataInicio: '2025-07-02',
        dataFinal: '2025-09-10',
        dataEntrega: '2025-08-29',
        diasDecorridos: 58,
        tipoCotacao: 'LICITAÇÃO',
        tipoObjeto: 'SERVIÇO',
        descricao: 'Contratação de serviços de limpeza para instalações administrativas.',
        responsavel: 'Pedro Santos',
        grauComplexidade: 'BAIXO',
        quantidadeItens: 5,
        unidadeExecutora: 'Facilities Management',
        status: 'Finalizado',
        finalizadoEm: '2025-08-29'
    },
    {
        sigadoc: '20231945',
        link: '',
        dataInicio: '2025-07-15',
        dataFinal: '2025-10-05',
        dataEntrega: '2025-09-28',
        diasDecorridos: 75,
        tipoCotacao: 'DISPENSA',
        tipoObjeto: 'EQUIPAMENTO',
        descricao: 'Aquisição de equipamentos de segurança para o estacionamento.',
        responsavel: 'Ana Oliveira',
        grauComplexidade: 'MÉDIO',
        quantidadeItens: 10,
        unidadeExecutora: 'Segurança Patrimonial',
        status: 'Finalizado',
        finalizadoEm: '2025-09-28'
    },
    {
        sigadoc: '20232011',
        link: '',
        dataInicio: '2025-08-01',
        dataFinal: '2025-11-15',
        dataEntrega: '2025-10-22',
        diasDecorridos: 82,
        tipoCotacao: 'LICITAÇÃO',
        tipoObjeto: 'OBRA',
        descricao: 'Reforma dos banheiros do bloco A — obras hidráulicas e elétricas.',
        responsavel: 'Lucas Ferreira',
        grauComplexidade: 'ALTO',
        quantidadeItens: 15,
        unidadeExecutora: 'Engenharia Civil',
        status: 'Finalizado',
        finalizadoEm: '2025-10-22'
    },
    {
        sigadoc: '20232078',
        link: '',
        dataInicio: '2025-08-20',
        dataFinal: '2025-11-30',
        dataEntrega: '2025-11-14',
        diasDecorridos: 86,
        tipoCotacao: 'AJUSTES CONTRATUAIS',
        tipoObjeto: 'SERVIÇO',
        descricao: 'Reajuste do contrato de fornecimento de café e lanches para o refeitório.',
        responsavel: 'Mariana Costa',
        grauComplexidade: 'BAIXO',
        quantidadeItens: 2,
        unidadeExecutora: 'Administração Geral',
        status: 'Finalizado',
        finalizadoEm: '2025-11-14'
    }
];

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------
function log(msg) {
    const el = document.getElementById('seedLog');
    if (el) {
        el.textContent += msg + '\n';
        el.scrollTop = el.scrollHeight;
    }
    console.log('[SEED]', msg);
}

// ---------------------------------------------------------------------------
// Execução principal
// ---------------------------------------------------------------------------
export async function runSeed(firebaseConfig) {
    const app = initializeApp(firebaseConfig, 'seed-' + Date.now());
    const db  = getDatabase(app);
    const auth = getAuth(app);

    // 1. Sign out para garantir estado limpo
    await signOut(auth);
    log('✓ Sessão limpa.');

    // 2. Criar usuários Auth + registros no Realtime Database
    log('--- Criando usuários Auth ---');
    for (const u of USUARIOS) {
        try {
            const cred = await createUserWithEmailAndPassword(auth, u.email, u.senha || SENHA_PADRAO);
            const uid = cred.user.uid;
            await set(ref(db, `usuarios/${uid}`), {
                email: u.email,
                nome: u.nome,
                role: u.role,
                criadoEm: new Date().toISOString()
            });
            log(`✓ Usuário criado: ${u.email} (${u.role})`);
            await signOut(auth);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                log(`⚠ Usuário já existe: ${u.email}`);
            } else {
                log(`✗ Erro ao criar ${u.email}: ${err.message}`);
            }
        }
    }

    // 3. Funcionários
    log('--- Criando funcionários ---');
    for (const f of FUNCIONARIOS) {
        await push(ref(db, 'funcionarios'), f);
        log(`✓ Funcionário: ${f.nome}`);
    }

    // 4. Processos em andamento
    log('--- Criando processos em andamento ---');
    for (const p of PROCESSOS_ANDAMENTO) {
        await push(ref(db, 'processosAndamento'), p);
        log(`✓ Processo andamento: ${p.sigadoc}`);
    }

    // 5. Processos finalizados
    log('--- Criando processos finalizados ---');
    for (const p of PROCESSOS_FINALIZADOS) {
        await push(ref(db, 'processosFinalizados'), p);
        log(`✓ Processo finalizado: ${p.sigadoc}`);
    }

    log('');
    log('=== Seed concluído com sucesso! ===');
}
