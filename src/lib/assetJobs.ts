// CRUD + coordenação de workers para a fila asset_jobs (migration 004).
// Responsável por resume robusto, dedup por canon_slug e sincronização com
// o plano determinístico gerado em conceptPlannerV2.

import Database from "@tauri-apps/plugin-sql";
import { getDb, uid } from "./db";
import type {
  AssetJob,
  AssetJobDomain,
  AssetJobStatus,
  AssetJobTier,
  QueueSnapshot,
} from "@/types/domain";
import type { PlanItemV2 } from "./conceptPlannerV2";

// ---------- Shape mínima que syncPlan aceita (domain-agnóstico) ----------

export interface GenericPlanItem {
  canonSlug: string;
  canonEntryId: string;
  kind: string;
  tier: AssetJobTier;
  category: string;
  prompt: string;
  promptHash: string;
  size: string;
}

async function db(): Promise<Database> {
  return getDb();
}

async function q<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const d = await db();
  return (await d.select<T[]>(sql, params)) ?? [];
}

async function exec(sql: string, params: unknown[] = []): Promise<void> {
  const d = await db();
  await d.execute(sql, params);
}

// ---------- Sync com o plano ----------

export interface SyncResult {
  inserted: number;
  updated: number;
  markedApproved: number; // jobs que ganharam asset_id porque entry já tinha conceptAssetIds
  total: number;
}

/**
 * Upsert idempotente de jobs a partir de itens de plano (genérico por domain).
 * Mantém jobs já existentes (preserva status/attempts); só atualiza campos
 * derivados do plano (prompt, size, tier, category) se mudarem.
 *
 * `domain` identifica o pipeline (concept_art, character_sprite, tileset, …).
 * Omitir = 'concept_art' (compat).
 */
export async function syncPlan(
  projectId: string,
  items: (PlanItemV2 | GenericPlanItem)[],
  canonAssetsBySlug: Map<string, string>,
  domain: AssetJobDomain = "concept_art"
): Promise<SyncResult> {
  const existing = await listByProject(projectId, { domain: [domain] });
  const bySlug = new Map(existing.map((j) => [j.canon_slug, j]));
  let inserted = 0;
  let updated = 0;
  let markedApproved = 0;

  for (const item of items) {
    const prev = bySlug.get(item.canonSlug);
    const existingAssetId = canonAssetsBySlug.get(item.canonSlug) ?? null;

    if (!prev) {
      const id = uid();
      const status: AssetJobStatus = existingAssetId ? "approved" : "pending";
      await exec(
        `INSERT INTO asset_jobs
          (id, project_id, domain, canon_slug, canon_entry_id, kind, tier, category,
           prompt, prompt_hash, size, status, asset_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          projectId,
          domain,
          item.canonSlug,
          item.canonEntryId,
          item.kind,
          item.tier,
          item.category,
          item.prompt,
          item.promptHash,
          item.size,
          status,
          existingAssetId,
        ]
      );
      inserted++;
      if (existingAssetId) markedApproved++;
      continue;
    }

    const needsUpdate =
      prev.prompt !== item.prompt ||
      prev.tier !== item.tier ||
      prev.size !== item.size ||
      prev.category !== item.category;

    if (needsUpdate && (prev.status === "pending" || prev.status === "failed")) {
      await exec(
        `UPDATE asset_jobs
         SET prompt = ?, prompt_hash = ?, size = ?, tier = ?, category = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [item.prompt, item.promptHash, item.size, item.tier, item.category, prev.id]
      );
      updated++;
    }

    if (!prev.asset_id && existingAssetId && prev.status !== "approved") {
      await exec(
        `UPDATE asset_jobs
         SET asset_id = ?, status = 'approved', updated_at = datetime('now')
         WHERE id = ?`,
        [existingAssetId, prev.id]
      );
      markedApproved++;
    }
  }

  return { inserted, updated, markedApproved, total: items.length };
}

// ---------- Queries ----------

export async function listByProject(
  projectId: string,
  filters?: {
    domain?: AssetJobDomain[];
    status?: AssetJobStatus[];
    tier?: AssetJobTier[];
    search?: string;
  }
): Promise<AssetJob[]> {
  const where: string[] = ["project_id = ?"];
  const params: unknown[] = [projectId];

  if (filters?.domain?.length) {
    where.push(`domain IN (${filters.domain.map(() => "?").join(",")})`);
    params.push(...filters.domain);
  }
  if (filters?.status?.length) {
    where.push(`status IN (${filters.status.map(() => "?").join(",")})`);
    params.push(...filters.status);
  }
  if (filters?.tier?.length) {
    where.push(`tier IN (${filters.tier.map(() => "?").join(",")})`);
    params.push(...filters.tier);
  }
  if (filters?.search) {
    where.push(`(canon_slug LIKE ? OR prompt LIKE ?)`);
    const q = `%${filters.search}%`;
    params.push(q, q);
  }

  return q<AssetJob>(
    `SELECT * FROM asset_jobs WHERE ${where.join(" AND ")}
     ORDER BY
       CASE status
         WHEN 'failed' THEN 0
         WHEN 'running' THEN 1
         WHEN 'pending' THEN 2
         WHEN 'generated' THEN 3
         WHEN 'approved' THEN 4
         WHEN 'skipped' THEN 5
       END,
       canon_slug ASC`,
    params
  );
}

