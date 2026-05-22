# Elysium

RPG 3D isométrico de fazenda inspirado em Stardew Valley, diferenciado por:

- **NPCs com LLM + memória persistente** — cada NPC lembra de interações e tem personalidade evolutiva
- **Economia circular multi-ator** — preços derivam de oferta/demanda real entre produtores e consumidores
- **Progressão orgânica** — sem barras de XP, sem questline forçada; habilidades emergem do uso
- **Liberdade de playstyle** — fazendeiro, comerciante, explorador, social: o jogador escolhe

## Stack

| Camada    | Tecnologia                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Cliente   | Vite 5 · React 18 · TypeScript strict · @react-three/fiber · drei · rapier · Zustand · Tailwind · TanStack Query · Dexie |
| Servidor  | Hono em Node 22 (proxy de chaves Anthropic + Meshy)                                                                      |
| Qualidade | ESLint 9 (flat) · Prettier · Vitest · Playwright · Husky + lint-staged                                                   |

## Quickstart

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis (ou herdar do .env raiz de NGS 2.0)
cp .env.example .env
# Edite .env com MESHY_API_KEY e ANTHROPIC_API_KEY

# 3. Rodar cliente + servidor juntos
pnpm dev
# Cliente:  http://localhost:5173
# Servidor: http://localhost:3001/api/health
```

## Layout

```
elysium/
├── apps/
│   ├── client/   # Vite + R3F (game frontend)
│   └── server/   # Hono (proxy de APIs externas)
├── packages/
│   └── shared/   # Tipos compartilhados client ↔ server
├── scripts/      # CLIs (asset generation, economy audit, seed)
└── docs/obsidian/  # Vault de design com ADRs
```

## Scripts

| Comando          | O que faz                                                  |
| ---------------- | ---------------------------------------------------------- |
| `pnpm dev`       | Sobe cliente e servidor em paralelo                        |
| `pnpm build`     | Build de produção de todos os workspaces                   |
| `pnpm lint`      | ESLint em todo o repo                                      |
| `pnpm typecheck` | TypeScript em todos os workspaces                          |
| `pnpm test`      | Vitest em todos os workspaces                              |
| `pnpm ci`        | Lint + typecheck + test + build (porta de qualidade local) |
| `pnpm format`    | Prettier em todo o repo                                    |

## Documentação

A pasta `docs/obsidian/` é um vault Obsidian funcional. Abra ali para ver decisões arquiteturais (ADRs), notas de sistemas e roadmap de fases.

## Pilares de design (não-negociáveis)

1. Liberdade de playstyle — sistemas modulares
2. Progressão orgânica — sem XP global
3. NPCs vivos — diálogo via LLM, memória persistente
4. Economia circular — preços dinâmicos
5. Charme isométrico — câmera ortográfica fixa
