import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import {
  formatDate,
  mesNome,
  mesNomeLongo,
  statusLabel,
} from "@/lib/lacto-utils";
import type { StatusVaca } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Milk,
  TrendingUp,
  Trophy,
  CalendarDays,
  Users,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/chart-colors";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — LactoControl" },
      {
        name: "description",
        content:
          "Análise gráfica completa da produção de leite: totais mensais, comparativos por vaca, evolução da média diária e exportação.",
      },
    ],
  }),
  component: RelatoriosPage,
});

interface Filtros {
  periodoInicial: string; // YYYY-MM
  periodoFinal: string; // YYYY-MM
  mes: string; // "todos" | "1".."12"
  ano: string; // "todos" | "YYYY"
  vacaId: string;
  raca: string;
  status: string; // "todos" | StatusVaca
}

const filtrosIniciais: Filtros = {
  periodoInicial: "",
  periodoFinal: "",
  mes: "todos",
  ano: "todos",
  vacaId: "todas",
  raca: "todas",
  status: "todos",
};

function diasDoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}

function ymKey(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function RelatoriosPage() {
  const navigate = useNavigate();
  const vacas = useStore((s) => s.vacas);
  const producoes = useStore((s) => s.producoes);

  const [draft, setDraft] = useState<Filtros>(filtrosIniciais);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [vacaEvolucao, setVacaEvolucao] = useState<string>("todas");

  const [sortKey, setSortKey] = useState<string>("periodo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const racas = useMemo(
    () => Array.from(new Set(vacas.map((v) => v.raca))).sort(),
    [vacas],
  );
  const anosDisp = useMemo(
    () =>
      Array.from(
        new Set(producoes.map((p) => p.ano).concat(new Date().getFullYear())),
      ).sort((a, b) => b - a),
    [producoes],
  );
  const mesesDisp = Array.from({ length: 12 }, (_, i) => i + 1);

  // Registros válidos: totalLitros >= 0, dedupe vaca+mes+ano
  const registrosValidos = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof producoes = [];
    for (const p of producoes) {
      if (p.totalLitros < 0) continue;
      const k = `${p.vacaId}-${p.ano}-${p.mes}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  }, [producoes]);

  // Filtragem
  const producoesFiltradas = useMemo(() => {
    return registrosValidos.filter((p) => {
      const vaca = vacas.find((v) => v.id === p.vacaId);
      if (!vaca) return false;

      const ym = ymKey(p.ano, p.mes);
      if (filtros.periodoInicial && ym < filtros.periodoInicial) return false;
      if (filtros.periodoFinal && ym > filtros.periodoFinal) return false;
      if (filtros.mes !== "todos" && p.mes !== Number(filtros.mes))
        return false;
      if (filtros.ano !== "todos" && p.ano !== Number(filtros.ano))
        return false;
      if (filtros.vacaId !== "todas" && p.vacaId !== filtros.vacaId)
        return false;
      if (filtros.raca !== "todas" && vaca.raca !== filtros.raca) return false;
      if (filtros.status !== "todos" && vaca.status !== filtros.status)
        return false;
      return true;
    });
  }, [registrosValidos, vacas, filtros]);

  const temDados = producoesFiltradas.length > 0;

  // Agregação mensal (rebanho)
  const mensal = useMemo(() => {
    const map = new Map<
      string,
      { ano: number; mes: number; total: number; vacas: Set<string> }
    >();
    for (const p of producoesFiltradas) {
      const k = ymKey(p.ano, p.mes);
      const cur =
        map.get(k) ??
        { ano: p.ano, mes: p.mes, total: 0, vacas: new Set<string>() };
      cur.total += p.totalLitros;
      cur.vacas.add(p.vacaId);
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => {
        const dias = diasDoMes(v.ano, v.mes);
        return {
          key: k,
          ano: v.ano,
          mes: v.mes,
          label: `${mesNome(v.mes)}/${String(v.ano).slice(2)}`,
          labelLongo: `${mesNomeLongo(v.mes)} de ${v.ano}`,
          total: v.total,
          vacas: v.vacas.size,
          mediaDiaria: +(v.total / dias).toFixed(2),
          dias,
        };
      })
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  }, [producoesFiltradas]);

  const mesMaior = mensal.length
    ? mensal.reduce((m, x) => (x.total > m.total ? x : m))
    : null;
  const mesMenor = mensal.length
    ? mensal.reduce((m, x) => (x.total < m.total ? x : m))
    : null;
  const mesMaiorMedia = mensal.length
    ? mensal.reduce((m, x) => (x.mediaDiaria > m.mediaDiaria ? x : m))
    : null;

  const totalPeriodo = mensal.reduce((s, m) => s + m.total, 0);
  const mediaDiariaRebanho = mensal.length
    ? +(
        mensal.reduce((s, m) => s + m.mediaDiaria, 0) / mensal.length
      ).toFixed(2)
    : 0;

  const vacasComRegistro = new Set(producoesFiltradas.map((p) => p.vacaId));
  const qtdVacas = vacasComRegistro.size;
  const mediaMensalPorVaca = qtdVacas
    ? +(totalPeriodo / qtdVacas / (mensal.length || 1)).toFixed(2)
    : 0;

  // Produção total do mês selecionado (quando mês+ano específicos)
  const producaoMesSelecionado = useMemo(() => {
    if (filtros.mes === "todos" || filtros.ano === "todos") return null;
    const k = ymKey(Number(filtros.ano), Number(filtros.mes));
    return mensal.find((m) => m.key === k) ?? null;
  }, [mensal, filtros]);

  // Por vaca no período
  const porVaca = useMemo(() => {
    const map = new Map<
      string,
      { total: number; meses: Set<string>; dias: number }
    >();
    for (const p of producoesFiltradas) {
      const cur =
        map.get(p.vacaId) ??
        { total: 0, meses: new Set<string>(), dias: 0 };
      cur.total += p.totalLitros;
      const k = ymKey(p.ano, p.mes);
      if (!cur.meses.has(k)) {
        cur.meses.add(k);
        cur.dias += diasDoMes(p.ano, p.mes);
      }
      map.set(p.vacaId, cur);
    }
    return Array.from(map.entries())
      .map(([vacaId, v]) => {
        const vaca = vacas.find((x) => x.id === vacaId)!;
        return {
          vacaId,
          nome: vaca.nome,
          brinco: vaca.brinco,
          label: `${vaca.nome} #${vaca.brinco}`,
          total: v.total,
          mediaDiaria: v.dias ? +(v.total / v.dias).toFixed(2) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [producoesFiltradas, vacas]);

  const vacaMaiorProducao = porVaca[0] ?? null;
  const vacaMaiorMedia = porVaca.length
    ? [...porVaca].sort((a, b) => b.mediaDiaria - a.mediaDiaria)[0]
    : null;

  // Evolução (por vaca ou rebanho)
  const evolucao = useMemo(() => {
    if (vacaEvolucao === "todas") {
      return mensal.map((m) => ({ label: m.label, mediaDiaria: m.mediaDiaria }));
    }
    const map = new Map<
      string,
      { ano: number; mes: number; total: number }
    >();
    for (const p of producoesFiltradas) {
      if (p.vacaId !== vacaEvolucao) continue;
      const k = ymKey(p.ano, p.mes);
      const cur = map.get(k) ?? { ano: p.ano, mes: p.mes, total: 0 };
      cur.total += p.totalLitros;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({
        key: k,
        ano: v.ano,
        mes: v.mes,
        label: `${mesNome(v.mes)}/${String(v.ano).slice(2)}`,
        mediaDiaria: +(v.total / diasDoMes(v.ano, v.mes)).toFixed(2),
      }))
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  }, [mensal, producoesFiltradas, vacaEvolucao]);

  // Tabela detalhada
  const tabela = useMemo(() => {
    // Ranking mensal
    const rankingPorMes = new Map<string, string[]>();
    const grupos = new Map<string, typeof producoesFiltradas>();
    for (const p of producoesFiltradas) {
      const k = ymKey(p.ano, p.mes);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(p);
    }
    for (const [k, arr] of grupos) {
      rankingPorMes.set(
        k,
        [...arr]
          .sort((a, b) => b.totalLitros - a.totalLitros)
          .map((x) => x.id),
      );
    }

    // Anterior por vaca (por chave YYYY-MM)
    const porVacaMap = new Map<
      string,
      Map<string, number>
    >();
    for (const p of producoesFiltradas) {
      if (!porVacaMap.has(p.vacaId)) porVacaMap.set(p.vacaId, new Map());
      porVacaMap.get(p.vacaId)!.set(ymKey(p.ano, p.mes), p.totalLitros);
    }

    return producoesFiltradas.map((p) => {
      const vaca = vacas.find((v) => v.id === p.vacaId)!;
      const dias = diasDoMes(p.ano, p.mes);
      const media = +(p.totalLitros / dias).toFixed(2);
      const k = ymKey(p.ano, p.mes);
      const ranking = rankingPorMes.get(k) ?? [];
      const pos = ranking.indexOf(p.id) + 1;

      // Anterior
      const prevAno = p.mes === 1 ? p.ano - 1 : p.ano;
      const prevMes = p.mes === 1 ? 12 : p.mes - 1;
      const prev = porVacaMap.get(p.vacaId)?.get(ymKey(prevAno, prevMes));
      const dif = prev !== undefined ? p.totalLitros - prev : null;
      const pct =
        prev !== undefined && prev > 0
          ? +(((p.totalLitros - prev) / prev) * 100).toFixed(1)
          : null;

      return {
        id: p.id,
        vacaId: p.vacaId,
        periodo: k,
        periodoLabel: `${mesNome(p.mes)}/${p.ano}`,
        ano: p.ano,
        mes: p.mes,
        nome: vaca.nome,
        brinco: vaca.brinco,
        raca: vaca.raca,
        status: statusLabel[vaca.status],
        dias,
        total: p.totalLitros,
        media,
        dif,
        pct,
        pos,
      };
    });
  }, [producoesFiltradas, vacas]);

  const tabelaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let out = q
      ? tabela.filter(
          (r) =>
            r.nome.toLowerCase().includes(q) ||
            r.brinco.toLowerCase().includes(q),
        )
      : tabela;
    out = [...out].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return out;
  }, [tabela, busca, sortKey, sortDir]);

  const totalPag = Math.max(1, Math.ceil(tabelaFiltrada.length / porPagina));
  const pagAtual = Math.min(pagina, totalPag);
  const tabelaPagina = tabelaFiltrada.slice(
    (pagAtual - 1) * porPagina,
    pagAtual * porPagina,
  );

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const aplicar = () => {
    setFiltros(draft);
    setPagina(1);
  };
  const limpar = () => {
    setDraft(filtrosIniciais);
    setFiltros(filtrosIniciais);
    setPagina(1);
    toast.success("Filtros limpos.");
  };

  // Exportação
  const buildCSVRows = () => {
    const headers = [
      "Mes/Ano",
      "Vaca",
      "Brinco",
      "Raca",
      "Status",
      "Dias",
      "Total (L)",
      "Media diaria (L/dia)",
      "Dif. mes anterior",
      "% variacao",
      "Ranking",
    ];
    const rows = tabelaFiltrada.map((r) => [
      r.periodoLabel,
      r.nome,
      r.brinco,
      r.raca,
      r.status,
      r.dias,
      r.total,
      r.media,
      r.dif ?? "",
      r.pct ?? "",
      r.pos,
    ]);
    return { headers, rows };
  };

  const filtrosResumo = () => {
    const parts: string[] = [];
    if (filtros.periodoInicial) parts.push(`De: ${filtros.periodoInicial}`);
    if (filtros.periodoFinal) parts.push(`Até: ${filtros.periodoFinal}`);
    if (filtros.mes !== "todos") parts.push(`Mês: ${mesNomeLongo(Number(filtros.mes))}`);
    if (filtros.ano !== "todos") parts.push(`Ano: ${filtros.ano}`);
    if (filtros.vacaId !== "todas") {
      const v = vacas.find((x) => x.id === filtros.vacaId);
      parts.push(`Vaca: ${v?.nome ?? filtros.vacaId}`);
    }
    if (filtros.raca !== "todas") parts.push(`Raça: ${filtros.raca}`);
    if (filtros.status !== "todos")
      parts.push(`Status: ${statusLabel[filtros.status as StatusVaca]}`);
    return parts.length ? parts.join(" · ") : "Todos os registros";
  };

  const exportCSV = () => {
    if (!temDados) {
      toast.error("Nada para exportar.");
      return;
    }
    const { headers, rows } = buildCSVRows();
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv =
      "\uFEFF" +
      [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))].join(
        "\n",
      );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    baixar(blob, `relatorio-producao-${Date.now()}.csv`);
    toast.success("CSV exportado.");
  };

  const exportExcel = () => {
    if (!temDados) {
      toast.error("Nada para exportar.");
      return;
    }
    const { headers, rows } = buildCSVRows();
    const esc = (v: any) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>
      <p><b>Relatório de Produção — LactoControl</b></p>
      <p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
      <p>Filtros: ${esc(filtrosResumo())}</p>
      <table border="1"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    baixar(blob, `relatorio-producao-${Date.now()}.xls`);
    toast.success("Excel exportado.");
  };

  const exportPDF = () => {
    if (!temDados) {
      toast.error("Nada para exportar.");
      return;
    }
    window.print();
  };

  const baixar = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios"
        description="Análise gráfica da produção de leite do rebanho."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportPDF}>
              <FileText className="mr-2 size-4" /> PDF
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 size-4" /> Excel
            </Button>
            <Button onClick={exportCSV}>
              <Download className="mr-2 size-4" /> CSV
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4" /> Filtros
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {filtrosAbertos ? "Recolher" : "Expandir"}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs">Período inicial</Label>
                  <Input
                    type="month"
                    value={draft.periodoInicial}
                    onChange={(e) =>
                      setDraft({ ...draft, periodoInicial: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Período final</Label>
                  <Input
                    type="month"
                    value={draft.periodoFinal}
                    onChange={(e) =>
                      setDraft({ ...draft, periodoFinal: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Mês</Label>
                  <Select
                    value={draft.mes}
                    onValueChange={(v) => setDraft({ ...draft, mes: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {mesesDisp.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {mesNomeLongo(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ano</Label>
                  <Select
                    value={draft.ano}
                    onValueChange={(v) => setDraft({ ...draft, ano: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {anosDisp.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Vaca</Label>
                  <Select
                    value={draft.vacaId}
                    onValueChange={(v) => setDraft({ ...draft, vacaId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {vacas.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nome} #{v.brinco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Raça</Label>
                  <Select
                    value={draft.raca}
                    onValueChange={(v) => setDraft({ ...draft, raca: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {racas.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status do animal</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft({ ...draft, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="lactacao">Em lactação</SelectItem>
                      <SelectItem value="seca">Seca</SelectItem>
                      <SelectItem value="prenha">Prenha</SelectItem>
                      <SelectItem value="descartada">Descartada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={aplicar} className="flex-1">
                    Aplicar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={limpar}
                    className="flex-1"
                  >
                    <RotateCcw className="mr-1 size-4" /> Limpar
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {filtrosResumo()}
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {!temDados ? (
        <EmptyState />
      ) : (
        <>
          {/* Cards KPI */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Milk className="size-4" />}
              label="Produção total (período)"
              value={`${totalPeriodo.toLocaleString("pt-BR")} L`}
            />
            <Kpi
              icon={<CalendarDays className="size-4" />}
              label={
                producaoMesSelecionado
                  ? `Produção em ${producaoMesSelecionado.labelLongo}`
                  : "Produção do mês (selecione mês/ano)"
              }
              value={
                producaoMesSelecionado
                  ? `${producaoMesSelecionado.total.toLocaleString("pt-BR")} L`
                  : "—"
              }
              hint={
                producaoMesSelecionado
                  ? `Média diária: ${producaoMesSelecionado.mediaDiaria.toLocaleString("pt-BR")} L/dia`
                  : undefined
              }
            />
            <Kpi
              icon={<Gauge className="size-4" />}
              label="Média diária do rebanho"
              value={`${mediaDiariaRebanho.toLocaleString("pt-BR")} L/dia`}
            />
            <Kpi
              icon={<TrendingUp className="size-4" />}
              label="Média mensal por vaca"
              value={`${mediaMensalPorVaca.toLocaleString("pt-BR")} L`}
            />
            <Kpi
              icon={<Trophy className="size-4" />}
              label="Vaca com maior produção"
              value={
                vacaMaiorProducao
                  ? `${vacaMaiorProducao.nome} #${vacaMaiorProducao.brinco}`
                  : "Sem dados"
              }
              hint={
                vacaMaiorProducao
                  ? `${vacaMaiorProducao.total.toLocaleString("pt-BR")} L`
                  : undefined
              }
            />
            <Kpi
              icon={<Trophy className="size-4" />}
              label="Vaca com maior média diária"
              value={
                vacaMaiorMedia
                  ? `${vacaMaiorMedia.nome} #${vacaMaiorMedia.brinco}`
                  : "Sem dados"
              }
              hint={
                vacaMaiorMedia
                  ? `${vacaMaiorMedia.mediaDiaria.toLocaleString("pt-BR")} L/dia`
                  : undefined
              }
            />
            <Kpi
              icon={<CalendarDays className="size-4" />}
              label="Mês de maior produção"
              value={mesMaior ? mesMaior.labelLongo : "Sem dados"}
              hint={
                mesMaior
                  ? `${mesMaior.total.toLocaleString("pt-BR")} L`
                  : undefined
              }
            />
            <Kpi
              icon={<Users className="size-4" />}
              label="Vacas com registros"
              value={String(qtdVacas)}
            />
          </div>

          {/* Produção total mensal */}
          <ChartCard title="Produção total de leite por mês">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mensal}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  content={<CustomTooltip suffix=" L" labelKey="labelLongo" />}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {mensal.map((m) => {
                    const highlight =
                      (mesMaior && m.key === mesMaior.key) ||
                      (mesMenor && m.key === mesMenor.key);
                    return (
                      <Cell
                        key={m.key}
                        fill={getCategoryColor(`mes-${m.mes}`)}
                        stroke={
                          mesMaior && m.key === mesMaior.key
                            ? "hsl(var(--success))"
                            : mesMenor && m.key === mesMenor.key
                              ? "hsl(var(--destructive))"
                              : undefined
                        }
                        strokeWidth={highlight ? 3 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <LegendRow>
              <LegendDot color="hsl(var(--success))" label="Maior mês (borda verde)" />
              <LegendDot color="hsl(var(--destructive))" label="Menor mês (borda vermelha)" />
            </LegendRow>
          </ChartCard>

          {/* Produção por vaca */}
          <ChartCard title="Produção de leite por vaca">
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(500, porVaca.length * 80) }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={porVaca}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<VacaTooltip />} />
                    <Bar
                      dataKey="total"
                      radius={[6, 6, 0, 0]}
                      onClick={(d: any) =>
                        d?.vacaId &&
                        navigate({ to: "/vacas/$id", params: { id: d.vacaId } })
                      }
                      cursor="pointer"
                    >
                      {porVaca.map((v, i) => (
                        <Cell
                          key={v.vacaId}
                          fill={
                            i === 0
                              ? "hsl(var(--chart-1))"
                              : "hsl(var(--primary))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>

          {/* Média diária por vaca */}
          <ChartCard title="Média diária de produção por vaca">
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(500, porVaca.length * 80) }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={porVaca}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      content={
                        <MediaDiariaTooltip media={mediaDiariaRebanho} />
                      }
                    />
                    <ReferenceLine
                      y={mediaDiariaRebanho}
                      stroke="hsl(var(--chart-2))"
                      strokeDasharray="4 4"
                      label={{
                        value: `Média rebanho ${mediaDiariaRebanho} L/dia`,
                        position: "insideTopRight",
                        fill: "hsl(var(--chart-2))",
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="mediaDiaria" radius={[6, 6, 0, 0]}>
                      {porVaca.map((v) => (
                        <Cell
                          key={v.vacaId}
                          fill={
                            v.mediaDiaria >= mediaDiariaRebanho
                              ? "hsl(var(--success))"
                              : "hsl(var(--destructive))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <LegendRow>
              <LegendDot
                color="hsl(var(--success))"
                label="Acima da média"
              />
              <LegendDot
                color="hsl(var(--destructive))"
                label="Abaixo da média"
              />
            </LegendRow>
          </ChartCard>

          {/* Evolução da média diária */}
          <ChartCard
            title="Evolução da média diária de produção"
            action={
              <Select value={vacaEvolucao} onValueChange={setVacaEvolucao}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Rebanho (todas)</SelectItem>
                  {vacas.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome} #{v.brinco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            {evolucao.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem dados para a vaca selecionada.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolucao}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    content={
                      <CustomTooltip suffix=" L/dia" labelKey="label" />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="mediaDiaria"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Combinado */}
          <ChartCard title="Produção total versus média diária">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={mensal}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--primary))"
                  label={{
                    value: "Total (L)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--chart-2))"
                  label={{
                    value: "L/dia",
                    angle: 90,
                    position: "insideRight",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<ComboTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="total"
                  name="Produção total (L)"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mediaDiaria"
                  name="Média diária (L/dia)"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tabela */}
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Detalhamento</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou brinco"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <Th onClick={() => toggleSort("periodo")}>Mês/Ano</Th>
                      <Th onClick={() => toggleSort("nome")}>Vaca</Th>
                      <Th onClick={() => toggleSort("brinco")}>Brinco</Th>
                      <Th onClick={() => toggleSort("raca")}>Raça</Th>
                      <Th onClick={() => toggleSort("status")}>Status</Th>
                      <Th onClick={() => toggleSort("dias")}>Dias</Th>
                      <Th onClick={() => toggleSort("total")}>Total (L)</Th>
                      <Th onClick={() => toggleSort("media")}>Média/dia</Th>
                      <Th onClick={() => toggleSort("dif")}>Δ anterior</Th>
                      <Th onClick={() => toggleSort("pct")}>% var.</Th>
                      <Th onClick={() => toggleSort("pos")}>Rank</Th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaPagina.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-2 pr-3">{r.periodoLabel}</td>
                        <td className="py-2 pr-3 font-medium">{r.nome}</td>
                        <td className="py-2 pr-3">#{r.brinco}</td>
                        <td className="py-2 pr-3">{r.raca}</td>
                        <td className="py-2 pr-3">{r.status}</td>
                        <td className="py-2 pr-3">{r.dias}</td>
                        <td className="py-2 pr-3">
                          {r.total.toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3">
                          {r.media.toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3">
                          {r.dif === null ? (
                            <span className="text-muted-foreground">
                              Sem dados
                            </span>
                          ) : (
                            <span
                              className={cn(
                                r.dif > 0 && "text-success",
                                r.dif < 0 && "text-destructive",
                              )}
                            >
                              {r.dif > 0 ? "+" : ""}
                              {r.dif.toLocaleString("pt-BR")}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {r.pct === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span
                              className={cn(
                                r.pct > 0 && "text-success",
                                r.pct < 0 && "text-destructive",
                              )}
                            >
                              {r.pct > 0 ? "+" : ""}
                              {r.pct}%
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline">#{r.pos}</Badge>
                        </td>
                        <td className="py-2 pr-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/vacas/$id",
                                params: { id: r.vacaId },
                              })
                            }
                          >
                            Ficha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  {tabelaFiltrada.length} registro(s) — página {pagAtual} de{" "}
                  {totalPag}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagAtual === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagina((p) => Math.min(totalPag, p + 1))
                    }
                    disabled={pagAtual === totalPag}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Relatório gerado em {new Date().toLocaleString("pt-BR")} ·{" "}
            {filtrosResumo()}
          </p>
        </>
      )}
    </AppLayout>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-2 text-lg font-bold leading-tight">{value}</div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th className="py-2 pr-3">
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-xs uppercase text-muted-foreground hover:text-foreground"
      >
        {children}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

function LegendRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block size-3 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  suffix,
  labelKey,
}: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-medium">{p[labelKey] ?? p.label}</div>
      <div className="text-muted-foreground">
        {payload[0].value.toLocaleString("pt-BR")}
        {suffix}
      </div>
    </div>
  );
}

function VacaTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-medium">
        {p.nome} <span className="text-muted-foreground">#{p.brinco}</span>
      </div>
      <div>Total: {p.total.toLocaleString("pt-BR")} L</div>
      <div className="text-muted-foreground">
        Média: {p.mediaDiaria.toLocaleString("pt-BR")} L/dia
      </div>
    </div>
  );
}

function MediaDiariaTooltip({ active, payload, media }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const dif = +(p.mediaDiaria - media).toFixed(2);
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-medium">
        {p.nome} <span className="text-muted-foreground">#{p.brinco}</span>
      </div>
      <div>Total: {p.total.toLocaleString("pt-BR")} L</div>
      <div>Média: {p.mediaDiaria.toLocaleString("pt-BR")} L/dia</div>
      <div className={cn(dif >= 0 ? "text-success" : "text-destructive")}>
        {dif >= 0 ? "+" : ""}
        {dif} vs rebanho
      </div>
    </div>
  );
}

function ComboTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="text-muted-foreground">
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Milk className="mx-auto mb-3 size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum registro de produção foi encontrado para os filtros
          selecionados.
        </p>
      </CardContent>
    </Card>
  );
}
