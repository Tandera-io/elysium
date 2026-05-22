---
tags: [pipeline, meshy, assets]
---

# Meshy asset pipeline

## Visão geral

```
prompt textual ──► scripts/generate-asset.ts ──► POST /api/meshy/generate
                                                          │
                                          AssetCache hash → cache miss?
                                                          │
                                                MeshyClient.createTextTo3DTask
                                                          │
                                                pollUntilDone (status SUCCEEDED)
                                                          │
                                                downloadResult(glb)
                                                          │
                                                AssetCache.writeManifest
                                                          │
                                          apps/client/public/assets/cache/<hash>.glb
                                                          │
                                                          ▼
                                  useGLTF('/assets/cache/<hash>.glb') no cliente
```

## Componentes

| Arquivo                                       | Função                                              |
| --------------------------------------------- | --------------------------------------------------- |
| `apps/server/src/lib/meshy-client.ts`         | Cliente Meshy v2 com retry + polling                |
| `apps/server/src/lib/asset-cache.ts`          | Cache content-addressed (sha256 do prompt)          |
| `apps/server/src/routes/meshy.ts`             | `POST /api/meshy/generate` + `GET /api/meshy/cache` |
| `scripts/generate-asset.ts`                   | CLI: `pnpm asset:generate --prompt "..."`           |
| `apps/client/src/engine/loader/GltfLoader.ts` | `useAsset(path)` consome do cache no cliente        |

## Chave de cache

Hash sha256 dos primeiros 16 chars de `prompt|mode|art_style`, normalizado (lowercase + trim). Mudança em qualquer um dos três regera.

## Manifest

`<hash>.json` ao lado do `<hash>.glb`:

```json
{
  "id": "<hash>",
  "prompt": "...",
  "mode": "preview",
  "art_style": "cartoon",
  "meshy_task_id": "task_xyz",
  "glb_path": "assets/cache/<hash>.glb",
  "created_at": "2026-05-22T15:30:00.000Z",
  "thumbnail_url": "https://meshy/..."
}
```

## Custo

Cada geração de **preview** custa ~5 créditos Meshy. **Refine** custa ~10 créditos. Cache hits são gratuitos. Ver template de prompts em [[meshy-prompt-templates]].

## Limites

- Toda geração custa créditos — antes de gerar em lote (>3 assets), pause e confirme com o usuário.
- Em caso de FAILED por qualidade visual, registrar em ADR antes de regenerar.

## Próximos passos

- Fase 11: lote de assets das 3 zonas
- Refine pass para NPCs principais (Marina, Tio Bento) após preview aprovado
