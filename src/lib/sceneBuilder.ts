// F9 — Scene Builder. Lê KB + documentos aprovados + lista de recursos
// Godot gerados em F8 e pede ao Claude uma árvore completa de cenas. O
// resultado é um JSON `SceneTreePlan` que a UI revisa antes de gerar os
// .tscn via tscnWriter.

import { invoke } from "@tauri-apps/api/core";
import { documentsRepo } from "./db";
import { streamClaude } from "./claude";
import { isTauri } from "./utils";
import { getIndexSnapshot } from "./kb";
import { renderScene, type SceneSpec } from "./tscnWriter";

export interface SceneTreePlan {
  projectId: string;
  createdAt: string;
  scenes: SceneSpec[];
}

const SCENE_BUILDER_SYSTEM = `Você é um Godot Scene Architect sênior. Você recebe os documentos aprovados (Personagens, Níveis, Quests), a lista de recursos Godot já gerados (.tres) e o mapa de KB do projeto. Produza a árvore completa de cenas Godot 4 que o protótipo precisa.

Responda ESTRITAMENTE com JSON puro:

{
  "scenes": [
    {
      "type": "player|enemy|boss|npc|level|hud|world|menu|cutscene",
      "name": "Player",
      "path": "scenes/player/Player.tscn",
      "sprite_ref": "assets/generated/characters/player_frames.tres",
      "tileset_ref": null,
      "atlas_ref": null,
      "script": "scenes/player/Player.cs",
      "spawn_points": [{"name":"Start","x":0,"y":0}],
      "children": ["Player","HUD","Level_ForestStart"]
    }
  ]
}

Regras:
- Sempre inclua 1 "world" como root com "children" listando os nomes dos demais.
- 1 "player" (protagonista) + 1 cena por inimigo/boss definido na Etapa 6.
- 1 "level" por nível da Etapa 7, usando tileset_ref do bioma correspondente.
- 1 "hud".
- Use EXATAMENTE os paths .tres listados em "Recursos Godot disponíveis" para sprite_ref/tileset_ref/atlas_ref. Se o recurso não existe, use null (o usuário gera depois).
- "path" sempre começa com "scenes/<categoria>/<Name>.tscn".
- "script" sugere um .cs C# a ser criado pelo Claude Code depois; use "scenes/<cat>/<Name>.cs".
- Entre 3 e 20 cenas totais.

Responda SOMENTE com JSON puro.`;

function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function normalizeScene(raw: any): SceneSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const type = typeof r.type === "string" ? r.type : "";
  if (!name || !type) return null;
  const allowed = [
    "player",
    "enemy",
    "boss",
    "npc",
    "level",
    "hud",
    "world",
    "menu",
    "cutscene",
  ];
  if (!allowed.includes(type)) return null;
  const pathRaw = typeof r.path === "string" ? r.path : `scenes/${type}/${name}.tscn`;
  const path = pathRaw.endsWith(".tscn") ? pathRaw : `${pathRaw}.tscn`;
  return {
    type: type as SceneSpec["type"],
    name,
    path,
    sprite_ref: typeof r.sprite_ref === "string" ? r.sprite_ref : undefined,
    tileset_ref: typeof r.tileset_ref === "string" ? r.tileset_ref : undefined,
    atlas_ref: typeof r.atlas_ref === "string" ? r.atlas_ref : undefined,
    script: typeof r.script === "string" ? r.script : undefined,
    spawn_points: Array.isArray(r.spawn_points)
      ? (r.spawn_points as any[])
          .filter((s) => s && typeof s.name === "string")
          .map((s) => ({
            name: s.name,
            x: typeof s.x === "number" ? s.x : 0,
            y: typeof s.y === "number" ? s.y : 0,
          }))
      : undefined,
    children: Array.isArray(r.children)
      ? (r.children as any[]).filter((c): c is string => typeof c === "string")
      : undefined,
  };
}

async function listGeneratedResources(
  projectId: string
): Promise<string[]> {
  const out: string[] = [];
  for (const subdir of ["characters", "tilesets", "ui"]) {
    try {
      const files = await invoke<
        { name: string; path: string; is_dir: boolean }[]
      >("list_project_files", {
        projectId,
        relative: `game/assets/generated/${subdir}`,
      });
      for (const f of files) {
        if (!f.is_dir && f.name.endsWith(".tres")) {
          out.push(`assets/generated/${subdir}/${f.name}`);
        }
      }
    } catch {
      /* dir doesn't exist yet */
    }
  }
  return out;
}

