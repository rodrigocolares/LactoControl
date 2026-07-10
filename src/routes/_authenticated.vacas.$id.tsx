import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import {
  daysBetween,
  estatisticas,
  formatDate,
  mesNome,
  periodicidadeLabel,
  producoesDaVaca,
  statusColor,
  statusLabel,
  statusVacina,
  tempoLactacao,
} from "@/lib/lacto-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Award,
  Calendar,
  Droplet,
  Edit,
  Milk,
  Syringe,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VacaFormDialog } from "./_authenticated.vacas.index";

export const Route = createFileRoute("/_authenticated/vacas/$id")({
  component: VacaDetail,
});

function VacaDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const vaca = useStore((s) => s.vacas.find((v) => v.id === id));
  const producoes = useStore((s) =>
    s.producoes.filter((p) => p.vacaId === id),
  );
  const aplicacoes = useStore((s) =>
    s.aplicacoes.filter((a) => a.vacaId === id),
  );
  const vacinas = useStore((s) => s.vacinas);
  const [editOpen, setEditOpen] = useState(false);

  if (!vaca) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Vaca não encontrada.</p>
          <Link to="/vacas" className="mt-3 inline-block text-primary">
            Voltar
          </Link>
        </div>
      </AppLayout>
    );
  }

  const prodOrdenadas = producoesDaVaca(producoes, vaca.id);
  const stats = estatisticas(prodOrdenadas);
  const tempo = tempoLactacao(vaca);

  const chartData = prodOrdenadas.map((p) => ({
    label: `${mesNome(p.mes)}/${String(p.ano).slice(2)}`,
    total: p.totalLitros,
    media: p.mediaDiaria,
    isPico: stats.melhor?.id === p.id,
  }));
  const picoIndex = chartData.findIndex((d) => d.isPico);

  return (
    <AppLayout>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.history.back()}
        >
          <ArrowLeft className="mr-2 size-4" /> Voltar
        </Button>
      </div>
      <PageHeader
        title={vaca.nome}
        description={`Brinco #${vaca.brinco} · ${vaca.raca}`}
        actions={
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 size-4" /> Editar
              </Button>
            </DialogTrigger>
            <VacaFormDialog vaca={vaca} onClose={() => setEditOpen(false)} />
          </Dialog>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={statusColor[vaca.status]}>
          {statusLabel[vaca.status]}
        </Badge>
        {vaca.status === "lactacao" && (
          <Badge variant="outline">
            {tempo.dias} dias em lactação ({tempo.meses} meses)
          </Badge>
        )}
      </div>

      <Tabs defaultValue="ciclo">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ciclo">Ciclo</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="vacinacao">Vacinação</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="ciclo" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat
              icon={Droplet}
              label="Total no ciclo"
              value={`${stats.total.toLocaleString("pt-BR")} L`}
            />
            <MiniStat
              icon={Milk}
              label="Média mensal"
              value={`${stats.media.toFixed(0)} L`}
            />
            <MiniStat
              icon={Award}
              label="Melhor mês"
              value={
                stats.melhor
                  ? `${mesNome(stats.melhor.mes)} · ${stats.melhor.totalLitros}L`
                  : "-"
              }
              tone="success"
            />
            <MiniStat
              icon={TrendingDown}
              label="Menor mês"
              value={
                stats.pior
                  ? `${mesNome(stats.pior.mes)} · ${stats.pior.totalLitros}L`
                  : "-"
              }
              tone="warning"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Histórico mensal · pico destacado
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem registros de produção.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                      formatter={(v, n) =>
                        n === "total" ? [`${v} L`, "Total"] : [`${v} L/dia`, "Média"]
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--primary)" }}
                    />
                    {picoIndex >= 0 && (
                      <ReferenceDot
                        x={chartData[picoIndex].label}
                        y={chartData[picoIndex].total}
                        r={9}
                        fill="var(--warning)"
                        stroke="var(--warning-foreground)"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Registros mensais ({prodOrdenadas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prodOrdenadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem registros. Cadastre em Produção.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Período</th>
                        <th className="py-2 pr-3">Total (L)</th>
                        <th className="py-2 pr-3">Média/dia</th>
                        <th className="py-2 pr-3">Obs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...prodOrdenadas].reverse().map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b border-border last:border-0 ${
                            stats.melhor?.id === p.id
                              ? "bg-warning/10"
                              : ""
                          }`}
                        >
                          <td className="py-3 pr-3 font-medium">
                            {mesNome(p.mes)}/{p.ano}
                            {stats.melhor?.id === p.id && (
                              <Badge className="ml-2 bg-warning text-warning-foreground">
                                pico
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 pr-3 font-semibold tabular-nums">
                            {p.totalLitros.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 pr-3 tabular-nums">
                            {p.mediaDiaria.toFixed(2)}
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground">
                            {p.observacoes ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacinacao" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Histórico vacinal ({aplicacoes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aplicacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem vacinações registradas.
                </p>
              ) : (
                <ol className="space-y-3 border-l-2 border-border pl-4">
                  {[...aplicacoes]
                    .sort(
                      (a, b) =>
                        new Date(b.data).getTime() -
                        new Date(a.data).getTime(),
                    )
                    .map((a) => {
                      const vc = vacinas.find((v) => v.id === a.vacinaId);
                      const st = statusVacina(a);
                      const stCls =
                        st === "vencida"
                          ? "bg-destructive text-destructive-foreground"
                          : st === "vencendo"
                            ? "bg-warning text-warning-foreground"
                            : "bg-success text-success-foreground";
                      return (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[22px] top-2 grid size-3 place-items-center">
                            <span
                              className={`size-3 rounded-full ${stCls}`}
                            />
                          </span>
                          <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-card p-3">
                            <div>
                              <div className="font-semibold">
                                {vc?.nome ?? "Vacina"}{" "}
                                <span className="text-xs text-muted-foreground">
                                  · {a.dose}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Aplicada em {formatDate(a.data)} por{" "}
                                {a.responsavel}
                              </div>
                              {a.proximaDose && (
                                <div className="mt-1 text-xs">
                                  Próxima: <b>{formatDate(a.proximaDose)}</b>
                                  {vc && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ({periodicidadeLabel[vc.periodicidade]})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge className={stCls}>
                              {st === "vencida"
                                ? "Vencida"
                                : st === "vencendo"
                                  ? "Vencendo"
                                  : "Em dia"}
                            </Badge>
                          </div>
                        </li>
                      );
                    })}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Info label="Nome" value={vaca.nome} />
              <Info label="Brinco" value={vaca.brinco} />
              <Info label="Raça" value={vaca.raca} />
              <Info label="Status" value={statusLabel[vaca.status]} />
              <Info
                label="Nascimento"
                value={formatDate(vaca.dataNascimento)}
              />
              <Info
                label="Último parto"
                value={formatDate(vaca.dataUltimoParto)}
              />
              <Info
                label="Início lactação"
                value={formatDate(vaca.dataInicioLactacao)}
              />
              <Info
                label="Dias em lactação"
                value={
                  vaca.status === "lactacao"
                    ? `${tempo.dias} dias (${tempo.meses} m)`
                    : "-"
                }
              />
              <div className="sm:col-span-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Observações
                </div>
                <div className="mt-1 text-sm">
                  {vaca.observacoes || "-"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`mb-2 grid size-9 place-items-center rounded-lg ${cls}`}>
          <Icon className="size-5" />
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
