/**
 * Módulo de Integração com OpenAI
 * Gera resumos executivos e análises inteligentes dos processos
 */

class OpenAIManager {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.openai.com/v1';
        this.model = 'gpt-4o-mini'; // Modelo mais econômico e rápido
    }

    /**
     * Configura a API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Verifica se a API está configurada
     */
    isConfigured() {
        return this.apiKey && this.apiKey.length > 0;
    }

    /**
     * Faz uma requisição para a API da OpenAI
     */
    async request(messages, maxTokens = 1000) {
        if (!this.isConfigured()) {
            throw new Error('API Key da OpenAI não configurada');
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Erro na API da OpenAI');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Gera resumo executivo dos processos
     */
    async gerarResumoExecutivo(dados) {
        const {
            totalProcessos,
            finalizados,
            emAndamento,
            tempoMedio,
            porTipo,
            porUnidade,
            porComplexidade,
            periodo
        } = dados;

        const prompt = `Você é um analista de gestão pública especializado em processos licitatórios.
Analise os dados abaixo e gere um resumo executivo profissional em português brasileiro.

DADOS DO PERÍODO (${periodo}):
- Total de Processos: ${totalProcessos}
- Finalizados: ${finalizados}
- Em Andamento: ${emAndamento}
- Tempo Médio de Conclusão: ${tempoMedio} dias

DISTRIBUIÇÃO POR TIPO DE COTAÇÃO:
${Object.entries(porTipo).map(([tipo, qtd]) => `- ${tipo}: ${qtd} processos`).join('\n')}

DISTRIBUIÇÃO POR UNIDADE EXECUTORA:
${Object.entries(porUnidade).map(([unidade, qtd]) => `- ${unidade}: ${qtd} processos`).join('\n')}

DISTRIBUIÇÃO POR COMPLEXIDADE:
${Object.entries(porComplexidade).map(([nivel, qtd]) => `- ${nivel}: ${qtd} processos`).join('\n')}

Gere um resumo executivo com:
1. Visão geral do período (2-3 frases)
2. Principais destaques e tendências (2-3 pontos)
3. Pontos de atenção ou recomendações (2-3 pontos)

Mantenha o tom profissional e objetivo. Use linguagem adequada para gestores públicos.
Limite a resposta a no máximo 250 palavras.`;

        const messages = [
            {
                role: 'system',
                content: 'Você é um assistente especializado em análise de processos licitatórios do setor público brasileiro. Suas análises são precisas, objetivas e úteis para tomada de decisão.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        return await this.request(messages, 500);
    }

    /**
     * Sugere classificação automática para um processo
     */
    async sugerirClassificacao(descricao) {
        const prompt = `Analise a descrição do processo abaixo e sugira a classificação mais adequada.

DESCRIÇÃO DO PROCESSO:
"${descricao}"

Retorne APENAS um JSON válido no formato:
{
    "tipoCotacao": "sugestão de tipo (Dispensa, Inexigibilidade, Pregão Eletrônico, etc)",
    "tipoObjeto": "sugestão de objeto (Material, Serviço, Obra, etc)",
    "complexidade": "BAIXO, MÉDIO, ALTO ou MUITO ALTO",
    "justificativa": "breve explicação da classificação"
}`;

        const messages = [
            {
                role: 'system',
                content: 'Você é um especialista em classificação de processos licitatórios. Responda apenas com JSON válido.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await this.request(messages, 300);

        try {
            return JSON.parse(response);
        } catch {
            // Tenta extrair JSON da resposta
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
            throw new Error('Resposta inválida da IA');
        }
    }

    /**
     * Gera insights sobre processos críticos
     */
    async analisarProcessosCriticos(processos) {
        if (processos.length === 0) {
            return 'Não há processos críticos no momento.';
        }

        const listaProcessos = processos.map(p =>
            `- ${p.sigadoc}: ${p.descricao?.substring(0, 100)}... (${p.diasPrazo} dias para o prazo)`
        ).join('\n');

        const prompt = `Analise os processos críticos abaixo (próximos do prazo ou atrasados) e forneça recomendações práticas.

PROCESSOS CRÍTICOS:
${listaProcessos}

Forneça:
1. Análise da situação geral (1-2 frases)
2. Recomendações de priorização (2-3 pontos)
3. Ações imediatas sugeridas

Seja objetivo e prático. Limite a 150 palavras.`;

        const messages = [
            {
                role: 'system',
                content: 'Você é um consultor de gestão especializado em processos licitatórios urgentes.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        return await this.request(messages, 300);
    }
}

// Exporta instância única
const openaiManager = new OpenAIManager();
export default openaiManager;
