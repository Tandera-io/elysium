// Style reference lock: carrega um concept art aprovado do projeto e retorna
// seu conteúdo em base64 para ser passado ao Pixellab como `style_image`.
// Isso garante consistência visual entre concept arts, sprites, tiles, UI e
// VFX — todos herdam a paleta/stroke/proporção do concept escolhido.
//
// Heurística de seleção (em ordem):
//   1. Primeiro concept art aprovado com categoria "character" OU "ui"
//      (tipicamente o protagonista / key visual).
//   2. Fallback: primeiro concept art aprovado qualquer.
//   3. Null: projeto ainda não tem concept approved → generatePixellab roda
//      sem styleRef (primeira geração serve de seed).

import { invoke } from "@tauri-apps/api/core";
import { assetsRepo } from "./db";
import { loadCanon, findBySlug } from "./canon";
import type { GeneratedAsset } from "@/types/domain";

interface CacheEntry {
  projectId: string;
  assetId: string;
  base64: string;
  loadedAt: number;
}

const cache = new Map<string, CacheEntry>(); // projectId -> entry
const CACHE_TTL_MS = 5 * 60 * 1000;

function toRelative(filePath: string, projectId: string): string | null {
  // file_path é absoluto (ex: "$APPDATA/.../projects/<id>/assets/concept/x.png").
  // Precisamos da parte relativa ao diretório do projeto.
  const marker = `projects\\${projectId}\\`;
  const markerUnix = `projects/${projectId}/`;
  const idx = filePath.lastIndexOf(marker);
  if (idx >= 0) {
    return filePath.slice(idx + marker.length).replace(/\\/g, "/");
  }
  const idxUnix = filePath.lastIndexOf(markerUnix);
  if (idxUnix >= 0) {
    return filePath.slice(idxUnix + markerUnix.length);
  }
  return null;
}

function pickStyleAsset(assets: GeneratedAsset[]): GeneratedAsset | null {
  const approved = assets.filter((a) => a.status === "approved");
  if (approved.length === 0) return null;

  // Tentamos inferir categoria via metadata JSON (quando presente) ou prompt.
  const preferred = approved.find((a) => {
    const haystack = `${a.prompt} ${a.generation_metadata ?? ""}`.toLowerCase();
    return (
      haystack.includes("character") ||
      haystack.includes("protagonist") ||
      haystack.includes("hero") ||
      haystack.includes("portrait") ||
      haystack.includes("ui ") ||
      haystack.includes("hud")
    );
  });
  if (preferred) return preferred;
  // Fallback: primeiro concept_art aprovado (listByProject ordena por data desc).
  const concept = approved.find((a) => a.asset_type === "concept_art");
  return concept ?? approved[0] ?? null;
}

/**
 * Busca e cacheia o style reference do projeto. Retorna base64 puro (sem
 * prefixo `data:`), pronto para `style_image.base64` do Pixellab.
 */
export async function getStyleRef(
  projectId: string,
  force = false
): Promise<string | null> {
  const cached = cache.get(projectId);
  if (
    !force &&
    cached &&
    Date.now() - cached.loadedAt < CACHE_TTL_MS
  ) {
    return cached.base64;
  }

  const assets = await assetsRepo.listByProject(projectId);
  let chosen = pickStyleAsset(assets);

  // Fallback: se DB sem approved mas canon tem conceptAssetIds populados
  // (ex: DB resetado mas canon.json preservado), resolve direto pelo canon.
  if (!chosen) {
    try {
      const canon = await loadCanon(projectId);
      const preferKinds = ["character", "npc", "boss"] as const;
      const candidate =
        canon.entries.find(
          (e) =>
            preferKinds.includes(e.kind as (typeof preferKinds)[number]) &&
            e.conceptAssetIds &&
            e.conceptAssetIds.length > 0
        ) ??
        canon.entries.find(
          (e) => e.conceptAssetIds && e.conceptAssetIds.length > 0
        );
      if (candidate?.conceptAssetIds?.[0]) {
        const viaCanon = await assetsRepo.findById(candidate.conceptAssetIds[0]);
        if (viaCanon) chosen = viaCanon;
      }
    } catch (e) {
      console.warn(`[styleRef] canon fallback falhou:`, e);
    }
  }

  if (!chosen) {
    console.warn(
      `[styleRef] nenhum concept approved encontrado para ${projectId} — ` +
        `sprites/tiles serão gerados SEM lock visual (drift de paleta/estilo esperado)`
    );
    return null;
  }

  const rel = toRelative(chosen.file_path, projectId);
  if (!rel) return null;

  try {
    const base64 = await invoke<string>("read_binary_asset", {
      projectId,
      relative: rel,
    });
    cache.set(projectId, {
      projectId,
      assetId: chosen.id,
      base64,
      loadedAt: Date.now(),
    });
    return base64;
  } catch {
    return null;
  }
}

export function invalidateStyleRef(projectId?: string): void {
  if (projectId) cache.delete(projectId);
  else cache.clear();
}

// Cache secundário: concept por canon_slug (TTL curto — muitos slugs).
const slugCache = new Map<string, { assetId: string; base64: string; loadedAt: number }>();
const SLUG_TTL_MS = 3 * 60 * 1000;

/**
 * Retorna base64 do concept art específico daquele canon_slug (para sprite/
 * tile do personagem/item herdar visual fiel). Fallback para getStyleRef
 * global se entry não tem conceptAssetIds ou asset não está acessível.
 */
export async function getStyleRefForSlug(
  projectId: string,
  slug: string
): Promise<string | null> {
  const key = `${projectId}:${slug}`;
  const cached = slugCache.get(key);
  if (cached && Date.now() - cached.loadedAt < SLUG_TTL_MS) {
    return cached.base64;
  }

  try {
    const entry = await findBySlug(projectId, slug);
    const conceptId = entry?.conceptAssetIds?.[0];
    if (conceptId) {
      const asset = await assetsRepo.findById(conceptId);
      if (asset) {
        const rel = toRelative(asset.file_path, projectId);
        if (rel) {
          const base64 = await invoke<string>("read_binary_asset", {
            projectId,
            relative: rel,
          });
          slugCache.set(key, { assetId: asset.id, base64, loadedAt: Date.now() });
          return base64;
        }
      }
    }
  } catch (e) {
    console.warn(`[styleRef] slug-specific falhou (${slug}), caindo pra global:`, e);
  }

  // Fallback: styleRef global do projeto
  return getStyleRef(projectId);
}

export function invalidateSlugStyleRef(projectId?: string, slug?: string): void {
  if (projectId && slug) slugCache.delete(`${projectId}:${slug}`);
  else if (projectId) {
    for (const k of Array.from(slugCache.keys())) {
      if (k.startsWith(`${projectId}:`)) slugCache.delete(k);
    }
  } else slugCache.clear();
}

/**
 * Retorna informações do asset escolhido como style-ref (para UI exibir
 * "Lock cromático: <nome>").
 */
export async function getStyleRefInfo(
  projectId: string
): Promise<{ assetId: string; prompt: string } | null> {
  const assets = await assetsRepo.listByProject(projectId);
  const chosen = pickStyleAsset(assets);
  if (!chosen) return null;
  return { assetId: chosen.id, prompt: chosen.prompt };
}
