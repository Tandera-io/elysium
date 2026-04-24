import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Mechanic {
  name: string;
  dynamic?: string;
  aesthetic?: string;
  source: "tsv" | "pipes" | "bullets" | "headings";
}

const HEADER_RE = /mec[aâ]n|din[aâ]m|est[eé]t|^#$|^n[uú]mero|aesthetic|dynamic/i;
const SEP_RE = /^[-+=\s|]+$/;

function isHeaderRow(cells: string[]): boolean {
  if (cells.length === 0) return true;
  return cells.some((c) => HEADER_RE.test(c)) && cells.every((c) => c.length < 60);
}

function splitAesthetics(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;/•]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 40)
    .slice(0, 6);
}

function extractMechanics(md: string): Mechanic[] {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  const result: Mechanic[] = [];

  // 1) TSV — linhas com pelo menos 2 TABs
  for (const raw of lines) {
    if (!raw.includes("\t")) continue;
    const cells = raw.split("\t").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    if (isHeaderRow(cells)) continue;
    if (SEP_RE.test(cells[0])) continue;

    let name: string, dynamic: string, aesthetic: string | undefined;
    // Se primeira coluna for só número (índice), usa col 2/3/4
    if (/^\d+$/.test(cells[0]) && cells.length >= 4) {
      [, name, dynamic, aesthetic] = cells;
    } else {
      [name, dynamic, aesthetic] = cells;
    }
    if (name && dynamic) {
      result.push({ name, dynamic, aesthetic, source: "tsv" });
    }
  }

  // 2) Pipes markdown — | col1 | col2 | col3 |
  if (result.length === 0) {
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed.startsWith("|")) continue;
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length < 3) continue;
      if (isHeaderRow(cells)) continue;
      if (SEP_RE.test(cells[0])) continue;
      let name: string, dynamic: string, aesthetic: string | undefined;
      if (/^\d+$/.test(cells[0]) && cells.length >= 4) {
        [, name, dynamic, aesthetic] = cells;
      } else {
        [name, dynamic, aesthetic] = cells;
      }
      if (name && dynamic) {
        result.push({ name, dynamic, aesthetic, source: "pipes" });
      }
    }
  }

  // 3) Bullets com nome em bold: "- **Nome**: descrição"
  if (result.length === 0) {
    const re = /[-*]\s+\*\*([^*]+)\*\*[:\-–—]?\s*(.*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      result.push({ name: m[1].trim(), dynamic: m[2].trim(), source: "bullets" });
    }
  }

  return result.slice(0, 30);
}

interface LoopSummary {
  micro?: string;
  medium?: string;
  macro?: string;
}

function extractCoreLoop(md: string): LoopSummary {
  if (!md) return {};
  const trim = (s: string) => s.trim().slice(0, 400);
  const micro = /Micro[-\s]?Loop[\s\S]{0,100}?\n([\s\S]*?)(?=\n\s*(?:Loop Médio|🔁|Macro-Loop|Loop|##)|\Z)/i.exec(md);
  const medium = /Loop\s+M[eé]dio[\s\S]{0,100}?\n([\s\S]*?)(?=\n\s*(?:Macro-Loop|🔁|##)|\Z)/i.exec(md);
  const macro = /Macro[-\s]?Loop[\s\S]{0,100}?\n([\s\S]*?)(?=\n\s*(?:##|\Z))/i.exec(md);
  return {
    micro: micro ? trim(micro[1]) : undefined,
    medium: medium ? trim(medium[1]) : undefined,
    macro: macro ? trim(macro[1]) : undefined,
  };
}

export function MechanicsMapView() {
  const { documents } = useProjectStore();
  const [query, setQuery] = useState("");

  const { mechs, loop, docTitle } = useMemo(() => {
    // Prioriza fase 4 (MDA detalhado); fallback fase 3 (core loop)
    const doc4 = documents.find((d) => d.phase_number === 4 && d.status === "approved");
    const doc3 = documents.find((d) => d.phase_number === 3 && d.status === "approved");

    const doc = doc4 ?? doc3;
    const mechs3 = extractMechanics(doc3?.content ?? "");
    const mechs4 = extractMechanics(doc4?.content ?? "");
    // Concatena preferindo fase 3 (tabela MDA canônica) e completando com fase 4 (specs) se distintas
    const seen = new Set(mechs3.map((m) => m.name.toLowerCase()));
    const combined = [...mechs3];
    for (const m of mechs4) {
      if (!seen.has(m.name.toLowerCase())) combined.push(m);
    }

    return {
      mechs: combined,
      loop: extractCoreLoop(doc3?.content ?? ""),
      docTitle: doc?.title ?? "",
    };
  }, [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mechs;
    return mechs.filter((m) => {
      const hay = `${m.name} ${m.dynamic ?? ""} ${m.aesthetic ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mechs, query]);

  if (mechs.length === 0) {
    return (
      <EmptyStateMap message="Complete a Etapa 3 (Core Loop) ou 4 (MDA) para visualizar o mapa de mecânicas." />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Mapa de Mecânicas
          </h1>
          <p className="text-xs text-muted-foreground">
            {docTitle || "Fases 3–4 · Core Loop + MDA/Tetrad"}
          </p>
        </header>

        {(loop.micro || loop.medium || loop.macro) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <LoopCard title="Micro · 5–30s" content={loop.micro} tone="primary" />
            <LoopCard title="Médio · 30–300s" content={loop.medium} tone="secondary" />
            <LoopCard title="Macro · 300s+" content={loop.macro} tone="muted" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar mecânica, dinâmica, estética..."
              className="pl-7 h-8"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} / {mechs.length} mecânicas
          </div>
        </div>

        <div className="rounded border border-border/60 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-card/60 text-muted-foreground">
              <tr className="text-left">
                <th className="p-2 w-10">#</th>
                <th className="p-2">Mecânica</th>
                <th className="p-2">Dinâmica que gera</th>
                <th className="p-2">Estética servida</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr
                  key={`${m.name}-${i}`}
                  className="border-t border-border/40 hover:bg-accent/20 align-top"
                >
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">{m.name}</td>
                  <td className="p-2 text-muted-foreground">{m.dynamic}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {splitAesthetics(m.aesthetic).map((a) => (
                        <Badge key={a} variant="secondary" className="text-[10px]">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
}

function LoopCard({
  title,
  content,
  tone,
}: {
  title: string;
  content?: string;
  tone: "primary" | "secondary" | "muted";
}) {
  if (!content) return null;
  return (
    <div
      className={cn(
        "rounded border border-border/60 p-3 space-y-1.5 bg-card/30",
        tone === "primary" && "border-primary/40"
      )}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-5">
        {content}
      </div>
    </div>
  );
}

export function EmptyStateMap({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