function buildCorpus(
  docs: { phase_number: number; title: string; content: string; status: string }[],
  resources: string[],
  kbSnapshot: {
    phase?: number;
    documentType: string;
    content: string;
  }[]
): string {
  const approvedPhases = [5, 6, 7, 8];
  const relevant = docs
    .filter((d) => d.status === "approved")
    .filter((d) => approvedPhases.includes(d.phase_number))
    .sort((a, b) => a.phase_number - b.phase_number);

  const corpus = [
    "## Documentos aprovados relevantes\n",
    ...relevant.map(
      (d) =>
        `### Etapa ${d.phase_number} — ${d.title}\n\n${d.content.slice(0, 4000)}`
    ),
    "\n## Recursos Godot disponíveis (.tres)\n",
    resources.length
      ? resources.map((r) => `- ${r}`).join("\n")
      : "(nenhum .tres gerado ainda — todos os sprite_ref/tileset_ref devem ser null)",
    "\n## KB do projeto (resumo)\n",
    kbSnapshot
      .slice(0, 40)
      .map((e) => `- [${e.documentType}] ${e.content.slice(0, 150)}`)
      .join("\n"),
  ].join("\n\n");

  return corpus;
}

export interface PlanSceneTreeOptions {
  projectId: string;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
}

export async function planSceneTree(
  opts: PlanSceneTreeOptions
): Promise<SceneTreePlan> {
  const docs = await documentsRepo.listByProject(opts.projectId);
  const resources = await listGeneratedResources(opts.projectId);
  const snapshotFull = await getIndexSnapshot(opts.projectId);
  const snapshot = snapshotFull.entries.map((e) => ({
    phase: e.phase,
    documentType: e.documentType,
    content: e.content,
  }));

  const corpus = buildCorpus(docs, resources, snapshot);

  const { done } = streamClaude({
    systemPrompt: SCENE_BUILDER_SYSTEM,
    // F9 Scene Builder planeja a árvore inteira do jogo no Godot cruzando
    // docs + canon + .tres existentes. Julgamento arquitetural crítico → opus.
    model: "opus",
    userMessage: `Contexto do projeto:\n\n${corpus}\n\nProduza a árvore completa de cenas conforme as regras.`,
    onText: opts.onText,
    signal: opts.signal,
  });

  const result = await done;
  if (!result.success) {
    throw new Error(`Scene Builder Claude falhou: ${result.error ?? "erro"}`);
  }

  const text = result.fullText.trim();
  const jsonText = firstJsonObject(text) ?? text;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(
      `Scene Builder: JSON inválido: ${String(e)}\n\n${text.slice(0, 500)}`
    );
  }

  const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
  const scenes = rawScenes
    .map(normalizeScene)
    .filter((s: SceneSpec | null): s is SceneSpec => !!s);

  if (scenes.length === 0) {
    throw new Error("Scene Builder: nenhuma cena válida produzida.");
  }

  const plan: SceneTreePlan = {
    projectId: opts.projectId,
    createdAt: new Date().toISOString(),
    scenes,
  };
  await saveScenePlan(plan).catch(() => {});
  return plan;
}

export async function saveScenePlan(plan: SceneTreePlan): Promise<void> {
  if (!isTauri()) return;
  await invoke("create_project_dir", { projectId: plan.projectId });
  await invoke("write_project_file", {
    args: {
      project_id: plan.projectId,
      relative: "scene_tree_plan.json",
      content: JSON.stringify(plan, null, 2),
    },
  });
}

export async function loadScenePlan(
  projectId: string
): Promise<SceneTreePlan | null> {
  if (!isTauri()) return null;
  try {
    const raw = await invoke<string>("read_project_file", {
      projectId,
      relative: "scene_tree_plan.json",
    });
    const parsed = JSON.parse(raw) as SceneTreePlan;
    if (!Array.isArray(parsed.scenes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface BuildScenesResult {
  scene: SceneSpec;
  tscnPath: string;
  success: boolean;
  error?: string;
}

export async function buildScenes(
  plan: SceneTreePlan,
  options: { autoCommit?: boolean } = {}
): Promise<BuildScenesResult[]> {
  const results: BuildScenesResult[] = [];
  for (const scene of plan.scenes) {
    try {
      const content = renderScene(scene, plan.scenes);
      const outSceneRel = scene.path.startsWith("res://")
        ? scene.path.slice("res://".length)
        : scene.path;
      await invoke<{ path: string }>("write_tscn_scene", {
        args: {
          project_id: plan.projectId,
          out_scene_rel: outSceneRel,
          content,
        },
      });
      results.push({ scene, tscnPath: outSceneRel, success: true });
    } catch (e) {
      results.push({
        scene,
        tscnPath: scene.path,
        success: false,
        error: String((e as Error)?.message ?? e),
      });
    }
  }
  if (options.autoCommit) {
    try {
      await invoke("game_git_commit", {
        args: {
          project_id: plan.projectId,
          message: `scenes: build from plan (${results.filter((r) => r.success).length} scenes)`,
        },
      });
    } catch (e) {
      console.warn("[sceneBuilder] git commit falhou:", e);
    }
  }
  return results;
}
