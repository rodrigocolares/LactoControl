import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AplicacaoVacina,
  Periodicidade,
  ProducaoMensal,
  StatusVaca,
  Vaca,
  Vacina,
} from "./types";

export type MigrationStatus =
  | "idle"
  | "checking"
  | "pending"
  | "running"
  | "completed"
  | "error";

export interface MigrationInfo {
  status: MigrationStatus;
  counts: {
    vacas: number;
    producoes: number;
    vacinas: number;
    aplicacoes: number;
  };
  processed: {
    vacas: number;
    producoes: number;
    vacinas: number;
    aplicacoes: number;
  };
  failed: number;
  errors: string[];
  backupFilename?: string;
}

export interface AppState {
  vacas: Vaca[];
  producoes: ProducaoMensal[];
  vacinas: Vacina[];
  aplicacoes: AplicacaoVacina[];
  ready: boolean;
  propertyId: string | null;
  migration: MigrationInfo;
}

const LEGACY_KEY = "lactocontrol-v1";
const MIGRATED_FLAG = "lactocontrol-v1-migrated";
const MIGRATION_KEY = "localstorage_v1";

const emptyMigration: MigrationInfo = {
  status: "idle",
  counts: { vacas: 0, producoes: 0, vacinas: 0, aplicacoes: 0 },
  processed: { vacas: 0, producoes: 0, vacinas: 0, aplicacoes: 0 },
  failed: 0,
  errors: [],
};

const empty: AppState = {
  vacas: [],
  producoes: [],
  vacinas: [],
  aplicacoes: [],
  ready: false,
  propertyId: null,
  migration: emptyMigration,
};

let state: AppState = empty;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  emit();
}
function setMigration(patch: Partial<MigrationInfo>) {
  state = { ...state, migration: { ...state.migration, ...patch } };
  emit();
}

/* ---------------------------- mapping helpers --------------------------- */

function mapCowRow(r: any): Vaca {
  return {
    id: r.id,
    nome: r.name,
    fazenda: r.__fazenda ?? undefined,
    brinco: r.ear_tag ?? "",
    raca: r.breed ?? "",
    dataNascimento: r.birth_date ?? "",
    dataUltimoParto: r.last_calving_date ?? "",
    dataInicioLactacao: r.lactation_start_date ?? "",
    status: (r.status as StatusVaca) ?? "lactacao",
    observacoes: r.notes ?? undefined,
  };
}
function cowInsertPayload(v: Omit<Vaca, "id">, propertyId: string, userId: string) {
  return {
    property_id: propertyId,
    created_by: userId,
    name: v.nome,
    ear_tag: v.brinco,
    breed: v.raca || null,
    birth_date: v.dataNascimento || null,
    last_calving_date: v.dataUltimoParto || null,
    lactation_start_date: v.dataInicioLactacao || null,
    status: v.status,
    notes: v.observacoes || null,
  };
}

function mapProdRow(r: any): ProducaoMensal {
  return {
    id: r.id,
    vacaId: r.cow_id,
    ano: r.reference_year,
    mes: r.reference_month,
    totalLitros: Number(r.total_liters ?? 0),
    mediaDiaria: Number(r.daily_average ?? 0),
    observacoes: r.notes ?? undefined,
  };
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}
function prodInsertPayload(p: Omit<ProducaoMensal, "id">, propertyId: string, userId: string) {
  const days = daysInMonth(p.ano, p.mes);
  return {
    property_id: propertyId,
    cow_id: p.vacaId,
    created_by: userId,
    reference_month: p.mes,
    reference_year: p.ano,
    total_liters: p.totalLitros,
    days_recorded: days,
    daily_average: Number(p.totalLitros) / days,
    notes: p.observacoes || null,
  };
}

