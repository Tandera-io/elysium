---
tags: [index]
---

# Elysium — Documentation Vault

This is an [Obsidian](https://obsidian.md/) vault. Open the folder as a vault to get backlinks and graph view.

## Phase status

| Fase | Tema                            | Status          |
| ---- | ------------------------------- | --------------- |
| 0    | Bootstrap & Segurança           | 🟢 concluída    |
| 1    | Mundo vazio + câmera isométrica | 🟢 concluída    |
| 2    | Player controller               | 🟢 concluída    |
| 3    | Pipeline Meshy                  | 🟢 concluída    |
| 4    | Loop de fazenda mínimo          | 🟢 concluída    |
| 5    | Inventário + UI                 | 🟢 concluída    |
| 6    | Ciclo de tempo                  | 🟢 concluída    |
| 7    | NPCs + diálogo LLM              | 🟢 concluída    |
| 8    | Economia circular               | 🟢 concluída    |
| 9    | Quest emergente                 | 🟡 em progresso |
| 10   | Save/Load (IndexedDB)           | ⚪ pendente     |
| 11   | Conteúdo das 3 zonas (Meshy)    | ⚪ pendente     |
| 12   | Polish, tutorial, build final   | ⚪ pendente     |

## Architecture

- [[overview]]

## Systems

(none yet — added from Fase 4 onwards)

## Content

(none yet — added from Fase 7 onwards)

## Pipelines

(none yet — added in Fase 3)

## Decisions (ADRs)

- [[ADR-0001-stack]] — stack escolhida (Vite + R3F + Hono + pnpm)
- [[ADR-0002-env-resolution]] — fallback para `.env` raiz de NGS 2.0
- [[ADR-0003-meshy-pipeline]] — pipeline Meshy com cache content-addressed

## Pipelines

- [[meshy-asset-pipeline]] — visão geral
- [[meshy-prompt-templates]] — templates de prompt
