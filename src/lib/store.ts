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

export interface AppState {
  vacas: Vaca[];
  producoes: ProducaoMensal[];
  vacinas: Vacina[];
  aplicacoes: AplicacaoVacina[];
  ready: boolean;
  propertyId: string | null;
}

const LEGACY_KEY = "lactocontrol-v1";
const MIGRATION_KEY = "localstorage_v1";

const empty: AppState = {
  vacas: [],
  producoes: [],
  vacinas: [],
  aplicacoes: [],
  ready: false,
  propertyId: null,
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
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
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

/* ------------------------- localStorage migration ----------------------- */

interface LegacyState {
  vacas?: any[];
  producoes?: any[];
  vacinas?: any[];
  aplicacoes?: any[];
}

async function migrateLegacyIfNeeded(userId: string, propertyId: string) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  let legacy: LegacyState;
  try {
    legacy = JSON.parse(raw);
  } catch {
    return;
  }
  const hasData =
    (legacy.vacas?.length ?? 0) +
      (legacy.producoes?.length ?? 0) +
      (legacy.vacinas?.length ?? 0) +
      (legacy.aplicacoes?.length ?? 0) >
    0;
  if (!hasData) return;

  const { data: mig } = await supabase
    .from("data_migrations")
    .select("id, status")
    .eq("user_id", userId)
    .eq("migration_key", MIGRATION_KEY)
    .maybeSingle();
  if (mig?.status === "completed") return;

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

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  // 1) cows — with legacy_local_id
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
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`vaca ${v.id}: ${e.message ?? e}`);
    }
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
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`vacina ${vac.id}: ${e.message ?? e}`);
    }
  }

  // 3) productions
  for (const p of legacy.producoes ?? []) {
    const cowId = cowIdMap.get(String(p.vacaId));
    if (!cowId) continue;
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
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`producao ${p.id}: ${e.message ?? e}`);
    }
  }

  // 4) applications
  for (const a of legacy.aplicacoes ?? []) {
    const cowId = cowIdMap.get(String(a.vacaId));
    const vacId = vacIdMap.get(String(a.vacinaId));
    if (!cowId || !vacId) continue;
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
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`aplicacao ${a.id}: ${e.message ?? e}`);
    }
  }

  if (migRow?.id) {
    await supabase
      .from("data_migrations")
      .update({
        status: failed === 0 ? "completed" : "completed_with_errors",
        completed_at: new Date().toISOString(),
        records_processed: processed,
        records_failed: failed,
        error_details: errors.length ? ({ errors: errors.slice(0, 50) } as any) : null,
      })
      .eq("id", migRow.id);
  }

  // Backup + mark local as migrated, do not delete
  try {
    localStorage.setItem(`${LEGACY_KEY}-backup-${Date.now()}`, raw);
    localStorage.setItem(`${LEGACY_KEY}-migrated`, "1");
  } catch {
    /* ignore quota */
  }
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
    try {
      await migrateLegacyIfNeeded(userId, propertyId);
    } catch (e) {
      console.error("[LactoControl] legacy migration error", e);
    }
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
      state = empty;
      emit();
      return;
    }
    if (uid !== currentUserId) {
      currentUserId = uid;
      state = { ...empty };
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
    state = empty;
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
    const { error } = await supabase.from("cows").delete().eq("id", id);
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
    const { error } = await supabase.from("vaccines").delete().eq("id", id);
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
