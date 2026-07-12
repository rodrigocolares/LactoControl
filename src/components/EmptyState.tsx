import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    node?: ReactNode;
  };
  className?: string;
  compact?: boolean;
}

/**
 * Estado vazio padronizado com ícone, título, descrição e CTA.
 * Use quando uma lista/consulta retorna zero itens legítimos.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-8" : "py-14 sm:py-20",
        className,
      )}
    >
      {Icon && (
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -m-3 rounded-full bg-primary/10 blur-xl"
          />
          <div className="relative grid size-16 place-items-center rounded-2xl border border-primary/20 bg-primary/5 text-primary">
            <Icon className="size-8" />
          </div>
        </div>
      )}
      <div className="max-w-md space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="mt-2">
          {action.node ?? (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Variante embrulhada em Card, para usar como bloco de conteúdo principal. */
export function EmptyStateCard(props: EmptyStateProps) {
  return (
    <Card className="p-6">
      <EmptyState {...props} />
    </Card>
  );
}
