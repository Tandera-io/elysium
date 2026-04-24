// Parsers para documentos da Expansão Narrativa (Fase 18 Quest Writer, Fase 19 Dialogue Writer).
//
// Fase 18: markdown com seções `# §N — ...`, atos `## ATO I — ...` e quests `### MQ-I-01 · "..."`.
// Fase 19: code blocks contendo árvores `[NODE-XX]` com escolhas `> [A] texto → [NODE-YY]` e flags `⊕ flag`.

export interface QuestSummary {
  id: string; // MQ-I-01, SQ01, QC-01
  title: string;
  act?: "I" | "II" | "III";
  section: "main" | "side" | "chain" | "faction" | "other";
  biome?: string;
  summary?: string; // primeiro parágrafo após o header
}

export interface DialogueChoice {
  label: string;
  target?: string; // NODE id destino
  flagsOn: string[];
  flagsOff: string[];
}

export interface DialogueNode {
  id: string; // NODE-01, NODE-02b
  scene?: string; // nome da cutscene/cena, se detectado
  text: string; // bloco narrativo (sem as escolhas)
  choices: DialogueChoice[];
  flagsRequired: string[]; // 🔒 req: ...
}

const QUEST_ID_RE = /\b(MQ-[IVX]+-\d+|SQ\d+|QC-\d+|FQ\d+)\b/;

