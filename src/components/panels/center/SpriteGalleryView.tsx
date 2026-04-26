// Sprite Gallery — agrupa sprites gerados por canon_slug e expande para
// grid com portrait + animações (idle/walk/attack/...) + frames fatiados.
// Consome generated_assets onde asset_type='sprite' e generator='pixellab'.

import { useCallback, useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  Image as ImageIcon,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { assetsRepo } from "@/lib/db";
import type { GeneratedAsset, AssetStatus } from "@/types/domain";

interface SpriteMeta {
  character_name?: string;
  character_display_name?: string;
  character_role?: string;
  frame_role?: string;
  action?: string;
  direction?: string;
  frame_index?: number;
  total_frames?: number;
  sheet?: boolean;
  size?: number;
  custom_action?: string;
}

interface GroupedSprite {
  slug: string;
  displayName: string;
  role?: string;
  portrait?: GeneratedAsset;
  animationSheets: GeneratedAsset[]; // PNG horizontais (Pixellab skeleton)
  animationFrames: GeneratedAsset[]; // PNGs fatiados
  actionFrames: GeneratedAsset[]; // attack/hurt/death/jump
  customActions: GeneratedAsset[]; // special, cast, etc.
  total: number;
}

type StatusFilter = AssetStatus | "all";

function parseMeta(raw: string | null | undefined): SpriteMeta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SpriteMeta;
  } catch {
    return {};
  }
}

