---
id: ADR-0003
date: 2026-05-22
status: accepted
tags: [decision, pipeline, meshy]
---

# ADR-0003: Pipeline de assets Meshy

## Contexto

Elysium precisa de modelos 3D para NPCs, itens, crops, props. Equipe é pequena (1 dev + LLM). Modelagem manual é cara demais; gerar via IA é o caminho. Meshy.ai oferece text-to-3d com GLB direto.

## Opções consideradas

- **A — Modelagem manual em Blender:** controle total mas inviável em tempo (10+ NPCs + dezenas de itens)
- **B — Asset packs prontos (Kenney, Synty):** rápido mas estética monolítica, viola pilar P5 ("charme próprio")
- **C — Meshy.ai text-to-3d:** prompts customizados → modelos GLB únicos. **Stack obrigatória pelo prompt mestre.**

## Decisão

Opção C com:

1. **Backend proxy obrigatório** — chaves NUNCA no cliente; servidor Hono em `/api/meshy/*` faz as chamadas
2. **Cache content-addressed** — hash sha256 do `prompt+mode+art_style` evita regeneração acidental
3. **Geração via CLI** (`pnpm asset:generate`) — disparado intencionalmente, não em runtime do jogo
4. **Preview mode** como default (5 créditos, ~30-60s) — Refine só para assets aprovados
5. **Manifest JSON** ao lado do `.glb` registra prompt original + taskId + thumbnail para reprodutibilidade

## Consequências

**Positivas**

- Geração reproduzível: rodar `pnpm asset:generate --prompt "..."` duas vezes hit no cache
- Auditoria de custos: cache trackeable; manifests dão paper trail
- Migração futura para outro provider: trocar `MeshyClient` mantém o restante intacto

**Negativas / Riscos**

- Qualidade de saída varia — alguns prompts geram artefatos. Mitigação: prompt templates em [[meshy-prompt-templates]]
- Créditos custam dinheiro real. Mitigação:
  - Cache hit é gratuito
  - Lote >3 assets pausa o agente para confirmação humana (ver Seção 10.2 do prompt mestre)
- API rate limits e falhas transitórias. Mitigação: retry com backoff exponencial até 5 tentativas

## Limites operacionais

- **Sem geração em runtime do jogo**: tudo é gerado offline via CLI e cacheado
- **Versionamento de assets**: ainda não há mecanismo para "regerar e substituir" — assume-se que o hash do prompt é estável

## Reversão

Trocar `MeshyClient` por outro provider (ex: Tripo, Stability) requer apenas reimplementar o mesmo contrato (`createTask`, `pollUntilDone`, `downloadResult`). Cache e endpoints permanecem.

## Links

- [[meshy-asset-pipeline]]
- [[meshy-prompt-templates]]
- [[ADR-0001-stack]]
