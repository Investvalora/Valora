const https = require('https');
const fs = require('fs');
const path = require('path');

// Ler token do arquivo .claude.json
const configPath = path.join(process.env.USERPROFILE, '.claude.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.projects['C:/Users/Samuel Leite/wkspaces/Valora'].mcpServers.atlassian.auth.token;
const jiraUrl = 'valorainvest.atlassian.net';

// Estrutura dos épicos
const epics = [
  {
    summary: 'Epic 1: Fundação e Autenticação',
    description: 'FRs Cobertos: FR-1, FR-2, FR-3, FR-4, FR-27\nEstimativa Total: 3 dias\nObjetivo: Usuários podem criar conta, fazer login/logout, recuperar senha e acessar sistema protegido por autenticação.'
  },
  {
    summary: 'Epic 2: Gestão de Carteira e Posições',
    description: 'FRs Cobertos: FR-5, FR-6, FR-7, FR-8, FR-9\nEstimativa Total: 5 dias\nObjetivo: Usuários cadastram posições manualmente ou via CSV, visualizam carteira consolidada com custo médio e quantidade atualizada.'
  },
  {
    summary: 'Epic 3: Análise de Portfolio',
    description: 'FRs Cobertos: FR-10, FR-11, FR-12, FR-13, FR-14, FR-15\nEstimativa Total: 8 dias\nObjetivo: Usuários visualizam evolução do patrimônio, composição da carteira, histórico de proventos recebidos e rentabilidade comparada com benchmarks.'
  },
  {
    summary: 'Epic 4: Valuation e Scoring Engine',
    description: 'FRs Cobertos: FR-16, FR-17, FR-18, FR-19\nEstimativa Total: 6 dias\nObjetivo: Usuários criam regras de score fundamentalista customizáveis e calculam preço-teto método Bazin, ambos com cálculos server-side rápidos.'
  },
  {
    summary: 'Epic 5: Sistema de Alertas Inteligentes',
    description: 'FRs Cobertos: FR-20, FR-21\nEstimativa Total: 3 dias\nObjetivo: Usuários recebem alertas instantâneos via Trigger Postgres + Realtime quando posições ficam sem transações ou eventos de valuation ocorrem.'
  },
  {
    summary: 'Epic 6: Detalhe de Ativo e Rastreabilidade',
    description: 'FRs Cobertos: FR-25, FR-26\nEstimativa Total: 3 dias\nObjetivo: Usuários acessam tela detalhe do ativo com todas as informações consolidadas e veem tooltips rastreáveis mostrando origem dos dados calculados.'
  },
  {
    summary: 'Epic 7: Dados de Mercado e Seed Incremental',
    description: 'FRs Cobertos: FR-22, FR-23, FR-24, FR-28\nEstimativa Total: 4 dias\nObjetivo: Popular base de dados com ativos, cotações, fundamentals, dividendos e benchmarks de forma incremental e idempotente.'
  }
];

// Histórias por épico (27 histórias no total)
const stories = {
  'Epic 1': [
    {
      summary: 'Story 1.1: Setup Projeto e Autenticação Básica Supabase',
      description: 'As a desenvolvedor, I want configurar o projeto Vite + React + TypeScript + Supabase com autenticação básica funcional, So that posso começar a desenvolver features em cima de uma base técnica sólida.\n\nEstimativa: 1 dia\n\nDependency: BLOCKS todas as outras histórias',
      labels: ['dependency-blocks']
    },
    {
      summary: 'Story 1.2: Estrutura Módulos + State Management + Routing',
      description: 'As a desenvolvedor, I want estrutura de pastas modular + Zustand (auth) + React Router configurados, So that o código seja organizado e escalável desde o início.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 1.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 1.3: Telas Login, Signup e Recuperação Senha',
      description: 'As a usuário não autenticado, I want fazer login, criar conta e recuperar senha, So that possa acessar o sistema de forma segura.\n\nEstimativa: 0.5 dia\n\nDependency: Precisa Story 1.1 + 1.2',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 1.4: Banner "Dados Simulados" e Persistência Session',
      description: 'As a usuário logado, I want ver banner informando que dados são simulados + sessão persistir entre reloads, So that saiba que está em ambiente MVP e não precise relogar a cada refresh.\n\nEstimativa: 0.5 dia',
      labels: ['dependency-independent']
    }
  ],
  'Epic 2': [
    {
      summary: 'Story 2.1: Criar Tabelas Transactions e Positions com RLS',
      description: 'As a desenvolvedor, I want criar tabelas transactions e positions com RLS configurado, So that cada usuário veja apenas suas próprias transações e posições.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 1.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 2.2: Cadastro Manual de Transação',
      description: 'As a usuário logado, I want cadastrar transação de compra/venda manualmente via formulário, So that possa registrar operações individuais e ver minha carteira atualizada automaticamente.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 2.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 2.3: Visualizar Lista Posições Consolidada',
      description: 'As a usuário logado, I want visualizar lista de posições consolidadas (ticker, quantidade, preço médio), So that possa ver minha carteira atualizada em tempo real.\n\nEstimativa: 0.5 dia\n\nDependency: Precisa Story 2.1 + 2.2',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 2.4: Importação CSV com Preview Paginado e Correção Inline',
      description: 'As a usuário logado, I want importar múltiplas transações via CSV com preview paginado e correção inline antes de confirmar, So that possa migrar meu histórico de forma rápida e conferir dados antes de salvar.\n\nEstimativa: 2 dias\n\nDependency: Precisa Story 2.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 2.5: Deletar Transação com Recalculo Automático Position',
      description: 'As a usuário logado, I want deletar transação incorreta, So that minha posição seja recalculada automaticamente sem a transação deletada.\n\nEstimativa: 0.5 dia\n\nDependency: Precisa Story 2.1',
      labels: ['dependency-independent']
    }
  ],
  'Epic 3': [
    {
      summary: 'Story 3.1: Criar Tabela Price History e Query Evolução Patrimônio',
      description: 'As a desenvolvedor, I want criar tabela price_history e query que calcula evolução patrimônio por período, So that usuários possam ver o valor da carteira ao longo do tempo.\n\nEstimativa: 1.5 dias\n\nDependency: Precisa Story 2.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 3.2: Gráfico Evolução Patrimônio com Filtros Período',
      description: 'As a usuário logado, I want visualizar gráfico de linha da evolução do meu patrimônio com filtros de período, So that possa acompanhar o crescimento da carteira ao longo do tempo.\n\nEstimativa: 1.5 dias\n\nDependency: Precisa Story 3.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 3.3: Composição e Exposição da Carteira',
      description: 'As a usuário logado, I want visualizar composição da carteira por ativo e exposição internacional, So that possa entender minha diversificação.\n\nEstimativa: 1.5 dias\n\nDependency: Precisa Story 2.3',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 3.4: Histórico de Proventos Recebidos',
      description: 'As a usuário logado, I want visualizar histórico de proventos recebidos (dividendos, JCP) por ativo, So that possa acompanhar renda passiva gerada pela carteira.\n\nEstimativa: 2 dias\n\nDependency: Precisa Story 2.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 3.5: Rentabilidade e Comparação com Benchmarks',
      description: 'As a usuário logado, I want visualizar rentabilidade da carteira e comparar com benchmarks (IBOV, CDI), So that possa avaliar performance dos investimentos.\n\nEstimativa: 1.5 dias\n\nDependency: Precisa Story 3.1 + 3.4',
      labels: ['dependency-soft']
    }
  ],
  'Epic 4': [
    {
      summary: 'Story 4.1: Postgres Functions Engine (Score + Preço-Teto)',
      description: 'As a desenvolvedor, I want implementar Postgres Functions PL/pgSQL para cálculo de Score e Preço-Teto com helper safe_divide, So that cálculos rodem server-side com latência <500ms e 0 cold start.\n\nEstimativa: 2 dias\n\nDependency: BLOCKS histórias 4.2, 4.3, 4.4',
      labels: ['dependency-blocks']
    },
    {
      summary: 'Story 4.2: UI Score Fundamentalista com CRUD Regras',
      description: 'As a usuário logado, I want criar/editar regras de score customizáveis e visualizar score calculado dos meus ativos, So that possa filtrar ações baseado nos meus critérios fundamentalistas.\n\nEstimativa: 2 dias\n\nDependency: Precisa Story 4.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 4.3: UI Preço-Teto Bazin',
      description: 'As a usuário logado, I want calcular preço-teto método Bazin para minhas posições com DY alvo customizável, So that possa identificar ações abaixo do preço justo para compra.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 4.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 4.4: Alertas Valuation Integrados',
      description: 'As a usuário logado, I want receber alertas quando score de ativo atingir threshold ou preço cair abaixo do preço-teto, So that possa ser notificado de oportunidades automaticamente.\n\nEstimativa: 1 dia',
      labels: ['dependency-independent']
    }
  ],
  'Epic 5': [
    {
      summary: 'Story 5.1: Trigger Postgres + Realtime para Alertas Instantâneos',
      description: 'As a desenvolvedor, I want criar tabela alerts com Trigger Postgres + Supabase Realtime, So that usuários recebam notificações instantâneas quando condições de alerta forem atingidas.\n\nEstimativa: 2 dias\n\nDependency: BLOCKS Story 5.2',
      labels: ['dependency-blocks']
    },
    {
      summary: 'Story 5.2: Lista Alertas + Badge + Botão Manual Refresh',
      description: 'As a usuário logado, I want visualizar lista de alertas ativos com badge no menu e botão manual para forçar re-check, So that possa gerenciar notificações e forçar verificação quando necessário.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 5.1',
      labels: ['dependency-soft']
    }
  ],
  'Epic 6': [
    {
      summary: 'Story 6.1: Tela Detalhe Ativo Consolidada',
      description: 'As a usuário logado, I want acessar tela detalhe de um ativo específico com todas informações consolidadas, So that possa ver visão 360° do ativo.\n\nEstimativa: 2 dias\n\nDependency: Precisa Epics 2, 3, 4',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 6.2: Tooltips Rastreabilidade de Cálculos',
      description: 'As a usuário logado, I want ver tooltips mostrando origem e fórmula dos valores calculados, So that possa entender de onde cada número veio e validar cálculos.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 6.1',
      labels: ['dependency-soft']
    }
  ],
  'Epic 7': [
    {
      summary: 'Story 7.1: Seed Mínimo (10 Ativos + Price History 3M)',
      description: 'As a desenvolvedor, I want criar seed mínimo com 10 ativos brasileiros + price_history de 3 meses, So that Epic 2 (Portfolio) possa começar imediatamente com dados reais.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 1.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 7.2: Seed Expand Fundamentals (30 Ativos)',
      description: 'As a desenvolvedor, I want expandir seed para 30 ativos + fundamentals completos, So that Epic 4 (Valuation Engine) possa calcular Score e Preço-Teto.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 7.1',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 7.3: Seed Full (50 Ativos + Dividends + Benchmarks + 12M)',
      description: 'As a desenvolvedor, I want seed completo com 50 ativos + dividends + benchmarks + price_history 12 meses, So that Epic 3 (Análise) possa exibir proventos, rentabilidade e comparação benchmarks.\n\nEstimativa: 1 dia\n\nDependency: Precisa Story 7.2',
      labels: ['dependency-soft']
    },
    {
      summary: 'Story 7.4: Validation Script Retroativo',
      description: 'As a desenvolvedor, I want script validação retroativa que verifica integridade dos dados seed, So that possamos detectar inconsistências antes de virar bugs em produção.\n\nEstimativa: 1 dia',
      labels: ['dependency-independent']
    }
  ]
};

let createdEpics = {};
let createdStories = 0;

function makeRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          console.error(`❌ Status: ${res.statusCode}`);
          console.error(data);
          reject(new Error(data));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function createEpic(epicData) {
  const payload = JSON.stringify({
    fields: {
      project: { key: 'KAN' },
      summary: epicData.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: epicData.description }]
          }
        ]
      },
      issuetype: { name: 'Epic' }
    }
  });

  const options = {
    hostname: jiraUrl,
    path: '/rest/api/3/issue',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  const result = await makeRequest(options, payload);
  console.log(`✅ Epic criado: ${epicData.summary} - Key: ${result.key}`);
  return result;
}