export async function snapshot(
  projectId: string,
  domain: AssetJobDomain = "concept_art"
): Promise<QueueSnapshot> {
  const rows = await q<{ status: AssetJobStatus; tier: AssetJobTier; count: number }>(
    `SELECT status, tier, COUNT(*) as count FROM asset_jobs
     WHERE project_id = ? AND domain = ? GROUP BY status, tier`,
    [projectId, domain]
  );

  const running = await q<{ canon_slug: string }>(
    `SELECT canon_slug FROM asset_jobs
     WHERE project_id = ? AND domain = ? AND status = 'running'`,
    [projectId, domain]
  );

  const byStatus: QueueSnapshot["byStatus"] = {
    pending: 0,
    running: 0,
    generated: 0,
    approved: 0,
    failed: 0,
    skipped: 0,
  };
  const byTier: QueueSnapshot["byTier"] = { high: 0, medium: 0, low: 0 };

  let total = 0;
  for (const r of rows) {
    byStatus[r.status] += r.count;
    byTier[r.tier] += r.count;
    total += r.count;
  }

  return { total, byStatus, byTier, currentlyRunning: running.map((r) => r.canon_slug) };
}

// ---------- Worker coordination ----------

/**
 * Reserva atomicamente o próximo job pendente que bate com os filtros.
 * SQLite não tem SELECT FOR UPDATE, então usamos UPDATE ... WHERE id IN (
 * SELECT ... LIMIT 1) que é atômico por tabela.
 */
export async function claimNext(
  projectId: string,
  opts?: {
    domain?: AssetJobDomain;
    tierFilter?: AssetJobTier[];
    allowedJobIds?: string[];
    workerId?: string;
  }
): Promise<AssetJob | null> {
  const domain = opts?.domain ?? "concept_art";
  const tierWhere =
    opts?.tierFilter?.length
      ? `AND tier IN (${opts.tierFilter.map(() => "?").join(",")})`
      : "";
  const tierParams = opts?.tierFilter ?? [];

  const allowed = opts?.allowedJobIds;
  if (allowed !== undefined && allowed.length === 0) {
    // Chamador passou lista vazia explicitamente = sem candidatos permitidos.
    return null;
  }
  const allowedWhere = allowed?.length
    ? `AND id IN (${allowed.map(() => "?").join(",")})`
    : "";
  const allowedParams = allowed ?? [];

  const candidates = await q<AssetJob>(
    `SELECT * FROM asset_jobs
     WHERE project_id = ? AND domain = ? AND status = 'pending' ${tierWhere} ${allowedWhere}
     ORDER BY
       CASE tier WHEN 'low' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       canon_slug ASC
     LIMIT 1`,
    [projectId, domain, ...tierParams, ...allowedParams]
  );
  if (candidates.length === 0) return null;
  const pick = candidates[0];

  const d = await db();
  const result = (await d.execute(
    `UPDATE asset_jobs
     SET status = 'running', heartbeat_at = datetime('now'), updated_at = datetime('now'),
         attempts = attempts + 1
     WHERE id = ? AND status = 'pending'`,
    [pick.id]
  )) as { rowsAffected?: number };

  if ((result?.rowsAffected ?? 0) === 0) {
    return claimNext(projectId, opts);
  }
  const [updated] = await q<AssetJob>(`SELECT * FROM asset_jobs WHERE id = ?`, [pick.id]);
  return updated ?? null;
}

export async function heartbeat(jobId: string): Promise<void> {
  await exec(
    `UPDATE asset_jobs SET heartbeat_at = datetime('now') WHERE id = ?`,
    [jobId]
  );
}

export async function completeSuccess(jobId: string, assetId: string): Promise<void> {
  await exec(
    `UPDATE asset_jobs
     SET status = 'generated', asset_id = ?, last_error = NULL, updated_at = datetime('now')
     WHERE id = ?`,
    [assetId, jobId]
  );
}

