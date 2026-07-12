import { Link } from "@tanstack/react-router";
import { Droplet } from "lucide-react";
import type { ReactNode } from "react";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  POLICIES_LAST_UPDATED,
} from "@/lib/legal";

export type TocItem = { id: string; label: string };

export function LegalPage({
  title,
  version,
  toc,
  children,
}: {
  title: string;
  version: string;
  toc: TocItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/auth" search={{ mode: "login" }} className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Droplet className="size-5" />
            </div>
            <span className="font-bold tracking-tight">Lacto Control</span>
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Voltar ao login
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão {version} · Última atualização em {POLICIES_LAST_UPDATED}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Índice" className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nesta página
            </p>
            <ul className="space-y-1 text-sm">
              {toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="prose prose-slate max-w-none text-foreground dark:prose-invert prose-headings:scroll-mt-20 prose-headings:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-li:my-1">
            {children}
          </article>
        </div>
      </main>

      <footer className="mt-12 border-t bg-card">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            © {new Date().getFullYear()} Lacto Control · Todos os direitos reservados.
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-4">
            <Link to="/politica-de-privacidade" className="hover:text-foreground hover:underline">
              Política de Privacidade
            </Link>
            <Link to="/termos-de-uso" className="hover:text-foreground hover:underline">
              Termos de Uso
            </Link>
            <Link to="/auth" search={{ mode: "login" }} className="hover:text-foreground hover:underline">
              Login
            </Link>
          </nav>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-6 text-xs text-muted-foreground sm:px-6">
          Contato: <a className="hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{" "}
          {CONTACT_PHONE} · {CONTACT_ADDRESS}
        </div>
      </footer>
    </div>
  );
}
