import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderArchive, FlaskConical, ScrollText } from "lucide-react";
import { PHASES } from "@/types/pipeline";
import { formatDate } from "@/lib/utils";

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, refreshProjects, createProject, archiveProject } =
    useProjectStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshProjects().catch((e) => setError(String(e?.message ?? e)));
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const p = await createProject(name.trim(), description.trim() || undefined);
      setOpen(false);
      setName("");
      setDescription("");
      navigate(`/project/${p.id}`);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">
              Elysium Build Platform
            </h1>
            <p className="text-muted-foreground max-w-2xl mt-2">
              Orquestre o desenvolvimento do seu jogo indie conversando com 8 agentes
              especialistas de IA. Do pitch ao GDD final, em 13 etapas estruturadas.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="glow" size="lg">
                <Plus className="h-4 w-4" /> Novo projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo projeto de jogo</DialogTitle>
                <DialogDescription>
                  Dê um nome e uma breve descrição. Você refina tudo depois com o
                  Discovery Agent.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Nome
                  </label>
                  <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Hollow Reverie"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Descrição (opcional)
                  </label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Um metroidvania melancólico sobre memórias fragmentadas..."
                  />
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={busy || !name.trim()}>
                  {busy ? "Criando…" : "Criar e abrir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <InfoCard
            icon={<FlaskConical className="h-4 w-4" />}
            title="8 agentes especialistas"
            text="Discovery, Benchmark, Mechanics, Lore, Level, Art, Audio e Producer — cada um com frameworks próprios."
          />
          <InfoCard
            icon={<ScrollText className="h-4 w-4" />}
            title="13 etapas sequenciais"
            text="Do pitch inicial ao GDD final, com gates de aprovação, KB semântico e versionamento de decisões."
          />
          <InfoCard
            icon={<Plus className="h-4 w-4" />}
            title="Integrações nativas"
            text="Pixellab para concept arts, ElevenLabs para trilha e SFX. Geração sob demanda, cacheada por prompt."
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Seus projetos
            </h2>
            <Badge variant="outline">{projects.length}</Badge>
          </div>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  Nenhum projeto ainda. Clique em{" "}
                  <strong className="text-foreground">Novo projeto</strong> para
                  começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/project/${p.id}`)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    navigate(`/project/${p.id}`)
                  }
                  className="cursor-pointer hover:border-primary/60 transition-colors"
                >
                  <CardHeader>
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                      {p.description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="default">
                        Etapa {p.current_phase}/13
                      </Badge>
                      <span>
                        {PHASES[p.current_phase - 1]?.title ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Atualizado em {formatDate(p.updated_at)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Arquivar "${p.name}"?`)) {
                            archiveProject(p.id);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-destructive"
                      >
                        <FolderArchive className="h-3 w-3" /> Arquivar
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}
