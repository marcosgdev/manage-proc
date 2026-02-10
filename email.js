/**
 * Módulo de Email
 * Gerencia envio de notificações por email usando EmailJS
 * Envia emails apenas para o responsável do processo (membro da equipe)
 */

import { EMAIL_CONFIG, DB_PATHS } from './config.js';
import dbManager from './database.js';
import { formatarData, diasParaPrazo } from './utils.js';

class EmailManager {
    constructor() {
        this.initialized = false;
        this.serviceId = null;
        this.templateId = null;
        this.publicKey = null;
    }

    /**
     * Inicializa o EmailJS
     */
    async initialize() {
        this.serviceId = localStorage.getItem('emailjs_service_id') || EMAIL_CONFIG.serviceId;
        this.publicKey = localStorage.getItem('emailjs_public_key') || EMAIL_CONFIG.publicKey;
        this.templateId = localStorage.getItem('emailjs_template_id') || EMAIL_CONFIG.templateId;

        if (this.isConfigured() && window.emailjs) {
            emailjs.init(this.publicKey);
            this.initialized = true;
            console.log('✅ EmailJS inicializado com sucesso');
        }
    }

    /**
     * Verifica se o serviço está configurado
     */
    isConfigured() {
        return this.serviceId && this.publicKey && this.templateId;
    }

    /**
     * Busca o email do responsável pelo nome
     * @param {string} nomeResponsavel - Nome do responsável (membro da equipe)
     * @returns {string|null} Email do responsável ou null se não encontrado
     */
    async getEmailResponsavel(nomeResponsavel) {
        if (!nomeResponsavel) return null;

        try {
            const resultado = await dbManager.getAll(DB_PATHS.FUNCIONARIOS);
            if (!resultado.success || !resultado.data) return null;

            // Busca o funcionário pelo nome
            const funcionario = resultado.data.find(f =>
                f.nome && f.nome.toLowerCase() === nomeResponsavel.toLowerCase()
            );

            return funcionario?.contato || null;
        } catch (error) {
            console.error('Erro ao buscar email do responsável:', error);
            return null;
        }
    }

