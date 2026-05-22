---
tags: [architecture]
---

# Architecture overview

## As-Is (entrada da Fase 0)

Subdiretório `elysium/` vazio dentro de `/Users/ngs/Desktop/NGS 2.0/`. NGS 2.0 (outro monorepo pnpm de propósito não relacionado) coexiste no diretório pai, mas é mantido intacto.

## To-Be (saída da Fase 0)

Monorepo pnpm funcional com:

- `apps/server/` — Hono em Node 22 escutando em `:3001`, expõe `/api/health` retornando JSON tipado
- `apps/client/` — Vite 5 + React 18 em `:5173`, proxy `/api` → `:3001`
- `packages/shared/` — TypeScript types cross-cutting (source-only)
- Lint (ESLint flat v9), typecheck (TS strict + `noUncheckedIndexedAccess`), test (Vitest), build — todos verdes
- Husky pre-commit bloqueia commit acidental de segredos
- `git init` apenas dentro de `elysium/` (raiz pai NGS 2.0 não é versionada)

## Gap (o que esta fase fecha)

- Criar arquivos de configuração: `package.json`, `tsconfig.base.json`, `eslint.config.js`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `.prettierrc.json`, `.npmrc`
- Criar `apps/server/` com Hono + endpoint health
- Criar `apps/client/` com Vite + React + Tailwind básico fetchando `/api/health`
- Criar `packages/shared/` com tipos
- Pre-commit hook + scanner de segredos
- `docs/obsidian/` com ADR-0001 e ADR-0002

## Risks tracked

| Risco                                           | Mitigação                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ESLint do NGS 2.0 (pai) "vazando" para Elysium  | `eslint.config.js` flat self-contained; pnpm install isola `node_modules` em `elysium/`         |
| Porta `:3001` ocupada por NGS 2.0               | NGS 2.0 usa `:3000` (visto em `../.env.example`). Sem colisão.                                  |
| Porta `:5173` ocupada por NGS 2.0 (também Vite) | Vite usa `strictPort: false`, escolhe `:5174` se ocupada                                        |
| `pnpm install` puxar lockfile da raiz pai       | Cada `pnpm install` em `elysium/` cria `elysium/pnpm-lock.yaml` isolado                         |
| Husky precisar de git já inicializado           | Ordem do bootstrap: criar arquivos → `git init` → `pnpm install` (que dispara `prepare: husky`) |

## Data flow (Fase 0)

```
Browser (:5173) ──fetch /api/health──► Vite dev proxy ──► localhost:3001/api/health ──► Hono ──► JSON
```

`apps/server/src/lib/env.ts` resolve `.env` na ordem:

1. `elysium/apps/server/.env` (raro)
2. `elysium/.env` (recomendado)
3. `../.env` (NGS 2.0 root — fallback compartilhado)

Ver [[ADR-0002-env-resolution]].

## Próximos passos (Fase 1)

R3F mount, câmera ortográfica isométrica, grid tile-based 50x50, luz ambiente + direcional, skybox simples. Validar com screenshot Playwright (a ser adicionado na Fase 1).
