import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { actions, useStore } from "@/lib/store";
import type { StatusVaca, Vaca } from "@/lib/types";
import { formatDate, statusColor, statusLabel } from "@/lib/lacto-utils";
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
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vacas/")({
  head: () => ({
    meta: [
      { title: "Vacas — Lacto Control" },
      {
        name: "description",
        content: "Cadastro e listagem das vacas do rebanho.",
      },
    ],
  }),
  component: VacasList,
});

const statusOptions: StatusVaca[] = ["lactacao", "seca", "prenha", "descartada"];

function VacasList() {
  const vacas = useStore((s) => s.vacas);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [open, setOpen] = useState(false);

  const filtered = vacas.filter((v) => {
    const matchQ =
      q === "" ||
      v.nome.toLowerCase().includes(q.toLowerCase()) ||
      v.brinco.includes(q) ||
      v.raca.toLowerCase().includes(q.toLowerCase());
    const matchS = filterStatus === "todos" || v.status === filterStatus;
    return matchQ && matchS;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Vacas"
        description={`${vacas.length} animais cadastrados`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Nova vaca
              </Button>
            </DialogTrigger>
            <VacaFormDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, brinco ou raça"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Nenhuma vaca encontrada.
            </div>
          )}
          {filtered.map((v) => (
            <Link
              key={v.id}
              to="/vacas/$id"
              params={{ id: v.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold group-hover:text-primary">
                    {v.nome}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Brinco #{v.brinco} · {v.raca}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={statusColor[v.status]}
                >
                  {statusLabel[v.status]}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Último parto</div>
                  <div className="font-medium">
                    {formatDate(v.dataUltimoParto)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Início lactação</div>
                  <div className="font-medium">
                    {formatDate(v.dataInicioLactacao)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}

export function VacaFormDialog({
  vaca,
  onClose,
}: {
  vaca?: Vaca;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Vaca, "id">>(
    vaca ?? {
      nome: "",
      brinco: "",
      raca: "",
      dataNascimento: "",
      dataUltimoParto: "",
      dataInicioLactacao: "",
      status: "lactacao",
      observacoes: "",
    },
  );

  const submit = () => {
    if (!form.nome.trim() || !form.brinco.trim()) {
      toast.error("Nome e brinco são obrigatórios.");
      return;
    }
    if (vaca) {
      actions.updateVaca(vaca.id, form);
      toast.success("Vaca atualizada.");
    } else {
      actions.addVaca(form);
      toast.success("Vaca cadastrada.");
    }
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{vaca ? "Editar vaca" : "Nova vaca"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome / identificação">
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </Field>
        <Field label="Brinco">
          <Input
            value={form.brinco}
            onChange={(e) => setForm({ ...form, brinco: e.target.value })}
          />
        </Field>
        <Field label="Raça">
          <Input
            value={form.raca}
            onChange={(e) => setForm({ ...form, raca: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as StatusVaca })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Data de nascimento">
          <Input
            type="date"
            value={form.dataNascimento}
            onChange={(e) =>
              setForm({ ...form, dataNascimento: e.target.value })
            }
          />
        </Field>
        <Field label="Data do último parto">
          <Input
            type="date"
            value={form.dataUltimoParto}
            onChange={(e) =>
              setForm({ ...form, dataUltimoParto: e.target.value })
            }
          />
        </Field>
        <Field label="Início da lactação">
          <Input
            type="date"
            value={form.dataInicioLactacao}
            onChange={(e) =>
              setForm({ ...form, dataInicioLactacao: e.target.value })
            }
          />
        </Field>
        <Field label="Observações" full>
          <Textarea
            value={form.observacoes ?? ""}
            onChange={(e) =>
              setForm({ ...form, observacoes: e.target.value })
            }
            rows={3}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        {vaca && (
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Excluir esta vaca?")) {
                actions.deleteVaca(vaca.id);
                toast.success("Vaca excluída.");
                onClose();
              }
            }}
          >
            <Trash2 className="mr-2 size-4" /> Excluir
          </Button>
        )}
        <Button onClick={submit}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({
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