function mapVaccineRow(r: any): Vacina {
  return {
    id: r.id,
    nome: r.name,
    doenca: r.disease_prevention ?? "",
    fabricante: r.manufacturer ?? "",
    doses: r.number_of_doses ?? 1,
    intervaloDoses: r.dose_interval_days ?? 0,
    periodicidade: (r.booster_frequency as Periodicidade) ?? "anual",
    periodicidadeDiasCustom: r.booster_custom_days ?? undefined,
    carencia: r.withdrawal_period_days ?? 0,
    observacoes: r.notes ?? undefined,
  };
}
function vaccineInsertPayload(v: Omit<Vacina, "id">, propertyId: string, userId: string) {
  return {
    property_id: propertyId,
    created_by: userId,
    name: v.nome,
    disease_prevention: v.doenca || null,
    manufacturer: v.fabricante || null,
    number_of_doses: v.doses ?? 1,
    dose_interval_days: v.intervaloDoses ?? 0,
    booster_frequency: v.periodicidade,
    booster_custom_days: v.periodicidadeDiasCustom ?? null,
    withdrawal_period_days: v.carencia ?? 0,
    notes: v.observacoes || null,
    active: true,
  };
}

function mapVaccRecordRow(r: any): AplicacaoVacina {
  return {
    id: r.id,
    vacaId: r.cow_id,
    vacinaId: r.vaccine_id,
    data: r.application_date,
    dose: r.dose_label ?? "1ª",
    responsavel: r.responsible_person ?? "",
    lote: r.batch_number ?? undefined,
    proximaDose: r.next_application_date ?? undefined,
    observacoes: r.notes ?? undefined,
  };
}
function vaccRecordInsertPayload(a: Omit<AplicacaoVacina, "id">, propertyId: string, userId: string) {
  return {
    property_id: propertyId,
    cow_id: a.vacaId,
    vaccine_id: a.vacinaId,
    created_by: userId,
    application_date: a.data,
    dose_label: a.dose || "1ª",
    responsible_person: a.responsavel || null,
    batch_number: a.lote || null,
    next_application_date: a.proximaDose || null,
    notes: a.observacoes || null,
  };
}

/* --------------------------- property bootstrap ------------------------- */

async function ensureProperty(userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: prof } = await supabase
    .from("profiles")
    .select("farm_name")
    .eq("id", userId)
    .maybeSingle();
  const name = prof?.farm_name?.trim() || "Minha Propriedade";
  const { data: created, error } = await supabase
    .from("properties")
    .insert({ owner_id: userId, name })
    .select("id")
    .single();
  if (error) {
    console.error("[LactoControl] failed to create property", error);
    return null;
  }
  if (created?.id) {
    await supabase.from("profiles").update({ property_id: created.id }).eq("id", userId);
  }
  return created?.id ?? null;
}

/* ------------------------------- backup --------------------------------- */

interface LegacyState {
  vacas?: any[];
  producoes?: any[];
  vacinas?: any[];
  aplicacoes?: any[];
}

function readLegacy(): LegacyState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LegacyState;
  } catch {
    return null;
  }
}

