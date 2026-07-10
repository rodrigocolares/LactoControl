import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { actions, useStore } from "@/lib/store";
import { periodicidadeLabel } from "@/lib/lacto-utils";
import type { Periodicidade, Vacina } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vacinas")({
  head: () => ({
    meta: [
      { title: "Vacinas — Lacto Control" },
      {
        name: "description",
        content: "Catálogo de vacinas e periodicidades.",
      },
    ],
  }),
  component: VacinasPage,
});

const periodicidades: Periodicidade[] = [
  "anual",
  "semestral",
  "trimestral",
  "mensal",
  "dose_unica",
  "personalizado",
];

function VacinasPage() {
  const vacinas = useStore((s) => s.vacinas);
  const [open, setOpen] = useState(false);

  return (
    <AppLayout>
      <PageHeader
        title="Catálogo de vacinas"
        description={`${vacinas.length} vacinas cadastradas`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Nova vacina
              </Button>
            </DialogTrigger>
            <VacinaDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {vacinas.map((v) => (
          <Card key={v.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-base font-bold">{v.nome}</div>
                <div className="text-xs text-muted-foreground">{v.doenca}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Excluir vacina?")) {
                    actions.deleteVacina(v.id);
                    toast.success("Excluída.");
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Info label="Fabricante" value={v.fabricante} />
              <Info label="Doses" value={v.doses} />
              <Info
                label="Periodicidade"
                value={periodicidadeLabel[v.periodicidade]}
              />
              <Info label="Carência" value={`${v.carencia} dias`} />
            </div>
          </Card>
        ))}
        {vacinas.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            Nenhuma vacina cadastrada.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function VacinaDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Omit<Vacina, "id">>({
    nome: "",
    doenca: "",
    fabricante: "",
    lote: "",
    doses: 1,
    intervaloDoses: 0,
    periodicidade: "anual",
    carencia: 0,
    observacoes: "",
  });

  const submit = () => {
    if (!form.nome.trim() || !form.doenca.trim()) {
      toast.error("Informe nome e doença.");
      return;
    }
    if (form.doses < 1 || form.carencia < 0 || form.intervaloDoses < 0) {
      toast.error("Valores inválidos.");
      return;
    }
    actions.addVacina(form);
    toast.success("Vacina cadastrada.");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova vacina</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Nome">
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </F>
        <F label="Doença/prevenção">
          <Input
            value={form.doenca}
            onChange={(e) => setForm({ ...form, doenca: e.target.value })}
          />
        </F>
        <F label="Fabricante">
          <Input
            value={form.fabricante}
            onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
          />
        </F>
        <F label="Lote (opcional)">
          <Input
            value={form.lote ?? ""}
            onChange={(e) => setForm({ ...form, lote: e.target.value })}
          />
        </F>
        <F label="Número de doses">
          <Input
            type="number"
            min="1"
            value={form.doses}
            onChange={(e) =>
              setForm({ ...form, doses: Number(e.target.value) || 1 })
            }
          />
        </F>
        <F label="Intervalo entre doses (dias)">
          <Input
            type="number"
            min="0"
            value={form.intervaloDoses}
            onChange={(e) =>
              setForm({ ...form, intervaloDoses: Number(e.target.value) || 0 })
            }
          />
        </F>
        <F label="Periodicidade de reforço">
          <Select
            value={form.periodicidade}
            onValueChange={(v) =>
              setForm({ ...form, periodicidade: v as Periodicidade })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodicidades.map((p) => (
                <SelectItem key={p} value={p}>
                  {periodicidadeLabel[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        {form.periodicidade === "personalizado" && (
          <F label="Intervalo personalizado (dias)">
            <Input
              type="number"
              min="1"
              value={form.periodicidadeDiasCustom ?? 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  periodicidadeDiasCustom: Number(e.target.value) || 0,
                })
              }
            />
          </F>
        )}
        <F label="Carência (dias)">
          <Input
            type="number"
            min="0"
            value={form.carencia}
            onChange={(e) =>
              setForm({ ...form, carencia: Number(e.target.value) || 0 })
            }
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
        <Button onClick={submit}>Salvar</Button>
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
