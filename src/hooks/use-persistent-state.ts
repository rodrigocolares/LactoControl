import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useState persistido em localStorage. Restaura automaticamente na próxima
 * visita, útil para filtros que devem ser lembrados por tela.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `lactocontrol:persist:${key}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore quota / private-mode errors
    }
  }, [storageKey, value]);
  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  return [value, setValue, reset];
}
