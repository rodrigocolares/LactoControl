import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  dismissMigration,
  downloadLocalBackup,
  runMigration,
  useStore,
} from "@/lib/store";

export function MigrationWizard() {
  const migration = useStore((s) => s.migration);
  const [running, setRunning] = useState(false);

  const total =
    migration.counts.vacas +
    migration.counts.producoes +
    migration.counts.vacinas +
    migration.counts.aplicacoes;
  const done =
    migration.processed.vacas +
    migration.processed.producoes +
    migration.processed.vacinas +
    migration.processed.aplicacoes +
    migration.failed;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const visible =
    migration.status === "pending" ||
    migration.status === "running" ||
    migration.status === "completed" ||
    migration.status === "error";

  const canClose = migration.status !== "running";

  useEffect(() => {
    if (migration.status === "completed" && migration.failed === 0) {
      toast.success("Migração concluída com sucesso.");
    }
  }, [migration.status, migration.failed]);

  const handleDownload = () => {
    if (downloadLocalBackup()) {
      toast.success("Backup baixado.");
    } else {
      toast.info("Nenhum dado local para baixar.");
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await runMigration();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na migração.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog
      open={visible}
      onOpenChange={(o) => {
        if (!o && canClose) dismissMigration();
      }}
    >
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => {
          if (!canClose) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {migration.status === "completed"
              ? "Migração concluída"
              : migration.status === "error"
                ? "Migração concluída com pendências"
                : migration.status === "running"
                  ? "Migrando seus dados..."
                  : "Migrar dados para o Lacto Control"}
          </DialogTitle>
          <DialogDescription>
            {migration.status === "pending" &&
              "Encontramos dados salvos no seu navegador. Vamos enviá-los para o banco seguro do Lacto Control para que fiquem disponíveis em qualquer dispositivo."}
            {migration.status === "running" &&
              "Não feche esta janela até a migração terminar."}
            {migration.status === "completed" &&
              "Seus dados agora estão no banco. Um backup local foi mantido, você pode baixá-lo ou excluí-lo abaixo."}
            {migration.status === "error" &&
              "Alguns registros não puderam ser migrados. Baixe o backup e verifique os detalhes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <Row label="Vacas" done={migration.processed.vacas} total={migration.counts.vacas} />
            <Row label="Vacinas" done={migration.processed.vacinas} total={migration.counts.vacinas} />
            <Row
              label="Produções"
              done={migration.processed.producoes}
              total={migration.counts.producoes}
            />
            <Row
              label="Aplicações"
              done={migration.processed.aplicacoes}
              total={migration.counts.aplicacoes}
            />
          </div>

          {(migration.status === "running" || migration.status === "completed" || migration.status === "error") && (
            <div>
              <Progress value={pct} />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  {done} / {total} registros
                </span>
                <span>{pct}%</span>
              </div>
            </div>
          )}

          {migration.failed > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="mb-1 flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="size-3.5" />
                {migration.failed} registro(s) com erro
              </div>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-destructive/80">
                {migration.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="truncate">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {migration.status === "completed" && migration.failed === 0 && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Todos os registros foram migrados com sucesso.
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Antes da migração, um backup do seu arquivo local é gerado. Você pode baixá-lo a
            qualquer momento.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 size-4" /> Baixar backup
          </Button>
          {migration.status === "pending" && (
            <Button onClick={handleRun} disabled={running}>
              {running && <Loader2 className="mr-2 size-4 animate-spin" />}
              Iniciar migração
            </Button>
          )}
          {(migration.status === "completed" || migration.status === "error") && (
            <Button onClick={() => dismissMigration()}>Concluir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">
        {done} / {total}
      </span>
    </div>
  );
}
