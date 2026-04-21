// Planejador de Concept Arts: lê TODOS os documentos aprovados do projeto
// e usa Claude para propor uma lista estruturada de concept arts que cobrem
// personagens, locais, cenas-chave, artefatos e UI. Retorna JSON estrito que
// alimenta o ConceptArtPipelineView.
//
// Diferente do Asset Producer (Etapa 12), este planner:
// - Foca APENAS em concept_art (não sprites/tiles/áudio).
// - Não depende da Etapa 12 estar aprovada.
// - Usa o corpus completo do projeto como contexto, não só um documento.

import { invoke } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import { documentsRepo } from "./db";
import { streamClaude } from "./claude";
import { isTauri } from "./utils";
import type { PhaseDocument } from "@/types/domain";
import { phaseLabel } from "@/types/pipeline";

export type ConceptArtCategory =
  | "character"
  | "location"
  | "scene"
  | "item"
  | "ui";

export type ConceptArtSize = 64 | 96 | 128 | 192 | 256;

export interface ConceptArtPlanItem {
  id: string;
  name: string;
  category: ConceptArtCategory;
  sourcePhase: number;
  prompt: string;
  rationale: string;
  size: ConceptArtSize;
  shading?: "flat shading" | "basic shading" | "medium shading";
  detail?: "low detail" | "medium detail" | "highly detailed";
  outline?:
    | "single color black outline"
    | "lineless"
    | "selective outline";
  included: boolean;
}

export interface ConceptArtPlan {
  projectId: string;
  createdAt: string;
  items: ConceptArtPlanItem[];
}

export interface PlanPreReqs {
  phase9Approved: boolean;
  phase5Approved: boolean;
  phase6Approved: boolean;
  phase10Approved: boolean;
  ready: boolean; // 9 AND 5 AND 6 aprovadas
  missing: string[];
}

export async function checkPlanPreReqs(
  projectId: string
): Promise<PlanPreReqs> {
  const docs = await documentsRepo.listByProject(projectId);
  const approved = (phase: number) =>
    docs.some((d) => d.phase_number === phase && d.status === "approved");
  const p9 = approved(9);
  const p5 = approved(5);
  const p6 = approved(6);
  const p10 = approved(10);
  const missing: string[] = [];
  if (!p9) missing.push("Etapa 9 (Direção de Arte)");
  if (!p5) missing.push("Etapa 5 (Lore)");
  if (!p6) missing.push("Etapa 6 (Personagens)");
  return {
    phase9Approved: p9,
    phase5Approved: p5,
    phase6Approved: p6,
    phase10Approved: p10,
    ready: p9 && p5 && p6,
    missing,
  };
}

const PLANNER_SYSTEM = `Você é um Concept Art Director sênior. Você recebe os documentos aprovados (Markdown) de um GDD indie e deve PLANEJAR o conjunto completo de concept arts necessários para que a produção visual do jogo tenha coerência.

Responda ESTRITAMENTE com um JSON puro (sem prosa, sem code fences) no formato:

{
  "items": [
    {
      "name": "Nome em português curto (ex: 'Cavaleiro Protagonista')",
      "category": "character|location|scene|item|ui",
      "sourcePhase": 5,
      "prompt": "Prompt Pixellab em INGLÊS, 1-2 linhas, detalhando sujeito, enquadramento, paleta, mood. Ex: 'isometric pixel art, 64x64 character, lonely knight in tarnished baroque armor, moody purple palette, crisp outlines'",
      "rationale": "Por que esse art é necessário (uma frase em PT-BR)",
      "size": 128,
      "shading": "basic shading",
      "detail": "highly detailed",
      "outline": "single color black outline"
    }
  ]
}

Regras obrigatórias:
- Entre 8 e 16 itens no total.
- Distribua entre as categorias: 3-5 personagens principais, 3-5 locais-chave (biomas/cenários), 2-4 cenas narrativas críticas (intro/conflito/clímax), 1-2 artefatos/itens icônicos, 0-1 UI/key visual.
- "sourcePhase" = número da etapa do GDD onde a inspiração está (5 Lore, 6 Personagens, 7 Níveis, 9 Direção de Arte, 10 Storyboard).
- "size": 64, 96, 128, 192 ou 256. Use 64 para sprites de personagem, 128 para retratos/cenas, 192 para locais amplos, 256 para key visuals.
- Prompts em INGLÊS sempre começando com "isometric pixel art" ou "pixel art" conforme a categoria.
- Prompts devem refletir a paleta, mood e estilo definidos na Etapa 9 (Direção de Arte).
- NÃO invente personagens/locais que não estão nos documentos. Use os nomes canônicos do GDD.
- Nomes únicos (não repita).

Responda SOMENTE com o JSON puro.`;