async function createStory(storyData, epicKey) {
  const payload = JSON.stringify({
    fields: {
      project: { key: 'KAN' },
      summary: storyData.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: storyData.description }]
          }
        ]
      },
      issuetype: { name: 'Story' },
      parent: { key: epicKey },
      labels: storyData.labels || []
    }
  });

  const options = {
    hostname: jiraUrl,
    path: '/rest/api/3/issue',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  const result = await makeRequest(options, payload);
  console.log(`  ✅ Story criada: ${storyData.summary} - Key: ${result.key}`);
  createdStories++;
  return result;
}

async function createAllIssues() {
  console.log('🚀 Iniciando criação de épicos e histórias no Jira KAN...\n');

  // Criar épicos
  console.log('📦 CRIANDO ÉPICOS...\n');
  for (const epic of epics) {
    const result = await createEpic(epic);
    createdEpics[epic.summary] = result.key;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }

  console.log(`\n✅ ${Object.keys(createdEpics).length} épicos criados!\n`);

  // Criar histórias
  console.log('📝 CRIANDO HISTÓRIAS...\n');
  for (const [epicName, storyList] of Object.entries(stories)) {
    const epicKey = createdEpics[epicName];
    console.log(`\n${epicName} (${epicKey}):`);

    for (const story of storyList) {
      await createStory(story, epicKey);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  }

  console.log(`\n\n🎉 SUMÁRIO FINAL:`);
  console.log(`   ✅ ${Object.keys(createdEpics).length} épicos criados`);
  console.log(`   ✅ ${createdStories} histórias criadas`);
  console.log(`\n🔗 Acesse: https://valorainvest.atlassian.net/jira/software/projects/KAN/board\n`);
}

createAllIssues().catch(console.error);
