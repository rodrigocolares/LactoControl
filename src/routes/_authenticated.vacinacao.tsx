import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { actions, useStore } from "@/lib/store";
import {
  addDays,
  formatDate,
  periodicidadeDias,
  statusVacina,
} from "@/lib/lacto-utils";
import type { AplicacaoVacina } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Syringe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/Skeletons";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePersistentState } from "@/hooks/use-persistent-state";


export const Route = createFileRoute("/_authenticated/vacinacao")({
  head: () => ({
    meta: [
      { title: "Vacinação — Lacto Control" },
      {
        name: "description",
        content: "Aplicações de vacinas e calendário sanitário do rebanho.",
      },
    ],
  }),
  component: VacinacaoPage,
});

function VacinacaoPage() {
  const aplicacoes = useStore((s) => s.aplicacoes);
  const vacas = useStore((s) => s.vacas);
  const vacinas = useStore((s) => s.vacinas);
  const ready = useStore((s) => s.ready);
  const [open, setOpen] = useState(false);
  const [fVaca, setFVaca] = usePersistentState<string>(
    "vacinacao:filterVaca",
    "todas",
  );
  const [fStatus, setFStatus] = usePersistentState<string>(
    "vacinacao:filterStatus",
    "todos",
  );
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 180);

  const filtered = aplicacoes
    .filter((a) => (fVaca === "todas" ? true : a.vacaId === fVaca))
    .filter((a) => (fStatus === "todos" ? true : statusVacina(a) === fStatus))
    .filter((a) => {
      const needle = debouncedQ.trim().toLowerCase();
      if (!needle) return true;
      const v = vacas.find((x) => x.id === a.vacaId);
      const vc = vacinas.find((x) => x.id === a.vacinaId);
      const hay = `${v?.nome ?? ""} ${v?.brinco ?? ""} ${vc?.nome ?? ""} ${a.responsavel ?? ""}`.toLowerCase();
      return hay.includes(needle);
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <AppLayout>
      <PageHeader
        title="Aplicações de vacinas"
        description={`${aplicacoes.length} registros`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Nova aplicação
              </Button>
            </DialogTrigger>
            <AplicacaoDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      {!ready ? (
        <Card className="p-4">
          <SkeletonTable rows={6} cols={7} />
        </Card>
      ) : aplicacoes.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={Syringe}
            title="Nenhuma aplicação registrada"
            description="Registre a primeira aplicação para o sistema calcular reforços automaticamente e alertar sobre vencimentos."
            action={{
              label: "Registrar primeira aplicação",
              node: (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 size-4" /> Registrar primeira aplicação
                </Button>
              ),
            }}
          />
        </Card>
      ) : (
        <Card className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por vaca, vacina ou responsável"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
                aria-label="Buscar aplicações"
              />
            </div>
            <Select value={fVaca} onValueChange={setFVaca}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as vacas</SelectItem>
                {vacas.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome} #{v.brinco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="em_dia">Em dia</SelectItem>
                <SelectItem value="vencendo">Vencendo</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title="Nenhuma aplicação encontrada"
              description="Ajuste os filtros ou a busca para ver mais resultados."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Vaca</th>
                    <th className="py-2 pr-3">Vacina</th>
                    <th className="py-2 pr-3">Dose</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Próxima</th>
                    <th className="py-2 pr-3">Responsável</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const v = vacas.find((x) => x.id === a.vacaId);
                    const vc = vacinas.find((x) => x.id === a.vacinaId);
                    const st = statusVacina(a);
                    const stCls =
                      st === "vencida"
                        ? "bg-destructive text-destructive-foreground"
                        : st === "vencendo"
                          ? "bg-warning text-warning-foreground"
                          : "bg-success text-success-foreground";
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 pr-3 font-medium">
                          {v?.nome}{" "}
                          <span className="text-muted-foreground">
                            #{v?.brinco}
                          </span>
                        </td>
                        <td className="py-3 pr-3">{vc?.nome ?? "-"}</td>
                        <td className="py-3 pr-3">{a.dose}</td>
                        <td className="py-3 pr-3">{formatDate(a.data)}</td>
                        <td className="py-3 pr-3">{formatDate(a.proximaDose)}</td>
                        <td className="py-3 pr-3">{a.responsavel}</td>
                        <td className="py-3 pr-3">
                          <Badge className={stCls}>
                            {st === "vencida"
                              ? "Vencida"
                              : st === "vencendo"
                                ? "Vencendo"
                                : "Em dia"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Excluir aplicação?")) {
                                actions.deleteAplicacao(a.id);
                                toast.success("Excluída.");
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </AppLayout>
  );
}


function AplicacaoDialog({ onClose }: { onClose: () => void }) {
  const vacas = useStore((s) => s.vacas);
  const vacinas = useStore((s) => s.vacinas);
  const aplicacoes = useStore((s) => s.aplicacoes);
  const [form, setForm] = useState<Omit<AplicacaoVacina, "id">>({
    vacaId: "",
    vacinaId: "",
    data: new Date().toISOString().slice(0, 10),
    dose: "1ª",
    responsavel: "",
    lote: "",
    observacoes: "",
  });

  const submit = () => {
    if (!form.vacaId) {
      toast.error("Selecione uma vaca.");
      return;
    }
    if (!form.vacinaId) {
      toast.error("Selecione a vacina.");
      return;
    }
    if (!form.responsavel.trim()) {
      toast.error("Informe o responsável.");
      return;
    }
    // Duplicate check
    const dup = aplicacoes.find(
      (a) =>
        a.vacaId === form.vacaId &&
        a.vacinaId === form.vacinaId &&
        a.data === form.data,
    );
    if (dup) {
      toast.error("Já existe registro dessa vacina nesta data para esta vaca.");
      return;
    }
    const vc = vacinas.find((v) => v.id === form.vacinaId);
    let proxima: string | undefined;
    if (vc) {
      const dias = periodicidadeDias(vc);
      if (dias) proxima = addDays(form.data, dias);
    }
    actions.addAplicacao({ ...form, proximaDose: proxima });
    toast.success("Aplicação registrada.");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova aplicação</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Vaca">
          <Select
            value={form.vacaId}
            onValueChange={(v) => setForm({ ...form, vacaId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {vacas.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome} #{v.brinco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Vacina">
          <Select
            value={form.vacinaId}
            onValueChange={(v) => setForm({ ...form, vacinaId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {vacinas.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Data">
          <Input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
        </F>
        <F label="Dose">
          <Select
            value={form.dose}
            onValueChange={(v) => setForm({ ...form, dose: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1ª">1ª dose</SelectItem>
              <SelectItem value="2ª">2ª dose</SelectItem>
              <SelectItem value="3ª">3ª dose</SelectItem>
              <SelectItem value="Reforço">Reforço</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Responsável">
          <Input
            value={form.responsavel}
            onChange={(e) =>
              setForm({ ...form, responsavel: e.target.value })
            }
          />
        </F>
        <F label="Lote (opcional)">
          <Input
            value={form.lote ?? ""}
            onChange={(e) => setForm({ ...form, lote: e.target.value })}
          />
        </F>
        <F label="Observações" full>
          <Textarea
            value={form.observacoes ?? ""}
            onChange={(e) =>
              setForm({ ...form, observacoes: e.target.value })
            }
            rows={2}
          />
        </F>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit}>Registrar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function F({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
