

{

  "title": "Elysium Build Platform - Indie Game Development via Vibe Coding",

  "overview": "Plataforma desktop de orquestração para criação de jogos indie via conversação com 8 agentes especialistas de IA, transformando ideias criativas em documentação profissional (GDD) através de 13 etapas estruturadas com geração integrada de assets visuais e sonoros.",

  "productType": "platform",

  "objectives": {

    "primary": "Criar uma plataforma desktop que orquestre o desenvolvimento completo de jogos indie via conversação com 8 agentes especialistas de IA, transformando ideias criativas em documentação profissional (GDD) através de 13 etapas estruturadas",

    "secondary": [

      "Integrar geração de assets visuais (Pixellab) e áudio (ElevenLabs) diretamente no workflow de design",

      "Manter coerência entre todas as decisões através de Knowledge Base semântico local",

      "Educar vibe coders sobre frameworks profissionais de game design (MDA, GDD, Elemental Tetrad)",

      "Exportar documentação completa que permita implementação por desenvolvedores ou continuação autônoma"

    ],

    "successCriteria": "Pipeline completa de 13 etapas funcional, todos os 8 agentes conversando naturalmente, geração de GDD coerente com concept arts e direção de áudio, interface multi-painel responsiva, Knowledge Base conectando decisões entre etapas"

  },

  "metrics": {

    "primary": "Taxa de conclusão do pipeline completo (usuários que completam todas as 13 etapas e geram GDD final)",

    "secondary": [

      "Tempo médio por etapa e taxa de aprovação de cada agente especialista",

      "Número de iterações por etapa (indicador de qualidade das conversas)",

      "Taxa de uso dos painéis especializados (árvore de lore, mapa de mecânicas, preview de assets)",

      "Qualidade dos assets gerados (aprovações vs regenerações no Pixellab/ElevenLabs)",

      "Utilização do Knowledge Base (buscas semânticas, conexões entre etapas)"

    ],

    "dataCollection": "Logs locais estruturados com eventos de uso, telemetria opcional anonimizada, métricas de API (latência, custos, rate limits), sistema de feedback por etapa"

  },

  "architecture": {

    "overview": "Aplicação desktop híbrida com frontend React em shell Tauri, backend Node.js como sidecar, processamento 100% local com integração a APIs de IA externas. Arquitetura orientada a agentes com Knowledge Base vetorial embedded.",

    "stack": {

      "frontend": "Tauri 2.0 + React 19 + TypeScript + TailwindCSS + shadcn/ui + Radix UI + React Flow + Tiptap + react-markdown + Shiki",

      "backend": "Node.js 20+ (sidecar) + LangChain.js + better-sqlite3 + ChromaDB embedded",

      "database": "SQLite (projetos, configurações) + ChromaDB (Knowledge Base vetorial) + Sistema de manifest JSON (cache de assets)",

      "hosting": "Aplicação desktop distribuída via instaladores nativos (.msi, .dmg, .deb) com auto-update integrado",

      "analytics": "Logs locais estruturados + telemetria opcional via endpoint próprio (não terceiros por ser desktop local)"

    },

    "integrations": [

      "Claude API (Anthropic) - Motor de todos os 8 agentes especialistas com streaming de respostas",

      "Pixellab API - Geração de concept arts, sprites, tiles isométricos via plugin Aseprite + MCP server + REST",

      "ElevenLabs API - Geração de trilha sonora, SFX, voice acting via Music API + SFX endpoints",

      "Steam API - Análise de jogos similares para benchmark (tags, reviews, dados de mercado)",

      "IGDB API - Base de dados de jogos para análise competitiva",

      "Git Integration - Versionamento automático de projetos do usuário"

    ],

    "security": "API keys armazenadas localmente com criptografia, todos os dados do usuário permanecem 100% locais (sem upload), backup opcional via Git remoto, assets gerados com licenças comerciais incluídas",

    "performance": "Cache agressivo de responses LLM via hash de prompts, lazy loading de painéis, streaming de respostas dos agentes, ChromaDB otimizado para busca vetorial local, footprint máximo 30MB (vantagem Tauri vs Electron)"

  },

  "features": [

    {

      "id": "FEAT-01",

      "name": "Pipeline de 13 Etapas Sequenciais",

      "description": "Sistema de workflow estruturado que guia o usuário através de 13 etapas sequenciais de desenvolvimento de jogos, desde Pitch & Visão até GDD Final & Roadmap, com gates de aprovação obrigatórios entre etapas",

      "priority": "must-have",

      "userStories": [

        "Como vibe coder criativo, quero ser guiado através de um processo estruturado para não ficar perdido sobre qual decisão tomar primeiro",

        "Como usuário, quero ver meu progresso visual no pipeline para entender onde estou e o que falta fazer",

        "Como criativo, quero poder voltar a etapas anteriores para revisar decisões quando tiver insights novos"

      ],

      "acceptanceCriteria": [

        "Dado que estou em uma etapa, quando tento avançar sem aprovar, então sistema bloqueia e exibe mensagem de aprovação necessária",

        "Dado que completo uma etapa, quando aprovo o resultado, então próxima etapa é desbloqueada automaticamente",

        "Dado que estou em qualquer etapa, quando clico em etapa anterior no pipeline, então posso revisar e modificar decisões passadas",

        "Dado que modifico uma etapa anterior, quando salvo, então sistema identifica etapas posteriores que precisam ser revalidadas"

      ],

      "businessRules": [

        "RN001: Usuário não pode avançar para próxima etapa sem aprovar a atual",

        "RN002: Mudanças em etapas anteriores invalidam etapas posteriores dependentes",

        "RN003: Cada etapa deve ter status visual claro: pendente, ativo, concluído, aprovado"

      ],

      "technicalNotes": "Implementar como state machine com React Context. Pipeline inferior como stepper horizontal com 13 estados. Persistir progresso em SQLite local. Usar React Flow para visualizar dependências entre etapas.",

      "edgeCases": [

        "Usuário fecha aplicação no meio de uma etapa - deve recuperar estado exato",

        "Falha de API durante geração de documento - deve permitir retry sem perder progresso",

        "Usuário tenta pular etapas via manipulação de URL/estado - deve ser bloqueado"

      ]

    },

    {

      "id": "FEAT-02",

      "name": "Sistema de 8 Agentes Especialistas",

      "description": "Conjunto de 8 agentes LLM especializados (Discovery, Benchmark, Mechanics Designer, Lore Writer, Level Designer, Art Director, Audio Director, Asset Producer) que conduzem conversas estruturadas em suas áreas de expertise",

      "priority": "must-have",

      "userStories": [

        "Como vibe coder, quero conversar com especialistas que entendem profundamente de game design para receber orientação qualificada",

        "Como usuário, quero que cada agente mantenha personalidade consistente e me desafie quando dou respostas vagas",

        "Como criativo, quero que os agentes consultem decisões anteriores para manter coerência no projeto"

      ],

      "acceptanceCriteria": [

        "Dado que inicio uma etapa, quando o agente carrega, então ele apresenta sua especialidade e faz primeira pergunta contextual",

        "Dado que dou resposta vaga, quando agente processa, então ele pede especificidade e exemplos concretos",

        "Dado que agente faz sugestão, quando ele referencia decisão anterior, então mostra conexão específica com etapa passada",

        "Dado que completo conversa com agente, quando finalizo etapa, então documento estruturado é gerado automaticamente"

      ],

      "businessRules": [

        "RN004: Cada agente só pode trabalhar em suas etapas designadas",

        "RN005: KB semântico deve ser consultado antes de qualquer decisão para manter coerência",

        "RN006: Todos os agentes devem referenciar decisões anteriores ao fazer sugestões"

      ],

      "technicalNotes": "Implementar com LangChain.js ou Vercel AI SDK. Cada agente tem system prompt específico + acesso ao KB semântico via ChromaDB. Chat interface com streaming de respostas. Histórico de conversas persistido em SQLite.",

      "edgeCases": [

        "Agente gera resposta inconsistente com KB - deve ter sistema de validação automática",

        "Rate limiting da Claude API - deve implementar queue e retry com backoff",

        "Usuário cola texto muito longo - deve ter limite de tokens e sugerir resumo"

      ]

    },

    {

      "id": "FEAT-03",

      "name": "Interface Desktop Multi-Painel",

      "description": "Layout estilo Unity Editor com 4 painéis simultâneos: sidebar esquerda (árvore do projeto), painel central (split view), chat do agente (direita), pipeline inferior. Suporte a redimensionamento e múltiplas abas no painel central",

      "priority": "must-have",

      "userStories": [

        "Como usuário, quero ver múltiplos documentos lado a lado para comparar decisões entre etapas",

        "Como criativo, quero navegar facilmente entre todos os documentos gerados sem perder contexto",

        "Como vibe coder, quero interface familiar que não me intimide com complexidade técnica"

      ],

      "acceptanceCriteria": [

        "Dado que abro a aplicação, quando carrego projeto, então todos os 4 painéis são visíveis simultaneamente",

        "Dado que arrasto divisor entre painéis, quando solto, então novo tamanho é persistido para próxima sessão",

        "Dado que tenho 2+ documentos abertos, quando clico em split view, então painel central divide horizontalmente",

        "Dado que clico em documento na sidebar, quando abre, então nova aba aparece no painel central"

      ],

      "businessRules": [

        "Resolução mínima suportada: 1920x1080",

        "Painéis devem manter proporções mínimas para usabilidade",

        "Estado da interface deve ser persistido entre sessões"

      ],

      "technicalNotes": "Tauri 2.0 + React 19. Usar react-resizable-panels para divisores. React Flow para diagramas. Tiptap para editor de texto rico. Estado da UI em Zustand com persistência local.",

      "edgeCases": [

        "Resolução muito baixa - deve colapsar painéis automaticamente",

        "Muitas abas abertas - deve implementar scroll horizontal",

        "Painel redimensionado além do limite - deve snap para tamanho mínimo"

      ]

    },

    {

      "id": "FEAT-04",

      "name": "Knowledge Base Semântico Local",

      "description": "Sistema de busca vetorial local usando ChromaDB que armazena todas as decisões do projeto, conecta informações entre etapas e permite consulta em linguagem natural para manter coerência",

      "priority": "must-have",

      "userStories": [

        "Como agente especialista, quero consultar decisões anteriores para fazer sugestões coerentes com o que já foi definido",

        "Como usuário, quero buscar informações do meu projeto em linguagem natural para encontrar conexões que esqueci",

        "Como criativo, quero que o sistema me avise quando uma nova decisão conflita com algo já estabelecido"

      ],

      "acceptanceCriteria": [

        "Dado que agente faz sugestão, quando consulta KB, então recebe contexto relevante das etapas anteriores",

        "Dado que faço busca no KB Explorer, quando digito pergunta, então recebo resultados rankeados por relevância semântica",

        "Dado que aprovo decisão em uma etapa, quando sistema salva, então informação é indexada com embeddings vetoriais",

        "Dado que modifico decisão anterior, quando salvo, então sistema identifica conflitos potenciais automaticamente"

      ],

      "businessRules": [

        "RN005: KB semântico deve ser consultado antes de qualquer decisão para manter coerência",

        "Todas as decisões aprovadas devem ser indexadas automaticamente",

        "Busca deve retornar máximo 10 resultados mais relevantes"

      ],

      "technicalNotes": "ChromaDB embedded com embeddings via Claude API. Indexar por chunks de 500 tokens. Metadata inclui etapa, agente, timestamp. Interface de busca com highlighting de resultados.",

      "edgeCases": [

        "KB muito grande (>10k entradas) - deve implementar cleanup de entradas antigas",

        "Busca sem resultados relevantes - deve sugerir termos alternativos",

        "Conflito detectado entre decisões - deve apresentar opções de resolução"

      ]

    },

    {

      "id": "FEAT-05",

      "name": "Integração com APIs de IA",

      "description": "Integração nativa com Claude API (agentes), Pixellab API (concept arts) e ElevenLabs API (áudio) com sistema de cache, rate limiting e fallbacks para garantir experiência fluida",

      "priority": "must-have",

      "userStories": [

        "Como usuário, quero que concept arts sejam gerados automaticamente baseados nas minhas decisões de art direction",

        "Como criativo, quero que trilhas sonoras sejam criadas que reflitam o mood do meu jogo",

        "Como vibe coder, quero que todas as integrações funcionem de forma transparente sem configuração técnica"

      ],

      "acceptanceCriteria": [

        "Dado que Art Director aprova estilo visual, quando solicito concept art, então Pixellab gera imagem consistente com diretrizes",

        "Dado que Audio Director define identidade sonora, quando solicito trilha, então ElevenLabs gera música alinhada",

        "Dado que API falha temporariamente, quando retry automático, então usuário vê progresso e não perde trabalho",

        "Dado que asset é gerado, quando salvo no projeto, então fica disponível offline para uso posterior"

      ],

      "businessRules": [

        "RN007: Concept arts só podem ser gerados após Art Direction aprovada (etapa 9)",

        "RN008: Assets de áudio só podem ser gerados após Audio Direction aprovada (etapa 11)",

        "RN009: Todos os assets gerados devem ser aprovados pelo usuário antes de serem incluídos no projeto",

        "RN010: Sistema deve manter cache de assets para evitar re-geração desnecessária"

      ],

      "technicalNotes": "Node.js sidecar para orquestração de APIs. Sistema de manifest com hash para cache. Rate limiting com queue. Fallbacks: Claude->GPT-4, Pixellab->Midjourney via proxy, ElevenLabs->local TTS.",

      "edgeCases": [

        "API key inválida - deve detectar e solicitar reconfiguração",

        "Asset gerado com qualidade baixa - deve permitir regeneração com prompt refinado",

        "Limite de créditos atingido - deve notificar e sugerir upgrade de plano"

      ]

    },

    {

      "id": "FEAT-06",

      "name": "Sistema de Projetos e Versionamento",

      "description": "Gestão completa de projetos de jogos com criação, abertura, save automático, export de GDD e backup local integrado com Git para versionamento de assets",

      "priority": "must-have",

      "userStories": [

        "Como usuário, quero criar novo projeto e ter meu progresso salvo automaticamente para nunca perder trabalho",

        "Como criativo, quero exportar GDD completo em PDF para apresentar para investidores ou desenvolvedores",

        "Como vibe coder, quero que meus assets sejam versionados automaticamente para poder voltar a versões anteriores"

      ],

      "acceptanceCriteria": [

        "Dado que crio novo projeto, quando preencho nome, então estrutura de pastas é criada automaticamente",

        "Dado que trabalho no projeto, quando faço alterações, então save automático ocorre a cada 30 segundos",

        "Dado que completo todas as etapas, quando solicito export, então GDD PDF é gerado com toda documentação",

        "Dado que assets são gerados, quando salvos, então Git LFS versiona automaticamente arquivos grandes"

      ],

      "businessRules": [

        "Projetos devem ser salvos em estrutura padronizada",

        "Export só disponível após completar etapas obrigatórias",

        "Backup automático deve ocorrer diariamente"

      ],

      "technicalNotes": "SQLite para metadados do projeto. Filesystem estruturado em %AppData%/Elysium-Platform/projects/. Git + Git LFS para versionamento. Export via Puppeteer para PDF ou react-pdf.",

      "edgeCases": [

        "Disco cheio durante save - deve alertar e sugerir limpeza",

        "Projeto corrompido - deve ter sistema de recovery automático",

        "Export muito grande - deve comprimir assets automaticamente"

      ]

    },

    {

      "id": "FEAT-07",

      "name": "Painéis Especializados de Visualização",

      "description": "Conjunto de painéis especializados para visualizar diferentes aspectos do projeto: Mapa de Mecânicas (React Flow), Árvore de Lore, Quest/Dialogue Editor, Preview de Assets, Audio Preview e KB Explorer",

      "priority": "should-have",

      "userStories": [

        "Como game designer, quero visualizar como as mecânicas do meu jogo se conectam para identificar gaps ou redundâncias",

        "Como criativo, quero ver a hierarquia do meu mundo (facções, personagens, locais) de forma visual",

        "Como usuário, quero editar árvores de diálogo de forma visual para criar conversas mais naturais"

      ],

      "acceptanceCriteria": [

        "Dado que tenho mecânicas definidas, quando abro Mapa de Mecânicas, então vejo diagrama interativo com conexões",

        "Dado que tenho lore criada, quando abro Árvore de Lore, então vejo hierarquia expandível de mundo/personagens/facções",

        "Dado que crio diálogo, quando uso Quest Editor, então posso arrastar nós para criar árvore de conversação",

        "Dado que assets são gerados, quando abro Preview, então vejo galeria com zoom e metadados"

      ],

      "businessRules": [

        "Painéis só mostram conteúdo após etapas relevantes serem completadas",

        "Visualizações devem ser interativas e permitir edição inline",

        "Mudanças nos painéis devem sincronizar com documentos fonte"

      ],

      "technicalNotes": "React Flow para diagramas node-based. react-virtualized para listas grandes. Canvas API para preview de imagens. Web Audio API para preview de áudio. Sincronização bidirecional com documentos.",

      "edgeCases": [

        "Projeto muito complexo - deve implementar filtros e busca nos painéis",

        "Asset muito grande para preview - deve mostrar thumbnail com opção de download",

        "Muitos nós no diagrama - deve implementar zoom e pan automático"

      ]

    },

    {

      "id": "FEAT-08",

      "name": "Sistema de Aprovações e Iterações",

      "description": "Workflow de aprovação explícita em cada etapa com capacidade de revisar, iterar e propagar mudanças para etapas dependentes, mantendo histórico de versões",

      "priority": "must-have",

      "userStories": [

        "Como usuário, quero revisar cuidadosamente cada documento gerado antes de aprovar para garantir qualidade",

        "Como criativo, quero poder solicitar mudanças específicas quando o resultado não atende minhas expectativas",

        "Como vibe coder, quero entender como uma mudança em etapa anterior afeta o resto do projeto"

      ],

      "acceptanceCriteria": [

        "Dado que agente gera documento, quando apresenta resultado, então vejo botões claros de Aprovar/Revisar/Iterar",

        "Dado que solicito iteração, quando especifico mudanças, então agente refina resultado mantendo contexto",

        "Dado que modifico etapa anterior, quando salvo, então sistema mostra lista de etapas que precisam ser revalidadas",

        "Dado que aprovo mudança, quando confirmo, então histórico de versões é mantido para rollback futuro"

      ],

      "businessRules": [

        "RN001: Usuário não pode avançar para próxima etapa sem aprovar a atual",

        "RN002: Mudanças em etapas anteriores invalidam etapas posteriores dependentes",

        "Máximo 5 iterações por etapa para evitar loop infinito"

      ],

      "technicalNotes": "Estado de aprovação em SQLite com timestamps. Diff algorithm para detectar mudanças significativas. Dependency graph para propagação de mudanças. Histórico versionado em JSON.",

      "edgeCases": [

        "Usuário aprova por engano - deve permitir desfazer aprovação se etapa seguinte não iniciada",

        "Iteração gera resultado pior - deve permitir voltar para versão anterior",

        "Mudança em cascata afeta muitas etapas - deve mostrar preview do impacto antes de confirmar"

      ]

    }

  ],

  "userFlows": [

    {

      "name": "Primeira Experiência - Novo Projeto",

      "persona": "Vibe coder criativo iniciante",

      "steps": [

        "Usuário abre aplicação pela primeira vez",

        "Sistema mostra onboarding com overview das 13 etapas",

        "Usuário clica 'Novo Projeto' e define nome",

        "Sistema cria estrutura de pastas e abre interface multi-painel",

        "Discovery Agent se apresenta e faz primeira pergunta sobre a ideia do jogo",

        "Usuário descreve sua ideia em linguagem natural",

        "Agente faz perguntas de refinamento (gênero, plataforma, público-alvo)",

        "Sistema gera Pitch Document estruturado",

        "Usuário revisa documento e aprova",

        "Sistema desbloqueia Etapa 2 (Benchmark) e sugere continuar",

        "Benchmark Agent analisa mercado baseado no pitch aprovado",

        "Usuário revisa análise competitiva e aprova",

        "Sistema mostra progresso no pipeline (2/13 etapas completas)"

      ],

      "expectedOutcome": "Usuário entende o processo, tem primeiros documentos aprovados e confiança para continuar"

    },

    {

      "name": "Sessão de Trabalho - Retorno ao Projeto",

      "persona": "Vibe coder com projeto em andamento",

      "steps": [

        "Usuário abre aplicação e vê lista de projetos recentes",

        "Clica no projeto em andamento",

        "Sistema carrega interface com progresso atual (ex: 5/13 etapas)",

        "Sidebar mostra documentos já criados, pipeline mostra próxima etapa",

        "Usuário pode escolher: continuar próxima etapa ou revisar anterior",

        "Se continuar: agente da próxima etapa carrega com contexto do KB",

        "Se revisar: agente da etapa anterior carrega decisões passadas",

        "Usuário trabalha com agente por 30-60 minutos",

        "Sistema salva automaticamente progresso a cada interação",

        "Usuário aprova resultado e avança ou agenda próxima sessão",

        "Sistema atualiza pipeline visual e sugere próximos passos"

      ],

      "expectedOutcome": "Progresso consistente sem perda de contexto, flexibilidade para trabalhar no próprio ritmo"

    },

    {

      "name": "Revisão e Iteração de Decisões",

      "persona": "Criativo que teve insight novo",

      "steps": [

        "Usuário está na Etapa 8 (Quests) e percebe que narrativa não serve às mecânicas",

        "Clica na Etapa 5 (Lore) no pipeline para revisar",

        "Lore Writer carrega decisões anteriores sobre história do mundo",

        "Usuário explica novo insight e solicita mudanças específicas",

        "Agente refina lore mantendo coerência com outras decisões",

        "Sistema detecta que mudança afeta Etapas 6, 7 e 8",

        "Mostra preview do impacto: quais personagens e quests precisam ajuste",

        "Usuário aprova mudança entendendo consequências",

        "Sistema marca etapas afetadas como 'revalidação necessária'",

        "Usuário revisita cada etapa afetada com agentes apropriados",

        "Agentes sugerem ajustes baseados na nova lore",

        "Projeto volta à consistência com nova direção narrativa"

      ],

      "expectedOutcome": "Mudanças são propagadas de forma controlada, mantendo coerência do projeto"

    },

    {

      "name": "Geração e Aprovação de Assets",

      "persona": "Criativo na fase de direção artística",

      "steps": [

        "Usuário completa Etapa 9 (Art Direction) com estilo visual definido",

        "Art Director sugere gerar concept arts baseados nas diretrizes",

        "Sistema chama Pixellab API com prompts estruturados",

        "Concept arts aparecem no Preview Panel com metadados",

        "Usuário revisa cada asset: aprova, rejeita ou solicita variação",

        "Para assets rejeitados, especifica o que deve mudar",

        "Sistema regenera com prompts refinados",

        "Assets aprovados são salvos no projeto e versionados com Git LFS",

        "Sistema atualiza Asset Sheet com lista de todos os assets criados",

        "Usuário pode usar assets aprovados em outras etapas (storyboard, etc.)"

      ],

      "expectedOutcome": "Assets visuais consistentes com direção artística, aprovados pelo criador"

    },

    {

      "name": "Export Final do GDD",

      "persona": "Criativo que completou todas as etapas",

      "steps": [

        "Usuário completa Etapa 13 (GDD Final & Roadmap)",

        "Sistema consolida todos os documentos das 13 etapas",

        "Mostra preview do GDD completo com índice navegável",

        "Usuário revisa seções e pode fazer ajustes finais",

        "Clica 'Exportar GDD' e escolhe formato (PDF, Markdown, JSON)",

        "Sistema gera documento profissional com concept arts integrados",

        "Export inclui pasta separada com todos os assets organizados",

        "Sistema gera roadmap de desenvolvimento em fases",

        "Usuário recebe GDD completo pronto para apresentar ou implementar"

      ],

      "expectedOutcome": "Documentação profissional completa que pode ser usada para desenvolvimento ou apresentação"

    }

  ],

  "dataModel": {

    "entities": [

      {

        "name": "GameProject",

        "fields": [

          "id: uuid PRIMARY KEY",

          "name: varchar(255) NOT NULL",

          "description: text",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "updated_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "current_phase: integer NOT NULL DEFAULT 1 CHECK (current_phase >= 1 AND current_phase <= 13)",

          "status: varchar(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived'))",

          "user_id: uuid NOT NULL",

          "project_data: jsonb NOT NULL DEFAULT '{}'",

          "kb_vector_id: varchar(255)"

        ],

        "relationships": "GameProject belongsTo User, GameProject hasMany PhaseDocuments, GameProject hasMany GeneratedAssets, GameProject hasMany AgentConversations"

      },

      {

        "name": "User",

        "fields": [

          "id: uuid PRIMARY KEY",

          "email: varchar(255) UNIQUE NOT NULL",

          "username: varchar(100) UNIQUE NOT NULL",

          "password_hash: varchar(255) NOT NULL",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "last_login: timestamp",

          "api_keys: jsonb DEFAULT '{}'",

          "preferences: jsonb DEFAULT '{}'",

          "subscription_tier: varchar(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise'))"

        ],

        "relationships": "User hasMany GameProjects, User hasMany ApiUsageMetrics"

      },

      {

        "name": "PhaseDocument",

        "fields": [

          "id: uuid PRIMARY KEY",

          "project_id: uuid NOT NULL",

          "phase_number: integer NOT NULL CHECK (phase_number >= 1 AND phase_number <= 13)",

          "document_type: varchar(100) NOT NULL",

          "title: varchar(255) NOT NULL",

          "content: text NOT NULL",

          "status: varchar(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved', 'needs_revision'))",

          "agent_type: varchar(100) NOT NULL",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "updated_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "approved_at: timestamp",

          "metadata: jsonb DEFAULT '{}'",

          "version: integer NOT NULL DEFAULT 1"

        ],

        "relationships": "PhaseDocument belongsTo GameProject, PhaseDocument hasMany DocumentRevisions"

      },

      {

        "name": "DocumentRevision",

        "fields": [

          "id: uuid PRIMARY KEY",

          "document_id: uuid NOT NULL",

          "version: integer NOT NULL",

          "content: text NOT NULL",

          "changes_summary: text",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "created_by_agent: varchar(100) NOT NULL"

        ],

        "relationships": "DocumentRevision belongsTo PhaseDocument"

      },

      {

        "name": "AgentConversation",

        "fields": [

          "id: uuid PRIMARY KEY",

          "project_id: uuid NOT NULL",

          "agent_type: varchar(100) NOT NULL",

          "phase_number: integer NOT NULL",

          "conversation_data: jsonb NOT NULL",

          "status: varchar(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'))",

          "started_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "completed_at: timestamp",

          "message_count: integer NOT NULL DEFAULT 0"

        ],

        "relationships": "AgentConversation belongsTo GameProject, AgentConversation hasMany ConversationMessages"

      },

      {

        "name": "ConversationMessage",

        "fields": [

          "id: uuid PRIMARY KEY",

          "conversation_id: uuid NOT NULL",

          "role: varchar(20) NOT NULL CHECK (role IN ('user', 'agent', 'system'))",

          "content: text NOT NULL",

          "timestamp: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "metadata: jsonb DEFAULT '{}'",

          "sequence_number: integer NOT NULL"

        ],

        "relationships": "ConversationMessage belongsTo AgentConversation"

      },

      {

        "name": "GeneratedAsset",

        "fields": [

          "id: uuid PRIMARY KEY",

          "project_id: uuid NOT NULL",

          "asset_type: varchar(50) NOT NULL CHECK (asset_type IN ('sprite', 'tile', 'concept_art', 'audio', 'music'))",

          "file_path: varchar(500) NOT NULL",

          "file_name: varchar(255) NOT NULL",

          "prompt: text NOT NULL",

          "prompt_hash: varchar(64) NOT NULL",

          "generator: varchar(50) NOT NULL CHECK (generator IN ('pixellab', 'elevenlabs'))",

          "status: varchar(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'approved', 'rejected'))",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "approved_at: timestamp",

          "file_size_bytes: bigint",

          "generation_metadata: jsonb DEFAULT '{}'",

          "iteration_count: integer NOT NULL DEFAULT 1"

        ],

        "relationships": "GeneratedAsset belongsTo GameProject"

      },

      {

        "name": "KnowledgeBaseEntry",

        "fields": [

          "id: uuid PRIMARY KEY",

          "project_id: uuid NOT NULL",

          "content: text NOT NULL",

          "content_hash: varchar(64) NOT NULL",

          "embedding_vector: vector(1536)",

          "document_type: varchar(100) NOT NULL",

          "phase_number: integer",

          "agent_type: varchar(100)",

          "tags: text[] DEFAULT ARRAY[]::text[]",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "metadata: jsonb DEFAULT '{}'",

          "source_document_id: uuid"

        ],

        "relationships": "KnowledgeBaseEntry belongsTo GameProject, KnowledgeBaseEntry hasMany KBConnections"

      },

      {

        "name": "KBConnection",

        "fields": [

          "id: uuid PRIMARY KEY",

          "source_entry_id: uuid NOT NULL",

          "target_entry_id: uuid NOT NULL",

          "connection_type: varchar(100) NOT NULL",

          "strength: decimal(3,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1)",

          "created_at: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP"

        ],

        "relationships": "KBConnection belongsTo KnowledgeBaseEntry (source), KBConnection belongsTo KnowledgeBaseEntry (target)"

      },

      {

        "name": "ApiUsageMetric",

        "fields": [

          "id: uuid PRIMARY KEY",

          "user_id: uuid NOT NULL",

          "project_id: uuid",

          "api_provider: varchar(50) NOT NULL CHECK (api_provider IN ('claude', 'pixellab', 'elevenlabs'))",

          "endpoint: varchar(255) NOT NULL",

          "tokens_used: integer",

          "cost_usd: decimal(10,4)",

          "timestamp: timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",

          "response_time_ms: integer",

          "status: varchar(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout'))"

        ],

        "relationships": "ApiUsageMetric belongsTo User, ApiUsageMetric belongsTo GameProject"

      }

    ]

  },

  "apiEndpoints": [

    {

      "method": "POST",

      "path": "/api/v1/auth/login",

      "description": "Authenticate user and return JWT token",

      "auth": false,

      "requestBody": "{ email: string, password: string }",

      "response": "{ token: string, user: UserObject, expiresAt: timestamp }"

    },

    {

      "method": "POST",

      "path": "/api/v1/auth/register",

      "description": "Register new user account",

      "auth": false,

      "requestBody": "{ email: string, username: string, password: string }",

      "response": "{ token: string, user: UserObject }"

    },

    {

      "method": "GET",

      "path": "/api/v1/projects",

      "description": "List all projects for authenticated user",

      "auth": true,

      "requestBody": null,

      "response": "{ projects: ProjectObject[], total: number }"

    },

    {

      "method": "POST",

      "path": "/api/v1/projects",

      "description": "Create new game project",

      "auth": true,

      "requestBody": "{ name: string, description?: string }",

      "response": "{ project: ProjectObject }"

    },

    {

      "method": "GET",

      "path": "/api/v1/projects/:id",

      "description": "Get specific project with all documents and assets",

      "auth": true,

      "requestBody": null,

      "response": "{ project: ProjectObject, documents: DocumentObject[], assets: AssetObject[] }"

    },

    {

      "method": "PUT",

      "path": "/api/v1/projects/:id",

      "description": "Update project details",

      "auth": true,

      "requestBody": "{ name?: string, description?: string, currentPhase?: number, status?: string }",

      "response": "{ project: ProjectObject }"

    },

    {

      "method": "DELETE",

      "path": "/api/v1/projects/:id",

      "description": "Archive project (soft delete)",

      "auth": true,

      "requestBody": null,

      "response": "{ success: boolean }"

    },

    {

      "method": "GET",

      "path": "/api/v1/projects/:id/phases/:phaseNumber",

      "description": "Get all documents for specific phase",

      "auth": true,

      "requestBody": null,

      "response": "{ documents: DocumentObject[], phase: PhaseObject }"

    },

    {

      "method": "POST",

      "path": "/api/v1/projects/:id/documents",

      "description": "Create or update phase document",

      "auth": true,

      "requestBody": "{ phaseNumber: number, documentType: string, title: string, content: string, agentType: string }",

      "response": "{ document: DocumentObject }"

    },

    {

      "method": "PUT",

      "path": "/api/v1/documents/:id/approve",

      "description": "Approve document and advance to next phase",

      "auth": true,

      "requestBody": null,

      "response": "{ document: DocumentObject, nextPhase?: number }"

    },

    {

      "method": "GET",

      "path": "/api/v1/projects/:id/agents/:agentType/conversation",

      "description": "Get or create conversation with specific agent",

      "auth": true,

      "requestBody": null,

      "response": "{ conversation: ConversationObject, messages: MessageObject[] }"

    },

    {

      "method": "POST",

      "path": "/api/v1/conversations/:id/messages",

      "description": "Send message to agent and get response",

      "auth": true,

      "requestBody": "{ content: string, attachments?: FileObject[] }",

      "response": "{ message: MessageObject, agentResponse: MessageObject }"

    },

    {

      "method": "POST",

      "path": "/api/v1/projects/:id/assets/generate",

      "description": "Generate new asset using AI APIs",

      "auth": true,

      "requestBody": "{ assetType: string, prompt: string, generator: string, metadata?: object }",

      "response": "{ asset: AssetObject, generationId: string }"

    },

    {

      "method": "GET",

      "path": "/api/v1/assets/:id/status",

      "description": "Check asset generation status",

      "auth": true,

      "requestBody": null,

      "response": "{ status: string, progress?: number, downloadUrl?: string }"

    },

    {

      "method": "PUT",

      "path": "/api/v1/assets/:id/approve",

      "description": "Approve generated asset",

      "auth": true,

      "requestBody": "{ approved: boolean, feedback?: string }",

      "response": "{ asset: AssetObject }"

    },

    {

      "method": "GET",

      "path": "/api/v1/projects/:id/knowledge-base/search",

      "description": "Semantic search in project knowledge base",

      "auth": true,

      "requestBody": null,

      "response": "{ results: KBEntryObject[], query: string, similarity: number[] }"

    },

    {

      "method": "POST",

      "path": "/api/v1/projects/:id/knowledge-base/ingest",

      "description": "Add content to project knowledge base",

      "auth": true,

      "requestBody": "{ content: string, documentType: string, tags?: string[], metadata?: object }",

      "response": "{ entry: KBEntryObject }"

    },

    {

      "method": "GET",

      "path": "/api/v1/projects/:id/export/gdd",

      "description": "Export complete Game Design Document",

      "auth": true,

      "requestBody": null,

      "response": "{ gdd: object, downloadUrl: string, format: string }"

    },

    {

      "method": "GET",

      "path": "/api/v1/user/usage",

      "description": "Get API usage metrics and costs for user",

      "auth": true,

      "requestBody": null,

      "response": "{ usage: UsageObject[], totalCost: number, currentPeriod: object }"

    },

    {

      "method": "PUT",

      "path": "/api/v1/user/api-keys",

      "description": "Update user API keys for external services",

      "auth": true,

      "requestBody": "{ pixellab?: string, elevenlabs?: string, claude?: string }",

      "response": "{ success: boolean }"

    }

  ],

  "fileStructure": {

    "description": "Estrutura desktop multi-painel com Tauri + React, backend Node.js sidecar para orquestração de agentes",

    "directories": [

      "src-tauri/ - código Rust do Tauri (main process, IPC, sistema de arquivos)",

      "src/ - frontend React TypeScript",

      "src/components/ - componentes UI reutilizáveis (shadcn/ui)",

      "src/components/panels/ - painéis especializados (DocumentViewer, AssetPreview, etc)",

      "src/components/agents/ - interfaces de chat dos 8 agentes",

      "src/hooks/ - hooks React customizados",

      "src/lib/ - utilitários e configurações",

      "src/types/ - definições TypeScript",

      "src/stores/ - estado global (Zustand)",

      "backend/ - Node.js sidecar para orquestração",

      "backend/agents/ - implementação dos 8 agentes LLM",

      "backend/kb/ - Knowledge Base semântico (ChromaDB)",

      "backend/apis/ - integrações Claude, Pixellab, ElevenLabs",

      "backend/cache/ - sistema de cache de assets",

      "backend/projects/ - gestão de projetos locais",

      "public/ - assets estáticos",

      "dist/ - build de produção",

      "docs