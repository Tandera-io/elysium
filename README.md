# Elysium Build Platform

Plataforma desktop para desenvolvimento de jogos indie via conversação com 8 agentes especialistas de IA, estruturada em 13 etapas que vão do pitch inicial ao GDD final exportável.

Construída com **Tauri 2.0 + React 19 + TypeScript + Tailwind** e usa o **Claude Code CLI** como motor de todos os agentes (invocado via `claude -p --output-format stream-json`), mais **Pixellab** para concept arts/sprites e **ElevenLabs** para trilha/SFX. Toda a persistência é 100% local: SQLite para projetos/conversas/metadata e um Knowledge Base vetorial local usando `@xenova/transformers` (embeddings MiniLM).

## Pré-requisitos

- **Node.js 20+** e **npm**
- **Rust toolchain** (`rustup`) — necessário para compilar o núcleo Tauri
- **Visual Studio Build Tools 2022** com workload C++ (Windows)
- **Claude Code CLI**: `npm install -g @anthropic-ai/claude-code` (depois execute `claude` uma vez no terminal para fazer login)

## Setup

```bash
npm install
# opcional: copie .env.example para .env e preencha chaves
npm run tauri:dev
```

A primeira compilação Rust demora alguns minutos. As subsequentes são rápidas.

## Variáveis de ambiente (opcional)

Crie um `.env` na raiz:

```env
VITE_PIXELLAB_API_KEY=...
VITE_PIXELLAB_API_URL=https://api.pixellab.ai/v1
VITE_ELEVENLABS_API_KEY=...
VITE_ELEVENLABS_API_URL=https://api.elevenlabs.io/v1
VITE_OPENAI_API_KEY=...      # opcional, não usado pelos agentes
```

Alternativamente, cadastre as chaves pela tela **Settings / Export** dentro do app (elas ficam armazenadas no SQLite local).

## Arquitetura

```
┌───────────────────────────────────────────────────────────────────────────┐
│ React 19 Renderer (multi-painel Unity-like)                               │
│  ├─ Sidebar: etapas + painéis especializados                              │
│  ├─ Center: docs (Markdown) + ReactFlow + KB Explorer + Assets            │
│  ├─ Agent Chat: streaming de Claude CLI                                   │
│  └─ Pipeline: 13 etapas horizontais                                        │
├───────────────────────────────────────────────────────────────────────────┤
│ Tauri Rust Core                                                            │
│  ├─ claude_prompt_stream → spawn claude -p, emite eventos de streaming    │
│  ├─ projects / assets / SQLite / filesystem                               │
│  └─ migrations/001_initial.sql                                             │
├───────────────────────────────────────────────────────────────────────────┤
│ Dados (100% local)                                                         │
│  ├─ SQLite (projects, docs, conversations, messages, assets, kb_entries)  │
│  ├─ kb.json por projeto (índice vetorial MiniLM)                           │
│  └─ assets/ com imagens e áudio                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

## Os 13 estágios e 8 agentes

| # | Etapa | Agente | Modelo |
|---|---|---|---|
| 1 | Pitch & Visão | Discovery | `opus` |
| 2 | Benchmark | Benchmark | `sonnet` |
| 3 | Core Loop & Pilares | Mechanics Designer | `opus` |
| 4 | MDA & Elemental Tetrad | Mechanics Designer | `opus` |
| 5 | Lore & Worldbuilding | Lore Writer | `opus` |
| 6 | Personagens & Facções | Lore Writer | `opus` |
| 7 | Níveis & Progressão | Level Designer | `sonnet` |
| 8 | Quests & Diálogos | Level Designer | `sonnet` |
| 9 | Direção de Arte | Art Director | `sonnet` |
| 10 | Storyboard & Concept Arts | Art Director (+ Pixellab) | `sonnet` |
| 11 | Direção de Áudio | Audio Director | `sonnet` |
| 12 | Produção de Assets | Asset Producer (+ Pixellab + ElevenLabs) | `sonnet` |
| 13 | GDD Final & Roadmap | Asset Producer | `sonnet` |

### Política de modelos

Para distribuir melhor os tokens (cotas do Claude Max / custos de API), cada
agente roda num modelo dedicado, definido em `src/agents/agents.ts` no campo
`model`. O Claude Code CLI recebe `--model <alias>` por chamada.

- **`opus`** — usado onde criação crua, julgamento crítico e coerência
  sistêmica são não-negociáveis:
  - `Discovery` (fundação do projeto, precisa recusar pitches vagos),
  - `Mechanics Designer` (core loop + MDA; mecânica fraca mata o jogo),
  - `Lore Writer` (escrita criativa de alto nível, vozes de personagem).
- **`sonnet`** — usado onde o trabalho é estruturado, templado, ou consiste
  em integrar KB e gerar prompts para outras APIs:
  - `Benchmark` (SWOT / Blue Ocean Canvas — frameworks fixos),
  - `Level Designer` (Kishōtenketsu / gating / pacing — lógica espacial),
  - `Art Director` (moodboard + prompts Pixellab enxutos),
  - `Audio Director` (prompts ElevenLabs enxutos),
  - `Asset Producer` (consolidação + roadmap + GDD final — trabalho
    executivo, não criativo).

Para trocar o modelo de um agente, edite `model` no objeto correspondente em
`src/agents/agents.ts`. Valores aceitos: `opus`, `sonnet`, `haiku` (ver
`AgentModel` em `src/agents/base.ts`).

## Fluxo principal

1. **Home**: lista de projetos; criar novo abre o workspace imediatamente.
2. **Workspace**: etapa ativa aparece no painel central (documento), agente correspondente no chat à direita.
3. **Conversa**: você digita → o runner pega top-6 chunks do KB → envia tudo como system prompt para `claude -p`. Claude responde em streaming via canal de eventos do Tauri.
4. **Documento**: quando o agente emite `<document title="...">…</document>`, o bloco é extraído e salvo como `phase_documents.draft` automaticamente.
5. **Aprovação**: ao clicar **Aprovar**, o documento é chunked + embedded + inserido no `kb.json` e no SQLite. Etapas posteriores dependentes ganham status `needs_revision` se já estavam aprovadas.
6. **Assets**: após a Etapa 9 aprovada, o painel **Concept Arts** habilita a geração no Pixellab; após a Etapa 11, o **Áudio** habilita o ElevenLabs.
7. **Export**: a qualquer momento (e especialmente na Etapa 13), o usuário exporta o GDD consolidado em Markdown ou JSON para `projects/<id>/exports/`.

## Scripts

```bash
npm run dev           # Vite dev sem Tauri (use para trabalhar a UI)
npm run tauri:dev     # app desktop (requer Rust + MSVC + Claude CLI)
npm run build         # build frontend
npm run tauri:build   # build do instalador desktop
```

## Onde os dados ficam

```
%AppData%/com.elysium.buildplatform/
├─ elysium.db                # SQLite principal
└─ projects/
   └─ <project-id>/
      ├─ kb.json             # índice vetorial MiniLM
      ├─ assets/
      │  ├─ concept/
      │  ├─ sprite/
      │  ├─ tile/
      │  └─ audio/
      ├─ docs/
      └─ exports/
```

## Limitações atuais e próximos passos

- Export PDF ainda não implementado (Markdown e JSON sim). Dependente de `react-pdf` ou Puppeteer-core.
- Git LFS e auto-commit por etapa aprovada não foram ligados — estrutura preparada no `src-tauri/capabilities/default.json`.
- Os fallbacks de LLM (OpenAI, GPT-4) estão plumbados via `lib/apis/env.ts` mas não chamados; a UI assume Claude CLI.