export function downloadLocalBackup(): boolean {
  const raw = typeof window !== "undefined" ? localStorage.getItem(LEGACY_KEY) : null;
  if (!raw) return false;
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `lactocontrol-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

export function deleteLocalBackup(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_KEY);
  // also cleanup any *-backup-* copies
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`${LEGACY_KEY}-backup-`))
    .forEach((k) => localStorage.removeItem(k));
}

export function hasLocalBackup(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(LEGACY_KEY)) return true;
  return Object.keys(localStorage).some((k) => k.startsWith(`${LEGACY_KEY}-backup-`));
}

/* ------------------------------- migration ------------------------------ */

async function detectPendingMigration(userId: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG)) return;
  const legacy = readLegacy();
  if (!legacy) return;
  const counts = {
    vacas: legacy.vacas?.length ?? 0,
    producoes: legacy.producoes?.length ?? 0,
    vacinas: legacy.vacinas?.length ?? 0,
    aplicacoes: legacy.aplicacoes?.length ?? 0,
  };
  if (counts.vacas + counts.producoes + counts.vacinas + counts.aplicacoes === 0) return;

  const { data: mig } = await supabase
    .from("data_migrations")
    .select("status")
    .eq("user_id", userId)
    .eq("migration_key", MIGRATION_KEY)
    .maybeSingle();
  if (mig?.status === "completed") {
    localStorage.setItem(MIGRATED_FLAG, "1");
    return;
  }
  setMigration({
    status: "pending",
    counts,
    processed: { vacas: 0, producoes: 0, vacinas: 0, aplicacoes: 0 },
    failed: 0,
    errors: [],
  });
}

export async function runMigration(): Promise<void> {
  const legacy = readLegacy();
  if (!legacy) {
    setMigration({ status: "completed" });
    return;
  }
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) throw new Error("Sessão expirada.");
  const propertyId = state.propertyId ?? (await ensureProperty(userId));
  if (!propertyId) throw new Error("Não foi possível criar a propriedade.");

  // backup filename (already saved copies in localStorage since previous step)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `lactocontrol-backup-${stamp}.json`;
  try {
    localStorage.setItem(
      `${LEGACY_KEY}-backup-${stamp}`,
      localStorage.getItem(LEGACY_KEY) ?? "",
    );
  } catch {
    /* quota */
  }

  setMigration({ status: "running", backupFilename });

  const { data: migRow } = await supabase
    .from("data_migrations")
    .upsert(
      {
        user_id: userId,
        property_id: propertyId,
        migration_key: MIGRATION_KEY,
        status: "running",
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id,migration_key" },
    )
    .select("id")
    .single();

  let failed = 0;
  const errors: string[] = [];
  const processed = { vacas: 0, producoes: 0, vacinas: 0, aplicacoes: 0 };
  const bump = () =>
    setMigration({ processed: { ...processed }, failed, errors: [...errors] });

  // 1) cows
  const cowIdMap = new Map<string, string>();
  for (const v of legacy.vacas ?? []) {
    try {
      const { data, error } = await supabase
        .from("cows")
        .upsert(
          {
            ...cowInsertPayload(
              {
                nome: v.nome ?? "Sem nome",
                brinco: v.brinco ?? String(v.id),
                raca: v.raca ?? "",
                dataNascimento: v.dataNascimento ?? "",
                dataUltimoParto: v.dataUltimoParto ?? "",
                dataInicioLactacao: v.dataInicioLactacao ?? "",
                status: (v.status as StatusVaca) ?? "lactacao",
                observacoes: v.observacoes,
              },
              propertyId,
              userId,
            ),
            legacy_local_id: String(v.id),
          },
          { onConflict: "property_id,legacy_local_id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      cowIdMap.set(String(v.id), data.id);
      processed.vacas++;
    } catch (e: any) {
      failed++;
      errors.push(`vaca ${v.nome ?? v.id}: ${e.message ?? e}`);
    }
    bump();
  }

  // 2) vaccines
  const vacIdMap = new Map<string, string>();
  for (const vac of legacy.vacinas ?? []) {
    try {
      const { data, error } = await supabase
        .from("vaccines")
        .upsert(
          {
            ...vaccineInsertPayload(
              {
                nome: vac.nome ?? "Sem nome",
                doenca: vac.doenca ?? "",
                fabricante: vac.fabricante ?? "",
                doses: vac.doses ?? 1,
                intervaloDoses: vac.intervaloDoses ?? 0,
                periodicidade: (vac.periodicidade as Periodicidade) ?? "anual",
                periodicidadeDiasCustom: vac.periodicidadeDiasCustom,
                carencia: vac.carencia ?? 0,
                observacoes: vac.observacoes,
              },
              propertyId,
              userId,
            ),
            legacy_local_id: String(vac.id),
          },
          { onConflict: "property_id,legacy_local_id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      vacIdMap.set(String(vac.id), data.id);
      processed.vacinas++;
    } catch (e: any) {
      failed++;
      errors.push(`vacina ${vac.nome ?? vac.id}: ${e.message ?? e}`);
    }
    bump();
  }

  // 3) productions
  for (const p of legacy.producoes ?? []) {
    const cowId = cowIdMap.get(String(p.vacaId));
    if (!cowId) {
      failed++;
      errors.push(`producao ${p.id}: vaca não encontrada`);
      bump();
      continue;
    }
    try {
      const { error } = await supabase.from("milk_productions").upsert(
        {
          ...prodInsertPayload(
            {
              vacaId: cowId,
              ano: Number(p.ano),
              mes: Number(p.mes),
              totalLitros: Number(p.totalLitros ?? 0),
              mediaDiaria: Number(p.mediaDiaria ?? 0),
              observacoes: p.observacoes,
            },
            propertyId,
            userId,
          ),
          legacy_local_id: String(p.id),
        },
        { onConflict: "property_id,legacy_local_id" },
      );
      if (error) throw error;
      processed.producoes++;
    } catch (e: any) {
      failed++;
      errors.push(`producao ${p.id}: ${e.message ?? e}`);
    }
    bump();
  }

  // 4) applications
  for (const a of legacy.aplicacoes ?? []) {
    const cowId = cowIdMap.get(String(a.vacaId));
    const vacId = vacIdMap.get(String(a.vacinaId));
    if (!cowId || !vacId) {
      failed++;
      errors.push(`aplicacao ${a.id}: vínculo não encontrado`);
      bump();
      continue;
    }
    try {
      const { error } = await supabase.from("vaccination_records").upsert(
        {
          ...vaccRecordInsertPayload(
            {
              vacaId: cowId,
              vacinaId: vacId,
              data: a.data,
              dose: a.dose ?? "1ª",
              responsavel: a.responsavel ?? "",
              lote: a.lote,
              proximaDose: a.proximaDose,
              observacoes: a.observacoes,
            },
            propertyId,
            userId,
          ),
          legacy_local_id: String(a.id),
        },
        { onConflict: "property_id,legacy_local_id" },
      );
      if (error) throw error;
      processed.aplicacoes++;
    } catch (e: any) {
      failed++;
      errors.push(`aplicacao ${a.id}: ${e.message ?? e}`);
    }
    bump();
  }

  const totalProcessed =
    processed.vacas + processed.producoes + processed.vacinas + processed.aplicacoes;

  if (migRow?.id) {
    await supabase
      .from("data_migrations")
      .update({
        status: failed === 0 ? "completed" : "completed_with_errors",
        completed_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_failed: failed,
        error_details: errors.length ? ({ errors: errors.slice(0, 100) } as any) : null,
      })
      .eq("id", migRow.id);
  }

  localStorage.setItem(MIGRATED_FLAG, "1");
  setMigration({
    status: failed === 0 ? "completed" : "error",
    processed: { ...processed },
    failed,
    errors: [...errors],
  });
  await fetchAll(propertyId);
}

export function dismissMigration() {
  setMigration({ status: "idle" });
}

/* ------------------------------- loading -------------------------------- */

async function fetchAll(propertyId: string) {
  const [{ data: cows }, { data: prods }, { data: vaccines }, { data: apps }] =
    await Promise.all([
      supabase.from("cows").select("*").is("deleted_at", null).order("created_at"),
      supabase.from("milk_productions").select("*").order("reference_year").order("reference_month"),
      supabase.from("vaccines").select("*").order("created_at"),
      supabase.from("vaccination_records").select("*").order("application_date", { ascending: false }),
    ]);
  setState({
    vacas: (cows ?? []).map(mapCowRow),
    producoes: (prods ?? []).map(mapProdRow),
    vacinas: (vaccines ?? []).map(mapVaccineRow),
    aplicacoes: (apps ?? []).map(mapVaccRecordRow),
    ready: true,
    propertyId,
  });
}

let currentUserId: string | null = null;
let loadingPromise: Promise<void> | null = null;

async function bootstrap(userId: string) {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const propertyId = await ensureProperty(userId);
    if (!propertyId) return;
    await detectPendingMigration(userId);
    await fetchAll(propertyId);
  })();
  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

async function reloadTable(kind: "cows" | "milk" | "vaccines" | "records") {
  const pid = state.propertyId;
  if (!pid) return;
  if (kind === "cows") {
    const { data } = await supabase.from("cows").select("*").is("deleted_at", null).order("created_at");
    setState({ vacas: (data ?? []).map(mapCowRow) });
  } else if (kind === "milk") {
    const { data } = await supabase
      .from("milk_productions")
      .select("*")
      .order("reference_year")
      .order("reference_month");
    setState({ producoes: (data ?? []).map(mapProdRow) });
  } else if (kind === "vaccines") {
    const { data } = await supabase.from("vaccines").select("*").order("created_at");
    setState({ vacinas: (data ?? []).map(mapVaccineRow) });
  } else {
    const { data } = await supabase
      .from("vaccination_records")
      .select("*")
      .order("application_date", { ascending: false });
    setState({ aplicacoes: (data ?? []).map(mapVaccRecordRow) });
  }
}

/* ------------------------------ auth wiring ----------------------------- */

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user?.id;
    if (uid) {
      currentUserId = uid;
      void bootstrap(uid);
    }
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const uid = session?.user?.id ?? null;
    if (event === "SIGNED_OUT" || !uid) {
      currentUserId = null;
      state = { ...empty, migration: { ...emptyMigration } };
      emit();
      return;
    }
    if (uid !== currentUserId) {
      currentUserId = uid;
      state = { ...empty, migration: { ...emptyMigration } };
      emit();
      void bootstrap(uid);
    }
  });
}

/* ---------------------------------- api --------------------------------- */

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reload: async () => {
    if (currentUserId) await bootstrap(currentUserId);
  },
  reset: () => {
    state = { ...empty, migration: { ...emptyMigration } };
    emit();
  },
};

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

async function requireCtx(): Promise<{ userId: string; propertyId: string } | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return null;
  const propertyId = state.propertyId ?? (await ensureProperty(userId));
  if (!propertyId) return null;
  if (!state.propertyId) setState({ propertyId });
  return { userId, propertyId };
}

export const actions = {
  addVaca: async (v: Omit<Vaca, "id">) => {
    const ctx = await requireCtx();
    if (!ctx) return;
    const { error } = await supabase
      .from("cows")
      .insert(cowInsertPayload(v, ctx.propertyId, ctx.userId));
    if (error) throw error;
    await reloadTable("cows");
  },
  updateVaca: async (id: string, patch: Partial<Vaca>) => {
    const p: any = {};
    if (patch.nome !== undefined) p.name = patch.nome;
    if (patch.brinco !== undefined) p.ear_tag = patch.brinco;
    if (patch.raca !== undefined) p.breed = patch.raca || null;
    if (patch.dataNascimento !== undefined) p.birth_date = patch.dataNascimento || null;
    if (patch.dataUltimoParto !== undefined) p.last_calving_date = patch.dataUltimoParto || null;
    if (patch.dataInicioLactacao !== undefined)
      p.lactation_start_date = patch.dataInicioLactacao || null;
    if (patch.status !== undefined) p.status = patch.status;
    if (patch.observacoes !== undefined) p.notes = patch.observacoes || null;
    const { error } = await supabase.from("cows").update(p).eq("id", id);
    if (error) throw error;
    await reloadTable("cows");
  },
  deleteVaca: async (id: string) => {
    // soft-delete to preserve history
    const { error } = await supabase
      .from("cows")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await reloadTable("cows");
  },

  addProducao: async (p: Omit<ProducaoMensal, "id">) => {
    const ctx = await requireCtx();
    if (!ctx) return;
    const { error } = await supabase
      .from("milk_productions")
      .insert(prodInsertPayload(p, ctx.propertyId, ctx.userId));
    if (error) throw error;
    await reloadTable("milk");
  },
  deleteProducao: async (id: string) => {
    const { error } = await supabase.from("milk_productions").delete().eq("id", id);
    if (error) throw error;
    await reloadTable("milk");
  },

  addVacina: async (v: Omit<Vacina, "id">) => {
    const ctx = await requireCtx();
    if (!ctx) return;
    const { error } = await supabase
      .from("vaccines")
      .insert(vaccineInsertPayload(v, ctx.propertyId, ctx.userId));
    if (error) throw error;
    await reloadTable("vaccines");
  },
  deleteVacina: async (id: string) => {
    // deactivate instead of hard delete to preserve records
    const { error } = await supabase.from("vaccines").update({ active: false }).eq("id", id);
    if (error) throw error;
    await reloadTable("vaccines");
  },

  addAplicacao: async (a: Omit<AplicacaoVacina, "id">) => {
    const ctx = await requireCtx();
    if (!ctx) return;
    const { error } = await supabase
      .from("vaccination_records")
      .insert(vaccRecordInsertPayload(a, ctx.propertyId, ctx.userId));
    if (error) throw error;
    await reloadTable("records");
  },
  deleteAplicacao: async (id: string) => {
    const { error } = await supabase.from("vaccination_records").delete().eq("id", id);
    if (error) throw error;
    await reloadTable("records");
  },
};
