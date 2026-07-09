import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import {
  formatDate,
  mesNome,
  statusLabel,
  statusVacina,
} from "@/lib/lacto-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — LactoControl" },
      {
        name: "description",
        content: "Relatórios de produção e vacinação com exportação CSV.",
      },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const vacas = useStore((s) => s.vacas);
  const producoes = useStore((s) => s.producoes);
  const aplicacoes = useStore((s) => s.aplicacoes);
  const vacinas = useStore((s) => s.vacinas);
  const [tipo, setTipo] = useState("producao");
  const [ano, setAno] = useState<string>("todos");
  const [vacaId, setVacaId] = useState("todas");

  const anos = Array.from(
    new Set(producoes.map((p) => p.ano).concat(new Date().getFullYear())),
  ).sort((a, b) => b - a);

  const rowsProducao = useMemo(() => {
    return producoes
      .filter(
        (p) =>
          (vacaId === "todas" || p.vacaId === vacaId) &&
          (ano === "todos" || p.ano === Number(ano)),
      )
      .sort((a, b) => b.ano - a.ano || b.mes - a.mes)
      .map((p) => {
        const v = vacas.find((x) => x.id === p.vacaId);
        return {
          Vaca: v?.nome ?? "-",
          Brinco: v?.brinco ?? "-",
          Status: v ? statusLabel[v.status] : "-",
          Mes: mesNome(p.mes),
          Ano: p.ano,
          "Total (L)": p.totalLitros,
          "Media diaria": p.mediaDiaria,
          Observacoes: p.observacoes ?? "",
        };
      });
  }, [producoes, vacaId, ano, vacas]);

  const rowsVacinacao = useMemo(() => {
    return aplicacoes
      .filter((a) => vacaId === "todas" || a.vacaId === vacaId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .map((a) => {
        const v = vacas.find((x) => x.id === a.vacaId);
        const vc = vacinas.find((x) => x.id === a.vacinaId);
        return {
          Vaca: v?.nome ?? "-",
          Brinco: v?.brinco ?? "-",
          Vacina: vc?.nome ?? "-",
          Doenca: vc?.doenca ?? "-",
          Dose: a.dose,
          Data: formatDate(a.data),
          "Proxima dose": formatDate(a.proximaDose),
          Responsavel: a.responsavel,
          Status:
            statusVacina(a) === "vencida"
              ? "Vencida"
              : statusVacina(a) === "vencendo"
                ? "Vencendo"
                : "Em dia",
        };
      });
  }, [aplicacoes, vacaId, vacas, vacinas]);

  const rows = tipo === "producao" ? rowsProducao : rowsVacinacao;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const exportCSV = () => {
    if (rows.length === 0) {
      toast.error("Nada para exportar.");
      return;
    }
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = String((r as any)[h] ?? "").replace(/"/g, '""');
            return `"${v}"`;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${tipo}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado.");
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios"
        description="Filtre, visualize e exporte os dados."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={printPDF}>
              <FileSpreadsheet className="mr-2 size-4" /> PDF
            </Button>
            <Button onClick={exportCSV}>
              <Download className="mr-2 size-4" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="producao">Produção mensal</SelectItem>
              <SelectItem value="vacinacao">Vacinação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vacaId} onValueChange={setVacaId}>
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
          {tipo === "producao" && (
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos anos</SelectItem>
                {anos.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum dado no filtro selecionado.
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="py-2 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0"
                  >
                    {headers.map((h) => (
                      <td key={h} className="py-2 pr-3">
                        {String((r as any)[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
