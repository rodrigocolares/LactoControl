import type {
  AplicacaoVacina,
  Periodicidade,
  ProducaoMensal,
  StatusVaca,
  Vaca,
  Vacina,
} from "./types";

export const statusLabel: Record<StatusVaca, string> = {
  lactacao: "Em lactação",
  seca: "Seca",
  prenha: "Prenha",
  descartada: "Descartada",
};

export const statusColor: Record<StatusVaca, string> = {
  lactacao: "bg-success/15 text-success border-success/30",
  seca: "bg-muted text-muted-foreground border-border",
  prenha: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  descartada: "bg-destructive/15 text-destructive border-destructive/30",
};

export const periodicidadeLabel: Record<Periodicidade, string> = {
  anual: "Anual",
  semestral: "Semestral",
  trimestral: "Trimestral",
  mensal: "Mensal",
  dose_unica: "Dose única",
  personalizado: "Personalizado",
};

export function periodicidadeDias(v: Vacina): number | null {
  switch (v.periodicidade) {
    case "anual":
      return 365;
    case "semestral":
      return 180;
    case "trimestral":
      return 90;
    case "mensal":
      return 30;
    case "dose_unica":
      return null;
    case "personalizado":
      return v.periodicidadeDiasCustom ?? null;
  }
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / 86400000);
}

export function tempoLactacao(vaca: Vaca): { dias: number; meses: number } {
  const dias = Math.max(
    0,
    daysBetween(vaca.dataInicioLactacao, new Date().toISOString()),
  );
  return { dias, meses: Math.floor(dias / 30) };
}

export function producoesDaVaca(
  producoes: ProducaoMensal[],
  vacaId: string,
): ProducaoMensal[] {
  return producoes
    .filter((p) => p.vacaId === vacaId)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

export function estatisticas(prods: ProducaoMensal[]) {
  if (!prods.length) {
    return { total: 0, media: 0, melhor: null, pior: null };
  }
  const total = prods.reduce((s, p) => s + p.totalLitros, 0);
  const media = total / prods.length;
  const melhor = prods.reduce((m, p) =>
    p.totalLitros > m.totalLitros ? p : m,
  );
  const pior = prods.reduce((m, p) => (p.totalLitros < m.totalLitros ? p : m));
  return { total, media, melhor, pior };
}

export const mesNome = (m: number) =>
  [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ][m - 1] ?? String(m);

export const mesNomeLongo = (m: number) =>
  [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ][m - 1] ?? String(m);

export function statusVacina(
  aplicacao: AplicacaoVacina,
): "em_dia" | "vencendo" | "vencida" {
  if (!aplicacao.proximaDose) return "em_dia";
  const dias = daysBetween(new Date().toISOString(), aplicacao.proximaDose);
  if (dias < 0) return "vencida";
  if (dias <= 30) return "vencendo";
  return "em_dia";
}

export function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function currentMonthYear() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}
