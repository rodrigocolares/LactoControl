import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Beef,
  Droplet,
  Gauge,
  Milk,
  Syringe,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout, PageHeader } from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonChart, SkeletonKPIs } from "@/components/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import {
  currentMonthYear,
  daysBetween,
  mesNome,
  statusVacina,
} from "@/lib/lacto-utils";
import { getCategoryColor } from "@/lib/chart-colors";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/executivo")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo — Lacto Control" },
      {
        name: "description",
        content:
          "Visão executiva do rebanho: metas, tendências, comparativos e alertas priorizados.",
      },
    ],
  }),
  component: ExecutivoPage,
});

type MonthAgg = {
  ano: number;
  mes: number;
  key: string;
  label: string;
  total: number;
  vacas: number;
  media: number; // média diária por vaca
};

function shiftMonth(ano: number, mes: number, delta: number) {
  const d = new Date(ano, mes - 1 + delta, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

function ExecutivoPage() {
  const vacas = useStore((s) => s.vacas);
  const producoes = useStore((s) => s.producoes);
  const aplicacoes = useStore((s) => s.aplicacoes);
  const ready = useStore((s) => s.ready);
  const { ano, mes } = currentMonthYear();

  const [metaMensal, setMetaMensal] = usePersistentState<number>(
    "exec:metaMensal",
    5000,
  );
  const [metaEditor, setMetaEditor] = useState<string>("");

  // Aggregate production per month
  const perMonth = useMemo<MonthAgg[]>(() => {
    const map = new Map<string, MonthAgg>();
    for (const p of producoes) {
      const key = `${p.ano}-${String(p.mes).padStart(2, "0")}`;
      const cur = map.get(key) ?? {
        ano: p.ano,
        mes: p.mes,
        key,
        label: `${mesNome(p.mes)}/${String(p.ano).slice(2)}`,
        total: 0,
        vacas: 0,
        media: 0,
      };
      cur.total += p.totalLitros;
      cur.vacas += 1;
      cur.media += p.mediaDiaria;
      map.set(key, cur);
    }
    const arr = Array.from(map.values())
      .map((m) => ({ ...m, media: m.vacas > 0 ? m.media / m.vacas : 0 }))
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    return arr;
  }, [producoes]);

  const currentKey = `${ano}-${String(mes).padStart(2, "0")}`;
  const prev = shiftMonth(ano, mes, -1);
  const prevKey = `${prev.ano}-${String(prev.mes).padStart(2, "0")}`;
  const monthNow = perMonth.find((m) => m.key === currentKey);
  const monthPrev = perMonth.find((m) => m.key === prevKey);

  const producaoNow = monthNow?.total ?? 0;
  const producaoPrev = monthPrev?.total ?? 0;
  const producaoDelta =
    producaoPrev > 0
      ? ((producaoNow - producaoPrev) / producaoPrev) * 100
      : producaoNow > 0
        ? 100
        : 0;

  const mediaNow = monthNow?.media ?? 0;
  const mediaPrev = monthPrev?.media ?? 0;
  const mediaDelta =
    mediaPrev > 0
      ? ((mediaNow - mediaPrev) / mediaPrev) * 100
      : mediaNow > 0
        ? 100
        : 0;

  // YTD
  const ytd = perMonth
    .filter((m) => m.ano === ano)
    .reduce((s, m) => s + m.total, 0);
  const ytdPrev = perMonth
    .filter((m) => m.ano === ano - 1 && m.mes <= mes)
    .reduce((s, m) => s + m.total, 0);
  const ytdDelta =
    ytdPrev > 0 ? ((ytd - ytdPrev) / ytdPrev) * 100 : ytd > 0 ? 100 : 0;

  // Rebanho
  const emLactacao = vacas.filter((v) => v.status === "lactacao").length;
  const totalAtivas = vacas.filter((v) => v.status !== "descartada").length;

  // Meta progress
  const metaPct = metaMensal > 0 ? Math.min(150, (producaoNow / metaMensal) * 100) : 0;
  const metaAtingida = producaoNow >= metaMensal;

  // Sanidade — vacinas
  const vencidas = aplicacoes.filter((a) => statusVacina(a) === "vencida").length;
  const vencendo = aplicacoes.filter((a) => statusVacina(a) === "vencendo").length;
  const percentEmDia =
    aplicacoes.length > 0
      ? Math.round(
          ((aplicacoes.length - vencidas) / aplicacoes.length) * 100,
        )
      : 100;

  // Last 6 months trend
  const last6 = perMonth.slice(-6);

  // Ranking of current month
  const rankingBase = producoes
    .filter((p) => p.ano === ano && p.mes === mes)
    .map((p) => {
      const v = vacas.find((x) => x.id === p.vacaId);
      return {
        id: p.id,
        vacaId: p.vacaId,
        nome: v?.nome ?? "—",
        brinco: v?.brinco ?? "",
        total: p.totalLitros,
        media: p.mediaDiaria,
      };
    })
    .sort((a, b) => b.total - a.total);

  const top5 = rankingBase.slice(0, 5);
  const bottom5 = rankingBase.slice(-5).reverse();

  // Alerts prioritized: drops >15% vs previous month per cow
  const drops = useMemo(() => {
    const prevMap = new Map<string, number>();
    for (const p of producoes) {
      if (p.ano === prev.ano && p.mes === prev.mes) prevMap.set(p.vacaId, p.totalLitros);
    }
    const items: { vacaId: string; nome: string; delta: number; now: number; prev: number }[] = [];
    for (const p of producoes) {
      if (p.ano !== ano || p.mes !== mes) continue;
      const before = prevMap.get(p.vacaId);
      if (!before || before <= 0) continue;
      const delta = ((p.totalLitros - before) / before) * 100;
      if (delta <= -15) {
        const v = vacas.find((x) => x.id === p.vacaId);
        items.push({
          vacaId: p.vacaId,
          nome: v?.nome ?? "—",
          delta,
          now: p.totalLitros,
          prev: before,
        });
      }
    }
    return items.sort((a, b) => a.delta - b.delta).slice(0, 5);
  }, [producoes, vacas, ano, mes, prev.ano, prev.mes]);

  // Vacas em lactação sem produção lançada no mês corrente
  const semRegistroMes = vacas.filter(
    (v) =>
      v.status === "lactacao" &&
      !producoes.some((p) => p.vacaId === v.id && p.ano === ano && p.mes === mes),
  );

  if (!ready) {
    return (
      <AppLayout>
        <PageHeader
          title="Dashboard Executivo"
          description="Indicadores estratégicos, metas e tendências."
        />
        <SkeletonKPIs count={4} />
        <div className="mt-4">
          <SkeletonKPIs count={4} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </AppLayout>
    );
  }

  if (vacas.length === 0 && producoes.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Dashboard Executivo"
          description="Indicadores estratégicos, metas e tendências."
        />
        <Card className="p-4">
          <EmptyState
            icon={Gauge}
            title="Sem dados para consolidar"
            description="Cadastre vacas e lance produções mensais para visualizar KPIs comparativos, tendências e metas."
            action={{
              label: "Cadastrar vacas",
              node: (
                <Button asChild>
                  <Link to="/vacas">Cadastrar vacas</Link>
                </Button>
              ),
            }}
          />
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard Executivo"
        description={`Consolidação de ${mesNome(mes)}/${ano} · comparativo com ${mesNome(prev.mes)}/${prev.ano}`}
      />

      {/* KPI row 1 — MoM */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiComparativo
          icon={Milk}
          label="Produção do mês"
          value={`${producaoNow.toLocaleString("pt-BR")} L`}
          delta={producaoDelta}
          hint={`Anterior: ${producaoPrev.toLocaleString("pt-BR")} L`}
        />
        <KpiComparativo
          icon={Droplet}
          label="Média diária/vaca"
          value={`${mediaNow.toFixed(1)} L`}
          delta={mediaDelta}
          hint={`Anterior: ${mediaPrev.toFixed(1)} L`}
        />
        <KpiComparativo
          icon={Activity}
          label="Acumulado no ano"
          value={`${ytd.toLocaleString("pt-BR")} L`}
          delta={ytdDelta}
          hint={`YTD ${ano - 1}: ${ytdPrev.toLocaleString("pt-BR")} L`}
        />
        <KpiComparativo
          icon={Beef}
          label="Em lactação"
          value={`${emLactacao}`}
          delta={0}
          hideDelta
          hint={`${totalAtivas} ativas no rebanho`}
        />
      </div>

      {/* Meta + Sanidade */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" />
                Meta de produção — {mesNome(mes)}/{ano}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Progresso do mês em relação à meta configurada.
              </p>
            </div>
            <Badge
              className={cn(
                metaAtingida
                  ? "bg-success text-success-foreground"
                  : metaPct >= 70
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {metaPct.toFixed(0)}%
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-semibold tabular-nums">
                  {producaoNow.toLocaleString("pt-BR")} L
                </span>
                <span className="text-xs text-muted-foreground">
                  Meta: {metaMensal.toLocaleString("pt-BR")} L
                </span>
              </div>
              <Progress value={Math.min(100, metaPct)} className="h-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                {metaAtingida
                  ? "Meta atingida — excelente desempenho no mês."
                  : `Faltam ${Math.max(0, metaMensal - producaoNow).toLocaleString("pt-BR")} L para atingir a meta.`}
              </p>
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = Number(metaEditor);
                if (Number.isFinite(v) && v > 0) {
                  setMetaMensal(Math.round(v));
                  setMetaEditor("");
                }
              }}
            >
              <div className="flex-1">
                <Label className="text-xs">Ajustar meta (litros/mês)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder={String(metaMensal)}
                  value={metaEditor}
                  onChange={(e) => setMetaEditor(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline">
                Salvar meta
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Syringe className="size-4 text-primary" />
              Sanidade do rebanho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStat label="Rebanho em dia" value={`${percentEmDia}%`} tone="success" />
            <MiniStat label="Vacinas vencendo (30d)" value={vencendo} tone="warning" />
            <MiniStat label="Vacinas vencidas" value={vencidas} tone={vencidas > 0 ? "danger" : "muted"} />
            <MiniStat
              label="Sem registro no mês"
              value={semRegistroMes.length}
              tone={semRegistroMes.length > 0 ? "warning" : "muted"}
            />
          </CardContent>
        </Card>
      </div>

      {/* Trend charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tendência de produção — últimos {last6.length} meses
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {last6.length === 0 ? (
              <EmptyState
                compact
                icon={TrendingUp}
                title="Sem histórico"
                description="Lance produções para acompanhar tendências."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last6}>
                  <defs>
                    <linearGradient id="exec-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [`${v.toLocaleString("pt-BR")} L`, "Total"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#exec-area)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Média diária/vaca vs meses anteriores
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {last6.length === 0 ? (
              <EmptyState
                compact
                icon={Droplet}
                title="Sem histórico"
                description="Sem dados suficientes para calcular a média."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)} L/dia`, "Média"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="media"
                    stroke="var(--chart-2)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "var(--chart-2)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking top/bottom */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-success" />
              Top 5 do mês
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {top5.length === 0 ? (
              <EmptyState compact icon={TrendingUp} title="Sem registros" description="Lance produções deste mês para ver o ranking." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [`${v.toLocaleString("pt-BR")} L`, "Total"]}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {top5.map((r) => (
                      <Cell key={r.id} fill={getCategoryColor(r.vacaId)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-destructive" />
              Bottom 5 do mês
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {bottom5.length === 0 ? (
              <EmptyState compact icon={TrendingDown} title="Sem registros" description="Nenhuma vaca no ranking inferior." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bottom5} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [`${v.toLocaleString("pt-BR")} L`, "Total"]}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {bottom5.map((r) => (
                      <Cell key={r.id} fill={getCategoryColor(r.vacaId)} fillOpacity={0.65} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts priorizados */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              Alertas priorizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drops.length === 0 && vencidas === 0 && semRegistroMes.length === 0 ? (
              <EmptyState
                compact
                icon={AlertTriangle}
                title="Nenhum alerta crítico"
                description="Rebanho estável — nenhuma queda relevante ou pendência sanitária no momento."
              />
            ) : (
              <ul className="space-y-3">
                {drops.map((d) => (
                  <li
                    key={d.vacaId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ArrowDown className="size-4 text-destructive" />
                        <Link
                          to="/vacas/$id"
                          params={{ id: d.vacaId }}
                          className="truncate hover:underline"
                        >
                          {d.nome}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Queda de {Math.abs(d.delta).toFixed(1)}% ({d.prev.toLocaleString("pt-BR")} → {d.now.toLocaleString("pt-BR")} L)
                      </div>
                    </div>
                    <Badge variant="destructive">{d.delta.toFixed(0)}%</Badge>
                  </li>
                ))}
                {vencidas > 0 && (
                  <li className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="text-sm">
                      <div className="font-semibold">Vacinas vencidas</div>
                      <div className="text-xs text-muted-foreground">
                        {vencidas} aplicações fora do prazo.
                      </div>
                    </div>
                    <Button asChild size="sm" variant="destructive">
                      <Link to="/vacinacao">Ver</Link>
                    </Button>
                  </li>
                )}
                {semRegistroMes.length > 0 && (
                  <li className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
                    <div className="text-sm">
                      <div className="font-semibold">Sem registro de produção</div>
                      <div className="text-xs text-muted-foreground">
                        {semRegistroMes.length} vacas em lactação sem lançamento em {mesNome(mes)}.
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/producao">Lançar</Link>
                    </Button>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Snapshot mensal</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/relatorios">
                Ver relatórios <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Registros no mês" value={rankingBase.length} />
            <Row label="Melhor vaca" value={top5[0]?.nome ?? "—"} sub={top5[0] ? `${top5[0].total.toLocaleString("pt-BR")} L` : ""} />
            <Row label="Menor produção" value={bottom5[0]?.nome ?? "—"} sub={bottom5[0] ? `${bottom5[0].total.toLocaleString("pt-BR")} L` : ""} />
            <Row label="Vacas em lactação" value={emLactacao} />

          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function KpiComparativo({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  hideDelta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: number;
  hint?: string;
  hideDelta?: boolean;
}) {
  const positive = delta >= 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          {!hideDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                positive
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUp className="size-3" />
              ) : (
                <ArrowDown className="size-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  const cls = {
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", cls)}>
        {value}
      </span>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className="font-semibold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
