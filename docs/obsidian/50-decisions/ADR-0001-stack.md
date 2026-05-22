---
id: ADR-0001
date: 2026-05-22
status: accepted
tags: [decision, stack]
---

# ADR-0001: Stack escolhida

## Contexto

Elysium é um RPG 3D isométrico browser-first com NPCs LLM e economia circular emergente. A stack precisa servir aos cinco pilares (P1 liberdade, P2 progressão orgânica, P3 NPCs vivos, P4 economia circular, P5 charme isométrico) e permitir iteração rápida com qualidade.

## Opções consideradas

- **A — Unity ou Unreal:** ecossistema maduro de RPG, mas desktop-only por padrão; barreira de iteração maior; conflita com browser-first.
- **B — Phaser ou PixiJS (2D):** ágil, mas perde charme 3D isométrico (P5: profundidade, sombras, parallax).
- **C — Vite + React + Three.js (R3F):** browser-native, hot reload instantâneo, ecossistema TS de primeira. R3F + drei + rapier dão 3D declarativo. **Stack obrigatória pelo prompt mestre (Seção 2).**

## Decisão

Adotar Opção C, conforme prompt mestre. Versões concretas escolhidas em mai/2026:

| Pacote              | Versão                                        |
| ------------------- | --------------------------------------------- |
| Vite                | 5.4 (v6 ainda estabilizando)                  |
| React               | 18.3                                          |
| TypeScript          | 5.7, modo strict + `noUncheckedIndexedAccess` |
| @react-three/fiber  | 8.17                                          |
| @react-three/drei   | 9.121                                         |
| @react-three/rapier | 1.5                                           |
| three               | 0.171                                         |
| Zustand             | 5.0                                           |
| Tailwind            | 3.4 (v4 mudando muito ainda)                  |
| TanStack Query      | 5.62                                          |
| Dexie               | 4.0                                           |
| Hono                | 4.6                                           |
| @hono/node-server   | 1.13                                          |
| @anthropic-ai/sdk   | 0.32                                          |
| ESLint              | 9.16 com flat config + typescript-eslint 8.18 |
| Vitest              | 2.1                                           |
| Husky               | 9.1                                           |
| pnpm                | 10.33                                         |
| Node                | 22                                            |

Bun foi descartado: não está instalado nesta máquina (verificado com `which bun`).

## Consequências

**Positivas**

- R3F componentiza cenas 3D declarativamente — facilita testar, refatorar, isolar sistemas (P1)
- Vite dev proxy resolve CORS naturalmente entre `:5173` e `:3001`
- pnpm workspaces permitem `@elysium/shared` source-only (sem build step entre client e server)
- Hono é leve e Node-compatible — perfeito para proxy de chaves API
- Flat config ESLint v9 isola Elysium de configurações herdadas do diretório pai

**Negativas**

- R3F tem curva de aprendizado se vier de Three.js cru
- Bundle pode crescer; meta: < 5MB gzipped (gate de qualidade)
- Tailwind 3 = decisão revisada se v4 estabilizar antes da Fase 12

## Reversão

Se R3F se mostrar inadequado em fases posteriores (perf, complexidade), Three.js cru ainda é viável dentro do mesmo Vite. ESLint flat permite descartar a v9 e voltar a `.eslintrc.cjs` se necessário (improvável).

## Links

- [[overview]]
- [[ADR-0002-env-resolution]]
