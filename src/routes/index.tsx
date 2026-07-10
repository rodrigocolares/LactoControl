import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import {
  currentMonthYear,
  estatisticas,
  mesNome,
  producoesDaVaca,
  statusVacina,
  daysBetween,
} from "@/lib/lacto-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Beef,
  Droplet,
  Milk,
  TrendingUp,
  AlertTriangle,
  Syringe,
  Calendar,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { getCategoryColor } from "@/lib/chart-colors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LactoControl" },
      {
        name: "description",
        content: "Panorama do rebanho, produção do mês e alertas sanitários.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const vacas = useStore((s) => s.vacas);
  const producoes = useStore((s) => s.producoes);
  const aplicacoes = useStore((s) => s.aplicacoes);
  const vacinas = useStore((s) => s.vacinas);
  const { ano, mes } = currentMonthYear();

  const producoesMes = producoes.filter(
    (p) => p.ano === ano && p.mes === mes,
  );
  const totalMes = producoesMes.reduce((s, p) => s + p.totalLitros, 0);
  const mediaDiariaGeral =
    producoesMes.length > 0
      ? producoesMes.reduce((s, p) => s + p.mediaDiaria, 0) /
        producoesMes.length
      : 0;

  const emLactacao = vacas.filter((v) => v.status === "lactacao").length;
  const secas = vacas.filter((v) => v.status === "seca").length;

  const topVacaMes = producoesMes.reduce<
    { vacaId: string; total: number } | null
  >(
    (best, p) =>
      !best || p.totalLitros > best.total
        ? { vacaId: p.vacaId, total: p.totalLitros }
        : best,
    null,
  );

  // Mês com maior produção geral
  const mensal: Record<string, number> = {};
  producoes.forEach((p) => {
    const k = `${p.ano}-${p.mes}`;
    mensal[k] = (mensal[k] ?? 0) + p.totalLitros;
  });
  const melhorMesGeral = Object.entries(mensal).sort(
    (a, b) => b[1] - a[1],
  )[0];

  // Ranking mês atual
  const ranking = [...producoesMes]
    .sort((a, b) => b.totalLitros - a.totalLitros)
    .slice(0, 5);

  // Comparação vacas no mês atual (barras)
  const barData = producoesMes.map((p) => ({
    nome: vacas.find((v) => v.id === p.vacaId)?.nome ?? "?",
    litros: p.totalLitros,
  }));

  // Evolução mensal geral (linha)
  const evolucao = Object.entries(mensal)
    .map(([k, v]) => {
      const [a, m] = k.split("-").map(Number);
      return { key: k, ano: a, mes: m, total: v };
    })
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-8)
    .map((d) => ({ label: `${mesNome(d.mes)}/${String(d.ano).slice(2)}`, total: d.total }));

  // Alertas
  const alertas = useMemo(() => buildAlertas(vacas, producoes, aplicacoes), [
    vacas,
    producoes,
    aplicacoes,
  ]);

  // Vacinação
  const hoje = new Date().toISOString();
  const aplicMes = aplicacoes.filter((a) => {
    const d = new Date(a.data);
    return d.getFullYear() === ano && d.getMonth() + 1 === mes;
  }).length;
  const vencidas = aplicacoes.filter((a) => statusVacina(a) === "vencida")
    .length;
  const proximas30 = aplicacoes.filter((a) => {
    if (!a.proximaDose) return false;
    const dias = daysBetween(hoje, a.proximaDose);
    return dias >= 0 && dias <= 30;
  }).length;
  const percentEmDia =
    aplicacoes.length > 0
      ? Math.round(
          (aplicacoes.filter((a) => statusVacina(a) === "em_dia").length /
            aplicacoes.length) *
            100,
        )
      : 0;

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do rebanho, produção e sanidade."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Beef}
          label="Vacas cadastradas"
          value={vacas.length}
          hint={`${emLactacao} em lactação · ${secas} secas`}
        />
        <StatCard
          icon={Milk}
          label="Produção do mês"
          value={`${totalMes.toLocaleString("pt-BR")} L`}
          hint={`${mesNome(mes)}/${ano}`}
        />
        <StatCard
          icon={Droplet}
          label="Média diária geral"
          value={`${mediaDiariaGeral.toFixed(1)} L`}
          hint="por vaca em lactação"
        />
        <StatCard
          icon={TrendingUp}
          label="Vaca destaque do mês"
          value={
            topVacaMes
              ? vacas.find((v) => v.id === topVacaMes.vacaId)?.nome ?? "-"
              : "-"
          }
          hint={topVacaMes ? `${topVacaMes.total.toLocaleString("pt-BR")} L` : ""}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Syringe}
          label="Vacinas no mês"
          value={aplicMes}
          hint={`${vacinas.length} tipos cadastrados`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Vacinas vencidas"
          value={vencidas}
          tone="danger"
        />
        <StatCard
          icon={Calendar}
          label="Vencem em 30 dias"
          value={proximas30}
          tone="warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Rebanho em dia"
          value={`${percentEmDia}%`}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Produção mensal do rebanho
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(v) => [`${v} L`, "Total"]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Ranking do mês ({mesNome(mes)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum registro este mês.
              </p>
            ) : (
              <ol className="space-y-3">
                {ranking.map((p, i) => {
                  const vaca = vacas.find((v) => v.id === p.vacaId);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            i === 0
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {vaca?.nome}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{vaca?.brinco}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {p.totalLitros.toLocaleString("pt-BR")} L
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Comparação — {mesNome(mes)}/{ano}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {barData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="litros" radius={[6, 6, 0, 0]}>
                    {barData.map((d: any, i) => (
                      <Cell
                        key={i}
                        fill={getCategoryColor(`vaca-${d.vacaId ?? d.nome ?? i}`)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta.</p>
            ) : (
              <ul className="space-y-3">
                {alertas.slice(0, 6).map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${a.tone}`}
                    >
                      <AlertTriangle className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.descricao}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {melhorMesGeral && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary">
                Melhor mês registrado
              </div>
              <div className="mt-1 text-lg font-bold">
                {mesNome(Number(melhorMesGeral[0].split("-")[1]))} /
                {" "}{melhorMesGeral[0].split("-")[0]}
              </div>
            </div>
            <div className="text-2xl font-black text-primary">
              {melhorMesGeral[1].toLocaleString("pt-BR")} L
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : tone === "success"
          ? "bg-success/15 text-success"
          : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 truncate text-xl font-bold sm:text-2xl">
              {value}
            </div>
            {hint && (
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {hint}
              </div>
            )}
          </div>
          <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildAlertas(
  vacas: import("@/lib/types").Vaca[],
  producoes: import("@/lib/types").ProducaoMensal[],
  aplicacoes: import("@/lib/types").AplicacaoVacina[],
) {
  const alertas: { titulo: string; descricao: string; tone: string }[] = [];
  const { ano, mes } = currentMonthYear();

  for (const vaca of vacas) {
    if (vaca.status !== "lactacao") continue;
    const ps = producoesDaVaca(producoes, vaca.id);
    const st = estatisticas(ps);
    const semMes = !ps.find((p) => p.ano === ano && p.mes === mes);
    if (semMes) {
      alertas.push({
        titulo: `${vaca.nome} sem registro este mês`,
        descricao: `Brinco #${vaca.brinco} — registrar produção de ${mesNome(mes)}.`,
        tone: "bg-warning/15 text-warning",
      });
    }
    if (ps.length >= 2) {
      const ultimo = ps[ps.length - 1];
      const anterior = ps[ps.length - 2];
      if (ultimo.totalLitros < anterior.totalLitros * 0.75) {
        alertas.push({
          titulo: `${vaca.nome} — queda brusca`,
          descricao: `Caiu de ${anterior.totalLitros}L para ${ultimo.totalLitros}L.`,
          tone: "bg-destructive/15 text-destructive",
        });
      }
      if (ultimo.totalLitros > st.media * 1.2) {
        alertas.push({
          titulo: `${vaca.nome} acima da média`,
          descricao: `Último mês ${ultimo.totalLitros}L (média ${st.media.toFixed(0)}L).`,
          tone: "bg-success/15 text-success",
        });
      }
    }
    const dias = daysBetween(vaca.dataInicioLactacao, new Date().toISOString());
    if (dias >= 270) {
      alertas.push({
        titulo: `${vaca.nome} — fim de lactação próximo`,
        descricao: `${dias} dias em lactação.`,
        tone: "bg-warning/15 text-warning",
      });
    }
  }

  for (const ap of aplicacoes) {
    const st = statusVacina(ap);
    const vaca = vacas.find((v) => v.id === ap.vacaId);
    if (!vaca) continue;
    if (st === "vencida") {
      alertas.push({
        titulo: `Vacina vencida — ${vaca.nome}`,
        descricao: `Reforço estava previsto para ${new Date(ap.proximaDose!).toLocaleDateString("pt-BR")}.`,
        tone: "bg-destructive/15 text-destructive",
      });
    }
  }
  return alertas;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _Link = Link;
