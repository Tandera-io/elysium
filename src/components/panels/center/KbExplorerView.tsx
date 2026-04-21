import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { kbStats, search } from "@/lib/kb";
import { AGENTS } from "@/agents/agents";
import type { AgentType } from "@/types/domain";

export function KbExplorerView() {
  const { currentProject } = useProjectStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof search>>
  >([]);
  const [stats, setStats] = useState<{
    count: number;
    byPhase: Record<number, number>;
  }>({ count: 0, byPhase: {} });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentProject) return;
    kbStats(currentProject.id).then(setStats);
  }, [currentProject?.id]);

  async function go() {
    if (!currentProject || !query.trim()) return;
    setBusy(true);
    try {
      const r = await search(currentProject.id, query.trim(), 10);
      setResults(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header">
        <Search className="h-3 w-3" />
        <span>Knowledge Base Semântico</span>
        <Badge variant="outline" className="ml-2">
          {stats.count} chunks
        </Badge>
      </div>
      <div className="p-3 border-b border-border/60 flex gap-2">
        <Input
          placeholder="Busca em linguagem natural. Ex: 'qual é o mood principal do jogo?'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        <Button onClick={go} disabled={busy || !query.trim()}>
          {busy ? "Buscando…" : "Buscar"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-10">
              Digite uma pergunta e tecle Enter. O KB só ingere documentos após
              você aprovar uma etapa.
            </p>
          )}
          {results.map((r, i) => {
            const agent =
              r.entry.agent && AGENTS[r.entry.agent as AgentType];
            return (
              <div
                key={r.entry.id}
                className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-1"
              >
                <div className="flex items-center gap-2 text-[10px]">
                  <Badge variant="outline">#{i + 1}</Badge>
                  <Badge variant="secondary">sim {r.similarity.toFixed(3)}</Badge>
                  {r.entry.phase != null && (
                    <Badge>Etapa {r.entry.phase}</Badge>
                  )}
                  {agent && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${agent.color}22`,
                        color: agent.color,
                      }}
                    >
                      {agent.displayName.replace(" Agent", "")}
                    </span>
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">
                  {r.entry.content}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