function buildCorpus(docs: PhaseDocument[]): string {
  const approved = docs
    .filter((d) => d.status === "approved")
    .sort((a, b) => a.phase_number - b.phase_number);
  if (approved.length === 0) return "(nenhum documento aprovado)";
  return approved
    .map(
      (d) =>
        `### Etapa ${phaseLabel(d.phase_number)} — ${d.title}\n\n${d.content.slice(0, 6000)}`
    )
    .join("\n\n---\n\n");
}

function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

const VALID_SIZES: ConceptArtSize[] = [64, 96, 128, 192, 256];
const VALID_CATEGORIES: ConceptArtCategory[] = [
  "character",
  "location",
  "scene",
  "item",
  "ui",
];

function normalizeItems(raw: unknown): ConceptArtPlanItem[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const list = obj.items;
  if (!Array.isArray(list)) return [];
  const out: ConceptArtPlanItem[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const it = entry as Record<string, unknown>;
    const name = typeof it.name === "string" ? it.name.trim() : "";
    const prompt = typeof it.prompt === "string" ? it.prompt.trim() : "";
    if (!name || !prompt) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const category = VALID_CATEGORIES.includes(it.category as ConceptArtCategory)
      ? (it.category as ConceptArtCategory)
      : "scene";
    const sourcePhase =
      typeof it.sourcePhase === "number"
        ? Math.max(1, Math.floor(it.sourcePhase))
        : 10;
    const rawSize =
      typeof it.size === "number" ? (it.size as ConceptArtSize) : 128;
    const size = VALID_SIZES.includes(rawSize) ? rawSize : 128;
    const rationale =
      typeof it.rationale === "string" ? it.rationale.trim() : "";

    const shading =
      it.shading === "flat shading" ||
      it.shading === "basic shading" ||
      it.shading === "medium shading"
        ? (it.shading as ConceptArtPlanItem["shading"])
        : "basic shading";
    const detail =
      it.detail === "low detail" ||
      it.detail === "medium detail" ||
      it.detail === "highly detailed"
        ? (it.detail as ConceptArtPlanItem["detail"])
        : "highly detailed";
    const outline =
      it.outline === "single color black outline" ||
      it.outline === "lineless" ||
      it.outline === "selective outline"
        ? (it.outline as ConceptArtPlanItem["outline"])
        : "single color black outline";

    out.push({
      id: nanoid(),
      name,
      category,
      sourcePhase,
      prompt,
      rationale,
      size,
      shading,
      detail,
      outline,
      included: true,
    });
  }
  return out;
}

async function projectRoot(projectId: string): Promise<string> {
  return await invoke<string>("create_project_dir", { projectId });
}

export async function savePlan(plan: ConceptArtPlan): Promise<void> {
  if (!isTauri()) return;
  await projectRoot(plan.projectId);
  await invoke("write_project_file", {
    args: {
      project_id: plan.projectId,
      relative: "concept_art_plan.json",
      content: JSON.stringify(plan, null, 2),
    },
  });
}

export async function loadPlan(
  projectId: string
): Promise<ConceptArtPlan | null> {
  if (!isTauri()) return null;
  try {
    const raw = await invoke<string>("read_project_file", {
      projectId,
      relative: "concept_art_plan.json",
    });
    const parsed = JSON.parse(raw) as ConceptArtPlan;
    if (!parsed.items || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface PlanConceptArtsOptions {
  projectId: string;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
}

export async function planConceptArts(
  opts: PlanConceptArtsOptions
): Promise<ConceptArtPlan> {
  const docs = await documentsRepo.listByProject(opts.projectId);
  const corpus = buildCorpus(docs);

  const { done } = streamClaude({
    systemPrompt: PLANNER_SYSTEM,
    model: "sonnet",
    userMessage:
      `Documentos aprovados do projeto abaixo. Planeje o conjunto completo de concept arts conforme as regras do sistema.\n\n` +
      corpus,
    onText: opts.onText,
    signal: opts.signal,
  });

  const result = await done;
  if (!result.success) {
    throw new Error(
      `Planner Claude falhou: ${result.error ?? "erro desconhecido"}`
    );
  }

  const text = result.fullText.trim();
  const jsonText = firstJsonObject(text) ?? text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(
      `Resposta do planner não é JSON válido: ${String(e)}\n\nTexto bruto:\n${text.slice(0, 800)}`
    );
  }

  const items = normalizeItems(parsed);
  if (items.length === 0) {
    throw new Error("Planner retornou plano vazio ou inválido.");
  }

  const plan: ConceptArtPlan = {
    projectId: opts.projectId,
    createdAt: new Date().toISOString(),
    items,
  };

  await savePlan(plan).catch((e) =>
    console.warn("[conceptPlanner] falha ao persistir plano:", e)
  );
  return plan;
}
