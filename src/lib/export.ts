// Exportação do GDD em Markdown / JSON.
//
// O arquivo é escrito em `projects/<id>/exports/` via Tauri command
// `write_project_file`, que já faz o sandbox de diretório.

import { invoke } from "@tauri-apps/api/core";
import { assetsRepo, documentsRepo, projectsRepo } from "./db";
import { PHASES } from "@/types/pipeline";
import { AGENTS } from "@/agents/agents";

export async function exportProjectMarkdown(
  projectId: string,
  projectName: string,
  opts?: { alsoLatest?: boolean }
): Promise<string> {
  const docs = await documentsRepo.listByProject(projectId);
  const assets = await assetsRepo.listByProject(projectId);
  const project = await projectsRepo.get(projectId);
  const date = new Date().toISOString().slice(0, 10);

  let md = `# Game Design Document — ${projectName}\n\n`;
  md += `> Gerado em ${date} pela Elysium Build Platform.\n\n`;
  if (project?.description) md += `_${project.description}_\n\n`;
  md += `## Sumário\n\n`;
  for (const p of PHASES) {
    md += `- Etapa ${p.number}: [${p.title}](#etapa-${p.number}-${slug(p.title)})\n`;
  }
  md += "\n---\n\n";

  for (const phase of PHASES) {
    const d = docs.find((x) => x.phase_number === phase.number);
    const agent = AGENTS[phase.agent];
    md += `## Etapa ${phase.number} — ${phase.title}\n\n`;
    md += `_${agent.displayName} · ${phase.subtitle}_\n\n`;
    if (!d) {
      md += `> ⚠ Esta etapa ainda não foi preenchida.\n\n`;
      continue;
    }
    md += `> Status: **${d.status}** · v${d.version}\n\n`;
    md += `${d.content.trim()}\n\n`;
    const related = assets.filter(
      (a) =>
        (phase.number === 10 && a.generator === "pixellab") ||
        (phase.number === 11 && a.generator === "elevenlabs") ||
        (phase.number === 12 && a.status === "approved")
    );
    if (related.length > 0) {
      md += `### Assets relacionados\n\n`;
      for (const a of related.slice(0, 20)) {
        md += `- \`${a.file_name}\` (${a.asset_type}, ${a.status}) — ${a.prompt.slice(0, 120)}\n`;
      }
      md += "\n";
    }
    md += "\n";
  }

  const filename = `exports/gdd-${date}.md`;
  const saved = await invoke<string>("write_project_file", {
    args: {
      project_id: projectId,
      relative: filename,
      content: md,
    },
  });
  // Quando alsoLatest=true, também grava uma cópia "latest" que o usuário
  // pode usar como briefing estável para artistas/engenheiros externos.
  if (opts?.alsoLatest) {
    try {
      await invoke<string>("write_project_file", {
        args: {
          project_id: projectId,
          relative: `exports/gdd-latest.md`,
          content: md,
        },
      });
    } catch (e) {
      console.warn("[export] gdd-latest.md falhou:", e);
    }
  }
  return saved;
}

export async function exportProjectJson(
  projectId: string,
  projectName: string
): Promise<string> {
  const docs = await documentsRepo.listByProject(projectId);
  const assets = await assetsRepo.listByProject(projectId);
  const project = await projectsRepo.get(projectId);
  const date = new Date().toISOString().slice(0, 10);

  const data = {
    exportedAt: new Date().toISOString(),
    project,
    phases: PHASES.map((p) => {
      const d = docs.find((x) => x.phase_number === p.number);
      return {
        number: p.number,
        slug: p.slug,
        title: p.title,
        agent: p.agent,
        documentType: p.documentType,
        document: d ?? null,
      };
    }),
    assets,
  };

  const filename = `exports/gdd-${date}.json`;
  const saved = await invoke<string>("write_project_file", {
    args: {
      project_id: projectId,
      relative: filename,
      content: JSON.stringify(data, null, 2),
    },
  });
  const _ = projectName; // reservado
  return saved;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
