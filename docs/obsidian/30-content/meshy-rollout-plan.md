---
tags: [content, meshy, pending-approval]
---

# Plano de rollout de assets Meshy (Fase 11)

⚠️ **Aguarda aprovação humana** antes de executar — geração em lote (>3 assets) exige confirmação do usuário pelo prompt mestre §10.2.

## Custo estimado

| Pacote              | Assets | Créditos est. (preview, ~5 cada) |
| ------------------- | ------ | -------------------------------- |
| 7 NPCs restantes    | 7      | ~35                              |
| 5 culturas (mature) | 5      | ~25                              |
| 8 itens artesanais  | 8      | ~40                              |
| 8 props de cenário  | 8      | ~40                              |
| **Total preview**   | 28     | **~140**                         |

Refine pass (após aprovar visual) custa ~10/asset → +280 créditos se TODOS forem refinados.

## Prompts pendentes (resumo)

Templates em [[meshy-prompt-templates]]. Lista resumida:

**NPCs** (7): ferraz, dorinha, pedro, nina, arnaldo, sofia, romeu — usa template "NPC humano (T-pose, character)".

**Crops maduros** (5):

1. `stylized cartoon wheat sheaf, golden grain, low-poly, isometric, white background`
2. `stylized cartoon ripe red tomato cluster on green vine, low-poly, isometric, white background`
3. `stylized cartoon orange pumpkin with curly stem, low-poly, isometric, white background`
4. `stylized cartoon corn cob with husk leaves peeled back, low-poly, isometric, white background`
5. `stylized cartoon red strawberry with green leaves, low-poly, isometric, white background`

**Itens artesanais** (8): pao_frances, bolo_fuba, queijo, geleia_morango, panela_barro, foice_madeira, lanterna, balde_madeira

**Props de cenário** (8): poço, banca_madeira, cerca_madeira, placa_madeira, baú_carvalho, fogueira, fardo_palha, cogumelo_grande

## Como executar (quando aprovado)

```bash
# Single example
pnpm asset:generate --prompt "stylized cartoon ripe tomato cluster ..." --name tomato_mature

# Bulk script (Phase 11, to be added when approved)
pnpm content:rollout
```

## Critérios de aceitação visual

- Cor coerente com o crop/item
- T-pose para NPCs (sem braços levantados ou poses extremas)
- Polycount alvo: 5–15k tris por modelo
- Sem ombras embutidas (`no shadow` no prompt)
- Branco/transparente no fundo

Se >2 assets falharem o critério, abrir ADR e iterar nos templates antes de regerar tudo.
