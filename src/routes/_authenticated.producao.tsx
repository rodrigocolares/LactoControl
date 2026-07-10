import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { actions, useStore } from "@/lib/store";
import { mesNome, mesNomeLongo } from "@/lib/lacto-utils";
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

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Produção mensal — Lacto Control" },
      {
        name: "description",
        content: "Registro mensal de produção de leite por vaca.",
      },
    ],
  }),
  component: ProducaoPage,
});

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function ProducaoPage() {
  const vacas = useStore((s) => s.vacas);
  const producoes = useStore((s) => s.producoes);
  const [open, setOpen] = useState(false);
  const [filterVaca, setFilterVaca] = useState("todas");
  const [filterAno, setFilterAno] = useState<string>("todos");

  const filtered = producoes
    .filter(
      (p) =>
        (filterVaca === "todas" || p.vacaId === filterVaca) &&
        (filterAno === "todos" || p.ano === Number(filterAno)),
    )
    .sort((a, b) => b.ano - a.ano || b.mes - a.mes);

  return (
    <AppLayout>
      <PageHeader
        title="Produção mensal"
        description="Registros de leite por vaca e mês."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Novo registro
              </Button>
            </DialogTrigger>
            <ProducaoDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={filterVaca} onValueChange={setFilterVaca}>
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
          <Select value={filterAno} onValueChange={setFilterAno}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos anos</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Vaca</th>
                <th className="py-2 pr-3">Período</th>
                <th className="py-2 pr-3">Total (L)</th>
                <th className="py-2 pr-3">Média/dia</th>
                <th className="py-2 pr-3">Obs</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const vaca = vacas.find((v) => v.id === p.vacaId);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-3 font-medium">
                      {vaca?.nome} <span className="text-muted-foreground">#{vaca?.brinco}</span>
                    </td>
                    <td className="py-3 pr-3">
                      {mesNome(p.mes)}/{p.ano}
                    </td>
                    <td className="py-3 pr-3 font-semibold tabular-nums">
                      {p.totalLitros.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 pr-3 tabular-nums">
                      {p.mediaDiaria.toFixed(2)}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {p.observacoes || "-"}
                    </td>
                    <td className="py-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Excluir registro?")) {
                            actions.deleteProducao(p.id);
                            toast.success("Excluído.");
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
      </Card>
    </AppLayout>
  );
}

function ProducaoDialog({ onClose }: { onClose: () => void }) {
  const vacas = useStore((s) => s.vacas);
  const now = new Date();
  const [vacaId, setVacaId] = useState("");
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [total, setTotal] = useState("");
  const [obs, setObs] = useState("");

  const totalNum = Number(total) || 0;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const media = totalNum / diasNoMes;

  const submit = () => {
    if (!vacaId) {
      toast.error("Selecione uma vaca.");
      return;
    }
    if (totalNum < 0) {
      toast.error("Não são permitidos valores negativos.");
      return;
    }
    if (totalNum === 0) {
      toast.error("Informe a quantidade produzida.");
      return;
    }
    actions.addProducao({
      vacaId,
      ano,
      mes,
      totalLitros: totalNum,
      mediaDiaria: +media.toFixed(2),
      observacoes: obs || undefined,
    });
    toast.success("Registro adicionado.");
    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova produção mensal</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div>
          <Label className="mb-1.5 block text-xs">Vaca</Label>
          <Select value={vacaId} onValueChange={setVacaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma vaca" />
            </SelectTrigger>
            <SelectContent>
              {vacas.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome} #{v.brinco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block text-xs">Mês</Label>
            <Select
              value={String(mes)}
              onValueChange={(v) => setMes(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {mesNomeLongo(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Ano</Label>
            <Select
              value={String(ano)}
              onValueChange={(v) => setAno(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">
            Total no mês (litros)
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          {totalNum > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Média diária calculada: <b>{media.toFixed(2)} L/dia</b>
            </p>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Observações</Label>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
          />
        </div>
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
