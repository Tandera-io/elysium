---
tags: [pipeline, meshy, prompts]
---

# Meshy prompt templates

Templates de prompt usados em geração. Sempre testar em preview mode antes de refinar.

## NPC humano (T-pose, character)

```
stylized 3d character, [role], [body_type], [clothing],
warm cartoon aesthetic, isometric game asset,
flat shading, low-poly, T-pose, white background, no shadow
```

Variáveis:

- `[role]`: padeira, ferreiro, fazendeiro, mercador, etc.
- `[body_type]`: petite woman, tall lean man, sturdy older woman, ...
- `[clothing]`: apron with flour stains, leather smock, straw hat, ...

Exemplo (Marina):

```
stylized 3d character, baker woman in her 40s, average build,
white apron with flour stains over a yellow dress,
warm cartoon aesthetic, isometric game asset,
flat shading, low-poly, T-pose, white background, no shadow
```

## Item / crop

```
stylized 3d [item], cartoon aesthetic, vibrant colors,
isometric game asset, flat shading, low-poly,
floating in neutral pose, white background, no shadow
```

Exemplos:

- "stylized 3d wheat sheaf, cartoon ..."
- "stylized 3d wooden crate with apples, cartoon ..."
- "stylized 3d ripe tomato plant in a small clay pot, cartoon ..."

## Prop de cenário

```
stylized 3d [prop], outdoor village setting,
cartoon aesthetic, weathered surface,
isometric game asset, flat shading, low-poly,
floating in neutral pose, white background
```

Exemplos:

- "stylized 3d wooden well with mossy stones ..."
- "stylized 3d hand-painted wooden sign post ..."

## Anti-patterns (negative_prompt)

```
realistic, photorealistic, sharp shadows,
ground shadow, complex background,
text, watermark, signature,
multiple subjects, walking pose, action pose
```
