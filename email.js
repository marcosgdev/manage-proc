/**
 * Módulo de Email
 * Gerencia envio de notificações por email usando EmailJS
 * Usa um único template universal para economizar no limite do plano gratuito
 */

import { EMAIL_CONFIG } from './config.js';
import dbManager from './database.js';
import authManager from './auth.js';
import { formatarData, diasParaPrazo } from './utils.js';

class EmailManager {
    constructor() {
        this.initialized = false;
        this.serviceId = null;
        this.templateId = null; // Agora usa apenas 1 template
        this.publicKey = null;
    }

    /**
     * Inicializa o EmailJS
     */
    async initialize() {
        // Carrega configurações do localStorage ou config
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
     * Obtém lista de emails dos usuários cadastrados
     */
    async getEmailsUsuarios() {
        try {
            const usuarios = await authManager.getAllUsers();
            if (Array.isArray(usuarios)) {
                return usuarios.map(u => u.email).filter(e => e);
            }
            return [];
        } catch (error) {
            console.error('Erro ao obter emails dos usuários:', error);
            return [];
        }
    }

    /**
     * Envia email usando EmailJS
     */
    async enviarEmail(params, toEmails) {
        if (!this.initialized || !this.isConfigured()) {
            console.warn('EmailJS não configurado. Email não enviado.');
            return { success: false, error: 'Serviço de email não configurado' };
        }

        try {
            const emailList = Array.isArray(toEmails) ? toEmails.join(', ') : toEmails;

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                {
                    ...params,
                    to_email: emailList,
                    reply_to: 'noreply@gestaoprocessual.com'
                }
            );

            console.log('✅ Email enviado com sucesso:', response);
            return { success: true, response };
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
            return { success: false, error: error.text || error.message };
        }
    }

    /**
     * Notifica sobre novo processo criado
     */
    async notificarNovoProcesso(processo) {
        const emails = await this.getEmailsUsuarios();
        if (emails.length === 0) return;

        const params = {
            tipo_notificacao: '📋 NOVO PROCESSO',
            assunto: `Novo Processo: ${processo.sigadoc}`,
            mensagem_principal: 'Um novo processo foi cadastrado no sistema.',
            numero_processo: processo.sigadoc,
            descricao: processo.descricao || '-',
            tipo_cotacao: processo.tipoCotacao || '-',
            responsavel: processo.responsavel || '-',
            data_info: `Início: ${formatarData(processo.dataInicio)}`,
            prazo_info: processo.dataFinal ? `Prazo: ${formatarData(processo.dataFinal)}` : '',
            unidade: processo.unidadeExecutora || '-',
            info_extra: `Complexidade: ${processo.grauComplexidade || '-'}`,
            link_sistema: window.location.origin
        };

        return await this.enviarEmail(params, emails);
    }

    /**
     * Notifica sobre processo finalizado
     */
    async notificarProcessoFinalizado(processo) {
        const emails = await this.getEmailsUsuarios();
        if (emails.length === 0) return;

        const params = {
            tipo_notificacao: '✅ PROCESSO FINALIZADO',
            assunto: `Processo Finalizado: ${processo.sigadoc}`,
            mensagem_principal: 'Um processo foi concluído com sucesso!',
            numero_processo: processo.sigadoc,
            descricao: processo.descricao || '-',
            tipo_cotacao: processo.tipoCotacao || '-',
            responsavel: processo.responsavel || '-',
            data_info: `Início: ${formatarData(processo.dataInicio)} | Fim: ${formatarData(processo.dataFinalizacao || new Date().toISOString())}`,
            prazo_info: `Dias corridos: ${processo.diasCorridos || '-'} | Dias úteis: ${processo.diasUteis || '-'}`,
            unidade: processo.unidadeExecutora || '-',
            info_extra: '',
            link_sistema: window.location.origin
        };

        return await this.enviarEmail(params, emails);
    }

    /**
     * Notifica sobre prazo próximo (5 dias ou 1 dia)
     */
    async notificarAlertaPrazo(processo, diasRestantes) {
        const emails = await this.getEmailsUsuarios();
        if (emails.length === 0) return;

        const urgencia = diasRestantes <= 1 ? '🚨 URGENTE' : '⚠️ ATENÇÃO';
        const mensagem = diasRestantes <= 1
            ? 'O prazo deste processo vence AMANHÃ!'
            : `Restam apenas ${diasRestantes} dias para o prazo deste processo.`;

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
            link_sistema: window.location.origin
        };

        return await this.enviarEmail(params, emails);
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
                if (!processo.dataFinal) continue;

                const dias = diasParaPrazo(processo.dataFinal);
                if (dias === null) continue;

                // Alerta de 5 dias
                if (dias === 5) {
                    const chave5dias = `${processo.id}_5dias_${hoje}`;
                    if (!alertasEnviados.includes(chave5dias)) {
                        await this.notificarAlertaPrazo(processo, 5);
                        novosAlertas.push(chave5dias);
                    }
                }

                // Alerta de 1 dia
                if (dias === 1) {
                    const chave1dia = `${processo.id}_1dia_${hoje}`;
                    if (!alertasEnviados.includes(chave1dia)) {
                        await this.notificarAlertaPrazo(processo, 1);
                        novosAlertas.push(chave1dia);
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
     * Configura credenciais do EmailJS (versão simplificada - 1 template)
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
