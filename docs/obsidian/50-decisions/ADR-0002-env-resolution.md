---
id: ADR-0002
date: 2026-05-22
status: accepted
tags: [decision, security, env]
---

# ADR-0002: Estratégia de resolução de `.env`

## Contexto

Elysium vive em `/Users/ngs/Desktop/NGS 2.0/elysium/`. O `.env` raiz de NGS 2.0 (em `/Users/ngs/Desktop/NGS 2.0/.env`) já possui `ANTHROPIC_API_KEY` e o usuário adicionou `MESHY_API_KEY` ali. Duplicar chaves em dois `.env` é propenso a divergir e mantém maior superfície de erro.

## Opções consideradas

- **A — Exigir `elysium/.env` próprio:** isolamento total, mas duplicação manual; usuário pode esquecer de propagar mudanças.
- **B — Symlink `elysium/.env → ../.env`:** simples, mas symlinks têm pegadinhas (Windows, Docker, alguns CI). Pode ser commitado acidentalmente. Confuso para humanos.
- **C — Fallback no loader:** `apps/server/src/lib/env.ts` tenta carregar `dotenv` em uma cadeia de caminhos, primeiro que existir vence. Loga origem.

## Decisão

Opção C — fallback no loader. Ordem:

1. `elysium/apps/server/.env` (per-app, raro)
2. `elysium/.env` (recomendado quando Elysium for um projeto independente)
3. `../.env` (NGS 2.0 root — atual)

O loader em `apps/server/src/lib/env.ts` emite log explícito sobre qual arquivo foi usado, para evitar surpresa silenciosa.

## Consequências

**Positivas**

- Zero duplicação enquanto Elysium vive dentro de NGS 2.0
- Migração futura indolor: basta criar `elysium/.env` e a precedência muda automaticamente
- Loader transparente sobre origem (`[env] Loaded /path`)

**Negativas / Riscos**

- Coupling implícito: alguém olhando só o Elysium não vê de onde vem a chave
  - **Mitigação:** documentação neste ADR + log explícito no boot
- Risco de carregar `.env` errado se houver `.env` órfão em algum nível
  - **Mitigação:** `.gitignore` cobre `.env` em qualquer profundidade; loader loga caminho

## Reversão

Criar `elysium/.env` explícito desativa o fallback (precedência maior). Sem mudança de código.

## Links

- [[ADR-0001-stack]]
- [[overview]]
