import { useCallback, useEffect, useState } from "react";

type Kind = "cow" | "report";

function storageKey(kind: Kind) {
  return `lactocontrol:favorites:${kind}`;
}

function read(kind: Kind): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Gerencia favoritos por tipo (vacas ou relatórios) persistidos em localStorage.
 * Emite atualização entre componentes/abas via evento `storage`.
 */
export function useFavorites(kind: Kind) {
  const [ids, setIds] = useState<string[]>(() => read(kind));

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey(kind)) setIds(read(kind));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [kind]);

  const persist = useCallback(
    (next: string[]) => {
      setIds(next);
      try {
        window.localStorage.setItem(storageKey(kind), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [kind],
  );

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        try {
          window.localStorage.setItem(storageKey(kind), JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [kind],
  );

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const clear = useCallback(() => persist([]), [persist]);

  return { ids, has, toggle, clear, setAll: persist };
}
