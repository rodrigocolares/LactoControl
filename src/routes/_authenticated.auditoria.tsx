import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, History, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/Skeletons";
import { usePersistentState } from "@/hooks/use-persistent-state";


export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Lacto Control" },
      {
        name: "description",
        content:
          "Registro de todas as operações relevantes realizadas nos dados do rebanho.",
      },
    ],
  }),
  component: AuditPage,
});

type Log = {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  property_id: string | null;
  old_data: any;
  new_data: any;
};

const ENTITY_LABEL: Record<string, string> = {
  cows: "Vaca",
  milk_productions: "Produção",
  vaccines: "Vacina",
  vaccination_records: "Aplicação",
  profiles: "Perfil",
  properties: "Propriedade",
  data_migrations: "Migração",
};

const ACTION_LABEL: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Exclusão",
  soft_delete: "Exclusão lógica",
  deactivate: "Desativação",
  migration_started: "Migração iniciada",
  migration_running: "Migração em andamento",
  migration_completed: "Migração concluída",
  migration_completed_with_errors: "Migração com erros",
};

function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = usePersistentState<string>("audit:entity", "todas");
  const [action, setAction] = usePersistentState<string>("audit:action", "todas");
  const [from, setFrom] = usePersistentState<string>("audit:from", "");
  const [to, setTo] = usePersistentState<string>("audit:to", "");
  const [userFilter, setUserFilter] = usePersistentState<string>("audit:user", "");


  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (entity !== "todas") q = q.eq("entity_type", entity);
    if (action !== "todas") q = q.eq("action", action);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", `${to}T23:59:59`);
    if (userFilter) q = q.eq("user_id", userFilter);
    const { data, error } = await q;
    if (error) {
      toast.error("Falha ao carregar auditoria.");
      setLogs([]);
    } else {
      setLogs((data as Log[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const l of logs) t[l.action] = (t[l.action] ?? 0) + 1;
    return t;
  }, [logs]);

  const exportCSV = () => {
    const rows = [
      ["Data", "Ação", "Entidade", "Registro", "Usuário"],
      ...logs.map((l) => [
        new Date(l.created_at).toISOString(),
        ACTION_LABEL[l.action] ?? l.action,
        ENTITY_LABEL[l.entity_type] ?? l.entity_type,
        l.entity_id ?? "",
        l.user_id ?? "",
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = logs
      .map(
        (l) => `
        <tr>
          <td>${new Date(l.created_at).toLocaleString("pt-BR")}</td>
          <td>${ACTION_LABEL[l.action] ?? l.action}</td>
          <td>${ENTITY_LABEL[l.entity_type] ?? l.entity_type}</td>
          <td style="font-family:monospace;font-size:11px">${l.entity_id ?? ""}</td>
        </tr>`,
      )
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Auditoria</title>
      <style>
        body{font:14px system-ui;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f5f5f5}
        @media print{@page{margin:16mm}}
      </style></head><body>
      <h1>Auditoria — Lacto Control</h1>
      <p>Gerado em ${new Date().toLocaleString("pt-BR")} — ${logs.length} registros</p>
      <table><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>Registro</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Auditoria"
        description="Registro cronológico de operações realizadas nos seus dados."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={logs.length === 0}>
              <Download className="mr-2 size-4" /> CSV
            </Button>
            <Button variant="outline" onClick={exportPDF} disabled={logs.length === 0}>
              <FileText className="mr-2 size-4" /> PDF
            </Button>
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Entidade</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ação</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {Object.entries(ACTION_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Usuário (UUID)</Label>
            <Input
              placeholder="(opcional)"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 size-4" />
            )}
            Aplicar filtros
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={8} cols={4} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={History}
              title="Nenhum registro de auditoria"
              description="Ainda não há eventos para os filtros aplicados. Ações como cadastros, edições e exclusões aparecerão aqui automaticamente."
            />
          </div>
        ) : (

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Quando</th>
                  <th className="px-4 py-2">Ação</th>
                  <th className="px-4 py-2">Entidade</th>
                  <th className="px-4 py-2">Registro</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-xs">
                        {ACTION_LABEL[l.action] ?? l.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {ENTITY_LABEL[l.entity_type] ?? l.entity_type}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                      {l.entity_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && logs.length > 0 && (
          <div className="border-t border-border p-3 text-xs text-muted-foreground">
            {logs.length} registros ·{" "}
            {Object.entries(totals)
              .map(([k, v]) => `${ACTION_LABEL[k] ?? k}: ${v}`)
              .join(" · ")}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