function groupSprites(assets: GeneratedAsset[]): GroupedSprite[] {
  const bySlug = new Map<string, GroupedSprite>();

  for (const a of assets) {
    if (a.asset_type !== "sprite") continue;
    const meta = parseMeta(a.generation_metadata);
    const slug = meta.character_name || "unknown";
    let group = bySlug.get(slug);
    if (!group) {
      group = {
        slug,
        displayName: meta.character_display_name || slug,
        role: meta.character_role,
        animationSheets: [],
        animationFrames: [],
        actionFrames: [],
        customActions: [],
        total: 0,
      };
      bySlug.set(slug, group);
    }
    group.total += 1;
    if (meta.frame_role === "portrait" && !group.portrait) {
      group.portrait = a;
    } else if (meta.frame_role === "animation" && meta.sheet === true) {
      group.animationSheets.push(a);
    } else if (meta.frame_role === "animation_frame") {
      group.animationFrames.push(a);
    } else if (meta.frame_role === "action") {
      group.actionFrames.push(a);
    } else if (meta.frame_role === "custom_action") {
      group.customActions.push(a);
    } else if (!group.portrait) {
      // Fallback: usar primeiro asset como portrait se não tem role explícito
      group.portrait = a;
    }
  }

  // Ordena frames por (action, direction, frame_index)
  for (const g of bySlug.values()) {
    g.animationFrames.sort((a, b) => {
      const ma = parseMeta(a.generation_metadata);
      const mb = parseMeta(b.generation_metadata);
      const actA = ma.action || "";
      const actB = mb.action || "";
      if (actA !== actB) return actA.localeCompare(actB);
      const dirA = ma.direction || "";
      const dirB = mb.direction || "";
      if (dirA !== dirB) return dirA.localeCompare(dirB);
      return (ma.frame_index ?? 0) - (mb.frame_index ?? 0);
    });
  }

  return Array.from(bySlug.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}

export function SpriteGalleryView() {
  const { currentProject } = useProjectStore();
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const all = await assetsRepo.listByProject(currentProject.id);
      setAssets(all.filter((a) => a.asset_type === "sprite"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groups = useMemo(() => groupSprites(assets), [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (q && !`${g.slug} ${g.displayName}`.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && g.role !== roleFilter) return false;
      if (statusFilter !== "all") {
        const hasStatus = g.portrait && g.portrait.status === statusFilter;
        if (!hasStatus) return false;
      }
      return true;
    });
  }, [groups, search, roleFilter, statusFilter]);

  const roleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) m.set(g.role || "other", (m.get(g.role || "other") ?? 0) + 1);
    return m;
  }, [groups]);

  const toggleExpand = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const totalAssets = assets.length;
  const totalCharacters = groups.length;

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Selecione um projeto.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-border/60 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Sprites Gallery</h1>
          <div className="text-[11px] text-muted-foreground ml-2">
            {totalCharacters} personagens · {totalAssets} sprites totais
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            Recarregar
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="buscar personagem..."
              className="pl-7 h-8"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos os roles ({groups.length})</option>
            {Array.from(roleCounts.entries()).map(([role, count]) => (
              <option key={role} value={role}>
                {role} ({count})
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 rounded border border-border/60 bg-background px-2 text-xs"
          >
            <option value="all">Todos status</option>
            <option value="generated">Gerado</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
          </select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setExpanded(new Set(filtered.slice(0, 50).map((g) => g.slug)))
            }
          >
            Expandir top 50
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setExpanded(new Set())}>
            Colapsar tudo
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Carregando…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhum sprite gerado ainda. Rode F1 · Character Sprites.
            </div>
          )}
          {filtered.map((g) => (
            <CharacterCard
              key={g.slug}
              group={g}
              expanded={expanded.has(g.slug)}
              onToggle={() => toggleExpand(g.slug)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function CharacterCard({
  group,
  expanded,
  onToggle,
}: {
  group: GroupedSprite;
  expanded: boolean;
  onToggle: () => void;
}) {
  const anims = useMemo(() => {
    // Agrupa animationFrames por action/direction para exibição
    const byKey = new Map<string, GeneratedAsset[]>();
    for (const a of group.animationFrames) {
      const m = parseMeta(a.generation_metadata);
      const key = `${m.action ?? "?"}/${m.direction ?? "?"}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(a);
    }
    return Array.from(byKey.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [group.animationFrames]);

  return (
    <div className="rounded border border-border/50 bg-card/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-accent/10 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        {group.portrait ? (
          <img
            src={convertFileSrc(group.portrait.file_path)}
            alt={group.slug}
            className="h-14 w-14 object-cover rounded border border-border/40 shrink-0 bg-black/20"
          />
        ) : (
          <div className="h-14 w-14 rounded border border-border/30 border-dashed flex items-center justify-center text-muted-foreground shrink-0">
            <Users className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{group.displayName}</span>
            {group.role && (
              <Badge variant="outline" className="text-[9px]">
                {group.role}
              </Badge>
            )}
            {group.portrait && (
              <StatusPill status={group.portrait.status} />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {group.slug}
          </div>
          <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{group.animationSheets.length} sheets</span>
            <span>·</span>
            <span>{group.animationFrames.length} frames</span>
            <span>·</span>
            <span>{group.actionFrames.length} actions</span>
            <span>·</span>
            <span>{group.customActions.length} customs</span>
            <span>·</span>
            <span className="font-semibold text-foreground">Total: {group.total}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/30 bg-background/40">
          {group.portrait && (
            <Section title="Portrait">
              <SpriteTile asset={group.portrait} />
            </Section>
          )}
          {anims.length > 0 && (
            <Section title="Animações (frames fatiados)">
              {anims.map(([key, frames]) => (
                <div key={key} className="mb-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    {key}
                    <span className="ml-1 text-muted-foreground/70">
                      ({frames.length} frames)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {frames.map((f) => (
                      <SpriteTile key={f.id} asset={f} size="sm" />
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}
          {group.animationSheets.length > 0 && (
            <Section title="Animation sheets (originais Pixellab)">
              <div className="flex flex-wrap gap-2">
                {group.animationSheets.map((a) => (
                  <SpriteTile key={a.id} asset={a} wide />
                ))}
              </div>
            </Section>
          )}
          {group.actionFrames.length > 0 && (
            <Section title="Actions (attack/hurt/death)">
              <div className="flex flex-wrap gap-2">
                {group.actionFrames.map((a) => (
                  <SpriteTile key={a.id} asset={a} />
                ))}
              </div>
            </Section>
          )}
          {group.customActions.length > 0 && (
            <Section title="Custom actions">
              <div className="flex flex-wrap gap-2">
                {group.customActions.map((a) => (
                  <SpriteTile key={a.id} asset={a} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-foreground/80 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function SpriteTile({
  asset,
  size = "md",
  wide = false,
}: {
  asset: GeneratedAsset;
  size?: "sm" | "md";
  wide?: boolean;
}) {
  const dim = size === "sm" ? "h-10" : "h-16";
  const w = wide ? "max-w-[200px]" : size === "sm" ? "w-10" : "w-16";
  const meta = parseMeta(asset.generation_metadata);
  const tooltip = meta.action
    ? `${meta.action}${meta.direction ? "/" + meta.direction : ""}${
        meta.frame_index ? ` #${meta.frame_index}` : ""
      }`
    : meta.custom_action || meta.frame_role || "";
  return (
    <div className="relative group" title={tooltip}>
      <img
        src={convertFileSrc(asset.file_path)}
        alt={tooltip}
        className={cn(
          "object-contain rounded border border-border/40 bg-black/20",
          dim,
          w
        )}
        style={{ imageRendering: "pixelated" }}
      />
      <StatusDot status={asset.status} />
    </div>
  );
}

function StatusPill({ status }: { status: AssetStatus }) {
  const base =
    "text-[9px] px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1";
  if (status === "approved")
    return (
      <span className={cn(base, "bg-emerald-500/20 text-emerald-300")}>
        <Check className="h-2.5 w-2.5" /> aprovado
      </span>
    );
  if (status === "generated")
    return (
      <span className={cn(base, "bg-sky-500/20 text-sky-300")}>
        <Check className="h-2.5 w-2.5" /> gerado
      </span>
    );
  if (status === "rejected")
    return (
      <span className={cn(base, "bg-red-500/20 text-red-300")}>
        <X className="h-2.5 w-2.5" /> rejeitado
      </span>
    );
  return <span className={cn(base, "bg-muted text-muted-foreground")}>{status}</span>;
}

function StatusDot({ status }: { status: AssetStatus }) {
  const color =
    status === "approved"
      ? "bg-emerald-400"
      : status === "generated"
        ? "bg-sky-400"
        : status === "rejected"
          ? "bg-red-400"
          : "bg-muted-foreground";
  return (
    <span
      className={cn(
        "absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full border border-background",
        color
      )}
    />
  );
}