    /**
     * Envia email usando EmailJS
     */
    async enviarEmail(params, toEmail) {
        if (!this.initialized || !this.isConfigured()) {
            console.warn('EmailJS não configurado. Email não enviado.');
            return { success: false, error: 'Serviço de email não configurado' };
        }

        if (!toEmail) {
            console.warn('Destinatário não encontrado. Email não enviado.');
            return { success: false, error: 'Destinatário não encontrado' };
        }

        try {
            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                {
                    ...params,
                    to_email: toEmail,
                    reply_to: 'noreply@gestaoprocessual.com'
                }
            );

            console.log('✅ Email enviado com sucesso para:', toEmail);
            return { success: true, response };
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
            return { success: false, error: error.text || error.message };
        }
    }

    /**
     * Notifica sobre novo processo criado
     * Envia para o responsável assinalado no processo
     */
    async notificarNovoProcesso(processo) {
        const emailResponsavel = await this.getEmailResponsavel(processo.responsavel);
        if (!emailResponsavel) {
            console.warn('Email do responsável não encontrado para:', processo.responsavel);
            return { success: false, error: 'Email do responsável não encontrado' };
        }

        const params = {
            tipo_notificacao: '📋 NOVO PROCESSO',
            assunto: `Novo Processo Atribuído: ${processo.sigadoc}`,
            mensagem_principal: `Você foi designado como responsável por um novo processo.`,
            numero_processo: processo.sigadoc,
            descricao: processo.descricao || '-',
            tipo_cotacao: processo.tipoCotacao || '-',
            responsavel: processo.responsavel || '-',
            data_info: `Início: ${formatarData(processo.dataInicio)}`,
            prazo_info: processo.dataFinal ? `Prazo: ${formatarData(processo.dataFinal)}` : '',
            unidade: processo.unidadeExecutora || '-',
            info_extra: `Complexidade: ${processo.grauComplexidade || '-'}`,
            link_sei: processo.link || '',
            link_sistema: window.location.origin
        };

        return await this.enviarEmail(params, emailResponsavel);
    }

    /**
     * Notifica sobre processo finalizado
     * Envia para o responsável do processo
     */
    async notificarProcessoFinalizado(processo) {
        const emailResponsavel = await this.getEmailResponsavel(processo.responsavel);
        if (!emailResponsavel) {
            console.warn('Email do responsável não encontrado para:', processo.responsavel);
            return { success: false, error: 'Email do responsável não encontrado' };
        }

        const params = {
            tipo_notificacao: '✅ PROCESSO FINALIZADO',
            assunto: `Processo Finalizado: ${processo.sigadoc}`,
            mensagem_principal: 'O processo sob sua responsabilidade foi concluído com sucesso!',
            numero_processo: processo.sigadoc,
            descricao: processo.descricao || '-',
            tipo_cotacao: processo.tipoCotacao || '-',
            responsavel: processo.responsavel || '-',
            data_info: `Início: ${formatarData(processo.dataInicio)} | Fim: ${formatarData(processo.dataFinalizacao || new Date().toISOString())}`,
            prazo_info: `Dias corridos: ${processo.diasCorridos || '-'} | Dias úteis: ${processo.diasUteis || '-'}`,
            unidade: processo.unidadeExecutora || '-',
            info_extra: '',
            link_sei: processo.link || '',
            link_sistema: window.location.origin
        };

        return await this.enviarEmail(params, emailResponsavel);
    }

    /**
     * Notifica sobre prazo próximo (5 dias ou 1 dia)
     * Envia para o responsável do processo
     */
    async notificarAlertaPrazo(processo, diasRestantes) {
        const emailResponsavel = await this.getEmailResponsavel(processo.responsavel);
        if (!emailResponsavel) {
            console.warn('Email do responsável não encontrado para:', processo.responsavel);
            return { success: false, error: 'Email do responsável não encontrado' };
        }

        const urgencia = diasRestantes <= 1 ? '🚨 URGENTE' : '⚠️ ATENÇÃO';
        const mensagem = diasRestantes <= 1
            ? 'O prazo do processo sob sua responsabilidade vence AMANHÃ!'
            : `Restam apenas ${diasRestantes} dias para o prazo do processo sob sua responsabilidade.`;

        const params = {
            tipo_notificacao: `${urgencia} - ALERTA DE PRAZO`,
            assunto: `${urgencia}: Prazo próximo - ${processo.sigadoc}`,
            mensagem_principal: mensagem,
            numero_processo: processo.sigadoc,
            descricao: processo.descricao || '-',
            tipo_cotacao: processo.tipoCotacao || '-',
            responsavel: processo.responsavel || '-',
            data_info: `Prazo Final: ${formatarData(processo.dataFinal)}`,
            prazo_info: `⏰ ${diasRestantes} dia(s) restante(s)`,
            unidade: processo.unidadeExecutora || '-',
            info_extra: `Status atual: ${processo.status || '-'}`,
            link_sei: processo.link || '',
            link_sistema: window.location.origin
        };

        return await this.enviarEmail(params, emailResponsavel);
    }

    /**
     * Verifica processos com prazo próximo e envia alertas
     */
    async verificarEEnviarAlertas() {
        if (!this.isConfigured()) return 0;

        try {
            const resultado = await dbManager.getProcessosAndamento();
            if (!resultado.success) return 0;

            const processos = resultado.data;
            const alertasEnviados = this.getAlertasEnviados();
            const hoje = new Date().toISOString().split('T')[0];
            let novosAlertas = [];

            for (const processo of processos) {
                if (!processo.dataFinal || !processo.responsavel) continue;

                const dias = diasParaPrazo(processo.dataFinal);
                if (dias === null) continue;

                // Alerta de 5 dias
                if (dias === 5) {
                    const chave5dias = `${processo.id}_5dias_${hoje}`;
                    if (!alertasEnviados.includes(chave5dias)) {
                        const result = await this.notificarAlertaPrazo(processo, 5);
                        if (result.success) {
                            novosAlertas.push(chave5dias);
                        }
                    }
                }

                // Alerta de 1 dia
                if (dias === 1) {
                    const chave1dia = `${processo.id}_1dia_${hoje}`;
                    if (!alertasEnviados.includes(chave1dia)) {
                        const result = await this.notificarAlertaPrazo(processo, 1);
                        if (result.success) {
                            novosAlertas.push(chave1dia);
                        }
                    }
                }
            }

            // Salva alertas enviados para evitar duplicatas
            if (novosAlertas.length > 0) {
                this.salvarAlertasEnviados([...alertasEnviados, ...novosAlertas]);
            }

            return novosAlertas.length;
        } catch (error) {
            console.error('Erro ao verificar alertas:', error);
            return 0;
        }
    }

    /**
     * Obtém lista de alertas já enviados (do localStorage)
     */
    getAlertasEnviados() {
        try {
            const alertas = localStorage.getItem('alertas_enviados');
            return alertas ? JSON.parse(alertas) : [];
        } catch {
            return [];
        }
    }

    /**
     * Salva lista de alertas enviados
     */
    salvarAlertasEnviados(alertas) {
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        const dataLimite = seteDiasAtras.toISOString().split('T')[0];

        const alertasFiltrados = alertas.filter(a => {
            const dataAlerta = a.split('_').pop();
            return dataAlerta >= dataLimite;
        });

        localStorage.setItem('alertas_enviados', JSON.stringify(alertasFiltrados));
    }

    /**
     * Configura credenciais do EmailJS
     */
    configurar(serviceId, publicKey, templateId) {
        localStorage.setItem('emailjs_service_id', serviceId);
        localStorage.setItem('emailjs_public_key', publicKey);
        localStorage.setItem('emailjs_template_id', templateId);

        this.serviceId = serviceId;
        this.publicKey = publicKey;
        this.templateId = templateId;

        if (window.emailjs) {
            emailjs.init(publicKey);
            this.initialized = true;
        }
    }

    /**
     * Remove configurações
     */
    limparConfiguracao() {
        localStorage.removeItem('emailjs_service_id');
        localStorage.removeItem('emailjs_public_key');
        localStorage.removeItem('emailjs_template_id');
        this.initialized = false;
        this.serviceId = null;
        this.publicKey = null;
        this.templateId = null;
    }
}

// Exporta instância única
const emailManager = new EmailManager();
export default emailManager;