export async function completeFailure(jobId: string, error: string): Promise<void> {
  await exec(
    `UPDATE asset_jobs
     SET status = 'failed', last_error = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [error.slice(0, 500), jobId]
  );
}

/** Devolve o job para 'pending' (ex: erro retryable que não esgotou tentativas). */
export async function requeue(jobId: string, error?: string): Promise<void> {
  await exec(
    `UPDATE asset_jobs
     SET status = 'pending', last_error = ?, heartbeat_at = NULL, updated_at = datetime('now')
     WHERE id = ?`,
    [error?.slice(0, 500) ?? null, jobId]
  );
}

/**
 * Recupera jobs em 'running' abandonados (heartbeat > maxAgeSec atrás) de volta
 * para 'pending'. Chamado no boot do runner e via botão "recuperar órfãos" na UI.
 */
export async function requeueStale(
  projectId: string,
  maxAgeSec = 300,
  domain: AssetJobDomain = "concept_art"
): Promise<number> {
  const d = await db();
  const result = (await d.execute(
    `UPDATE asset_jobs
     SET status = 'pending', heartbeat_at = NULL, updated_at = datetime('now'),
         last_error = 'recovered from stale heartbeat'
     WHERE project_id = ? AND domain = ? AND status = 'running'
       AND (heartbeat_at IS NULL OR heartbeat_at < datetime('now', ?))`,
    [projectId, domain, `-${maxAgeSec} seconds`]
  )) as { rowsAffected?: number };
  return result?.rowsAffected ?? 0;
}

export async function retryFailed(
  projectId: string,
  domain: AssetJobDomain = "concept_art"
): Promise<number> {
  const d = await db();
  const result = (await d.execute(
    `UPDATE asset_jobs
     SET status = 'pending', last_error = NULL, updated_at = datetime('now')
     WHERE project_id = ? AND domain = ? AND status = 'failed'`,
    [projectId, domain]
  )) as { rowsAffected?: number };
  return result?.rowsAffected ?? 0;
}

export async function skipJob(jobId: string): Promise<void> {
  await exec(
    `UPDATE asset_jobs SET status = 'skipped', updated_at = datetime('now') WHERE id = ?`,
    [jobId]
  );
}

export async function approveJob(jobId: string): Promise<void> {
  await exec(
    `UPDATE asset_jobs SET status = 'approved', updated_at = datetime('now') WHERE id = ?`,
    [jobId]
  );
}

/**
 * Aprova vários jobs em massa, propagando o status para os generated_assets
 * vinculados. Não usa transação explícita (tauri-plugin-sql não expõe API
 * trivial) — as duas queries são idempotentes, então re-execução é segura.
 * Retorna counts separados por tabela para telemetria da UI.
 */
export async function approveMany(
  jobIds: string[]
): Promise<{ jobsUpdated: number; assetsUpdated: number }> {
  if (jobIds.length === 0) return { jobsUpdated: 0, assetsUpdated: 0 };

  const placeholders = jobIds.map(() => "?").join(",");

  // 1. Levanta os asset_ids vinculados ANTES de mudar status do job.
  const linked = await q<{ asset_id: string | null }>(
    `SELECT asset_id FROM asset_jobs WHERE id IN (${placeholders})`,
    jobIds
  );
  const assetIds = linked
    .map((r) => r.asset_id)
    .filter((x): x is string => typeof x === "string" && x.length > 0);

  // 2. UPDATE em asset_jobs.
  const d = await db();
  const jobsResult = (await d.execute(
    `UPDATE asset_jobs
     SET status = 'approved', updated_at = datetime('now')
     WHERE id IN (${placeholders})`,
    jobIds
  )) as { rowsAffected?: number };

  // 3. UPDATE em generated_assets (se houver assets vinculados).
  let assetsUpdated = 0;
  if (assetIds.length > 0) {
    const aPlaceholders = assetIds.map(() => "?").join(",");
    const assetsResult = (await d.execute(
      `UPDATE generated_assets
       SET status = 'approved', approved_at = datetime('now')
       WHERE id IN (${aPlaceholders})`,
      assetIds
    )) as { rowsAffected?: number };
    assetsUpdated = assetsResult?.rowsAffected ?? 0;
  }

  return {
    jobsUpdated: jobsResult?.rowsAffected ?? 0,
    assetsUpdated,
  };
}

export async function updatePrompt(
  jobId: string,
  prompt: string,
  promptHash: string
): Promise<void> {
  await exec(
    `UPDATE asset_jobs
     SET prompt = ?, prompt_hash = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [prompt, promptHash, jobId]
  );
}

export async function getById(jobId: string): Promise<AssetJob | null> {
  const rows = await q<AssetJob>(`SELECT * FROM asset_jobs WHERE id = ?`, [jobId]);
  return rows[0] ?? null;
}

export async function countPending(
  projectId: string,
  tierFilter?: AssetJobTier[],
  domain: AssetJobDomain = "concept_art"
): Promise<number> {
  const tierWhere =
    tierFilter?.length
      ? `AND tier IN (${tierFilter.map(() => "?").join(",")})`
      : "";
  const params: unknown[] = [projectId, domain];
  if (tierFilter) params.push(...tierFilter);
  const rows = await q<{ c: number }>(
    `SELECT COUNT(*) as c FROM asset_jobs WHERE project_id = ? AND domain = ? AND status = 'pending' ${tierWhere}`,
    params
  );
  return rows[0]?.c ?? 0;
}
