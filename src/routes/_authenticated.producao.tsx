import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { Droplet, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/Skeletons";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePersistentState } from "@/hooks/use-persistent-state";


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
  const ready = useStore((s) => s.ready);
  const [open, setOpen] = useState(false);
  const [filterVaca, setFilterVaca] = usePersistentState<string>(
    "producao:filterVaca",
    "todas",
  );
  const [filterAno, setFilterAno] = usePersistentState<string>(
    "producao:filterAno",
    "todos",
  );
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 180);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return producoes
      .filter((p) => {
        if (filterVaca !== "todas" && p.vacaId !== filterVaca) return false;
        if (filterAno !== "todos" && p.ano !== Number(filterAno)) return false;
        if (needle) {
          const vaca = vacas.find((v) => v.id === p.vacaId);
          const hay = `${vaca?.nome ?? ""} ${vaca?.brinco ?? ""} ${p.observacoes ?? ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => b.ano - a.ano || b.mes - a.mes);
  }, [producoes, vacas, filterVaca, filterAno, debouncedQ]);

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

      {!ready ? (
        <Card className="p-4">
          <SkeletonTable rows={6} cols={5} />
        </Card>
      ) : producoes.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={Droplet}
            title="Nenhum registro de produção"
            description="Registre a produção mensal de cada vaca para acompanhar médias diárias, picos e evolução da lactação."
            action={{
              label: "Registrar primeira produção",
              node: (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 size-4" /> Registrar primeira produção
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
                placeholder="Buscar por vaca ou observação"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
                aria-label="Buscar produção"
              />
            </div>
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

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title="Nenhum registro encontrado"
              description="Ajuste os filtros ou a busca para ver mais resultados."
            />
          ) : (
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
                  {filtered.map((p) => {
                    const vaca = vacas.find((v) => v.id === p.vacaId);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-3 font-medium">
                          {vaca?.nome}{" "}
                          <span className="text-muted-foreground">#{vaca?.brinco}</span>
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
          )}
        </Card>
      )}
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
