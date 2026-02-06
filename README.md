# Sistema de Gestao de Acervo Processual

Sistema completo para gestao e controle de processos de licitacao, com dashboard interativo, analise de produtividade, controle de acesso por papel (Gestor/Usuario) e sincronizacao em tempo real com Firebase.

## Caracteristicas

- **Dashboard Interativo** com KPIs e graficos em tempo real
- **Analise de Produtividade** da equipe
- **Autenticacao e Controle de Acesso** com papeis (Gestor/Usuario)
- **Sincronizacao Automatica** com Firebase Realtime Database
- **Responsivo** - funciona em desktop, tablet e mobile
- **Interface Moderna** com design limpo e intuitivo
- **Relatorios Exportaveis** em CSV

## Funcionalidades

### Dashboard
- KPIs de processos em andamento, finalizados, tempo medio e equipe ativa
- Graficos de processos por tipo, status, evolucao temporal e complexidade
- Filtros por periodo e unidade executora
- Alertas de processos criticos proximos do prazo

### Gestao de Processos
- Cadastro e edicao de processos em andamento (apenas Gestores)
- Historico de processos finalizados com dias corridos e uteis
- Filtros por tipo, responsavel e busca textual
- Finalizacao automatica com calculo de prazos
- Links para documentos externos

### Gestao de Equipe (Apenas Gestores)
- Cadastro de funcionarios
- Visualizacao de performance individual
- Estatisticas de processos por colaborador

### Gerenciamento de Usuarios (Apenas Gestores)
- Cadastro de novos usuarios
- Alteracao de papeis (Gestor/Usuario)
- Edicao de perfil e senha

### Relatorios
- Geracao de relatorios por periodo
- Analises por unidade executora e tipo de objeto
- Exportacao para CSV

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase Realtime Database + Authentication
- **Graficos**: Chart.js
- **Arquitetura**: Modular com ES6 Modules

## Estrutura de Arquivos

```
gestao-processual/
├── index.html                  # Pagina principal
├── seed.html                   # Pagina para popular dados iniciais
├── main.css                    # Estilos principais e variaveis
├── dashboard.css               # Estilos do dashboard
├── components.css              # Estilos de componentes
├── auth.css                    # Estilos da tela de login
├── config.js                   # Configuracoes e constantes
├── database.js                 # Gerenciamento Firebase Database
├── auth.js                     # Gerenciamento Firebase Auth
├── login.js                    # Logica da tela de login
├── utils.js                    # Funcoes utilitarias
├── charts.js                   # Gerenciamento de graficos
├── processos.js                # Modulo de processos
├── equipe.js                   # Modulo de equipe
├── relatorios.js               # Modulo de relatorios
├── dashboard.js                # Modulo do dashboard
├── app.js                      # Arquivo principal
├── firebase-rules-deploy.json  # Regras de seguranca do Firebase
└── README.md                   # Este arquivo
```

## Configuracao

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o **Realtime Database**
4. Ative o **Authentication** com Email/Password

### 2. Configurar Regras de Seguranca

No Firebase Console > Realtime Database > Regras, cole o conteudo do arquivo `firebase-rules-deploy.json`.

### 3. Configurar Credenciais

Abra `index.html` e substitua as credenciais do Firebase (linhas 391-399):

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### 4. Popular Dados Iniciais (Opcional)

1. Abra `seed.html` no navegador
2. Clique em "Executar Seed"
3. Aguarde a criacao dos usuarios e dados de exemplo

### 5. Executar

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# VS Code: Live Server extension
```

Acesse: `http://localhost:8000`

## Controle de Acesso

| Funcionalidade | Gestor | Usuario |
|----------------|--------|---------|
| Dashboard | Sim | Sim |
| Ver Processos | Sim | Sim |
| Criar/Editar/Excluir Processos | Sim | Nao |
| Finalizar Processos | Sim | Nao |
| Gestao de Equipe | Sim | Nao |
| Gerenciamento de Usuarios | Sim | Nao |
| Relatorios | Sim | Sim |

## Deploy

### GitHub Pages
1. Crie um repositorio no GitHub
2. Push do codigo
3. Settings > Pages > Branch: main

### Netlify
Arraste a pasta para [Netlify Drop](https://app.netlify.com/drop)

### Firebase Hosting
```bash
firebase init hosting
firebase deploy
```

## Solucao de Problemas

- **Firebase nao conecta**: Verifique credenciais e se Realtime Database esta ativo
- **Login nao funciona**: Verifique se Authentication com Email/Password esta habilitado
- **Permissao negada**: Usuario deve ser Gestor para modificar dados
- **Graficos nao aparecem**: Verifique conexao com CDN do Chart.js

---

**Desenvolvido para gestores publicos**