export function parseQuestList(md: string): QuestSummary[] {
  if (!md) return [];
  const out: QuestSummary[] = [];
  const lines = md.split(/\r?\n/);

  let currentSection: QuestSummary["section"] = "other";
  let currentAct: QuestSummary["act"] | undefined;
  let current: QuestSummary | null = null;
  const pushCurrent = () => {
    if (current) out.push(current);
    current = null;
  };

  for (const line of lines) {
    const sectionMatch = /^#\s+§(\d+)\s*—\s*(.+)/.exec(line);
    if (sectionMatch) {
      pushCurrent();
      const name = sectionMatch[2].toLowerCase();
      if (name.includes("main")) currentSection = "main";
      else if (name.includes("chain")) currentSection = "chain";
      else if (name.includes("fac")) currentSection = "faction";
      else if (name.includes("side")) currentSection = "side";
      else currentSection = "other";
      currentAct = undefined;
      continue;
    }

    const actMatch = /^##\s+ATO\s+([IVX]+)\s*[—\-]/i.exec(line);
    if (actMatch) {
      pushCurrent();
      const roman = actMatch[1].toUpperCase();
      currentAct = roman === "I" || roman === "II" || roman === "III" ? (roman as "I" | "II" | "III") : undefined;
      continue;
    }

    const questMatch = /^###\s+(.+)/.exec(line);
    if (questMatch) {
      pushCurrent();
      const rawTitle = questMatch[1].trim();
      const idMatch = QUEST_ID_RE.exec(rawTitle);
      const id = idMatch ? idMatch[1] : rawTitle.split(/\s+/)[0];
      // Remove ID e separadores no título
      let title = rawTitle
        .replace(QUEST_ID_RE, "")
        .replace(/^[·\-—\s"]+|["\s·\-—]+$/g, "")
        .trim();
      if (!title) title = rawTitle;
      current = {
        id,
        title,
        act: currentAct,
        section: currentSection,
      };
      continue;
    }

    if (current) {
      const bioma = /bioma[\-\s—:]*(?:âncora|ancora)?\s*[:=]?\s*([A-ZÁÉÍÓÚÀÂÊÎÔÛÃÕÇ][\wÀ-ÿ\'\-\s]+)/i.exec(line);
      if (bioma && !current.biome) current.biome = bioma[1].trim().slice(0, 40);
      if (!current.summary) {
        const clean = line.replace(/^\*+|^>+\s*|^-+\s*/, "").trim();
        if (clean.length > 20 && !clean.startsWith("#") && !clean.startsWith("|")) {
          current.summary = clean.slice(0, 180);
        }
      }
    }
  }
  pushCurrent();

  // Filtra entries sem id reconhecível
  return out.filter((q) => q.id && q.title);
}

export function parseDialogueNodes(md: string): DialogueNode[] {
  if (!md) return [];
  const out: DialogueNode[] = [];

  // Extrai code blocks tripla-crase (onde ficam as árvores reais)
  const blocks: string[] = [];
  const blockRe = /```[\w]*\n([\s\S]*?)```/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(md)) !== null) {
    blocks.push(bm[1]);
  }

  // Fallback: se não achou code blocks, parseia doc inteiro
  const sources = blocks.length > 0 ? blocks : [md];

  // Descobre a cena/cutscene mais próxima escaneando o doc por headers
  const sceneByLine = new Map<number, string>();
  const lines = md.split(/\r?\n/);
  let currentScene = "";
  for (let i = 0; i < lines.length; i++) {
    const h2 = /^##\s+(?:CUTSCENE|CENA|DIÁLOGO|DIALOGO|NPC)[^\n]*/i.exec(lines[i]);
    if (h2) currentScene = h2[0].replace(/^##\s+/, "").trim();
    sceneByLine.set(i, currentScene);
  }

  for (const block of sources) {
    // Divide o bloco em nodes: começa em [NODE-XX] e vai até o próximo [NODE-] ou fim
    const nodeRe = /\[NODE-([\w\-]+)\]([\s\S]*?)(?=\[NODE-[\w\-]+\]|$)/g;
    let nm: RegExpExecArray | null;
    while ((nm = nodeRe.exec(block)) !== null) {
      const id = nm[1];
      // Ignora o placeholder das convenções (ex: "XX")
      if (/^X+$/i.test(id)) continue;

      const body = nm[2];
      const choices: DialogueChoice[] = [];
      const flagsRequired: string[] = [];
      const textLines: string[] = [];

      for (const rawLine of body.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        // Escolha: > [A] texto → [NODE-YY]
        const choice = /^>\s*\[([A-Z0-9]+)\]\s*(.+)/.exec(line);
        if (choice) {
          const rest = choice[2];
          const targetMatch = /→\s*\[NODE-([\w\-]+)\]|\bto\s+NODE-([\w\-]+)/i.exec(rest);
          const target = targetMatch ? targetMatch[1] || targetMatch[2] : undefined;
          const label = rest.replace(/→\s*\[NODE-[\w\-]+\].*$/, "").replace(/\s*⊕.*$/, "").replace(/\s*⊖.*$/, "").trim();
          const flagsOn = [...rest.matchAll(/⊕\s*([\w_]+)/g)].map((m) => m[1]);
          const flagsOff = [...rest.matchAll(/⊖\s*([\w_]+)/g)].map((m) => m[1]);
          choices.push({ label: `[${choice[1]}] ${label}`, target, flagsOn, flagsOff });
          continue;
        }

        // Requisitos 🔒 req: flag_a & flag_b
        const req = /🔒\s*req:\s*(.+)/i.exec(line);
        if (req) {
          req[1].split(/[,&]/).forEach((f) => {
            const t = f.trim().replace(/[`'"]/g, "");
            if (t) flagsRequired.push(t);
          });
          continue;
        }

        textLines.push(rawLine);
      }

      const text = textLines.join("\n").trim().slice(0, 600);
      const scene = sceneByLine.get(0) || undefined;
      out.push({ id: `NODE-${id}`, scene, text, choices, flagsRequired });
    }
  }

  return out;
}

export function groupQuestsBySection(quests: QuestSummary[]): Record<QuestSummary["section"], QuestSummary[]> {
  const empty: Record<QuestSummary["section"], QuestSummary[]> = {
    main: [],
    side: [],
    chain: [],
    faction: [],
    other: [],
  };
  for (const q of quests) empty[q.section].push(q);
  return empty;
}
