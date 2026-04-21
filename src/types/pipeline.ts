import type { AgentType } from "./domain";

export interface PhaseDefinition {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  agent: AgentType;
  documentType: string;
  /**
   * Etapas cuja alteração invalida esta (precisa revalidação).
   */
  dependsOn: number[];
  shortGoal: string;
  /**
   * Ordem visual na pipeline. Se omitido, usa `number`. Use valores
   * fracionados (ex.: 8.1…8.8) para inserir fases novas SEM renumerar as
   * existentes — mantém dados legados funcionando.
   */
  position?: number;
  /**
   * Categoria visual — permite agrupar specialist writers num sub-menu.
   */
  group?: "discovery" | "narrative_expansion" | "direction" | "production";
}

export const PHASES: PhaseDefinition[] = [
  {
    number: 1,
    slug: "pitch",
    title: "Pitch & Visão",
    subtitle: "Ideia nuclear e elevator pitch",
    agent: "discovery",
    documentType: "pitch",
    dependsOn: [],
    shortGoal:
      "Transformar a faísca criativa em um pitch de 3 linhas, público-alvo e plataforma.",
  },
  {
    number: 2,
    slug: "benchmark",
    title: "Benchmark de Mercado",
    subtitle: "Jogos similares e diferencial",
    agent: "benchmark",
    documentType: "benchmark",
    dependsOn: [1],
    shortGoal: "Mapear referências, posicionamento e diferencial competitivo.",
  },
  {
    number: 3,
    slug: "core-loop",
    title: "Core Loop & Pilares",
    subtitle: "Gameplay loop de 5-30s",
    agent: "mechanics_designer",
    documentType: "core_loop",
    dependsOn: [1, 2],
    shortGoal: "Definir o loop central de segundos e os pilares de design.",
  },
  {
    number: 4,
    slug: "mda",
    title: "MDA & Tetrad Elemental",
    subtitle: "Mecânicas, Dinâmicas, Estética",
    agent: "mechanics_designer",
    documentType: "mda_tetrad",
    dependsOn: [1, 3],
    shortGoal: "Aplicar frameworks MDA e Elemental Tetrad ao design.",
  },
  {
    number: 5,
    slug: "lore-world",
    title: "Lore & Worldbuilding",
    subtitle: "Mundo, história, facções",
    agent: "lore_writer",
    documentType: "lore_world",
    dependsOn: [1, 4],
    shortGoal: "Construir o mundo, sua história e tensões centrais.",
  },
  {
    number: 6,
    slug: "characters",
    title: "Personagens & Facções",
    subtitle: "Protagonistas, antagonistas, aliados",
    agent: "lore_writer",
    documentType: "characters",
    dependsOn: [5],
    shortGoal: "Desenhar personagens memoráveis com arcos e relações.",
  },
  {
    number: 7,
    slug: "levels",
    title: "Níveis & Progressão",
    subtitle: "Biomas, zonas, pacing",
    agent: "level_designer",
    documentType: "levels",
    dependsOn: [3, 5],
    shortGoal: "Estruturar níveis, progressão e ritmo da experiência.",
  },
  {
    number: 8,
    slug: "quests",
    title: "Quests & Diálogos",
    subtitle: "Objetivos e árvores de conversa",
    agent: "level_designer",
    documentType: "quests",
    dependsOn: [5, 6, 7],
    shortGoal: "Tecer missões principais e diálogos com escolhas.",
  },
  {
    number: 9,
    slug: "art-direction",
    title: "Direção de Arte",
    subtitle: "Estilo visual e paleta",
    agent: "art_director",
    documentType: "art_direction",
    dependsOn: [1, 5],
    shortGoal: "Consolidar moodboard, paleta, silhueta e referências.",
  },
  {
    number: 10,
    slug: "storyboard",
    title: "Storyboard & Concept Arts",
    subtitle: "Cenas-chave e key arts",
    agent: "art_director",
    documentType: "storyboard",
    dependsOn: [6, 7, 9],
    shortGoal: "Produzir concept arts dos momentos-chave (via Pixellab).",
  },
  {
    number: 11,
    slug: "audio-direction",
    title: "Direção de Áudio",
    subtitle: "Identidade sonora e trilha",
    agent: "audio_director",
    documentType: "audio_direction",
    dependsOn: [1, 5, 9],
    shortGoal: "Definir a identidade sonora e a paleta auditiva.",
  },
  {
    number: 12,
    slug: "asset-production",
    title: "Produção de Assets",
    subtitle: "Sprites, SFX, música",
    agent: "asset_producer",
    documentType: "asset_production",
    dependsOn: [9, 10, 11],
    shortGoal: "Gerar sprites, SFX e música alinhados às direções aprovadas.",
  },
  {
    number: 13,
    slug: "gdd-final",
    title: "GDD Final & Roadmap",
    subtitle: "Documento consolidado",
    agent: "asset_producer",
    documentType: "gdd_final",
    dependsOn: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    shortGoal: "Consolidar tudo no GDD final exportável e gerar o roadmap.",
  },
  // ---------- Etapa 8.5 — Expansão Narrativa (specialist writers) ----------
  // Injetadas entre 8 (Quests macro) e 9 (Direção de Arte) via campo
  // `position`. Cada fase alimenta o Canon Registry (canon_entries YAML)
  // com dezenas/centenas de entidades que depois viram assets/sheets/tres.
  {
    number: 14,
    slug: "worldbuilding-expansion",
    title: "Expansão: Worldbuilding",
    subtitle: "Geografia, facções menores, história pregressa",
    agent: "worldbuilder",
    documentType: "worldbuilding_expansion",
    dependsOn: [5, 7, 8],
    shortGoal:
      "Expandir o mundo em profundidade: regiões, sub-biomas, linguagem, timeline.",
    position: 8.1,
    group: "narrative_expansion",
  },
  {
    number: 15,
    slug: "npc-writer",
    title: "Expansão: NPCs",
    subtitle: "Roster nomeado com arcos por ato",
    agent: "npc_writer",
    documentType: "npc_roster",
    dependsOn: [6, 7, 8, 14],
    shortGoal: "Criar o roster completo de NPCs com motivações e arcos.",
    position: 8.2,
    group: "narrative_expansion",
  },
  {
    number: 16,
    slug: "bestiary",
    title: "Expansão: Bestiário",
    subtitle: "Inimigos, bosses, criaturas por bioma",
    agent: "bestiary_writer",
    documentType: "bestiary",
    dependsOn: [5, 7, 14],
    shortGoal: "Desenhar inimigos/bosses/criaturas com comportamentos.",
    position: 8.3,
    group: "narrative_expansion",
  },
  {
    number: 17,
    slug: "loot",
    title: "Expansão: Loot & Gear",
    subtitle: "Armas, armaduras, poções, materiais",
    agent: "loot_writer",
    documentType: "loot_catalog",
    dependsOn: [3, 5, 14, 16],
    shortGoal: "Catalogar itens: raridade, origem, efeitos, crafting sources.",
    position: 8.4,
    group: "narrative_expansion",
  },
  {
    number: 18,
    slug: "quests-expansion",
    title: "Expansão: Quests",
    subtitle: "15-30 side quests + main por ato",
    agent: "quest_writer",
    documentType: "quests_expansion",
    dependsOn: [8, 14, 15, 16],
    shortGoal: "Detalhar main e side quests com steps, recompensas e hooks.",
    position: 8.5,
    group: "narrative_expansion",
  },
  {
    number: 19,
    slug: "dialogue-trees",
    title: "Expansão: Diálogos",
    subtitle: "Árvores de conversa dos NPCs principais",
    agent: "dialogue_writer",
    documentType: "dialogue_trees",
    dependsOn: [6, 15, 18],
    shortGoal: "Escrever árvores de diálogo com escolhas e estados.",
    position: 8.6,
    group: "narrative_expansion",
  },
  {
    number: 20,
    slug: "crafting",
    title: "Expansão: Crafting & Sistemas",
    subtitle: "Receitas, estações, colheita, smithing",
    agent: "crafting_writer",
    documentType: "crafting_systems",
    dependsOn: [3, 17],
    shortGoal: "Desenhar sistemas de crafting/farming/cooking integrados.",
    position: 8.7,
    group: "narrative_expansion",
  },
  {
    number: 21,
    slug: "exploration",
    title: "Expansão: Exploração",
    subtitle: "POIs, colecionáveis, segredos",
    agent: "exploration_writer",
    documentType: "exploration_points",
    dependsOn: [5, 7, 14, 16],
    shortGoal: "Popular o mundo com POIs, lore collectibles e segredos.",
    position: 8.8,
    group: "narrative_expansion",
  },
];

/** Ordem visual do pipeline, respeitando `position` quando presente. */
export function orderedPhases(): PhaseDefinition[] {
  return [...PHASES].sort((a, b) => {
    const pa = a.position ?? a.number;
    const pb = b.position ?? b.number;
    return pa - pb;
  });
}

export function getPhase(n: number): PhaseDefinition {
  const p = PHASES.find((p) => p.number === n);
  if (!p) throw new Error(`Fase inválida: ${n}`);
  return p;
}

/**
 * Rótulo visual da fase para uso em UI e chat. Respeita `position`
 * (ex.: "8.1") caindo no `number` quando ausente. Usar sempre que for
 * exibir para o usuário — nunca imprimir `phase.number` direto.
 */
export function phaseLabel(p: PhaseDefinition | number): string {
  const phase = typeof p === "number" ? PHASES.find((x) => x.number === p) : p;
  if (!phase) return String(p);
  if (phase.position !== undefined) {
    return phase.position.toFixed(1);
  }
  return String(phase.number);
}
