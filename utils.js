/**
 * Módulo de Utilidades
 * Funções auxiliares para formatação, validação e manipulação de dados
 */

/**
 * Formata data no padrão brasileiro (DD/MM/YYYY)
 * Trata corretamente datas no formato YYYY-MM-DD sem problemas de timezone
 */
export function formatarData(data) {
    if (!data) return '-';

    // Se for string no formato YYYY-MM-DD, faz parse manual para evitar timezone
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // Se for string ISO com T (datetime), extrai apenas a data
    if (typeof data === 'string' && data.includes('T')) {
        const [dataParte] = data.split('T');
        const [ano, mes, dia] = dataParte.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    // Fallback para outros formatos
    const d = new Date(data);
    if (isNaN(d.getTime())) return '-';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

/**
 * Formata data e hora no padrão brasileiro
 */
export function formatarDataHora(data) {
    if (!data) return '-';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

/**
 * Converte data ISO para formato de input date (YYYY-MM-DD)
 * Trata corretamente sem problemas de timezone
 */
export function isoParaInputDate(isoDate) {
    if (!isoDate) return '';

    // Se já estiver no formato YYYY-MM-DD, retorna diretamente
    if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return isoDate;
    }

    // Se for ISO datetime, extrai apenas a parte da data
    if (typeof isoDate === 'string' && isoDate.includes('T')) {
        return isoDate.split('T')[0];
    }

    // Fallback
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/**
 * Calcula dias entre duas datas
 * Trata corretamente datas no formato YYYY-MM-DD sem problemas de timezone
 */
export function calcularDias(dataInicio, dataFim) {
    const parseData = (data) => {
        if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
            const [ano, mes, dia] = data.split('-').map(Number);
            return new Date(ano, mes - 1, dia);
        }
        if (typeof data === 'string' && data.includes('T')) {
            const [dataParte] = data.split('T');
            const [ano, mes, dia] = dataParte.split('-').map(Number);
            return new Date(ano, mes - 1, dia);
        }
        return new Date(data);
    };

    const inicio = parseData(dataInicio);
    const fim = parseData(dataFim);

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;

    const diffTime = Math.abs(fim - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Calcula dias para o prazo (negativo se vencido)
 * Trata corretamente datas no formato YYYY-MM-DD sem problemas de timezone
 */
export function diasParaPrazo(dataFinal) {
    if (!dataFinal) return null;

    // Data de hoje (meia-noite local)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let prazo;

    // Se for string no formato YYYY-MM-DD, cria data local manualmente
    if (typeof dataFinal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
        const [ano, mes, dia] = dataFinal.split('-').map(Number);
        prazo = new Date(ano, mes - 1, dia); // mes é 0-indexed
    } else if (typeof dataFinal === 'string' && dataFinal.includes('T')) {
        // Se for ISO datetime, extrai apenas a data
        const [dataParte] = dataFinal.split('T');
        const [ano, mes, dia] = dataParte.split('-').map(Number);
        prazo = new Date(ano, mes - 1, dia);
    } else {
        prazo = new Date(dataFinal);
        prazo.setHours(0, 0, 0, 0);
    }

    if (isNaN(prazo.getTime())) return null;

    const diffTime = prazo - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Formata exibição de prazo
 */
export function formatarPrazo(dias) {
    if (dias === null) return 'Sem prazo';
    if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`;
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Vence amanhã';
    return `${dias} dias`;
}

/**
 * Obtém classe CSS baseada no prazo
 */
export function getClassePrazo(dias) {
    if (dias === null) return 'badge-info';
    if (dias < 0) return 'badge-danger';
    if (dias <= 5) return 'badge-warning';
    return 'badge-success';
}

/**
 * Valida email
 */
export function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida URL
 */
export function validarUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitiza string (remove caracteres especiais)
 */
export function sanitizar(str) {
    return str.replace(/[^a-zA-Z0-9\s]/g, '');
}

/**
 * Trunca texto com elipse
 */
export function truncar(texto, tamanho = 50) {
    if (!texto) return '';
    if (texto.length <= tamanho) return texto;
    return texto.substring(0, tamanho) + '...';
}

/**
 * Capitaliza primeira letra
 */
export function capitalizar(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Gera iniciais do nome
 */
export function gerarIniciais(nome) {
    if (!nome) return '?';
    const palavras = nome.trim().split(' ');
    if (palavras.length === 1) {
        return palavras[0].substring(0, 2).toUpperCase();
    }
    return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

/**
 * Gera cor baseada em string (para avatares)
 */
export function gerarCorPorString(str) {
    const cores = [
        '#2563eb', '#7c3aed', '#06b6d4', '#10b981',
        '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
        '#f97316', '#14b8a6'
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % cores.length;
    return cores[index];
}

/**
 * Debounce para otimizar eventos
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Mostra/esconde loading overlay
 */
export function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

export function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Mostra notificação toast
 */
export function showNotification(message, type = 'info') {
    // Remove notificações anteriores
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) {
        oldToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Adiciona estilos para notificações toast
 */
export function injectToastStyles() {
    if (document.getElementById('toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .toast-notification {
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            opacity: 0;
            transform: translateX(400px);
            transition: all 0.3s ease;
        }
        
        .toast-notification.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast-info {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        
        .toast-success {
            background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .toast-error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        .toast-warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Exporta dados para CSV
 */
export function exportarParaCSV(dados, nomeArquivo) {
    if (!dados || dados.length === 0) {
        showNotification('Não há dados para exportar', 'warning');
        return;
    }

    const cabecalhos = Object.keys(dados[0]);
    const linhas = dados.map(obj => 
        cabecalhos.map(campo => {
            const valor = obj[campo] || '';
            return `"${String(valor).replace(/"/g, '""')}"`;
        }).join(',')
    );

    const csv = [
        cabecalhos.join(','),
        ...linhas
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${nomeArquivo}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Arquivo exportado com sucesso!', 'success');
}

/**
 * Filtra array por texto de busca
 */
export function filtrarPorTexto(array, texto, campos) {
    if (!texto) return array;
    
    const textoLower = texto.toLowerCase();
    return array.filter(item => {
        return campos.some(campo => {
            const valor = item[campo];
            return valor && String(valor).toLowerCase().includes(textoLower);
        });
    });
}

/**
 * Ordena array por campo
 */
export function ordenarPor(array, campo, ordem = 'asc') {
    return [...array].sort((a, b) => {
        const valorA = a[campo];
        const valorB = b[campo];
        
        if (valorA === valorB) return 0;
        
        if (ordem === 'asc') {
            return valorA > valorB ? 1 : -1;
        } else {
            return valorA < valorB ? 1 : -1;
        }
    });
}

/**
 * Agrupa array por campo
 */
export function agruparPor(array, campo) {
    return array.reduce((acc, item) => {
        const chave = item[campo] || 'Não Informado';
        if (!acc[chave]) {
            acc[chave] = [];
        }
        acc[chave].push(item);
        return acc;
    }, {});
}

/**
 * Calcula média de um campo numérico
 */
export function calcularMedia(array, campo) {
    if (!array || array.length === 0) return 0;
    
    const soma = array.reduce((acc, item) => {
        const valor = parseFloat(item[campo]) || 0;
        return acc + valor;
    }, 0);
    
    return Math.round(soma / array.length);
}

/**
 * Conta ocorrências de valores em um campo
 */
export function contarOcorrencias(array, campo) {
    return array.reduce((acc, item) => {
        const valor = item[campo] || 'Não Informado';
        acc[valor] = (acc[valor] || 0) + 1;
        return acc;
    }, {});
}

/**
 * Inicializa estilos toast ao carregar
 */
injectToastStyles();

export default {
    formatarData,
    formatarDataHora,
    isoParaInputDate,
    calcularDias,
    diasParaPrazo,
    formatarPrazo,
    getClassePrazo,
    validarEmail,
    validarUrl,
    sanitizar,
    truncar,
    capitalizar,
    gerarIniciais,
    gerarCorPorString,
    debounce,
    showLoading,
    hideLoading,
    showNotification,
    exportarParaCSV,
    filtrarPorTexto,
    ordenarPor,
    agruparPor,
    calcularMedia,
    contarOcorrencias
};
