import { useSyncExternalStore } from "react";
import type {
  AplicacaoVacina,
  ProducaoMensal,
  Vaca,
  Vacina,
} from "./types";
import { seedData } from "./mock-data";

export interface AppState {
  vacas: Vaca[];
  producoes: ProducaoMensal[];
  vacinas: Vacina[];
  aplicacoes: AplicacaoVacina[];
}

const STORAGE_KEY = "lactocontrol-v1";

function load(): AppState {
  if (typeof window === "undefined") return seedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as AppState;
  } catch {
    return seedData();
  }
}

let state: AppState = typeof window === "undefined" ? seedData() : load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    state = seedData();
    persist();
  },
  set: (updater: (s: AppState) => AppState) => {
    state = updater(state);
    persist();
  },
};

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// Helpers
const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  addVaca: (v: Omit<Vaca, "id">) =>
    store.set((s) => ({ ...s, vacas: [...s.vacas, { ...v, id: uid() }] })),
  updateVaca: (id: string, patch: Partial<Vaca>) =>
    store.set((s) => ({
      ...s,
      vacas: s.vacas.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    })),
  deleteVaca: (id: string) =>
    store.set((s) => ({ ...s, vacas: s.vacas.filter((v) => v.id !== id) })),

  addProducao: (p: Omit<ProducaoMensal, "id">) =>
    store.set((s) => ({
      ...s,
      producoes: [...s.producoes, { ...p, id: uid() }],
    })),
  deleteProducao: (id: string) =>
    store.set((s) => ({
      ...s,
      producoes: s.producoes.filter((p) => p.id !== id),
    })),

  addVacina: (v: Omit<Vacina, "id">) =>
    store.set((s) => ({ ...s, vacinas: [...s.vacinas, { ...v, id: uid() }] })),
  deleteVacina: (id: string) =>
    store.set((s) => ({
      ...s,
      vacinas: s.vacinas.filter((v) => v.id !== id),
    })),

  addAplicacao: (a: Omit<AplicacaoVacina, "id">) =>
    store.set((s) => ({
      ...s,
      aplicacoes: [...s.aplicacoes, { ...a, id: uid() }],
    })),
  deleteAplicacao: (id: string) =>
    store.set((s) => ({
      ...s,
      aplicacoes: s.aplicacoes.filter((a) => a.id !== id),
    })),
};
