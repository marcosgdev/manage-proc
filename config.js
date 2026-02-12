/**
 * Configuração do Firebase
 * Módulo responsável pela inicialização e configuração do Firebase
 */

// Configuração do Firebase (SUBSTITUA COM SUAS CREDENCIAIS)
export const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Estrutura de dados no Firebase Realtime Database
export const DB_PATHS = {
    PROCESSOS_ANDAMENTO: 'processosAndamento',
    PROCESSOS_FINALIZADOS: 'processosFinalizados',
    FUNCIONARIOS: 'funcionarios',
    LISTAS_VALIDACAO: 'listasValidacao',
    USUARIOS: 'usuarios'
};

// Opções de lista para validação
export const OPCOES = {
    TIPO_OBJETO: ['SERVIÇO', 'MATERIAL', 'OBRA', 'EQUIPAMENTO'],
    TIPO_COTACAO: [
        'DISPENSA DE LICITAÇÃO',
        'LICITAÇÃO',
        'AJUSTES CONTRATUAIS',
        'LEVANTAMENTO DE MERCADO'
    ],
    GRAU_COMPLEXIDADE: ['BAIXO', 'MÉDIO', 'ALTO', 'MUITO ALTO'],
    VINCULO: ['Colaborador', 'Servidor', 'Estagiário', 'Terceirizado'],
    STATUS: [
        'Em Elaboração',
        'Aguardando Aprovação',
        'Validação Orçamento - SEPLAN',
        'Em Análise Jurídica',
        'Publicado',
        'Em Andamento',
        'Concluído',
        'Cancelado'
    ],
    UNIDADE_EXECUTORA: [
        'Coordenadoria Militar',
        'Departamento de Comunicação',
        'Secretaria de Administração',
        'Secretaria de Engenharia e Arquitetura',
        'Secretaria de Gestão de Pessoas',
        'Secretaria de Tecnologia da Informação e Comunicação',
        'Secretaria de Planejamento, Coordenação e Finanças',
        'Escola Judicial do Poder Judiciário do Estado do Pará'
    ]
};

// Configuração da OpenAI (para recursos de IA)
// ATENÇÃO: Em produção, use uma função serverless para proteger a API key
export const OPENAI_CONFIG = {
    apiKey: '', // Configure sua API key aqui ou via localStorage
    model: 'gpt-4o-mini' // Modelo econômico e rápido
};

// Configuração do EmailJS (para notificações por email)
// Crie uma conta gratuita em: https://www.emailjs.com/
// Usa apenas 1 template universal (compatível com plano gratuito - limite de 2 templates)
export const EMAIL_CONFIG = {
    serviceId: '', // ID do serviço de email (ex: 'service_xxxxx')
    publicKey: '', // Chave pública do EmailJS (ex: 'user_xxxxx')
    templateId: '' // Template ID universal (1 template para todas as notificações)
};

// Configuração de Backup Automático
export const BACKUP_PATHS = {
    METADATA: 'backups/metadata',
    LAST_BACKUP: 'backups/lastBackup'
};

export const BACKUP_CONFIG = {
    RETENTION_DAYS: 30,
    STORAGE_FOLDER: 'backups',
    PATHS_TO_BACKUP: [
        'processosAndamento',
        'processosFinalizados',
        'funcionarios',
        'usuarios'
    ]
};

// Cores para gráficos (mesma paleta do projeto)
export const CHART_COLORS = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
    teal: '#14b8a6'
};

// Configuração padrão dos gráficos Chart.js
export const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 15,
                font: {
                    family: 'Inter',
                    size: 12
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 12,
            titleFont: {
                family: 'Inter',
                size: 14,
                weight: 'bold'
            },
            bodyFont: {
                family: 'Inter',
                size: 13
            },
            cornerRadius: 8
        }
    }
};

// Mensagens do sistema
export const MESSAGES = {
    SUCCESS: {
        SAVE: 'Dados salvos com sucesso! ✅',
        DELETE: 'Item excluído com sucesso! ✅',
        UPDATE: 'Dados atualizados com sucesso! ✅'
    },
    ERROR: {
        SAVE: 'Erro ao salvar dados. Tente novamente. ❌',
        DELETE: 'Erro ao excluir item. Tente novamente. ❌',
        UPDATE: 'Erro ao atualizar dados. Tente novamente. ❌',
        LOAD: 'Erro ao carregar dados. Tente novamente. ❌',
        NETWORK: 'Erro de conexão. Verifique sua internet. 🌐'
    },
    CONFIRM: {
        DELETE: 'Tem certeza que deseja excluir este item?'
    }
};

export default {
    firebaseConfig,
    DB_PATHS,
    OPCOES,
    BACKUP_PATHS,
    BACKUP_CONFIG,
    CHART_COLORS,
    CHART_OPTIONS,
    MESSAGES
};
